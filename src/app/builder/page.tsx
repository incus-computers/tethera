import { PCBuilderView } from "../../components/builder/PCBuilderView";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "PC Builder | Incus Computers",
  description:
    "Customize your PC configuration, compare replacement parts and review component pricing with Incus Computers.",
};

export default function BuilderPage() {
  return <Suspense fallback={<div className="p-8" role="status">Loading your configuration...</div>}><PCBuilderView /></Suspense>;
}
