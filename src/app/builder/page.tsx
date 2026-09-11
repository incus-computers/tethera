import { PCBuilderView } from "../../components/builder/PCBuilderView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom PC Builder | Tethera Precision Studio",
  description:
    "Configure high-performance gaming desktops and workstations with real-time socket matching, clearance checks, and Click & Collect fulfillment.",
};

export default function BuilderPage() {
  return <PCBuilderView />;
}
