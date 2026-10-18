import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./i18n";
import i18n from "./i18n";
import "./styles.css";
import "./motion.css";
import App from "./App";
import { tokenExpired, usePrefs, useSession } from "./lib/store";
import { ApiError } from "./lib/api/client";
import { ToastProvider } from "./components/ui";
import { ConfirmationProvider } from "./components/Confirmation";
import { MotionRoot, animateTheme } from "./components/Motion";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        count < 1 && !(error instanceof ApiError && error.status < 500),
    },
  },
});

function Runtime() {
  const { prefs } = usePrefs();
  const session = useSession((s) => s.session);
  const setSession = useSession((s) => s.setSession);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme;
      if (document.documentElement.dataset.theme === theme) return;
      const commit = () => {
        document.documentElement.dataset.theme = theme;
      };
      if (document.documentElement.dataset.theme) animateTheme(commit);
      else commit();
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [prefs.theme]);
  useEffect(() => {
    void i18n.changeLanguage(prefs.language);
    document.documentElement.lang = prefs.language;
  }, [prefs.language]);
  useEffect(() => {
    const logout = () => {
      queryClient.clear();
      setSession(null);
    };
    const check = () => {
      if (session && tokenExpired(session.token)) logout();
    };
    check();
    window.addEventListener("jebryx:unauthorized", logout);
    window.addEventListener("focus", check);
    const timer = setInterval(check, 30_000);
    return () => {
      window.removeEventListener("jebryx:unauthorized", logout);
      window.removeEventListener("focus", check);
      clearInterval(timer);
    };
  }, [session, setSession]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "jebryx.web.session") {
        queryClient.clear();
        void useSession.persist.rehydrate();
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <MotionRoot>
      <ConfirmationProvider>
        <App />
      </ConfirmationProvider>
    </MotionRoot>
  );
}

const content = (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ToastProvider>
        <Runtime />
      </ToastProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {content}
  </React.StrictMode>,
);
