import { apiRequest } from "@/lib/api/client";

/* ── Reportes ────────────────────────────────────────────────────────
 * Pantalla "Reportes": resumen del período, serie ingresos/egresos,
 * desglose por categoría, resumen generado por IA y acciones sugeridas.
 * Pendiente de implementación en backend; ver docs/prompt_reportes.md.
 */
export type ReportPeriod = "week" | "month" | "quarter" | "year";

function periodQuery(period: ReportPeriod) {
  return `?period=${period}`;
}

/** KPIs del período: ingresos, egresos, balance neto y tasa de ahorro. */
export type ReportSummary = {
  moneda: { id: string; nombre: string; simbolo: string };
  ingresos_total: string;
  egresos_total: string;
  balance_neto: string;
  /** 0–100. Puede ser negativo si los egresos superan los ingresos. */
  tasa_ahorro_pct: number;
};

export function getReportSummary(
  token: string,
  profileId: string,
  period: ReportPeriod,
) {
  return apiRequest<ReportSummary>(
    `/api/v1/reportes/resumen${periodQuery(period)}`,
    {
      token,
      profileId,
    },
  );
}

/** Un punto de la serie temporal (una barra agrupada ingreso/egreso). */
export type ReportSeriesBucket = {
  /** Etiqueta corta ya lista para mostrar (ej. "Lun", "Sem 1", "Ene"). */
  label: string;
  ingresos: string;
  egresos: string;
};

export type ReportSeries = {
  moneda: { id: string; nombre: string; simbolo: string };
  buckets: ReportSeriesBucket[];
};

/**
 * GET /api/v1/reportes/serie?period=week|month|quarter|year
 * Granularidad esperada por período: week→día, month→semana,
 * quarter→mes, year→mes.
 */
export function getReportSeries(
  token: string,
  profileId: string,
  period: ReportPeriod,
) {
  return apiRequest<ReportSeries>(
    `/api/v1/reportes/serie${periodQuery(period)}`,
    {
      token,
      profileId,
    },
  );
}

/** Desglose de egresos por categoría dentro del período. */
export type ReportCategoria = {
  categoria_id: string | null;
  nombre: string;
  icono: string | null;
  monto: string;
  /** 0–100, ya calculado por el backend (monto / total del período). */
  pct: number;
};

export type ReportCategorias = {
  moneda: { id: string; nombre: string; simbolo: string };
  total: string;
  categorias: ReportCategoria[];
};

export function getReportCategorias(
  token: string,
  profileId: string,
  period: ReportPeriod,
) {
  return apiRequest<ReportCategorias>(
    `/api/v1/reportes/categorias${periodQuery(period)}`,
    {
      token,
      profileId,
    },
  );
}

/** Resumen en prosa generado por IA a partir de los datos del período. */
export type ReportSummaryAI = {
  summary: string;
  generated_at: string;
};

export function getReportSummaryAI(
  token: string,
  profileId: string,
  period: ReportPeriod,
) {
  return apiRequest<ReportSummaryAI>(
    `/api/v1/reportes/resumen-ia${periodQuery(period)}`,
    {
      token,
      profileId,
    },
  );
}

export type ReportActionStatus = "pending" | "completed" | "dismissed";

/**
 * Sugerencia accionable (mismo ciclo de vida que `CoachAction`: el usuario
 * decide, nada se aplica solo). `type` identifica qué hacer al aplicarla
 * (ver docs/prompt_reportes.md); si el frontend no reconoce el `type`,
 * simplemente la marca como completada sin navegar a ningún lado.
 */
export type ReportAction = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: ReportActionStatus;
  params: Record<string, unknown>;
};

export function listReportActions(
  token: string,
  profileId: string,
  period: ReportPeriod,
) {
  return apiRequest<{ acciones: ReportAction[] }>(
    `/api/v1/reportes/acciones${periodQuery(period)}`,
    {
      token,
      profileId,
    },
  );
}

export function updateReportAction(
  token: string,
  profileId: string,
  id: string,
  body: {
    status: "completed" | "dismissed";
    created_resource_id?: string | null;
  },
) {
  return apiRequest<{ accion: ReportAction }>(
    `/api/v1/reportes/acciones/${id}`,
    {
      method: "PATCH",
      body,
      token,
      profileId,
    },
  );
}
