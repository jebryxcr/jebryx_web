import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useText } from "@/lib/hooks";
import "@/settings.css";

type Theme = "light" | "dark" | "system";

/** The same two preview cards and separate automatic option as the mobile app. */
export default function AppearancePicker({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (value: Theme) => void;
}) {
  const tr = useText();
  return (
    <div
      className="appearance-picker"
      role="radiogroup"
      aria-label={tr("Apariencia", "Appearance")}
      onKeyDown={(event) => {
        const keys = [
          "ArrowRight",
          "ArrowDown",
          "ArrowLeft",
          "ArrowUp",
          "Home",
          "End",
        ];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const choices = ["light", "dark", "system"] as const;
        const index = choices.indexOf(value);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? 2
              : (index +
                  (event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -1
                    : 1) +
                  3) %
                3;
        onChange(choices[next]);
        event.currentTarget
          .querySelectorAll<HTMLButtonElement>('[role="radio"]')
          [next]?.focus();
      }}
    >
      <div className="appearance-preview-options">
        {(
          [
            {
              value: "light",
              label: tr("Claro", "Light"),
              hint: tr("Brillante y cálido", "Bright and warm"),
              icon: Sun,
            },
            {
              value: "dark",
              label: tr("Oscuro", "Dark"),
              hint: tr("Suave para la noche", "Easy on the eyes"),
              icon: Moon,
            },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-label={option.label}
            aria-checked={value === option.value}
            tabIndex={value === option.value ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`appearance-choice preview-${option.value} ${value === option.value ? "selected" : ""}`}
          >
            <span className="appearance-miniature" aria-hidden="true">
              <span className="appearance-mini-panel">
                <span className="appearance-mini-heading" />
                <span className="appearance-mini-subtitle" />
                <span className="appearance-mini-summary">
                  <i />
                  <i />
                </span>
                <span className="appearance-mini-rule" />
                <span className="appearance-mini-row">
                  <i />
                  <i />
                </span>
              </span>
            </span>
            <span className="appearance-choice-caption">
              <option.icon size={17} />
              <span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
              <span className="appearance-selection-mark" aria-hidden="true">
                {value === option.value && <Check size={12} strokeWidth={3} />}
              </span>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        role="radio"
        aria-label={tr("Sistema", "System")}
        aria-checked={value === "system"}
        tabIndex={value === "system" ? 0 : -1}
        onClick={() => onChange("system")}
        className={`appearance-system ${value === "system" ? "selected" : ""}`}
      >
        <Monitor size={18} />
        <span>
          <strong>{tr("Sistema", "System")}</strong>
          <small>{tr("Usar tema del dispositivo", "Use device setting")}</small>
        </span>
        <span className="appearance-selection-mark" aria-hidden="true">
          {value === "system" && <Check size={12} strokeWidth={3} />}
        </span>
      </button>
    </div>
  );
}
