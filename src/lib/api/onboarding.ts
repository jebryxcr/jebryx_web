import { apiRequest } from "@/lib/api/client";

/* ── Tour guiado de primeros pasos ──────────────────────────────────
 * Progreso de los 3 pasos guiados (cuenta → categoría → ingreso) y
 * si el usuario ya cerró el tour de forma permanente.
 * Pendiente de implementación en backend; ver docs/prompt_onboarding_tour.md.
 */
export type OnboardingStatus = {
  /** true si el perfil ya tiene al menos una cuenta. */
  done_acct: boolean;
  /** true si ya tiene al menos una categoría (requiere done_acct). */
  done_cat: boolean;
  /** true si ya registró al menos un ingreso (requiere done_acct y done_cat). */
  done_ing: boolean;
  /** true cuando el usuario finaliza u omite el recorrido; lo oculta para este perfil. */
  dismissed: boolean;
};

/**
 * GET /api/v1/onboarding/status
 * Devuelve el avance del tour guiado para el perfil activo.
 */
export function getOnboardingStatus(token: string, profileId: string) {
  return apiRequest<OnboardingStatus>("/api/v1/onboarding/status", {
    token,
    profileId,
  });
}

/**
 * PATCH /api/v1/onboarding/dismiss
 * Marca el tour como cerrado permanentemente para este perfil.
 */
export function dismissOnboarding(token: string, profileId: string) {
  return apiRequest<{ dismissed: true }>("/api/v1/onboarding/dismiss", {
    method: "PATCH",
    token,
    profileId,
  });
}
