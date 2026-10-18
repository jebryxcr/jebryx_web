import Select2 from "@/components/Select2";
import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Delete,
  LockKeyhole,
  Wallet,
} from "lucide-react";
import type { Cuenta } from "@/lib/api/cuentas";
import type { Categoria } from "@/lib/api/categorias";
import type { Moneda } from "@/lib/api/monedas";
import { currencyCode } from "@/lib/currency";
import { money, useText } from "@/lib/hooks";
import { Button, ErrorBox, Field } from "./ui";
import { FinancialIcon } from "./FinancialIcon";
import "@/movements.css";

type Values = Record<string, string>;
export default function MovementForm({
  initial,
  normalize,
  onSave,
  close,
  accounts,
  categories,
  currencies,
}: {
  initial: Values;
  normalize: (values: Values, changed: string) => Values;
  onSave: (values: Values) => Promise<void>;
  close: () => void;
  accounts: Cuenta[];
  categories: Categoria[];
  currencies: Moneda[];
}) {
  const tr = useText();
  const [values, setValues] = useState<Values>(() =>
    normalize(
      {
        tipo: "gasto",
        monto: "",
        moneda_id: "",
        categoria_id: "",
        cuenta_id: "",
        descripcion: "",
        ...initial,
      },
      "cuenta_id",
    ),
  );
  const [target, setTarget] = useState(
    initial.cuenta_id && !initial.categoria_id ? "account" : "category",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const change = (name: string, value: string) =>
    setValues((previous) => normalize({ ...previous, [name]: value }, name));
  const income = values.tipo === "ingreso";
  const category = categories.find((item) => item.id === values.categoria_id);
  const account = accounts.find((item) => item.id === values.cuenta_id);
  const currency = currencies.find((item) => item.id === values.moneda_id);
  const accountCurrency = currencies.find(
    (item) => currencyCode(item) === account?.color,
  );
  const linked = !income && !!category;
  const availableAccounts = accounts.filter(
    (item) => !item.archivada || item.id === values.cuenta_id,
  );
  const key = (value: string) => {
    if (value === "backspace") change("monto", values.monto.slice(0, -1));
    else if (value === ".") {
      if (!values.monto.includes("."))
        change("monto", `${values.monto || "0"}.`);
    } else if (
      /^\d{0,12}(\.\d{0,2})?$/.test(
        (values.monto === "0" ? "" : values.monto) + value,
      )
    )
      change("monto", (values.monto === "0" ? "" : values.monto) + value);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
    <form
      className={`movement-form ${income ? "is-income" : "is-expense"}`}
      onSubmit={submit}
    >
      <fieldset disabled={busy}>
        <div
          className="movement-type-toggle"
          aria-label={tr("Tipo de movimiento", "Transaction type")}
        >
          <button
            type="button"
            aria-pressed={!income}
            className={!income ? "selected" : ""}
            onClick={() => change("tipo", "gasto")}
          >
            <ArrowUpRight size={18} />
            {tr("Gasto", "Expense")}
          </button>
          <button
            type="button"
            aria-pressed={income}
            className={income ? "selected" : ""}
            onClick={() => change("tipo", "ingreso")}
          >
            <ArrowDownLeft size={18} />
            {tr("Ingreso", "Income")}
          </button>
        </div>
        {error != null && <ErrorBox error={error} />}
        <div className="movement-form-grid">
          <div className="movement-amount-panel">
            <label htmlFor="movement-amount">
              {tr(
                income ? "¿Cuánto recibiste?" : "¿Cuánto gastaste?",
                income
                  ? "How much did you receive?"
                  : "How much did you spend?",
              )}
            </label>
            <div className="movement-amount-input">
              <span>{currency?.simbolo || "¤"}</span>
              <input
                id="movement-amount"
                aria-label={tr("Monto", "Amount")}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
                value={values.monto}
                onChange={(event) => change("monto", event.target.value)}
              />
            </div>
            <div className="movement-currency-select">
              <Select2
                aria-label={tr("Moneda", "Currency")}
                required
                value={values.moneda_id}
                disabled={!!accountCurrency}
                onChange={(event) => change("moneda_id", event.target.value)}
              >
                <option value="">
                  {tr("Selecciona una moneda", "Select a currency")}
                </option>
                {currencies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.simbolo} · {item.nombre}
                  </option>
                ))}
              </Select2>
              <ChevronDown size={14} />
            </div>
            <small>
              {accountCurrency
                ? tr(
                    "Moneda de la cuenta seleccionada",
                    "Currency of the selected account",
                  )
                : tr(
                    "Elige la moneda del movimiento",
                    "Choose your transaction currency",
                  )}
            </small>
          </div>
          <div className="movement-details-panel">
            <div className="movement-section-label">
              <span>01</span>
              {tr("Destino del movimiento", "Transaction destination")}
            </div>
            {!income && (
              <div className="movement-target-toggle">
                <button
                  type="button"
                  aria-pressed={target === "category"}
                  className={target === "category" ? "selected" : ""}
                  onClick={() => setTarget("category")}
                >
                  {tr("Por categoría", "By category")}
                </button>
                <button
                  type="button"
                  aria-pressed={target === "account"}
                  className={target === "account" ? "selected" : ""}
                  onClick={() => {
                    setTarget("account");
                    change("categoria_id", "");
                  }}
                >
                  {tr("Directo a cuenta", "Direct to account")}
                </button>
              </div>
            )}
            {!income && target === "category" && (
              <>
                <Field label={tr("Categoría", "Category")}>
                  <div className="movement-choice-field">
                    <span className="movement-choice-icon">
                      <FinancialIcon name={category?.icono || "receipt"} />
                    </span>
                    <Select2
                      value={values.categoria_id}
                      onChange={(event) =>
                        change("categoria_id", event.target.value)
                      }
                    >
                      <option value="">
                        {tr("Selecciona una categoría", "Select a category")}
                      </option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </Select2>
                    <ChevronDown size={16} />
                  </div>
                </Field>
                {categories.length > 0 && (
                  <div className="movement-category-picks">
                    {categories.slice(0, 6).map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        aria-pressed={item.id === values.categoria_id}
                        className={
                          item.id === values.categoria_id ? "selected" : ""
                        }
                        onClick={() => change("categoria_id", item.id)}
                      >
                        <FinancialIcon name={item.icono} size={17} />
                        <span>{item.nombre}</span>
                        {item.id === values.categoria_id && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <Field label={tr("Cuenta", "Account")}>
              <div
                className={`movement-choice-field ${linked ? "linked" : ""}`}
              >
                <span className="movement-choice-icon">
                  <FinancialIcon name={account?.icono || "wallet"} />
                </span>
                <Select2
                  required
                  disabled={linked}
                  value={values.cuenta_id}
                  onChange={(event) => change("cuenta_id", event.target.value)}
                >
                  <option value="">
                    {tr("Selecciona una cuenta", "Select an account")}
                  </option>
                  {availableAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} · {item.color}
                    </option>
                  ))}
                </Select2>
                {linked ? <LockKeyhole size={15} /> : <ChevronDown size={16} />}
              </div>
            </Field>
            {account && (
              <div className="movement-account-balance">
                <Wallet size={14} />
                <span>
                  {linked
                    ? tr(
                        "Cuenta vinculada a la categoría",
                        "Category's linked account",
                      )
                    : tr("Saldo disponible", "Available balance")}
                </span>
                <strong>
                  {money(
                    account.saldo,
                    accountCurrency?.simbolo || account.color || "",
                  )}
                </strong>
              </div>
            )}
            <div className="movement-section-label">
              <span>02</span>
              {tr("Dale un poco de contexto", "Add a little context")}
            </div>
            <Field
              label={tr("Descripción (opcional)", "Description (optional)")}
            >
              <textarea
                rows={2}
                maxLength={1000}
                value={values.descripcion}
                onChange={(event) => change("descripcion", event.target.value)}
                placeholder={tr(
                  "Ej. Almuerzo, gasolina, pago del internet…",
                  "E.g. Lunch, gas, internet bill…",
                )}
              />
            </Field>
            <div className="movement-receipt-preview">
              <span className="movement-preview-dot" />
              <div>
                <small>
                  {tr(
                    income
                      ? "Se sumará a tu cuenta"
                      : "Se descontará de tu cuenta",
                    income
                      ? "Added to your account"
                      : "Deducted from your account",
                  )}
                </small>
                <strong>
                  {account?.nombre ||
                    tr("Selecciona el destino", "Select a destination")}
                </strong>
              </div>
              <span>
                {income ? "+" : "−"}
                {money(values.monto, currency?.simbolo || "")}
              </span>
            </div>
          </div>
          <div
            className="movement-keypad"
            aria-label={tr("Teclado numérico", "Numeric keypad")}
          >
            {[
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              ".",
              "0",
              "backspace",
            ].map((value) => (
              <button
                type="button"
                key={value}
                aria-label={
                  value === "backspace"
                    ? tr("Borrar último dígito", "Delete last digit")
                    : value === "."
                      ? tr("Separador decimal", "Decimal separator")
                      : value
                }
                onClick={() => key(value)}
              >
                {value === "backspace" ? (
                  <Delete size={21} />
                ) : value === "." ? (
                  ","
                ) : (
                  value
                )}
              </button>
            ))}
          </div>
        </div>
      </fieldset>
      <div className="movement-form-actions">
        <Button
          type="button"
          className="secondary"
          onClick={close}
          disabled={busy}
        >
          {tr("Cancelar", "Cancel")}
        </Button>
        <Button type="submit" busy={busy}>
          <Check size={18} />
          {tr("Guardar", "Save")}
        </Button>
      </div>
    </form>
  );
}
