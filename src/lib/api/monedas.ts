import { apiRequest } from "@/lib/api/client";

export type Moneda = {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
};

type RawMoneda = {
  id?: string | number;
  codigo?: string;
  code?: string;
  iso?: string;
  nombre?: string;
  name?: string;
  simbolo?: string;
  symbol?: string;
};

type MonedasPayload =
  | RawMoneda[]
  | {
      monedas?: RawMoneda[];
      currencies?: RawMoneda[];
    };

function normalizeMoneda(raw: RawMoneda): Moneda | null {
  const codigo =
    raw.codigo ??
    raw.code ??
    raw.iso ??
    raw.simbolo ??
    raw.symbol ??
    raw.nombre ??
    raw.name;
  const id = raw.id != null ? String(raw.id) : codigo;

  if (!id || !codigo) {
    return null;
  }

  return {
    id: String(id),
    codigo,
    nombre: raw.nombre ?? raw.name ?? codigo,
    simbolo: raw.simbolo ?? raw.symbol ?? codigo,
  };
}

/**
 * GET /api/v1/monedas
 * Lista las monedas disponibles para registrar movimientos.
 */
export async function listMonedas(token: string) {
  const data = await apiRequest<MonedasPayload>("/api/v1/monedas", { token });
  const raw = Array.isArray(data)
    ? data
    : (data.monedas ?? data.currencies ?? []);
  return {
    monedas: raw
      .map(normalizeMoneda)
      .filter((item): item is Moneda => item != null),
  };
}
