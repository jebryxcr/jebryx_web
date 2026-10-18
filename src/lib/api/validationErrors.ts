import i18n from "@/i18n";

/**
 * Errores de validación tal como los devuelve CakePHP en `getErrors()`:
 * `{ campo: { regla: mensaje } }`. Ej.:
 * `{ email: { unique: '…' }, password: { minLength: '…', complexity: '…' } }`.
 */
type CakeValidationErrors = Record<string, unknown>;

/**
 * Traduce una regla de validación del backend a su clave i18n en el FE, para
 * que el mensaje respete el idioma activo de la app en vez de mostrar el texto
 * en español que fija el backend.
 *
 * La regla `complexity` de la contraseña devuelve un único mensaje que cambia
 * según qué falta (mayúscula, número o carácter especial); como no podemos
 * distinguirlo por el nombre de la regla, lo deducimos del texto del backend.
 */
function resolveKey(
  field: string,
  rule: string,
  beMessage: string,
): string | null {
  if (rule === "complexity") {
    if (/may[uú]scula|uppercase/i.test(beMessage))
      return "auth.errors.passwordUppercase";
    if (/n[uú]mero|number|d[ií]git/i.test(beMessage))
      return "auth.errors.passwordNumber";
    return "auth.errors.passwordSpecial";
  }

  // El campo vacío o ausente se resume como "obligatorio" para ese campo.
  if (rule === "_empty" || rule === "_required") {
    if (field === "email") return "auth.errors.emailRequired";
    if (field === "password") return "auth.errors.passwordRequired";
    if (field === "name") return "auth.errors.nameRequired";
    return null;
  }

  switch (rule) {
    case "unique":
      return "auth.errors.emailTaken";
    case "email":
      return "auth.errors.emailInvalid";
    case "minLength":
      return "auth.errors.passwordMinLength";
    case "maxLength":
      if (field === "email") return "auth.errors.emailTooLong";
      if (field === "name") return "auth.errors.nameTooLong";
      return null;
    default:
      return null;
  }
}

/**
 * Convierte el objeto de errores de validación del backend en una lista de
 * mensajes orientativos y localizados, lista para mostrarse en un modal. Si no
 * reconoce una regla, cae al texto que envió el backend para no perder el motivo.
 * Devuelve `[]` si no hay errores estructurados que mostrar.
 */
export function humanizeValidationErrors(
  errors: CakeValidationErrors | undefined | null,
): string[] {
  if (!errors || typeof errors !== "object") return [];

  const t = i18n.t.bind(i18n);
  const messages: string[] = [];

  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (!fieldErrors || typeof fieldErrors !== "object") continue;
    for (const [rule, raw] of Object.entries(
      fieldErrors as Record<string, unknown>,
    )) {
      const beMessage = typeof raw === "string" ? raw : "";
      const key = resolveKey(field, rule, beMessage);
      const message = key ? t(key) : beMessage;
      if (message) messages.push(message);
    }
  }

  // Evita repetir un mismo motivo (dos reglas podrían traducir al mismo texto).
  return [...new Set(messages)];
}
