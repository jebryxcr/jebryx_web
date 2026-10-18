import { apiRequest } from "@/lib/api/client";

export type Notificacion = {
  id: string;
  profile_id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  icono: string;
  leida: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export function listNotificaciones(token: string, profileId: string) {
  return apiRequest<{ notificaciones: Notificacion[] }>(
    "/api/v1/notificaciones",
    {
      token,
      profileId,
    },
  );
}

export function updateNotificacion(
  token: string,
  profileId: string,
  id: string,
  body: Partial<Pick<Notificacion, "leida">>,
) {
  return apiRequest<{ notificacion: Notificacion }>(
    `/api/v1/notificaciones/${id}`,
    {
      method: "PATCH",
      body,
      token,
      profileId,
    },
  );
}

export function deleteNotificacion(
  token: string,
  profileId: string,
  id: string,
) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/notificaciones/${id}`, {
    method: "DELETE",
    token,
    profileId,
  });
}
