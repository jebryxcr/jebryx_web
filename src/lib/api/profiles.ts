import { apiRequest } from "@/lib/api/client";
import type { Profile } from "@/lib/api/auth";

/** Campos editables de un perfil. `color` es opcional (hex `#RGB`…`#RRGGBBAA`). */
export type ProfileInput = {
  name?: string;
  color?: string | null;
  avatar?: string | null;
};

/**
 * GET /api/v1/profiles
 * Lista los perfiles del usuario autenticado (no lleva X-Profile-Id).
 */
export function listProfiles(token: string) {
  return apiRequest<{ profiles: Profile[] }>("/api/v1/profiles", { token });
}

/**
 * POST /api/v1/profiles
 * Crea un perfil (máximo 3). Si ya hay 3, el backend responde 422 con
 * `errors.name.maxProfiles`.
 */
export function createProfile(
  token: string,
  body: { name: string; color?: string | null; avatar?: string | null },
) {
  return apiRequest<{ profile: Profile }>("/api/v1/profiles", {
    method: "POST",
    body,
    token,
  });
}

/**
 * PATCH /api/v1/profiles/{id}
 * Renombra y/o cambia el color. Ambos campos son opcionales.
 */
export function updateProfile(token: string, id: string, body: ProfileInput) {
  return apiRequest<{ profile: Profile }>(`/api/v1/profiles/${id}`, {
    method: "PATCH",
    body,
    token,
  });
}

/**
 * DELETE /api/v1/profiles/{id}
 * Borra con confirmación fuerte: `confirm_name` debe coincidir EXACTO con el
 * nombre del perfil. El body JSON viaja en el cuerpo del DELETE.
 */
export function deleteProfile(token: string, id: string, confirmName: string) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/profiles/${id}`, {
    method: "DELETE",
    body: { confirm_name: confirmName },
    token,
  });
}

/**
 * PATCH /api/v1/profiles/{id}/set-default
 * Marca el perfil como predeterminado (quita el flag del anterior).
 */
export function setDefaultProfile(token: string, id: string) {
  return apiRequest<{ profile: Profile }>(
    `/api/v1/profiles/${id}/set-default`,
    {
      method: "PATCH",
      token,
    },
  );
}
