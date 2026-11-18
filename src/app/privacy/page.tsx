import { PolicyDocumentView } from "@/components/storefront/PolicyDocumentView";
import { getStorefrontProfile } from "@/lib/storefront/profile";
export const dynamic="force-dynamic";
export function generateMetadata(){const profile=getStorefrontProfile();return {title:profile.documents["privacy"].en.title+" | Incus Computers",robots:{index:profile.status==="published",follow:true}};}
export default function PolicyPage(){return <PolicyDocumentView profile={getStorefrontProfile()} policy="privacy"/>;}
