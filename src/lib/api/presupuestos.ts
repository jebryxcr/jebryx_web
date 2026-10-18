import { apiRequest } from "@/lib/api/client";

export type Presupuesto = {
  id: string;
  categoria_id: string;
  profile_id: string;
  moneda_id: string;
  monto: string;
  icono: string;
  gastado?: number;
  disponible?: number;
  porcentaje_usado?: number;
  created_at?: string | null;
  updated_at?: string | null;
  categoria: {
    id: string;
    nombre: string;
    icono: string;
  } | null;
  moneda: {
    id: string;
    nombre: string;
    simbolo: string;
  } | null;
};

export type PresupuestoInput = {
  categoria_id: string;
  moneda_id: string;
  monto: string;
  icono: string;
};

export function listPresupuestos(token: string, profileId: string) {
  return apiRequest<{ presupuestos: Presupuesto[] }>("/api/v1/presupuestos", {
    token,
    profileId,
  });
}

export function createPresupuesto(
  token: string,
  profileId: string,
  body: PresupuestoInput,
) {
  return apiRequest<{ presupuesto: Presupuesto }>("/api/v1/presupuestos", {
    method: "POST",
    body,
    token,
    profileId,
  });
}

export function updatePresupuesto(
  token: string,
  profileId: string,
  id: string,
  body: Partial<PresupuestoInput>,
) {
  return apiRequest<{ presupuesto: Presupuesto }>(
    `/api/v1/presupuestos/${id}`,
    {
      method: "PATCH",
      body,
      token,
      profileId,
    },
  );
}

export function deletePresupuesto(
  token: string,
  profileId: string,
  id: string,
) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/presupuestos/${id}`, {
    method: "DELETE",
    token,
    profileId,
  });
}
