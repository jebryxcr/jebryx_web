import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { DayPicker } from "@daypicker/react";
import { es, enUS } from "@daypicker/react/locale";
import { format, isValid, parse } from "date-fns";
import { useText } from "@/lib/hooks";
import "@daypicker/react/style.css";
import "@/datepicker.css";

function readDate(value: string) {
  const date = parse(value, "yyyy-MM-dd", new Date());
  return isValid(date) && format(date, "yyyy-MM-dd") === value
    ? date
    : undefined;
}

export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  const tr = useText();
  const locale = tr("es", "en") === "es" ? es : enUS;
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [month, setMonth] = useState(() => readDate(value) || new Date());
  const selected = readDate(value);
  const earliest = min ? readDate(min) : undefined;
  const latest = max ? readDate(max) : undefined;
  const allowed = (date: Date) =>
    (!earliest || date >= earliest) && (!latest || date <= latest);

  useEffect(() => {
    const date = readDate(value);
    setDraft(date ? format(date, "dd/MM/yyyy") : "");
    input.current?.setCustomValidity("");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const position = () => {
      if (!anchor.current || !popup.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const width = popup.current.offsetWidth;
      const height = popup.current.offsetHeight;
      popup.current.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      const below = window.innerHeight - rect.bottom;
      const top =
        below >= height + 12 || below >= rect.top
          ? rect.bottom + 8
          : rect.top - height - 8;
      popup.current.style.top = `${Math.max(12, Math.min(top, window.innerHeight - height - 12))}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  const close = (restoreFocus = true) => {
    popup.current?.hidePopover();
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const show = () => {
    if (disabled) return;
    setMonth(selected || earliest || latest || new Date());
    popup.current?.showPopover();
  };
  const choose = (date: Date | undefined) => {
    setDraft(date ? format(date, "dd/MM/yyyy") : "");
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    input.current?.setCustomValidity("");
    close();
  };
  return (
    <div className="date-picker" ref={anchor}>
      <div className={`date-picker-control ${open ? "is-open" : ""}`}>
        <input
          ref={input}
          type="text"
          inputMode="numeric"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={id}
          placeholder={tr("dd/mm/aaaa", "dd/mm/yyyy")}
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={draft}
          onClick={show}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              show();
            }
          }}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            const date =
              readDate(text) || parse(text, "dd/MM/yyyy", new Date());
            const valid =
              isValid(date) &&
              allowed(date) &&
              (format(date, "dd/MM/yyyy") === text ||
                format(date, "yyyy-MM-dd") === text);
            event.target.setCustomValidity(
              text && !valid
                ? tr(
                    "Introduce una fecha válida dentro del período permitido (dd/mm/aaaa).",
                    "Enter a valid date within the allowed period (dd/mm/yyyy).",
                  )
                : "",
            );
            if (!text || valid) {
              onChange(text && valid ? format(date, "yyyy-MM-dd") : "");
              if (valid) setMonth(date);
            }
          }}
        />
        <button
          ref={trigger}
          type="button"
          className="date-picker-trigger"
          aria-label={`${tr("Abrir calendario", "Open calendar")}: ${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={id}
          disabled={disabled}
          onClick={() => (open ? close() : show())}
        >
          <CalendarDays size={18} />
        </button>
      </div>
      <div
        ref={popup}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`${tr("Calendario", "Calendar")}: ${label}`}
        className="date-picker-popup"
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        {open && (
          <>
            <div className="date-picker-heading">
              <span className="date-picker-badge">
                <CalendarDays size={19} />
              </span>
              <div>
                <span>{label}</span>
                <strong>
                  {selected
                    ? format(selected, "EEE, d MMM yyyy", { locale })
                    : tr("Elige una fecha", "Choose a date")}
                </strong>
              </div>
              <button
                type="button"
                className="date-picker-close"
                aria-label={tr("Cerrar calendario", "Close calendar")}
                onClick={() => close()}
              >
                <X size={17} />
              </button>
            </div>
            <DayPicker
              mode="single"
              required={required}
              selected={selected}
              onSelect={choose}
              month={month}
              onMonthChange={setMonth}
              locale={locale}
              showOutsideDays
              fixedWeeks
              autoFocus
              disabled={[
                ...(earliest ? [{ before: earliest }] : []),
                ...(latest ? [{ after: latest }] : []),
              ]}
            />
            <div className="date-picker-footer">
              <button
                type="button"
                disabled={required || !draft}
                onClick={() => choose(undefined)}
              >
                {tr("Limpiar", "Clear")}
              </button>
              <button
                type="button"
                disabled={!allowed(new Date(new Date().setHours(0, 0, 0, 0)))}
                onClick={() => choose(new Date())}
              >
                {tr("Ir a hoy", "Today")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
