import { apiRequest } from "@/lib/api/client";

/**
 * Tipo de cuenta mapeado al FE.
 * Se almacena en el campo `icono` del backend.
 */
export type CuentaTipo = "bank" | "wallet" | "credit" | "savings";

/**
 * Cuenta tal como llega del backend.
 * - `icono` contiene el tipo de cuenta (bank, wallet, credit, savings)
 * - `color` contiene el código de moneda (CRC, USD, EUR, etc.)
 * - `hex_color` es el color de personalización (#RRGGBB)
 * - `saldo` es un decimal con signo (negativo para deudas)
 */
export type Cuenta = {
  id: string;
  profile_id: string;
  nombre: string;
  color: string | null; // = moneda (sin cambios)
  icono: string | null; // = tipo (sin cambios)
  saldo: string | null;
  alias: string | null;
  digits: string | null;
  hex_color: string | null;
  fav: boolean;
  archivada: boolean;
  last_movement_at?: string | null; // opcional, proxy = modified
  created: string | null;
  modified: string | null;
};

/**
 * Payload para crear/actualizar una cuenta.
 * - icono → tipo de cuenta (bank, wallet, credit, savings)
 * - color → código de moneda (CRC, USD, etc.)
 * - saldo → decimal con signo
 */
export type CuentaInput = {
  nombre: string;
  icono?: string | null;
  color?: string | null;
  saldo?: string | number;
  alias?: string | null;
  digits?: string | null;
  hex_color?: string | null;
  fav?: boolean;
  archivada?: boolean;
};

// ── CRUD ──────────────────────────────────────────────────────────

export function listCuentas(
  token: string,
  profileId: string,
  options?: { archivada?: "true" | "false" | "all" },
) {
  const params = new URLSearchParams();
  if (options?.archivada) params.set("archivada", options.archivada);
  const qs = params.toString();
  return apiRequest<{ cuentas: Cuenta[] }>(
    `/api/v1/cuentas${qs ? `?${qs}` : ""}`,
    {
      token,
      profileId,
    },
  );
}

export function createCuenta(
  token: string,
  profileId: string,
  body: CuentaInput,
) {
  return apiRequest<{ cuenta: Cuenta }>("/api/v1/cuentas", {
    method: "POST",
    body,
    token,
    profileId,
  });
}

export function updateCuenta(
  token: string,
  profileId: string,
  id: string,
  body: CuentaInput,
) {
  return apiRequest<{ cuenta: Cuenta }>(`/api/v1/cuentas/${id}`, {
    method: "PATCH",
    body,
    token,
    profileId,
  });
}

export function deleteCuenta(token: string, profileId: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/cuentas/${id}`, {
    method: "DELETE",
    token,
    profileId,
  });
}
