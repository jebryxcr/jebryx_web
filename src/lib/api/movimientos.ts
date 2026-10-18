import { apiRequest } from "@/lib/api/client";

export type MovimientoTipo = "gasto" | "ingreso";

export type MovimientoInput = {
  tipo: MovimientoTipo;
  moneda_id: string;
  categoria_id: string | null;
  cuenta_id?: string | null;
  monto: string;
  descripcion?: string | null;
  description?: string | null;
};

export type Movimiento = {
  id: string;
  profile_id: string;
  tipo: MovimientoTipo;
  moneda_id: string;
  categoria_id: string | null;
  cuenta_id: string | null;
  monto: string;
  descripcion?: string | null;
  description?: string | null;
  created?: string | null;
  created_at?: string | null;
  fecha?: string | null;
  modified?: string | null;
  moneda: {
    id: string;
    nombre: string;
    simbolo: string;
  } | null;
  categoria: {
    id: string;
    nombre: string;
    icono: string;
  } | null;
  cuenta: {
    id: string;
    nombre: string;
    saldo?: string | null;
    color?: string | null;
  } | null;
};

export type MetaPaginacion = {
  current_page: number;
  limit: number;
  total: number;
  has_next: boolean;
};

export function getMovimientoDescripcion(movimiento: Movimiento) {
  const value = movimiento.descripcion ?? movimiento.description;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function listMovimientos(
  token: string,
  profileId: string,
  page: number = 1,
  limit: number = 50,
) {
  return apiRequest<{ movimientos: Movimiento[]; meta?: MetaPaginacion }>(
    `/api/v1/movimientos?page=${page}&limit=${limit}`,
    {
      token,
      profileId,
    },
  );
}

/* ── Resumen: gasto por categoría ───────────────────────────────────
 * Agregación por mes y moneda para el gráfico "Gasto por categoría" del home.
 * Pendiente de implementación en backend; ver prompt de BE.
 */
export type ResumenCategoria = {
  categoria_id: string | null;
  nombre: string;
  icono: string | null;
  /** Total gastado en esta categoría (decimal como string). */
  total: string;
};

export type ResumenMoneda = {
  moneda: { id: string; nombre: string; simbolo: string };
  /** Total gastado en esta moneda en el mes. */
  total: string;
  /** Categorías ordenadas de mayor a menor gasto. */
  categorias: ResumenCategoria[];
};

export type ResumenCategoriasResponse = {
  /** Mes consultado en formato `YYYY-MM`. */
  month: string;
  /** Un bloque por cada moneda con gastos en el mes. */
  monedas: ResumenMoneda[];
};

/**
 * GET /api/v1/movimientos/resumen-categorias?month=YYYY-MM
 * Devuelve el gasto (tipo=gasto) agrupado por categoría y por moneda para el mes.
 * Si se omite `month`, usa el mes actual del servidor.
 */
export function getResumenCategorias(
  token: string,
  profileId: string,
  month?: string,
) {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return apiRequest<ResumenCategoriasResponse>(
    `/api/v1/movimientos/resumen-categorias${query}`,
    {
      token,
      profileId,
    },
  );
}

/* ── Resumen: saldo total + onboarding ──────────────────────────────
 * Para la tarjeta "Saldo total" del home (estado vacío vs normal).
 * Pendiente de implementación en backend; ver prompt de BE.
 */
export type SaldoResumen = {
  /** Moneda principal del perfil en la que se expresan los montos. */
  moneda: { id: string; nombre: string; simbolo: string };
  /** Saldo total histórico (ingresos − gastos) como decimal string. */
  saldo: string;
  /** Ingresos del mes actual. */
  ingresos_mes: string;
  /** Gastos del mes actual. */
  gastos_mes: string;
  /** Variación del saldo respecto al mes anterior (con signo). */
  variacion_pct: number;
  /** false → usuario nuevo: mostrar el estado vacío/onboarding. */
  tiene_movimientos: boolean;
  /** Progreso de configuración de la cuenta (0–100). */
  onboarding: { completado_pct: number };
};

/**
 * GET /api/v1/movimientos/resumen-saldo
 * Devuelve el saldo total, ingresos/gastos del mes, variación y estado de
 * onboarding, en la moneda principal del perfil.
 */
export function getResumenSaldo(token: string, profileId: string) {
  return apiRequest<SaldoResumen>("/api/v1/movimientos/resumen-saldo", {
    token,
    profileId,
  });
}
export async function listAllMovimientos(token: string, profileId: string) {
  const movements: Movimiento[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await listMovimientos(token, profileId, page, 100);
    movements.push(...response.movimientos);
    hasNext = response.meta?.has_next ?? false;
    page += 1;
  }

  return movements;
}

export function createMovimiento(
  token: string,
  profileId: string,
  body: MovimientoInput,
) {
  return apiRequest<{ movimiento: Movimiento }>("/api/v1/movimientos", {
    method: "POST",
    body,
    token,
    profileId,
  });
}

export function updateMovimiento(
  token: string,
  profileId: string,
  id: string,
  body: MovimientoInput,
) {
  return apiRequest<{ movimiento: Movimiento }>(`/api/v1/movimientos/${id}`, {
    method: "PATCH",
    body,
    token,
    profileId,
  });
}

export function deleteMovimiento(token: string, profileId: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/movimientos/${id}`, {
    method: "DELETE",
    token,
    profileId,
  });
}
