import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import * as api from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/config";
import { usePrefs, useSession } from "@/lib/store";
import { Button, ErrorBox, Field, IconButton, useToast } from "@/components/ui";
import { useText } from "@/lib/hooks";
import { Logo } from "@/components/Brand";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export type AuthMode =
  | "login"
  | "register"
  | "verify"
  | "recuperar"
  | "reset-codigo"
  | "nueva-clave"
  | "reset-listo";
export default function Auth({ mode }: { mode: AuthMode }) {
  const tr = useText();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState(params.get("code") || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const session = useSession((s) => s.session);
  const setSession = useSession((s) => s.setSession);
  const { prefs, update } = usePrefs();
  const toast = useToast();
  if (session) return <Navigate to="/" replace />;
  const titles: Record<AuthMode, [string, string]> = {
    login: ["Qué bueno verte de nuevo.", "Good to see you again."],
    register: ["Tu tranquilidad empieza aquí.", "Peace of mind starts here."],
    verify: ["Revisa tu correo.", "Check your inbox."],
    recuperar: ["Recupera tu acceso.", "Recover your access."],
    "reset-codigo": ["Ingresa tu código.", "Enter your code."],
    "nueva-clave": ["Una nueva contraseña.", "A new password."],
    "reset-listo": ["Todo listo.", "You’re all set."],
  };
  const acceptSession = (value: api.AuthSession) => {
    window.dispatchEvent(new Event("jebryx:login"));
    setSession(value);
    navigate("/", { replace: true });
  };
  const go = (route: string, withCode = false) =>
    navigate(
      `/${route}?${new URLSearchParams({ email, ...(withCode ? { code } : {}) })}`,
      { replace: true },
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") acceptSession(await api.login({ email, password }));
      if (mode === "register") {
        await api.register({ name, email, password });
        go("verify");
      }
      if (mode === "verify") acceptSession(await api.verify({ email, code }));
      if (mode === "recuperar") {
        await api.requestPasswordReset({ email });
        go("reset-codigo");
      }
      if (mode === "reset-codigo") {
        await api.verifyPasswordResetCode({ email, code });
        go("nueva-clave", true);
      }
      if (mode === "nueva-clave") {
        if (password !== confirmation)
          throw new Error(
            tr("Las contraseñas no coinciden.", "Passwords do not match."),
          );
        await api.resetPassword({ email, code, password });
        navigate("/reset-listo", { replace: true });
      }
    } catch (err) {
      if (
        mode === "login" &&
        err instanceof ApiError &&
        err.status === 403 &&
        err.errors?.email_verified === false
      ) {
        go("verify");
        return;
      }
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      if (mode === "verify") await api.resendCode({ email });
      else await api.requestPasswordReset({ email });
      setCooldown(Date.now() + 60_000);
      toast(
        tr(
          "Código reenviado. Puedes solicitar otro en un minuto.",
          "Code resent. You can request another in one minute.",
        ),
      );
    } catch (err) {
      setError(err);
    } finally {
      setResending(false);
    }
  };
  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Link className="auth-form-logo" to="/login">
          <Logo size={260} />
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow">
            <span className="status-dot" />
            {tr("TU ESPACIO FINANCIERO", "YOUR FINANCIAL SPACE")}
          </span>
          <h1>
            {tr(
              "Haz espacio para lo que importa.",
              "Make room for what matters.",
            )}
          </h1>
          <p>
            {tr(
              "Entiende tu dinero, construye mejores hábitos y da el siguiente paso con confianza.",
              "Understand your money, build better habits, and take your next step with confidence.",
            )}
          </p>
        </div>
        <small>
          © {new Date().getFullYear()} Jebryx ·{" "}
          {tr("Un hábito a la vez.", "One habit at a time.")}
        </small>
      </aside>
      <div className="auth-tools">
        <button
          type="button"
          aria-label={tr("Cambiar a inglés", "Switch to Spanish")}
          onClick={() =>
            update({ language: prefs.language === "es" ? "en" : "es" })
          }
        >
          {prefs.language === "es" ? "EN" : "ES"}
        </button>
      </div>
      <main className="auth-main">
        <div className="auth-form-wrap">
          {mode !== "login" && mode !== "register" && (
            <Link className="text-link back-link" to="/login">
              <ArrowLeft size={15} />
              {tr("Volver al inicio de sesión", "Back to sign in")}
            </Link>
          )}
          <div className="auth-kicker">
            <Sparkles size={17} />
            {tr(
              "TU BILLETERA, SIEMPRE CONTIGO",
              "YOUR WALLET, ALWAYS WITH YOU",
            )}
          </div>
          <h2>{tr(...titles[mode])}</h2>
          <p className="auth-description">
            {mode === "login"
              ? tr(
                  "Entra y retoma el control de tus finanzas.",
                  "Sign in and take control of your finances.",
                )
              : mode === "register"
                ? tr(
                    "Crea tu cuenta y empieza a conocer tu dinero.",
                    "Create your account and get to know your money.",
                  )
                : mode === "reset-listo"
                  ? tr(
                      "Tu contraseña se actualizó. Ya puedes iniciar sesión.",
                      "Your password has been updated. You can now sign in.",
                    )
                  : tr(
                      "Te acompañamos para que vuelvas a tu espacio de forma segura.",
                      "We’ll help you return to your space securely.",
                    )}
          </p>
          {error != null && <ErrorBox error={error} />}
          {mode === "reset-listo" ? (
            <>
              <div className="success-mark">
                <Check />
              </div>
              <Link className="button" to="/login">
                {tr("Iniciar sesión", "Sign in")}
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              {mode === "register" && (
                <Field label={tr("Tu nombre", "Your name")}>
                  <input
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tr("¿Cómo te llamas?", "What’s your name?")}
                  />
                </Field>
              )}
              {mode !== "nueva-clave" && (
                <Field label={tr("Correo electrónico", "Email address")}>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                  />
                </Field>
              )}
              {(mode === "verify" || mode === "reset-codigo") && (
                <Field label={tr("Código de 6 dígitos", "6 digit code")}>
                  <input
                    className="code-input"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                  />
                </Field>
              )}
              {(mode === "login" ||
                mode === "register" ||
                mode === "nueva-clave") && (
                <Field label={tr("Contraseña", "Password")}>
                  <div className="password-input">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      minLength={mode === "login" ? 1 : 8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tr("Tu contraseña", "Your password")}
                    />
                    <IconButton
                      label={tr("Mostrar contraseña", "Show password")}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </div>
                </Field>
              )}
              {mode === "nueva-clave" && (
                <Field label={tr("Confirmar contraseña", "Confirm password")}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </Field>
              )}
              {mode === "login" && (
                <div className="forgot-row">
                  <Link className="text-link" to="/recuperar">
                    {tr("¿Olvidaste tu contraseña?", "Forgot your password?")}
                  </Link>
                </div>
              )}
              <Button type="submit" className="full" busy={busy}>
                {mode === "login"
                  ? tr("Entrar a mi espacio", "Sign in")
                  : mode === "register"
                    ? tr("Crear mi cuenta", "Create account")
                    : mode === "nueva-clave"
                      ? tr("Guardar contraseña", "Save password")
                      : tr("Continuar", "Continue")}
                <ArrowUpRight size={18} />
              </Button>
            </form>
          )}
          {(mode === "verify" || mode === "reset-codigo") && (
            <Button
              className="ghost full"
              busy={resending}
              onClick={() => {
                if (Date.now() < cooldown)
                  toast(
                    tr(
                      "Espera un minuto antes de reenviar.",
                      "Wait one minute before resending.",
                    ),
                  );
                else void resend();
              }}
            >
              {tr("Reenviar código", "Resend code")}
            </Button>
          )}
          {(mode === "login" || mode === "register") && (
            <>
              {GOOGLE_WEB_CLIENT_ID && (
                <>
                  <div className="divider">
                    <span>{tr("o continúa con", "or continue with")}</span>
                  </div>
                  <GoogleSignInButton
                    busy={busy}
                    onSuccess={async (result) => {
                      if (!result.credential || busy) return;
                      setBusy(true);
                      setError(null);
                      try {
                        acceptSession(
                          await api.loginWithGoogle({
                            idToken: result.credential,
                          }),
                        );
                      } catch (err) {
                        setError(err);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onError={() =>
                      setError(
                        new Error(
                          tr(
                            "No se pudo iniciar sesión con Google.",
                            "Google sign in failed.",
                          ),
                        ),
                      )
                    }
                  />
                </>
              )}
              <p className="auth-switch">
                {mode === "login"
                  ? tr("¿Aún no tienes cuenta?", "Don’t have an account?")
                  : tr("¿Ya tienes cuenta?", "Already have an account?")}{" "}
                <Link
                  className="text-link"
                  to={mode === "login" ? "/register" : "/login"}
                >
                  {mode === "login"
                    ? tr("Regístrate", "Sign up")
                    : tr("Inicia sesión", "Sign in")}
                </Link>
              </p>
            </>
          )}
          <p className="auth-secure">
            <ShieldCheck size={15} />
            {tr(
              "Tus finanzas, en tu propio espacio.",
              "Your finances, in your own space.",
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
