import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Star,
  Sun,
  UserRound,
} from "lucide-react";
import * as api from "@/lib/api/profiles";
import type { Profile } from "@/lib/api/auth";
import { listAllMovimientos } from "@/lib/api/movimientos";
import { exportMovements } from "@/lib/export";
import { useCredentials, useText } from "@/lib/hooks";
import { usePrefs, useSession } from "@/lib/store";
import {
  Button,
  Card,
  EditActions,
  ErrorBox,
  Field,
  Loading,
  Modal,
  NavRow,
  PageTitle,
  useToast,
} from "@/components/ui";
import { ResourceForm } from "@/components/ResourceForm";

function ProfileEditor({
  profile,
  close,
  onSave,
}: {
  profile: Profile | "new";
  close: () => void;
  onSave: (list: Profile[]) => void;
}) {
  const tr = useText();
  const { token } = useCredentials();
  return (
    <Modal
      title={
        profile === "new"
          ? tr("Nuevo perfil", "New profile")
          : tr("Editar perfil", "Edit profile")
      }
      close={close}
    >
      <ResourceForm
        fields={[
          {
            name: "name",
            label: tr("Nombre del perfil", "Profile name"),
            required: true,
            maxLength: 50,
          },
          { name: "color", label: tr("Color", "Color"), type: "color" },
          {
            name: "avatar",
            label: tr("Avatar", "Avatar"),
            options: [
              { value: "", label: tr("Inicial del nombre", "Name initial") },
              ...[
                "01-corto",
                "02-melena",
                "03-mono",
                "04-rizos",
                "05-gorro",
                "06-cola",
                "07-barba",
                "08-audio",
                "09-ondas",
                "10-gorra",
              ].map((name, i) => ({
                value: `avatar-${name}.svg`,
                label: `Avatar ${i + 1}`,
              })),
            ],
          },
        ]}
        initial={
          profile === "new"
            ? { color: "#0f6e56" }
            : {
                name: profile.name,
                color: profile.color || "#0f6e56",
                avatar: profile.avatar || "",
              }
        }
        close={close}
        onSave={async (v) => {
          const body = {
            name: v.name,
            color: v.color,
            avatar: v.avatar || null,
          };
          if (profile === "new") await api.createProfile(token, body);
          else await api.updateProfile(token, profile.id, body);
          onSave((await api.listProfiles(token)).profiles);
          close();
        }}
      />
    </Modal>
  );
}
export default function Settings() {
  const tr = useText();
  const navigate = useNavigate();
  const { session, token, profileId } = useCredentials();
  const setSession = useSession((s) => s.setSession);
  const switchProfile = useSession((s) => s.switchProfile);
  const { prefs, update } = usePrefs();
  const client = useQueryClient();
  const toast = useToast();
  const profiles = useQuery({
    queryKey: ["profiles", token],
    queryFn: () => api.listProfiles(token),
  });
  const [editor, setEditor] = useState<Profile | "new" | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const saveProfiles = (list: Profile[]) => {
    const current = useSession.getState().session;
    if (!current) return;
    const active = list.some((p) => p.id === current.active_profile_id)
      ? current.active_profile_id
      : (list.find((p) => p.is_default) || list[0])?.id;
    if (active)
      setSession({ ...current, profiles: list, active_profile_id: active });
    client.setQueryData(["profiles", token], { profiles: list });
  };
  useEffect(() => {
    if (
      profiles.data &&
      JSON.stringify(session.profiles) !==
        JSON.stringify(profiles.data.profiles)
    )
      saveProfiles(profiles.data.profiles);
  }, [profiles.data]);
  const makeDefault = async (profile: Profile) => {
    try {
      await api.setDefaultProfile(token, profile.id);
      saveProfiles((await api.listProfiles(token)).profiles);
    } catch (err) {
      setError(err);
    }
  };
  return (
    <>
      <PageTitle
        title={tr("Ajustes", "Settings")}
        subtitle={tr(
          "Un espacio que se siente tuyo.",
          "A space that feels like yours.",
        )}
      />
      {error != null && <ErrorBox error={error} />}
      <div className="settings-layout">
        <div className="settings-main">
          <Card>
            <div className="section-heading">
              <div>
                <h3>{tr("Perfiles financieros", "Financial profiles")}</h3>
                <p>
                  {tr(
                    "Hasta 3 espacios independientes para tu dinero.",
                    "Up to 3 independent spaces for your money.",
                  )}
                </p>
              </div>
              <Button
                className="secondary small"
                disabled={session.profiles.length >= 3}
                onClick={() => setEditor("new")}
              >
                <Plus size={16} />
                {tr("Crear perfil", "Create profile")}
              </Button>
            </div>
            {profiles.isPending ? (
              <Loading />
            ) : profiles.error ? (
              <ErrorBox
                error={profiles.error}
                retry={() => void profiles.refetch()}
              />
            ) : (
              session.profiles.map((p) => (
                <div
                  className={`profile-row ${p.id === profileId ? "selected" : ""}`}
                  key={p.id}
                >
                  <button
                    className="profile-select-button"
                    onClick={() => switchProfile(p.id)}
                  >
                    <span
                      className="avatar"
                      style={{ backgroundColor: p.color || "#d8ebe4" }}
                    >
                      {p.avatar ? (
                        <img
                          src={`/avatars/${encodeURIComponent(p.avatar)}`}
                          alt=""
                        />
                      ) : (
                        p.name[0]
                      )}
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.id === profileId
                          ? tr("Perfil activo", "Active profile")
                          : tr(
                              "Cambiar a este perfil",
                              "Switch to this profile",
                            )}
                      </small>
                    </span>
                  </button>
                  <div className="row-actions">
                    <button
                      className={`default-profile ${p.is_default ? "is-default" : ""}`}
                      title={tr("Marcar como predeterminado", "Set as default")}
                      aria-label={tr(
                        "Marcar como predeterminado",
                        "Set as default",
                      )}
                      onClick={() => void makeDefault(p)}
                    >
                      <Star
                        size={17}
                        fill={p.is_default ? "currentColor" : "none"}
                      />
                    </button>
                    <EditActions
                      edit={() => setEditor(p)}
                      remove={
                        session.profiles.length > 1
                          ? () => setDeleting(p)
                          : undefined
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </Card>
          <Card>
            <h3>{tr("Apariencia", "Appearance")}</h3>
            <p>
              {tr(
                "Elige cómo quieres ver este perfil.",
                "Choose how you want to see this profile.",
              )}
            </p>
            <div className="theme-options">
              {(
                [
                  ["light", tr("Claro", "Light"), Sun],
                  ["dark", tr("Oscuro", "Dark"), Moon],
                  ["system", tr("Sistema", "System"), Monitor],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  className={prefs.theme === value ? "active" : ""}
                  onClick={() => update({ theme: value })}
                >
                  <Icon size={23} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <Field label={tr("Idioma", "Language")}>
              <select
                value={prefs.language}
                onChange={(e) =>
                  update({ language: e.target.value as "es" | "en" })
                }
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </Field>
          </Card>
          <Card>
            <h3>{tr("Notificaciones y coach", "Notifications & coach")}</h3>
            <label className="toggle-row">
              <span>
                {tr(
                  "Advertencias de saldo y presupuesto",
                  "Balance and budget warnings",
                )}
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={prefs.budgetAlerts}
                onChange={(e) => update({ budgetAlerts: e.target.checked })}
              />
            </label>
            <label className="toggle-row">
              <span>{tr("Sugerencias del coach", "Coach nudges")}</span>
              <input
                type="checkbox"
                role="switch"
                checked={prefs.coachNudges}
                onChange={(e) => update({ coachNudges: e.target.checked })}
              />
            </label>
            <Field label={tr("Modelo del coach", "Coach model")}>
              <select
                value={prefs.coachModel}
                onChange={(e) =>
                  update({ coachModel: e.target.value as "sabio" | "destello" })
                }
              >
                <option value="sabio">
                  {tr("Sabio · análisis profundo", "Sage · deeper analysis")}
                </option>
                <option value="destello">
                  {tr("Destello · respuesta rápida", "Flash · fast responses")}
                </option>
              </select>
            </Field>
            <NavRow onClick={() => navigate("/coach-usage")}>
              {tr("Uso del coach", "Coach usage")}
            </NavRow>
          </Card>
          <Card>
            <h3>{tr("Privacidad y datos", "Privacy & data")}</h3>
            <NavRow
              onClick={async () => {
                setExporting(true);
                try {
                  exportMovements(await listAllMovimientos(token, profileId));
                  toast(tr("Exportación preparada", "Export ready"));
                } catch (err) {
                  setError(err);
                } finally {
                  setExporting(false);
                }
              }}
            >
              <span className="row-actions">
                <Download size={17} />
                {exporting
                  ? tr("Preparando exportación…", "Preparing export…")
                  : tr(
                      "Exportar mis movimientos (CSV)",
                      "Export my transactions (CSV)",
                    )}
              </span>
            </NavRow>
            <div className="future-feature">
              <span>{tr("Importar CSV / Excel", "Import CSV / Excel")}</span>
              <span className="pill">{tr("Próximamente", "Coming soon")}</span>
            </div>
            <div className="future-feature">
              <span>{tr("Respaldo cifrado", "Encrypted backup")}</span>
              <span className="pill">{tr("Próximamente", "Coming soon")}</span>
            </div>
          </Card>
        </div>
        <aside className="settings-aside">
          <Card className="user-card">
            <div className="user-icon">
              <UserRound size={28} />
            </div>
            <h3>{session.user.name}</h3>
            <p>{session.user.email}</p>
            <span className="pill positive">
              {tr("Cuenta sincronizada", "Synced account")}
            </span>
            <Button
              className="secondary full"
              onClick={() => {
                client.clear();
                setSession(null);
              }}
            >
              <LogOut size={17} />
              {tr("Cerrar sesión", "Sign out")}
            </Button>
          </Card>
          <Card>
            <h3>{tr("Tu espacio", "Your space")}</h3>
            {[
              ["/cuentas", tr("Cuentas", "Accounts")],
              ["/categorias", tr("Categorías", "Categories")],
              ["/presupuestos", tr("Presupuestos", "Budgets")],
              [
                "/recurrentes",
                tr("Recurrentes y cuotas", "Recurring & installments"),
              ],
              ["/reportes", tr("Reportes", "Reports")],
              ["/notificaciones", tr("Notificaciones", "Notifications")],
            ].map(([path, title]) => (
              <NavRow key={path} onClick={() => navigate(path)}>
                {title}
              </NavRow>
            ))}
          </Card>
          <p className="legal-note">
            {tr(
              "Jebryx v1.0 · Orientación educativa, no asesoría financiera regulada.",
              "Jebryx v1.0 · Educational guidance, not regulated financial advice.",
            )}
          </p>
        </aside>
      </div>
      {editor && (
        <ProfileEditor
          profile={editor}
          close={() => setEditor(null)}
          onSave={saveProfiles}
        />
      )}
      {deleting && (
        <Modal
          title={tr("Eliminar perfil", "Delete profile")}
          close={() => setDeleting(null)}
        >
          <p>
            {tr(
              `Se eliminarán el perfil «${deleting.name}» y todos sus datos financieros. Escribe el nombre exacto para confirmar.`,
              `The profile “${deleting.name}” and all its financial data will be deleted. Type the exact name to confirm.`,
            )}
          </p>
          <ResourceForm
            fields={[
              {
                name: "confirm_name",
                label: tr("Nombre exacto del perfil", "Exact profile name"),
                required: true,
              },
            ]}
            close={() => setDeleting(null)}
            label={tr("Eliminar definitivamente", "Delete permanently")}
            onSave={async (v) => {
              if (v.confirm_name !== deleting.name)
                throw new Error(
                  tr("El nombre no coincide.", "The name does not match."),
                );
              await api.deleteProfile(token, deleting.id, v.confirm_name);
              saveProfiles((await api.listProfiles(token)).profiles);
              client.removeQueries({
                predicate: (q) => q.queryKey[0] === deleting.id,
              });
              setDeleting(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
