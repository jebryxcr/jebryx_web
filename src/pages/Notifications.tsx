import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import {
  deleteNotificacion,
  listNotificaciones,
  updateNotificacion,
} from "@/lib/api/notificaciones";
import {
  localDate,
  useCredentials,
  useProfileQuery,
  useRefresh,
  useText,
} from "@/lib/hooks";
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  PageTitle,
} from "@/components/ui";

export default function Notifications() {
  const tr = useText();
  const { token, profileId } = useCredentials();
  const notifications = useProfileQuery(["notificaciones"], listNotificaciones);
  const refresh = useRefresh();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = notifications.data?.notificaciones || [];
  const unread = list.filter((n) => !n.leida);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title={tr("Notificaciones", "Notifications")}
        subtitle={tr(
          "Mantente al día con tu espacio financiero.",
          "Keep up with your financial space.",
        )}
        action={
          <Button
            className="secondary"
            busy={busy}
            disabled={!unread.length}
            onClick={() =>
              void run(() =>
                Promise.all(
                  unread.map((n) =>
                    updateNotificacion(token, profileId, n.id, { leida: true }),
                  ),
                ),
              )
            }
          >
            <CheckCheck size={18} />
            {tr("Marcar todo como leído", "Mark all as read")}
          </Button>
        }
      />
      <div className="filters">
        <div className="segmented">
          <button
            className={!unreadOnly ? "active" : ""}
            onClick={() => setUnreadOnly(false)}
          >
            {tr("Todas", "All")}
          </button>
          <button
            className={unreadOnly ? "active" : ""}
            onClick={() => setUnreadOnly(true)}
          >
            {tr("No leídas", "Unread")}{" "}
            <span className="tag">{unread.length}</span>
          </button>
        </div>
      </div>
      {error != null && <ErrorBox error={error} />}
      {notifications.isPending ? (
        <Loading />
      ) : notifications.error ? (
        <ErrorBox
          error={notifications.error}
          retry={() => void notifications.refetch()}
        />
      ) : (unreadOnly ? unread : list).length ? (
        <div className="notification-list">
          {(unreadOnly ? unread : list).map((n) => (
            <Card
              key={n.id}
              className={`notification ${!n.leida ? "unread" : ""}`}
            >
              <span className="category-icon">
                <Bell size={21} />
              </span>
              <div className="notification-content">
                <div>
                  <h3>{n.titulo}</h3>
                  {!n.leida && <span className="unread-dot" />}
                </div>
                <p>{n.descripcion}</p>
                <small>
                  {localDate(n.fecha)} ·{" "}
                  {n.leida ? tr("Leída", "Read") : tr("No leída", "Unread")}
                </small>
              </div>
              <div className="row-actions">
                {!n.leida && (
                  <IconButton
                    disabled={busy}
                    label={tr("Marcar como leída", "Mark as read")}
                    onClick={() =>
                      void run(() =>
                        updateNotificacion(token, profileId, n.id, {
                          leida: true,
                        }),
                      )
                    }
                  >
                    <Check size={18} />
                  </IconButton>
                )}
                <IconButton
                  disabled={busy}
                  label={tr("Eliminar notificación", "Delete notification")}
                  onClick={() => {
                    if (
                      window.confirm(
                        tr(
                          "¿Eliminar esta notificación?",
                          "Delete this notification?",
                        ),
                      )
                    )
                      void run(() =>
                        deleteNotificacion(token, profileId, n.id),
                      );
                  }}
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title={tr("Todo al día", "You’re all caught up")}
          body={tr(
            "Las nuevas notificaciones aparecerán aquí.",
            "New notifications will appear here.",
          )}
        />
      )}
    </>
  );
}
