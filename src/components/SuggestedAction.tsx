import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { CoachAction } from "@/lib/api/coach";
import type { ReportAction } from "@/lib/api/reportes";
import { useCatalogs, useText } from "@/lib/hooks";
import { Button, ErrorBox } from "./ui";
import Editor, { type EditorKind } from "./Editors";

export default function SuggestedAction({
  action,
  update,
}: {
  action: CoachAction | ReportAction;
  update: (
    status: "completed" | "dismissed",
    resourceId?: string,
  ) => Promise<void>;
}) {
  const tr = useText();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [createdId, setCreatedId] = useState<string>();
  const { categories, currencies } = useCatalogs();
  const kind: EditorKind | undefined =
    action.type === "create_category"
      ? "categorias"
      : action.type === "registrar_movimiento"
        ? "movimientos"
        : action.type === "create_budget"
          ? "presupuestos"
          : undefined;
  const params = action.params;
  const defaults: Record<string, string> = {};
  const category = categories.data?.categorias.find(
    (c) =>
      c.nombre.toLowerCase() === String(params.categoria || "").toLowerCase(),
  );
  const currency = currencies.data?.monedas.find((c) =>
    [c.nombre, c.codigo, c.simbolo].some(
      (v) => v.toLowerCase() === String(params.moneda || "").toLowerCase(),
    ),
  );
  if (kind === "categorias") {
    defaults.nombre = String(params.nombre || "");
    defaults.icono = String(params.icono || "other");
  }
  if (kind === "movimientos") {
    defaults.tipo = String(params.tipo || "gasto");
    defaults.monto = String(params.monto || "");
    defaults.categoria_id = category?.id || "";
    defaults.moneda_id = currency?.id || "";
  }
  if (kind === "presupuestos") {
    defaults.categoria_id = String(params.categoria_id || "");
    defaults.monto = String(params.sugerido_monto || "");
  }
  const applyStatus = async (
    status: "completed" | "dismissed",
    id?: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      await update(status, id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="suggested-action">
      <div className="action-title">
        <Sparkles size={17} />
        <strong>{"title" in action ? action.title : action.label}</strong>
      </div>
      {"body" in action && <p>{action.body}</p>}
      {error != null && <ErrorBox error={error} />}
      {action.status === "pending" ? (
        <div className="row-actions">
          {createdId ? (
            <Button
              className="secondary small"
              busy={busy}
              onClick={() => void applyStatus("completed", createdId)}
            >
              {tr("Confirmar registro creado", "Confirm created record")}
            </Button>
          ) : kind ? (
            <Button
              className="secondary small"
              disabled={busy}
              onClick={() => setOpen(true)}
            >
              {tr("Revisar y aplicar", "Review & apply")}
            </Button>
          ) : (
            <span className="muted">
              {tr(
                "Revisa esta sugerencia con tu coach.",
                "Review this suggestion with your coach.",
              )}
            </span>
          )}
          <Button
            className="ghost small"
            disabled={busy}
            onClick={() => void applyStatus("dismissed")}
          >
            {tr("Descartar", "Dismiss")}
          </Button>
        </div>
      ) : (
        <span className="pill">
          <Check size={13} />
          {action.status === "completed"
            ? tr("Aplicada", "Applied")
            : tr("Descartada", "Dismissed")}
        </span>
      )}
      {open && kind && (
        <Editor
          kind={kind}
          defaults={defaults}
          close={() => setOpen(false)}
          onCreated={async (id) => {
            setCreatedId(id);
            await applyStatus("completed", id);
          }}
        />
      )}
    </div>
  );
}
