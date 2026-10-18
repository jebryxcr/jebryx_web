import { apiRequest } from "@/lib/api/client";
import type { RecurringPlan } from "@/lib/recurring";

export type PlanRecurrenteInput = Pick<
  RecurringPlan,
  | "name"
  | "kind"
  | "frequency"
  | "startDate"
  | "amount"
  | "currencyId"
  | "accountId"
  | "categoryId"
  | "totalInstallments"
>;

const base = "/api/v1/planes-recurrentes";

export const listarPlanesRecurrentes = (token: string, profileId: string) =>
  apiRequest<{ plans: RecurringPlan[] }>(base, { token, profileId });

export const crearPlanRecurrente = (
  token: string,
  profileId: string,
  body: PlanRecurrenteInput,
) =>
  apiRequest<{ plan: RecurringPlan }>(base, {
    method: "POST",
    token,
    profileId,
    body,
  });

export const actualizarPlanRecurrente = (
  token: string,
  profileId: string,
  id: string,
  body: Partial<PlanRecurrenteInput> & { active?: boolean },
) =>
  apiRequest<{ plan: RecurringPlan }>(`${base}/${id}`, {
    method: "PATCH",
    token,
    profileId,
    body,
  });

export const eliminarPlanRecurrente = (
  token: string,
  profileId: string,
  id: string,
) =>
  apiRequest<{ deleted: boolean }>(`${base}/${id}`, {
    method: "DELETE",
    token,
    profileId,
  });

export const registrarPagoRecurrente = (
  token: string,
  profileId: string,
  id: string,
) =>
  apiRequest<{ plan: RecurringPlan; movementId: string }>(
    `${base}/${id}/pagos`,
    { method: "POST", token, profileId },
  );

export const importarPlanesRecurrentes = (
  token: string,
  profileId: string,
  plans: RecurringPlan[],
) =>
  apiRequest<{ plans: RecurringPlan[] }>(`${base}/importar`, {
    method: "POST",
    token,
    profileId,
    body: { plans },
  });
