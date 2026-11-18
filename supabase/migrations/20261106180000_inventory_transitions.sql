begin;
create function public.transition_order_inventory(p_order_id text,p_action text,p_reference text default '',p_reason text default '',p_amount numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders;h public.inventory_reservations;v_previous integer;v_count integer;v_expired boolean;v_settle boolean;v_status text;v_items jsonb:='[]';
begin
 if p_action not in ('settle','cancel','expire','pending') then raise exception using errcode='22023',message='Invalid inventory action';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then return jsonb_build_object('success',false,'error','Order not found.');end if;
 if p_action='pending' then return jsonb_build_object('success',true,'changed',false,'status',o.status,'order',to_jsonb(o));end if;
 if o.paid_at is not null then
   return jsonb_build_object('success',p_action='settle' and p_reference=o.payment_reference,'changed',false,'status',o.status,'order',to_jsonb(o),'error','Paid orders cannot be cancelled or settled with another reference.');
 end if;
 if o.status='cancelled' then return jsonb_build_object('success',p_action<>'settle','changed',false,'status',o.status,'order',to_jsonb(o),'error','Cancelled order; late payments require reconciliation.');end if;
 if o.status not in ('pending_payment','order_received') then return jsonb_build_object('success',false,'changed',false,'error','Order is not awaiting payment.');end if;
 perform 1 from public.inventory_reservations where order_id=o.id order by product_id,variant_id,id for update;
 if not exists(select 1 from public.inventory_reservations where order_id=o.id and status='reserved') or exists(
   (select product_id,variant_id,sum(quantity)::bigint from public.order_items where order_id=o.id and product_id is not null group by 1,2
    except select product_id,variant_id,sum(quantity)::bigint from public.inventory_reservations where order_id=o.id and status='reserved' group by 1,2)
   union all
   (select product_id,variant_id,sum(quantity)::bigint from public.inventory_reservations where order_id=o.id and status='reserved' group by 1,2
    except select product_id,variant_id,sum(quantity)::bigint from public.order_items where order_id=o.id and product_id is not null group by 1,2)
 ) then return jsonb_build_object('success',false,'changed',false,'error','Missing order-linked reservation coverage; reconcile historical inventory.');end if;
 select bool_or(expires_at<=now()) into v_expired from public.inventory_reservations where order_id=o.id and status='reserved';
 if p_action='expire' and not v_expired then return jsonb_build_object('success',true,'changed',false,'status',o.status);end if;
 if p_action='settle' and (p_reference is null or length(p_reference) not between 1 and 200 or (p_amount is not null and p_amount<>o.total)) then return jsonb_build_object('success',false,'changed',false,'error','Invalid payment reference or amount.');end if;
 v_settle:=p_action='settle' and not v_expired;
 for h in select * from public.inventory_reservations where order_id=o.id and status='reserved' order by product_id,variant_id,id loop
   if h.variant_id is not null then
     select stock_quantity into v_previous from public.product_variants where id=h.variant_id and product_id=h.product_id for update;
     update public.product_variants set stock_quantity=stock_quantity-case when v_settle then h.quantity else 0 end,reserved_quantity=reserved_quantity-h.quantity,updated_at=now()
       where id=h.variant_id and product_id=h.product_id and reserved_quantity>=h.quantity and (not v_settle or stock_quantity>=h.quantity);
   else
     select stock_on_hand into v_previous from public.store_inventory where product_id=h.product_id and store_id=h.store_id for update;
     update public.store_inventory set stock_on_hand=stock_on_hand-case when v_settle then h.quantity else 0 end,stock_reserved=stock_reserved-h.quantity,updated_at=now()
       where product_id=h.product_id and store_id=h.store_id and stock_reserved>=h.quantity and (not v_settle or stock_on_hand>=h.quantity);
   end if;
   get diagnostics v_count=row_count;
   if v_count<>1 then raise exception using errcode='23514',message='Inventory reservation drift';end if;
   if v_settle then
     insert into public.inventory_adjustment_ledger(product_id,variant_id,store_id,delta_quantity,previous_stock,new_stock,reason_code,reference_order_id,actor_id)
       values(h.product_id,h.variant_id,h.store_id,-h.quantity,v_previous,v_previous-h.quantity,'SALE',o.id,'inventory_transition');
     v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',h.product_id,'variant_id',h.variant_id,'quantity',h.quantity));
   end if;
   update public.inventory_reservations set status=case when v_settle then 'settled' else 'released' end,updated_at=now() where id=h.id;
 end loop;
 v_status:=case when not v_settle then 'cancelled' when exists(select 1 from public.order_items where order_id=o.id and is_custom_build) then 'assembly_in_progress' when o.fulfillment_type='click_and_collect' then 'ready_for_pickup' else 'order_accepted' end;
 update public.orders set status=v_status,paid_at=case when v_settle then now() else paid_at end,payment_reference=case when v_settle then p_reference else payment_reference end,
   payment_method=case when v_settle then 'Midtrans' else payment_method end,notes=case when not v_settle then coalesce(nullif(p_reason,''),'Reservation released or expired.') else notes end,updated_at=now() where id=o.id returning * into o;
 return jsonb_build_object('success',not(p_action='settle' and v_expired),'changed',true,'status',o.status,'order',to_jsonb(o),'reservedItems',v_items,'error',case when p_action='settle' and v_expired then 'Reservation expired; payment requires reconciliation.' else null end);
end;
$$;
revoke all on function public.transition_order_inventory(text,text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.transition_order_inventory(text,text,text,text,numeric) to service_role;
-- Disable the unsafe legacy double-reservation function, including service calls.
revoke all on function public.process_order_payment_success(text,text) from public,anon,authenticated,service_role;
create function public.expire_order_reservations(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o record;r jsonb;results jsonb:='[]';
begin
 if p_limit<1 or p_limit>500 or p_limit is null then raise exception using errcode='22023',message='Invalid batch size';end if;
 for o in select orders.id from public.orders orders where orders.paid_at is null and orders.status in ('pending_payment','order_received')
   and exists(select 1 from public.inventory_reservations h where h.order_id=orders.id and h.status='reserved' and h.expires_at<=now())
   order by orders.id limit p_limit for update skip locked loop
   r:=public.transition_order_inventory(o.id,'expire','','Reservation expired.',null);results:=results||jsonb_build_array(r);
 end loop;
 return results;
end;
$$;
revoke all on function public.expire_order_reservations(integer) from public,anon,authenticated;
grant execute on function public.expire_order_reservations(integer) to service_role;
insert into public.application_schema_versions(version) values('20261106180000_inventory_transitions');
alter function public.application_schema_health() rename to application_checkout_schema_health;
revoke all on function public.application_checkout_schema_health() from public,anon,authenticated;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_checkout_schema_health() and exists(select 1 from public.application_schema_versions where version='20261106180000_inventory_transitions')
 and to_regprocedure('public.transition_order_inventory(text,text,text,text,numeric)') is not null and to_regprocedure('public.expire_order_reservations(integer)') is not null;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
