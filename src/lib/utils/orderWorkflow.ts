// Order fulfillment workflow helper matching Tethera operational stages:
// Order Received -> Order Accepted -> Finding Stock -> Ready for Dispatch -> Finding Courier -> Dispatched -> Finished

export interface WorkflowStage {
  key: string;
  label: string;
  shortLabel: string;
  nextStatus?: string;
  nextActionLabel?: string;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    key: "order_received",
    label: "Order Received",
    shortLabel: "Received",
    nextStatus: "order_accepted",
    nextActionLabel: "Accept Order",
  },
  {
    key: "order_accepted",
    label: "Order Accepted",
    shortLabel: "Accepted",
    nextStatus: "finding_stock",
    nextActionLabel: "Find Stock",
  },
  {
    key: "finding_stock",
    label: "Finding Stock",
    shortLabel: "Finding Stock",
    nextStatus: "ready_for_dispatch",
    nextActionLabel: "Ready for Dispatch",
  },
  {
    key: "ready_for_dispatch",
    label: "Ready for Dispatch",
    shortLabel: "Ready Dispatch",
    nextStatus: "finding_courier",
    nextActionLabel: "Find Courier",
  },
  {
    key: "finding_courier",
    label: "Finding Courier",
    shortLabel: "Finding Courier",
    nextStatus: "dispatched",
    nextActionLabel: "Dispatch Order",
  },
  {
    key: "dispatched",
    label: "Dispatched",
    shortLabel: "Dispatched",
    nextStatus: "finished",
    nextActionLabel: "Finish Order",
  },
  {
    key: "finished",
    label: "Finished",
    shortLabel: "Finished",
  },
];

export function getWorkflowStageIndex(status: string): number {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "order_received":
    case "pending":
    case "pending_payment":
      return 0;
    case "order_accepted":
    case "payment_received":
      return 1;
    case "finding_stock":
    case "assembly_in_progress":
    case "testing_bench":
      return 2;
    case "ready_for_dispatch":
    case "ready_for_pickup":
      return 3;
    case "finding_courier":
      return 4;
    case "dispatched":
    case "shipped":
    case "on_delivery":
      return 5;
    case "finished":
    case "delivered":
    case "delivery_arrived":
    case "collected":
      return 6;
    default:
      return 0;
  }
}

export function getNextWorkflowStep(
  status: string
): { nextStatus: string; nextActionLabel: string } | null {
  const s = (status || "").toLowerCase().trim();
  if (s === "cancelled" || s === "refunded") return null;

  const currentIndex = getWorkflowStageIndex(s);
  if (currentIndex < WORKFLOW_STAGES.length - 1) {
    const currentStage = WORKFLOW_STAGES[currentIndex];
    const nextStage = WORKFLOW_STAGES[currentIndex + 1];
    return {
      nextStatus: nextStage.key,
      nextActionLabel: currentStage.nextActionLabel || `Progress to ${nextStage.label}`,
    };
  }
  return null;
}
