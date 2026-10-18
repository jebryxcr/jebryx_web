import { apiRequest } from "@/lib/api/client";

/** Usuario que devuelve el backend en login/verify. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  created: string;
};

/**
 * Perfil financiero aislado del usuario (estilo YouTube). Un usuario tiene
 * entre 1 y 3 perfiles; el activo viaja en el header `X-Profile-Id`.
 */
export type Profile = {
  id: string;
  name: string;
  /** Hex `#RGB`…`#RRGGBBAA` o null si no tiene color asignado. */
  color: string | null;
  /** Nombre del archivo de avatar (ej. avatar-01-corto.svg) o null. */
  avatar: string | null;
  is_default: boolean;
};

/**
 * Sesión autenticada: usuario + token JWT + perfiles (login y verify).
 * `active_profile_id` es el perfil por defecto que el backend marca como activo.
 */
export type AuthSession = {
  user: AuthUser;
  token: string;
  profiles: Profile[];
  active_profile_id: string;
};

/** Campos que el cliente envía al registrar (los únicos que el BE acepta). */
export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

/** Respuesta del endpoint de registro (sin token: primero hay que verificar). */
export type RegisterResponse = {
  message: string;
  email: string;
  requires_verification: boolean;
};

/**
 * POST /api/v1/auth/register
 * Crea la cuenta (inactiva y sin verificar) y dispara el envío del código.
 */
export function register(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/auth/verify
 * Valida el código enviado por correo y devuelve la sesión (usuario + token).
 */
export function verify(payload: { email: string; code: string }) {
  return apiRequest<AuthSession>("/api/v1/auth/verify", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/auth/login
 * Autentica y devuelve la sesión. Falla con 403 si el correo no está verificado.
 */
export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/auth/google
 * Envía el ID token de Google para que el backend lo valide y emita la sesión.
 */
export function loginWithGoogle(payload: { idToken: string }) {
  return apiRequest<AuthSession>("/api/v1/auth/google", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/auth/resend
 * Reenvía el código de verificación al correo. Cada reenvío invalida el código
 * anterior. Hay un cooldown de 60s en el backend (responde 429 si no pasó).
 * Por seguridad, un 200 NO confirma que el correo exista; solo que se procesó.
 */
export function resendCode(payload: { email: string }) {
  return apiRequest<{ message?: string }>("/api/v1/auth/resend", {
    method: "POST",
    body: payload,
  });
}

/* ── Recuperación de contraseña ─────────────────────────────────────
 * Flujo: forgot (enviar código) → verify-code (validar) → reset (nueva
 * contraseña). Pendiente de implementación en backend; ver prompt de BE.
 * Por seguridad, forgot devuelve 200 aunque el correo no exista.
 */

/**
 * POST /api/v1/auth/password/forgot
 * Envía un código de restablecimiento al correo. Reutilizable para "reenviar".
 * Cooldown en backend (responde 429 si no pasó el tiempo mínimo).
 */
export function requestPasswordReset(payload: { email: string }) {
  return apiRequest<{ message?: string }>("/api/v1/auth/password/forgot", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/auth/password/verify-code
 * Valida que el código de 6 dígitos sea correcto y vigente, sin consumirlo.
 * Se usa antes de mostrar la pantalla de nueva contraseña.
 */
export function verifyPasswordResetCode(payload: {
  email: string;
  code: string;
}) {
  return apiRequest<{ valid: true }>("/api/v1/auth/password/verify-code", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/auth/password/reset
 * Restablece la contraseña usando el código. NO devuelve sesión: al terminar,
 * el usuario inicia sesión con la nueva contraseña.
 */
export function resetPassword(payload: {
  email: string;
  code: string;
  password: string;
}) {
  return apiRequest<{ message?: string }>("/api/v1/auth/password/reset", {
    method: "POST",
    body: payload,
  });
}
