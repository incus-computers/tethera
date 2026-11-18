"use client";
import { create } from "zustand";
import { CustomerProfile, RegistrationInput } from "../types/customer";
interface AuthState {
 user:CustomerProfile|null; isAuthenticated:boolean; isLoading:boolean; error:string|null;
 login:(identifier:string,password?:string)=>Promise<{success:boolean;error?:string}>;
 register:(input:RegistrationInput)=>Promise<{success:boolean;error?:string;message?:string}>;
 updateProfile:(updates:Partial<CustomerProfile>)=>Promise<{success:boolean;error?:string}>;
 logout:()=>Promise<void>; initSession:()=>Promise<void>; clearError:()=>void;
}
let epoch=0;
export const useAuthStore=create<AuthState>((set,get)=>({
 user:null,isAuthenticated:false,isLoading:false,error:null,
 initSession:async()=>{
   const current=epoch;
   localStorage.removeItem("tethera_customer_session");
   try { const response=await fetch("/api/auth/me",{cache:"no-store"});const data=await response.json();
     if(current===epoch) set({user:response.ok?data.user:null,isAuthenticated:response.ok,isLoading:false});
   } catch {if(current===epoch)set({user:null,isAuthenticated:false,isLoading:false});}
 },
 login:async(identifier,password)=>{
   ++epoch;set({isLoading:true,error:null});
   try {const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifier,password})});const data=await response.json();
     if(!response.ok)throw new Error(data.error);
     set({user:data.user,isAuthenticated:true,isLoading:false});return {success:true};
   }catch(error){const message=error instanceof Error?error.message:"Sign-in failed.";set({user:null,isAuthenticated:false,isLoading:false,error:message});return {success:false,error:message};}
 },
 register:async(input)=>{
   ++epoch;set({isLoading:true,error:null});
   try{const response=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});const data=await response.json();if(!response.ok)throw new Error(data.error);
     set({user:data.user,isAuthenticated:true,isLoading:false});return {success:true};
   }catch(error){const message=error instanceof Error?error.message:"Registration failed.";set({isLoading:false,error:message});return {success:false,error:message};}
 },
 updateProfile:async(updates)=>{
   if(!get().user)return {success:false,error:"Sign in first."};
   try{const response=await fetch("/api/account/update",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({updates})});const data=await response.json();if(!response.ok)throw new Error(data.error);set({user:data.user});return {success:true};
   }catch(error){return {success:false,error:error instanceof Error?error.message:"Update failed."};}
 },
 logout:async()=>{
   ++epoch;
   const response=await fetch("/api/auth/logout",{method:"POST"});
   if(!response.ok){set({error:"Could not sign out. Please retry."});return;}
   localStorage.removeItem("tethera_customer_session");
   set({user:null,isAuthenticated:false,error:null});
 },
 clearError:()=>set({error:null})
}));
