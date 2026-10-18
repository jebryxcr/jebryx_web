import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { errorMessage, useText } from "@/lib/hooks";
import { LoadingDots, useMotionReady } from "./Motion";

export function Button({
  children,
  className = "",
  busy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      className={`button ${className}`}
      disabled={props.disabled || busy}
      aria-busy={busy}
    >
      {busy && <LoadingDots />}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      type="button"
      className={`icon-button ${props.className ?? ""}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = ref.current?.querySelector("input, select, textarea");
    if (input) {
      input.id = id;
      if (hint) input.setAttribute("aria-describedby", `${id}-hint`);
    }
  }, [id, hint, children]);
  return (
    <div className="field" ref={ref}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  const tr = useText();
  return (
    <div className="empty">
      <div className="empty-icon">
        <Wallet size={28} />
      </div>
      <h3>{title || tr("Todo empieza aquí", "It all starts here")}</h3>
      <p>
        {body ||
          tr(
            "Todavía no hay datos para mostrar en este apartado.",
            "There is no data to display here yet.",
          )}
      </p>
      {action}
    </div>
  );
}
export function Loading() {
  const tr = useText();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      {tr("Cargando…", "Loading…")}
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const tr = useText();
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={20} />
      <div>{errorMessage(error)}</div>
      {retry && (
        <Button className="secondary small" onClick={retry}>
          {tr("Reintentar", "Retry")}
        </Button>
      )}
    </div>
  );
}
export function EditActions({
  edit,
  remove,
}: {
  edit: () => void;
  remove?: () => void;
}) {
  const tr = useText();
  return (
    <div className="row-actions">
      <IconButton label={tr("Editar", "Edit")} onClick={edit}>
        <Pencil size={16} />
      </IconButton>
      {remove && (
        <IconButton label={tr("Eliminar", "Delete")} onClick={remove}>
          <Trash2 size={16} />
        </IconButton>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const tr = useText();
  const motionReady = useMotionReady();
  useEffect(() => {
    if (!motionReady) return;
    ref.current?.showModal();
    const el = ref.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = previous;
    };
  }, [motionReady]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <IconButton label={tr("Cerrar", "Close")} onClick={close}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Progress({
  value,
  danger = false,
}: {
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`progress ${danger ? "danger" : ""}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
export function NavRow({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="nav-row" onClick={onClick}>
      {children}
      <ChevronRight size={18} />
    </button>
  );
}
const ToastContext = createContext<(text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {message && (
        <div role="status" className="toast">
          <Check size={18} />
          {message}
          <IconButton label="Cerrar" onClick={() => setMessage("")}>
            <X size={14} />
          </IconButton>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
