// @ts-ignore
import { describe, it, expect } from "vitest";
import {
  WORKFLOW_STAGES,
  getWorkflowStageIndex,
  getNextWorkflowStep,
} from "@/lib/utils/orderWorkflow";

describe("Order Workflow Utilities", () => {
  it("defines the 6-stage fulfillment workflow correctly", () => {
    const keys = WORKFLOW_STAGES.map((s) => s.key);
    expect(keys).toEqual([
      "order_received",
      "order_accepted",
      "finding_stock",
      "ready_for_dispatch",
      "finding_courier",
      "dispatched",
      "finished",
    ]);
  });

  it("maps status strings to correct stage indices", () => {
    expect(getWorkflowStageIndex("order_received")).toBe(0);
    expect(getWorkflowStageIndex("pending")).toBe(0);
    expect(getWorkflowStageIndex("order_accepted")).toBe(1);
    expect(getWorkflowStageIndex("finding_stock")).toBe(2);
    expect(getWorkflowStageIndex("ready_for_dispatch")).toBe(3);
    expect(getWorkflowStageIndex("finding_courier")).toBe(4);
    expect(getWorkflowStageIndex("dispatched")).toBe(5);
    expect(getWorkflowStageIndex("shipped")).toBe(5);
    expect(getWorkflowStageIndex("finished")).toBe(6);
    expect(getWorkflowStageIndex("delivered")).toBe(6);
  });

  it("progresses order_accepted to finding_stock with Find Stock label", () => {
    const next = getNextWorkflowStep("order_accepted");
    expect(next).not.toBeNull();
    expect(next?.nextStatus).toBe("finding_stock");
    expect(next?.nextActionLabel).toBe("Find Stock");
  });

  it("progresses finding_stock to ready_for_dispatch", () => {
    const next = getNextWorkflowStep("finding_stock");
    expect(next).not.toBeNull();
    expect(next?.nextStatus).toBe("ready_for_dispatch");
    expect(next?.nextActionLabel).toBe("Ready for Dispatch");
  });

  it("progresses ready_for_dispatch to finding_courier", () => {
    const next = getNextWorkflowStep("ready_for_dispatch");
    expect(next).not.toBeNull();
    expect(next?.nextStatus).toBe("finding_courier");
    expect(next?.nextActionLabel).toBe("Find Courier");
  });

  it("progresses finding_courier to dispatched", () => {
    const next = getNextWorkflowStep("finding_courier");
    expect(next).not.toBeNull();
    expect(next?.nextStatus).toBe("dispatched");
    expect(next?.nextActionLabel).toBe("Dispatch Order");
  });

  it("progresses dispatched to finished", () => {
    const next = getNextWorkflowStep("dispatched");
    expect(next).not.toBeNull();
    expect(next?.nextStatus).toBe("finished");
    expect(next?.nextActionLabel).toBe("Finish Order");
  });

  it("returns null for final or terminal statuses", () => {
    expect(getNextWorkflowStep("finished")).toBeNull();
    expect(getNextWorkflowStep("cancelled")).toBeNull();
    expect(getNextWorkflowStep("refunded")).toBeNull();
  });
});
