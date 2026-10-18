import { apiRequest } from "@/lib/api/client";
/**
 * Coach IA (Groq). Todos los endpoints requieren JWT y operan sobre el perfil
 * activo (header `X-Profile-Id`). Cada conversación queda aislada por perfil.
 * Ver `docs` del backend: `/api/v1/coach`.
 */

/**
 * Zona horaria IANA del dispositivo (p. ej. "America/Costa_Rica"). El BE la usa
 * para agrupar por día/mes en el calendario del usuario. Si no se puede resolver,
 * cae a UTC (mismo default del backend).
 */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Header que se manda en todas las peticiones del coach. */
const tzHeader = (): Record<string, string> => ({
  "X-Timezone": deviceTimezone(),
});

/** Conversación (hilo) del coach. */
export type CoachConversation = {
  id: string;
  title: string;
  created: string;
  modified: string;
};

export type CoachActionStatus = "pending" | "completed" | "dismissed";

/**
 * Acción sugerida por el coach (tarjeta accionable). El usuario decide; nada se
 * crea solo. Tipos actuales: `create_category` y `registrar_movimiento`.
 *
 * - `create_category`: la IA propone `params.nombre` y `params.icono` (opcional);
 *   el FE completa el color.
 * - `registrar_movimiento`: la IA propone datos semánticos (NO ids):
 *   `params.tipo` ("gasto"|"ingreso"), `params.monto` (>0), `params.categoria`
 *   (nombre) y `params.moneda` (símbolo/nombre). El FE resuelve categoría→id y
 *   moneda→id antes de crear el movimiento.
 */
export type CoachAction = {
  id: string;
  type: string;
  label: string;
  status: CoachActionStatus;
  params: {
    // create_category
    nombre?: string;
    icono?: string;
    // registrar_movimiento
    tipo?: "gasto" | "ingreso";
    monto?: number | string;
    categoria?: string;
    moneda?: string;
    [key: string]: unknown;
  };
  created_resource_id: string | null;
};

/**
 * Mensaje de una conversación. En mensajes del usuario (`role: 'user'`) los
 * campos `model`/`prompt_tokens`/`completion_tokens` llegan `null` y
 * `actions`/`suggestions` son `[]`. `content` viene en Markdown.
 */
export type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  actions: CoachAction[];
  /** Respuestas rápidas (texto literal que el usuario podría enviar). Siempre presente. */
  suggestions?: string[];
};

/** Conversación con todos sus mensajes (detalle). */
export type CoachConversationDetail = CoachConversation & {
  messages: CoachMessage[];
};

/**
 * Respuesta al enviar un mensaje (o crear conversación con primer mensaje):
 * `message` = mensaje del usuario ya persistido · `reply` = respuesta del coach.
 */
export type CoachExchange = {
  conversation: CoachConversation;
  message: CoachMessage;
  reply: CoachMessage;
};

/**
 * GET /api/v1/coach/conversations
 * Lista las conversaciones del perfil (orden: actividad reciente).
 */
export function listConversations(token: string, profileId: string | null) {
  return apiRequest<{ conversations: CoachConversation[] }>(
    "/api/v1/coach/conversations",
    {
      token,
      profileId,
      headers: tzHeader(),
    },
  );
}

/**
 * GET /api/v1/coach/conversations/{id}
 * Detalle de la conversación con todos sus mensajes.
 */
export function getConversation(
  token: string,
  profileId: string | null,
  id: string,
) {
  return apiRequest<{ conversation: CoachConversationDetail }>(
    `/api/v1/coach/conversations/${id}`,
    { token, profileId, headers: tzHeader() },
  );
}

/**
 * POST /api/v1/coach/conversations
 * Crea una conversación. Con `message` devuelve además la respuesta del coach
 * ({ conversation, message, reply }); sin `message` solo { conversation }.
 */
export function createConversation(
  token: string,
  profileId: string | null,
  message?: string,
  model?: string,
) {
  const body: Record<string, string> = {};
  if (message) body.message = message;
  if (model) body.model = model;

  return apiRequest<CoachExchange | { conversation: CoachConversation }>(
    "/api/v1/coach/conversations",
    {
      method: "POST",
      body,
      token,
      profileId,
      headers: tzHeader(),
    },
  );
}

/**
 * POST /api/v1/coach/conversations/{id}/messages
 * Envía un mensaje y devuelve { conversation, message, reply }.
 * Atómico: si la IA falla no se guarda nada, así que reenviar es seguro.
 */
export function sendMessage(
  token: string,
  profileId: string | null,
  conversationId: string,
  message: string,
  model?: string,
) {
  const body: Record<string, string> = { message };
  if (model) body.model = model;

  return apiRequest<CoachExchange>(
    `/api/v1/coach/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body,
      token,
      profileId,
      headers: tzHeader(),
    },
  );
}

/**
 * DELETE /api/v1/coach/conversations/{id}
 * Borra la conversación y sus mensajes (cascada).
 */
export function deleteConversation(
  token: string,
  profileId: string | null,
  id: string,
) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/coach/conversations/${id}`, {
    method: "DELETE",
    token,
    profileId,
    headers: tzHeader(),
  });
}

/**
 * PATCH /api/v1/coach/actions/{id}
 * Confirma (`completed`) o descarta (`dismissed`) una acción sugerida. Al
 * completar conviene enlazar el recurso creado con `created_resource_id`.
 */
export function updateAction(
  token: string,
  profileId: string | null,
  id: string,
  body: {
    status: "completed" | "dismissed";
    created_resource_id?: string | null;
  },
) {
  return apiRequest<{ action: CoachAction }>(`/api/v1/coach/actions/${id}`, {
    method: "PATCH",
    body,
    token,
    profileId,
    headers: tzHeader(),
  });
}

/** Consumo de tokens agregado por día. */
export type CoachUsageDay = {
  date: string;
  messages: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  active_time?: number;
};

export type CoachUsageModel = {
  messages: number;
  total_tokens: number;
};

export type CoachUsage = {
  today: CoachUsageDay;
  daily: CoachUsageDay[];
  models: {
    sabio: CoachUsageModel;
    destello: CoachUsageModel;
  };
  total: {
    messages: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    active_time: number;
    active_days: number;
  };
};

/**
 * GET /api/v1/coach/usage
 * Consumo de tokens del coach del perfil activo (últimos 30 días, por día).
 * Los buckets se agrupan según `X-Timezone` (calendario del dispositivo).
 */
export function getUsage(token: string, profileId: string | null) {
  return apiRequest<{ usage: CoachUsage }>("/api/v1/coach/usage", {
    token,
    profileId,
    headers: tzHeader(),
  });
}
