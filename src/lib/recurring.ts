export type Frequency = "weekly" | "biweekly" | "monthly";
export type PlanKind = "recurring" | "installments";
export type RecurringPlan = {
  id: string;
  name: string;
  kind: PlanKind;
  frequency: Frequency;
  startDate: string;
  amount: string;
  currencyId: string;
  accountId: string;
  categoryId: string | null;
  totalInstallments: number | null;
  paidCount: number;
  active: boolean;
  createdAt: string;
};

export function dueDate(
  plan: Pick<RecurringPlan, "startDate" | "frequency" | "paidCount">,
): string {
  const [year, month, day] = plan.startDate.split("-").map(Number);
  if (plan.frequency === "monthly") {
    const first = new Date(Date.UTC(year, month - 1 + plan.paidCount, 1));
    const lastDay = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    first.setUTCDate(Math.min(day, lastDay));
    return first.toISOString().slice(0, 10);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(
    date.getUTCDate() + plan.paidCount * (plan.frequency === "weekly" ? 7 : 14),
  );
  return date.toISOString().slice(0, 10);
}
