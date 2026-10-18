export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(
  /\/$/,
  "",
);
export const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? "";
export const COACH_MODELS = {
  sabio: import.meta.env.VITE_COACH_SABIO_MODEL || "openai/gpt-oss-120b",
  destello: import.meta.env.VITE_COACH_DESTELLO_MODEL || "openai/gpt-oss-20b",
};
