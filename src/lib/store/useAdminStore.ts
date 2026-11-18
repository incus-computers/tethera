"use client";
import { create } from "zustand";
export type AdminRole="SUPER_ADMIN"|"CATALOG_MANAGER"|"FULFILLMENT_OPERATOR"|"SUPPORT_AGENT";
export interface AdminUser {id:string;username:string;email:string;name:string;role:AdminRole;clearanceLevel:number;}
interface AdminState {
 user:AdminUser|null;token:null;isAuthenticated:boolean;isSuperAdmin:boolean;isLoading:boolean;error:string|null;
 login:(identifier:string,password:string,totpCode?:string)=>Promise<{success:boolean;error?:string}>;
 logout:()=>Promise<void>;initSession:()=>Promise<void>;clearError:()=>void;
}
let epoch=0;
export const useAdminStore=create<AdminState>(set=>({
 user:null,token:null,isAuthenticated:false,isSuperAdmin:false,isLoading:false,error:null,
 initSession:async()=>{
  const current=epoch;localStorage.removeItem("tethera_admin_clearance_session");
  try{const response=await fetch("/api/admin/auth",{cache:"no-store"});const data=await response.json();
   if(current===epoch)set({user:response.ok?data.user:null,isAuthenticated:response.ok,isSuperAdmin:response.ok&&data.user.role==="SUPER_ADMIN"});
  }catch{if(current===epoch)set({user:null,isAuthenticated:false,isSuperAdmin:false});}
 },
 login:async(identifier,password,totpCode)=>{
  ++epoch;set({isLoading:true,error:null});
  try{const response=await fetch("/api/admin/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifier,password,totpCode})});const data=await response.json();if(!response.ok)throw new Error(data.error);
   set({user:data.user,isAuthenticated:true,isSuperAdmin:data.user.role==="SUPER_ADMIN",isLoading:false});return {success:true};
  }catch(error){const message=error instanceof Error?error.message:"Sign-in failed.";set({user:null,isAuthenticated:false,isSuperAdmin:false,isLoading:false,error:message});return {success:false,error:message};}
 },
 logout:async()=>{
  ++epoch;
  const response=await fetch("/api/admin/auth",{method:"DELETE"});
  if(!response.ok){set({error:"Could not sign out. Please retry."});return;}
  localStorage.removeItem("tethera_admin_clearance_session");
  set({user:null,isAuthenticated:false,isSuperAdmin:false,error:null});
 },
 clearError:()=>set({error:null})
}));
