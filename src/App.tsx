import Select2 from "@/components/Select2";
import { lazy, Suspense, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  Bell,
  ChartNoAxesCombined,
  CircleHelp,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Repeat2,
  Settings,
  Sun,
  Tags,
  Wallet,
  X,
} from "lucide-react";
import { usePrefs, useSession } from "./lib/store";
import { useResolvedTheme, useText } from "./lib/hooks";
import { IconButton, Loading } from "./components/ui";
import Auth from "./pages/Auth";
import { CoachAvatar } from "./components/Brand";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Movements = lazy(() => import("./pages/Movements"));
const Catalogs = lazy(() => import("./pages/Catalogs"));
const Reports = lazy(() => import("./pages/Reports"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Coach = lazy(() => import("./pages/Coach"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));

function Shell() {
  const session = useSession((s) => s.session);
  const switchProfile = useSession((s) => s.switchProfile);
  const setSession = useSession((s) => s.setSession);
  const { update } = usePrefs();
  const resolvedTheme = useResolvedTheme();
  const tr = useText();
  const location = useLocation();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  if (!session)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  const links = [
    ["/", tr("Inicio", "Overview"), Home],
    ["/movimientos", tr("Movimientos", "Transactions"), ArrowDownUp],
    ["/cuentas", tr("Cuentas", "Accounts"), Wallet],
    ["/categorias", tr("Categorías", "Categories"), Tags],
    ["/presupuestos", tr("Presupuestos", "Budgets"), LayoutGrid],
    [
      "/recurrentes",
      tr("Recurrentes y cuotas", "Recurring & installments"),
      Repeat2,
    ],
    ["/reportes", tr("Reportes", "Reports"), ChartNoAxesCombined],
  ] as const;
  const active = session.profiles.find(
    (p) => p.id === session.active_profile_id,
  );
  const logout = () => {
    client.clear();
    setSession(null);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {tr("Saltar al contenido", "Skip to content")}
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label={tr("Cerrar menú", "Close menu")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img
            src="/logo.png"
            className="official-logo"
            width="39"
            height="39"
            alt="Jebryx"
          />
          <span>Jebryx</span>
        </Link>
        <span className="nav-label">{tr("MI ESPACIO", "MY SPACE")}</span>
        <nav aria-label={tr("Navegación principal", "Main navigation")}>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-coach">
          <CoachAvatar size={36} />
          <strong>{tr("Un poco de claridad.", "A little clarity.")}</strong>
          <p>
            {tr(
              "Tu coach te ayuda a dar el siguiente paso.",
              "Your coach helps you take the next step.",
            )}
          </p>
          <NavLink to="/coach" onClick={() => setOpen(false)}>
            {tr("Conversar con Jebryx", "Talk to Jebryx")}{" "}
            <MessageCircle size={16} />
          </NavLink>
        </div>
        <nav className="sidebar-bottom">
          <NavLink to="/coach" onClick={() => setOpen(false)}>
            <MessageCircle size={19} />
            {tr("Coach IA", "AI Coach")}
            <span className="tag">IA</span>
          </NavLink>
          <NavLink to="/ajustes" onClick={() => setOpen(false)}>
            <Settings size={19} />
            {tr("Ajustes", "Settings")}
          </NavLink>
          <button onClick={logout}>
            <LogOut size={19} />
            {tr("Cerrar sesión", "Sign out")}
          </button>
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" /> Jebryx Web <span>v1.0</span>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="topbar-start">
            <IconButton
              label={tr("Abrir menú", "Open menu")}
              className="menu-button"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </IconButton>
            <span className="breadcrumb">
              {tr("Mi espacio", "My space")}
              <span>/</span>
              <strong>
                {([
                  ...links,
                  ["/coach", tr("Coach IA", "AI Coach"), MessageCircle],
                  ["/ajustes", tr("Ajustes", "Settings"), Settings],
                  [
                    "/notificaciones",
                    tr("Notificaciones", "Notifications"),
                    Bell,
                  ],
                  [
                    "/agregar",
                    tr("Agregar movimiento", "Add transaction"),
                    Plus,
                  ],
                  [
                    "/coach-usage",
                    tr("Uso del coach", "Coach usage"),
                    CircleHelp,
                  ],
                ].find(
                  (item) => item[0] === location.pathname,
                )?.[1] as string) || "Jebryx"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <IconButton
              label={tr("Cambiar tema", "Toggle theme")}
              onClick={() =>
                update({ theme: resolvedTheme === "dark" ? "light" : "dark" })
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </IconButton>
            <Link
              to="/notificaciones"
              className="icon-button"
              aria-label={tr("Notificaciones", "Notifications")}
            >
              <Bell size={19} />
            </Link>
            <span className="topbar-divider" />
            <div className="profile-selector">
              <div
                className="avatar"
                style={{ backgroundColor: active?.color || "#d8ebe4" }}
              >
                {active?.avatar ? (
                  <img
                    src={`/avatars/${encodeURIComponent(active.avatar)}`}
                    alt=""
                  />
                ) : (
                  (active?.name || session.user.name).slice(0, 1).toUpperCase()
                )}
              </div>
              <label className="sr-only" htmlFor="active-profile">
                {tr("Perfil activo", "Active profile")}
              </label>
              <Select2
                id="active-profile"
                value={session.active_profile_id}
                onChange={(e) => {
                  client.cancelQueries();
                  switchProfile(e.target.value);
                }}
              >
                {session.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select2>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          <Suspense fallback={<Loading />}>
            <div key={session.active_profile_id}>
              <Outlet />
            </div>
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>
            Jebryx · {tr("Un hábito a la vez.", "One habit at a time.")}
          </span>
          <span>
            {tr(
              "Orientación educativa financiera.",
              "Financial education guidance.",
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}
function NotFound() {
  const tr = useText();
  return (
    <div className="empty">
      <h1>404</h1>
      <p>{tr("No encontramos esta página.", "Page not found.")}</p>
      <Link className="button" to="/">
        {tr("Volver al inicio", "Back to overview")}
      </Link>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      {(
        [
          "login",
          "register",
          "verify",
          "recuperar",
          "reset-codigo",
          "nueva-clave",
          "reset-listo",
        ] as const
      ).map((mode) => (
        <Route
          key={mode}
          path={`/${mode}`}
          element={<Auth key={mode} mode={mode} />}
        />
      ))}
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="movimientos" element={<Movements />} />
        <Route path="agregar" element={<Movements create />} />
        <Route path="cuentas" element={<Catalogs kind="cuentas" />} />
        <Route path="categorias" element={<Catalogs kind="categorias" />} />
        <Route path="presupuestos" element={<Catalogs kind="presupuestos" />} />
        <Route path="recurrentes" element={<Recurring />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="coach" element={<Coach />} />
        <Route path="coach-usage" element={<Coach usage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="notificaciones" element={<Notifications />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
