import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSyncExternalStore } from "react";
import { usePrefs, useSession } from "./store";
import { listCuentas } from "./api/cuentas";
import { listCategorias } from "./api/categorias";
import { listMonedas } from "./api/monedas";
import { ApiError } from "./api/client";

export function useText() {
  const { i18n } = useTranslation();
  return (es: string, en: string) => (i18n.language.startsWith("en") ? en : es);
}
const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
export function useResolvedTheme() {
  const { prefs } = usePrefs();
  const systemDark = useSyncExternalStore(
    (listener) => {
      darkMedia.addEventListener("change", listener);
      return () => darkMedia.removeEventListener("change", listener);
    },
    () => darkMedia.matches,
  );
  return prefs.theme === "system"
    ? systemDark
      ? "dark"
      : "light"
    : prefs.theme;
}
export function useCredentials() {
  const session = useSession((s) => s.session)!;
  return {
    token: session.token,
    profileId: session.active_profile_id,
    session,
  };
}
export function useProfileQuery<T>(
  key: readonly unknown[],
  fn: (token: string, profileId: string) => Promise<T>,
) {
  const { token, profileId } = useCredentials();
  return useQuery({
    queryKey: [profileId, ...key],
    queryFn: () => fn(token, profileId),
    enabled: !!profileId,
  });
}
export function useCatalogs() {
  const { token } = useCredentials();
  const accounts = useProfileQuery(["cuentas", "all"], (t, p) =>
    listCuentas(t, p, { archivada: "all" }),
  );
  const categories = useProfileQuery(["categorias"], listCategorias);
  const currencies = useQuery({
    queryKey: ["monedas", token],
    queryFn: () => listMonedas(token),
  });
  return { accounts, categories, currencies };
}
export function useRefresh() {
  const client = useQueryClient();
  const { profileId } = useCredentials();
  return () =>
    client.invalidateQueries({ predicate: (q) => q.queryKey[0] === profileId });
}
export function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.errors) {
    const flatten = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : value && typeof value === "object"
          ? Object.values(value).flatMap(flatten)
          : [];
    const details = flatten(error.errors).join(" ");
    return [error.message, details].filter(Boolean).join(" ");
  }
  return error instanceof Error
    ? error.message
    : "Ocurrió un error. Intenta de nuevo.";
}
export function money(value: string | number | null | undefined, symbol = "₡") {
  return `${symbol} ${new Intl.NumberFormat(document.documentElement.lang === "en" ? "en-US" : "es-CR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Number(value ?? 0))}`;
}
export function localDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
  );
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(
        document.documentElement.lang === "en" ? "en-US" : "es-CR",
        { day: "numeric", month: "short", year: "numeric" },
      );
}
