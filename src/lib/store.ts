import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession } from "./api/auth";

export function tokenExpired(token: string): boolean {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(part));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

type SessionState = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  switchProfile: (id: string) => void;
};
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      switchProfile: (id) =>
        set(({ session }) => ({
          session: session?.profiles.some((p) => p.id === id)
            ? { ...session, active_profile_id: id }
            : session,
        })),
    }),
    { name: "jebryx.web.session", version: 1 },
  ),
);

export type Preferences = {
  theme: "light" | "dark" | "system";
  language: "es" | "en";
  coachModel: "sabio" | "destello";
  budgetAlerts: boolean;
  coachNudges: boolean;
};
const defaults: Preferences = {
  theme: "system",
  language: navigator.language.startsWith("en") ? "en" : "es",
  coachModel: "sabio",
  budgetAlerts: true,
  coachNudges: true,
};
type PrefState = {
  values: Record<string, Preferences>;
  update: (key: string, change: Partial<Preferences>) => void;
};
export const usePreferences = create<PrefState>()(
  persist(
    (set) => ({
      values: {},
      update: (key, change) =>
        set(({ values }) => ({
          values: {
            ...values,
            [key]: { ...defaults, ...values[key], ...change },
          },
        })),
    }),
    { name: "jebryx.web.preferences" },
  ),
);
export function usePrefs() {
  const session = useSession((s) => s.session);
  const key = session
    ? `${session.user.id}.${session.active_profile_id}`
    : "global";
  const values = usePreferences((s) => s.values);
  const update = usePreferences((s) => s.update);
  return {
    prefs: values[key] ?? defaults,
    update: (change: Partial<Preferences>) => update(key, change),
  };
}
