import Select2 from "@/components/Select2";
import DatePicker from "@/components/DatePicker";
import { useState, type FormEvent } from "react";
import { Button, ErrorBox, Field } from "./ui";
import { useText } from "@/lib/hooks";

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "number" | "color" | "date" | "checkbox" | "textarea";
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
  hint?: string;
  visibleWhen?: (values: Record<string, string>) => boolean;
  disabledWhen?: (values: Record<string, string>) => boolean;
};
export function ResourceForm({
  fields,
  initial = {},
  onSave,
  close,
  label,
  normalize,
  destructive = false,
}: {
  fields: FieldSpec[];
  initial?: Record<string, string>;
  onSave: (values: Record<string, string>) => Promise<void>;
  close: () => void;
  label?: string;
  destructive?: boolean;
  normalize?: (
    values: Record<string, string>,
    changed: string,
  ) => Record<string, string>;
}) {
  const tr = useText();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        initial[f.name] ??
          (f.type === "checkbox" ? "false" : (f.options?.[0]?.value ?? "")),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSave(values);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="resource-form">
      {error != null && <ErrorBox error={error} />}
      {fields.map((f) => {
        if (f.visibleWhen && !f.visibleWhen(values)) return null;
        const value = values[f.name] ?? "";
        const change = (next: string) =>
          setValues((v) => {
            const updated = { ...v, [f.name]: next };
            return normalize ? normalize(updated, f.name) : updated;
          });
        if (f.type === "checkbox")
          return (
            <label className="checkbox-field" key={f.name}>
              <input
                type="checkbox"
                checked={value === "true"}
                onChange={(e) => change(String(e.target.checked))}
              />
              {f.label}
            </label>
          );
        return (
          <Field key={f.name} label={f.label} hint={f.hint}>
            {f.options ? (
              <Select2
                required={f.required}
                disabled={f.disabledWhen?.(values)}
                value={value}
                onChange={(e) => change(e.target.value)}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select2>
            ) : f.type === "date" ? (
              <DatePicker
                label={f.label}
                value={value}
                onChange={change}
                required={f.required}
                disabled={f.disabledWhen?.(values)}
              />
            ) : f.type === "textarea" ? (
              <textarea
                value={value}
                maxLength={f.maxLength}
                onChange={(e) => change(e.target.value)}
                rows={3}
              />
            ) : (
              <input
                type={f.type || "text"}
                value={value}
                onChange={(e) => change(e.target.value)}
                required={f.required}
                min={f.min}
                max={f.max}
                step={f.step}
                maxLength={f.maxLength}
              />
            )}
          </Field>
        );
      })}
      <div className="form-actions">
        <Button
          type="button"
          className="secondary"
          onClick={close}
          disabled={busy}
        >
          {tr("Cancelar", "Cancel")}
        </Button>
        <Button type="submit" busy={busy} className={destructive ? "danger" : ""}>
          {label || tr("Guardar", "Save")}
        </Button>
      </div>
    </form>
  );
}
