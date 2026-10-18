import { API_BASE_URL } from "@/lib/config";

/**
 * Error tipado para respuestas no exitosas del API.
 * `errors` contiene los errores de validación de CakePHP (getErrors()).
 */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Token JWT para endpoints protegidos (aún no usado en registro). */
  token?: string | null;
  /**
   * Perfil financiero activo. Se envía como header `X-Profile-Id` en las
   * peticiones de datos financieros (cuentas, transacciones, etc.). Los
   * endpoints de auth y de gestión de perfiles NO deben pasarlo.
   */
  profileId?: string | null;
};

/** CakePHP serializes integer account IDs and UUIDs in the same response.
 * HTML select values are strings, so normalize identifiers at the boundary. */
export function normalizeIdentifiers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeIdentifiers);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        typeof item === "number" &&
        (key === "id" || key.endsWith("_id") || key.endsWith("Id"))
          ? String(item)
          : normalizeIdentifiers(item),
      ]),
    );
  return value;
}

/**
 * Cliente base sobre fetch. Negocia JSON con el backend CakePHP mediante el
 * header `Accept: application/json` y desempaqueta la respuesta de apiSuccess.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, token, profileId } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(profileId ? { "X-Profile-Id": profileId } : {}),
        "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con Jebryx. Revisa tu conexión e intenta de nuevo.",
      0,
    );
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const message = response.ok
        ? "El backend respondió con un formato inválido."
        : `El backend no devolvió JSON para ${path} (${response.status}). Revisa que el endpoint exista y responda application/json.`;
      throw new ApiError(message, response.status);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event("jebryx:unauthorized"));
    const message =
      (data && (data.message as string)) ??
      "Ocurrió un error inesperado. Intenta de nuevo.";
    throw new ApiError(message, response.status, data?.errors);
  }

  // apiSuccess suele envolver en { data: ... }; si no, devolvemos el cuerpo tal cual.
  return normalizeIdentifiers(data?.data ?? data) as T;
}
