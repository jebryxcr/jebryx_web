import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSession } from "@/lib/store";
import { useText } from "@/lib/hooks";
import { Button, Modal } from "./ui";

type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "warning" | "primary";
};
type Confirm = (options: ConfirmationOptions) => Promise<boolean>;
const ConfirmationContext = createContext<Confirm | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const tr = useText();
  const location = useLocation();
  const profileId = useSession((s) => s.session?.active_profile_id);
  const [request, setRequest] = useState<ConfirmationOptions | null>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const descriptionId = useId();
  const settle = useCallback((accepted: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(accepted);
  }, []);
  const confirm = useCallback<Confirm>((options) => {
    // Ignore duplicate requests while the current decision is still pending.
    if (pending.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      pending.current = resolve;
      setRequest(options);
    });
  }, []);
  useEffect(() => {
    // A decision belongs to the page and financial profile that opened it.
    return () => settle(false);
  }, [location.key, profileId, settle]);
  const tone = request?.tone ?? "danger";
  const Icon =
    tone === "danger" ? Trash2 : tone === "warning" ? AlertTriangle : Check;
  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal
          title={request.title}
          close={() => settle(false)}
          className={`confirmation-modal confirmation-${tone}`}
          role="alertdialog"
          descriptionId={descriptionId}
          icon={
            <span className="confirmation-icon">
              <Icon size={24} />
            </span>
          }
        >
          <p className="confirmation-message" id={descriptionId}>
            {request.message}
          </p>
          <div className="confirmation-actions">
            <Button
              type="button"
              className="secondary"
              data-modal-autofocus
              onClick={() => settle(false)}
            >
              {tr("Cancelar", "Cancel")}
            </Button>
            <Button
              type="button"
              className={tone === "danger" ? "danger" : ""}
              onClick={() => settle(true)}
            >
              {request.confirmLabel ?? tr("Eliminar", "Delete")}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error("useConfirm requires ConfirmationProvider");
  return confirm;
}
