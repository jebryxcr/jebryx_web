import { useCatalogs, useCredentials, useRefresh, useText } from "@/lib/hooks";
import { createCuenta, updateCuenta, type Cuenta } from "@/lib/api/cuentas";
import {
  createCategoria,
  updateCategoria,
  type Categoria,
} from "@/lib/api/categorias";
import {
  createPresupuesto,
  updatePresupuesto,
  type Presupuesto,
} from "@/lib/api/presupuestos";
import {
  createMovimiento,
  updateMovimiento,
  type Movimiento,
  type MovimientoInput,
} from "@/lib/api/movimientos";
import { listPresupuestos } from "@/lib/api/presupuestos";
import { usePrefs } from "@/lib/store";
import { ACCOUNT_CURRENCIES, currencyCode } from "@/lib/currency";
import { ErrorBox, Loading, Modal, useToast } from "./ui";
import { ResourceForm, type FieldSpec } from "./ResourceForm";
import MovementForm from "./MovementForm";
import { useConfirm } from "./Confirmation";

export type EditorKind =
  "cuentas" | "categorias" | "presupuestos" | "movimientos";
type EditorRecord = Cuenta | Categoria | Presupuesto | Movimiento;
export default function Editor({
  kind,
  record,
  close,
  defaults = {},
  onCreated,
}: {
  kind: EditorKind;
  record?: EditorRecord;
  close: () => void;
  defaults?: Record<string, string>;
  onCreated?: (id: string) => Promise<void>;
}) {
  const tr = useText();
  const { token, profileId } = useCredentials();
  const { accounts, categories, currencies } = useCatalogs();
  const refresh = useRefresh();
  const toast = useToast();
  const confirm = useConfirm();
  const { prefs } = usePrefs();
  const accountOptions = [
    { value: "", label: tr("Selecciona una cuenta", "Select an account") },
    ...(accounts.data?.cuentas
      .filter(
        (c) =>
          !c.archivada ||
          ("cuenta_id" in (record || {}) &&
            (record as Movimiento).cuenta_id === c.id),
      )
      .map((c) => ({ value: c.id, label: `${c.nombre} · ${c.color || ""}` })) ||
      []),
  ];
  const categoryOptions = [
    { value: "", label: tr("Sin categoría", "Uncategorized") },
    ...(categories.data?.categorias.map((c) => ({
      value: c.id,
      label: c.nombre,
    })) || []),
  ];
  const currencyOptions = [
    { value: "", label: tr("Selecciona una moneda", "Select a currency") },
    ...(currencies.data?.monedas.map((c) => ({
      value: c.id,
      label: `${c.simbolo} · ${c.nombre}`,
    })) || []),
  ];
  const iconOptions = [
    ["utensils", tr("Comida", "Food")],
    ["home", tr("Casa", "Home")],
    ["car", tr("Transporte", "Transport")],
    ["heart-pulse", tr("Salud", "Health")],
    ["briefcase-business", tr("Trabajo", "Work")],
    ["plane", tr("Viaje", "Travel")],
    ["shirt", tr("Ropa", "Clothing")],
    ["dumbbell", tr("Gimnasio", "Gym")],
    ["graduation-cap", tr("Estudio", "Education")],
    ["shopping-cart", tr("Compras", "Shopping")],
    ["coffee", tr("Café", "Coffee")],
    ["gamepad-2", tr("Juegos", "Games")],
    ["gift", tr("Regalos", "Gifts")],
    ["banknote", tr("Efectivo", "Cash")],
    ["credit-card", tr("Tarjeta", "Card")],
    ["landmark", tr("Banco", "Bank")],
    ["smartphone", tr("Teléfono", "Phone")],
    ["receipt", tr("Recibos", "Receipts")],
    ["more-horizontal", tr("Otros", "Other")],
  ].map(([value, label]) => ({ value, label }));
  const fields: Record<EditorKind, FieldSpec[]> = {
    cuentas: [
      {
        name: "nombre",
        label: tr("Nombre de la cuenta", "Account name"),
        required: true,
        maxLength: 100,
      },
      {
        name: "icono",
        label: tr("Tipo de cuenta", "Account type"),
        options: [
          { value: "bank", label: tr("Banco", "Bank") },
          { value: "wallet", label: tr("Efectivo", "Cash") },
          { value: "credit", label: tr("Tarjeta de crédito", "Credit card") },
          { value: "savings", label: tr("Ahorro", "Savings") },
        ],
      },
      {
        name: "color",
        label: tr("Moneda de la cuenta", "Account currency"),
        required: true,
        options: [
          ...new Set([
            ...ACCOUNT_CURRENCIES.map((c) => c.code),
            ...(currencies.data?.monedas.map((c) => currencyCode(c)!) || []),
          ]),
        ].map((value) => ({ value, label: value })),
      },
      {
        name: "saldo",
        label: tr("Saldo", "Balance"),
        type: "number",
        step: "0.01",
        required: true,
      },
      {
        name: "alias",
        label: tr("Alias (opcional)", "Alias (optional)"),
        maxLength: 100,
      },
      {
        name: "digits",
        label: tr("Últimos 4 dígitos (opcional)", "Last 4 digits (optional)"),
        maxLength: 4,
      },
      { name: "hex_color", label: tr("Color", "Color"), type: "color" },
      {
        name: "fav",
        label: tr("Marcar como favorita", "Mark as favorite"),
        type: "checkbox",
      },
      {
        name: "archivada",
        label: tr("Cuenta archivada", "Archived account"),
        type: "checkbox",
      },
    ],
    categorias: [
      {
        name: "nombre",
        label: tr("Nombre", "Name"),
        required: true,
        maxLength: 100,
      },
      { name: "icono", label: tr("Icono", "Icon"), options: iconOptions },
      { name: "color", label: tr("Color", "Color"), type: "color" },
      {
        name: "cuenta_id",
        label: tr("Cuenta vinculada", "Linked account"),
        options: accountOptions,
        required: true,
      },
    ],
    presupuestos: [
      {
        name: "categoria_id",
        label: tr("Categoría", "Category"),
        options: [
          {
            value: "",
            label: tr("Selecciona una categoría", "Select a category"),
          },
          ...categoryOptions.slice(1),
        ],
        required: true,
      },
      {
        name: "moneda_id",
        label: tr("Moneda", "Currency"),
        options: currencyOptions,
        required: true,
      },
      {
        name: "monto",
        label: tr("Límite mensual", "Monthly limit"),
        type: "number",
        min: 0.01,
        step: "0.01",
        required: true,
      },
    ],
    movimientos: [
      {
        name: "tipo",
        label: tr("Tipo de movimiento", "Transaction type"),
        options: [
          { value: "gasto", label: tr("Gasto", "Expense") },
          { value: "ingreso", label: tr("Ingreso", "Income") },
        ],
      },
      {
        name: "monto",
        label: tr("Monto", "Amount"),
        type: "number",
        min: 0.01,
        step: "0.01",
        required: true,
      },
      {
        name: "moneda_id",
        label: tr("Moneda", "Currency"),
        options: currencyOptions,
        required: true,
      },
      {
        name: "categoria_id",
        label: tr("Categoría", "Category"),
        options: categoryOptions,
        visibleWhen: (v) => v.tipo === "gasto",
      },
      {
        name: "cuenta_id",
        label: tr("Cuenta", "Account"),
        options: accountOptions,
        required: true,
        disabledWhen: (v) => v.tipo === "gasto" && !!v.categoria_id,
        hint: tr(
          "Los gastos con categoría usan su cuenta vinculada.",
          "Categorized expenses use the category’s linked account.",
        ),
      },
      {
        name: "descripcion",
        label: tr("Descripción (opcional)", "Description (optional)"),
        type: "textarea",
        maxLength: 1000,
      },
    ],
  };
  const names = {
    cuentas: tr("cuenta", "account"),
    categorias: tr("categoría", "category"),
    presupuestos: tr("presupuesto", "budget"),
    movimientos: tr("movimiento", "transaction"),
  };
  if (record && kind === "cuentas")
    fields.cuentas = fields.cuentas.filter((f) => f.name !== "saldo");
  const initial: Record<string, string> = {
    hex_color: "#0f6e56",
    color: kind === "cuentas" ? "CRC" : "#0f6e56",
    saldo: "0",
    ...defaults,
  };
  if (record)
    for (const [key, value] of Object.entries(record)) {
      if (value != null && typeof value !== "object")
        initial[key] = String(value);
    }
  if (kind === "movimientos" && record)
    initial.descripcion =
      (record as Movimiento).descripcion ||
      (record as Movimiento).description ||
      "";
  if (
    initial.icono &&
    !fields[kind]
      .find((f) => f.name === "icono")
      ?.options?.some((o) => o.value === initial.icono)
  )
    fields[kind]
      .find((f) => f.name === "icono")
      ?.options?.push({ value: initial.icono, label: initial.icono });
  const loading =
    accounts.isPending || categories.isPending || currencies.isPending;
  const catalogError = accounts.error || categories.error || currencies.error;
  const normalize = (v: Record<string, string>, changed: string) => {
    if (kind !== "movimientos") return v;
    if (v.tipo === "ingreso") v.categoria_id = "";
    const category = categories.data?.categorias.find(
      (c) => c.id === v.categoria_id,
    );
    if (v.tipo === "gasto" && category) v.cuenta_id = category.cuenta_id || "";
    if (["tipo", "categoria_id", "cuenta_id"].includes(changed)) {
      const account = accounts.data?.cuentas.find((c) => c.id === v.cuenta_id);
      const currency = currencies.data?.monedas.find(
        (c) => currencyCode(c) === account?.color,
      );
      if (currency) v.moneda_id = currency.id;
    }
    return v;
  };
  const save = async (v: Record<string, string>) => {
    let id = record?.id || "";
    if (kind === "cuentas") {
      if (v.digits && !/^\d{1,4}$/.test(v.digits))
        throw new Error(
          tr("Usa hasta 4 dígitos numéricos.", "Use up to 4 numeric digits."),
        );
      const body = {
        nombre: v.nombre,
        icono: v.icono,
        color: v.color,
        ...(record ? {} : { saldo: v.saldo }),
        alias: v.alias || null,
        digits: v.digits || null,
        hex_color: v.hex_color,
        fav: v.fav === "true",
        archivada: v.archivada === "true",
      };
      const result = record
        ? await updateCuenta(token, profileId, record.id, body)
        : await createCuenta(token, profileId, body);
      id = result.cuenta.id;
    }
    if (kind === "categorias") {
      const body = {
        nombre: v.nombre,
        icono: v.icono,
        color: v.color,
        cuenta_id: v.cuenta_id || null,
      };
      const result = record
        ? await updateCategoria(token, profileId, record.id, body)
        : await createCategoria(token, profileId, body);
      id = result.categoria.id;
    }
    if (kind === "presupuestos") {
      const body = {
        categoria_id: v.categoria_id,
        moneda_id: v.moneda_id,
        monto: v.monto,
        icono:
          categories.data?.categorias.find((c) => c.id === v.categoria_id)
            ?.icono || "wallet",
      };
      const result = record
        ? await updatePresupuesto(token, profileId, record.id, body)
        : await createPresupuesto(token, profileId, body);
      id = result.presupuesto.id;
    }
    if (kind === "movimientos") {
      const category = categories.data?.categorias.find(
        (c) => c.id === v.categoria_id,
      );
      const accountId =
        v.tipo === "gasto" && category
          ? category.cuenta_id
          : v.cuenta_id || null;
      if (!accountId)
        throw new Error(
          tr("Selecciona una cuenta válida.", "Select a valid account."),
        );
      const account = accounts.data?.cuentas.find((c) => c.id === accountId);
      const currency = currencies.data?.monedas.find(
        (c) => c.id === v.moneda_id,
      );
      const code = currencyCode(currency);
      if (account?.color && code && account.color !== code)
        throw new Error(
          tr(
            "La moneda del movimiento debe coincidir con la moneda de la cuenta.",
            "The transaction currency must match the account currency.",
          ),
        );
      const body: MovimientoInput = {
        tipo: v.tipo === "ingreso" ? "ingreso" : "gasto",
        monto: v.monto,
        moneda_id: v.moneda_id,
        categoria_id: v.tipo === "ingreso" ? null : v.categoria_id || null,
        cuenta_id: accountId,
        descripcion: v.descripcion || null,
      };
      if (body.tipo === "gasto" && prefs.budgetAlerts) {
        const old = record as Movimiento | undefined;
        const adjusted =
          Number(account?.saldo || 0) +
          (old?.cuenta_id === accountId
            ? Number(old.monto) * (old.tipo === "gasto" ? 1 : -1)
            : 0);
        if (
          account &&
          adjusted < Number(v.monto) &&
          !(await confirm({
            title: tr("La cuenta quedará en negativo", "The account will go negative"),
            tone: "warning",
            confirmLabel: tr("Continuar con el gasto", "Continue with expense"),
            message: tr(
              "Este gasto dejará la cuenta con saldo negativo. ¿Deseas continuar?",
              "This expense will leave a negative account balance. Continue?",
            ),
          }))
        )
          return;
        const { presupuestos } = await listPresupuestos(token, profileId);
        const budget = presupuestos.find(
          (b) =>
            b.categoria_id === v.categoria_id && b.moneda_id === v.moneda_id,
        );
        const spent =
          Number(budget?.gastado || 0) -
          (old?.tipo === "gasto" &&
          old.categoria_id === v.categoria_id &&
          old.moneda_id === v.moneda_id
            ? Number(old.monto)
            : 0);
        if (
          budget &&
          spent + Number(v.monto) > Number(budget.monto) &&
          !(await confirm({
            title: tr("Superarás tu presupuesto", "You'll exceed your budget"),
            tone: "warning",
            confirmLabel: tr("Continuar con el gasto", "Continue with expense"),
            message: tr(
              "Este gasto supera tu presupuesto mensual. ¿Deseas continuar?",
              "This expense exceeds your monthly budget. Continue?",
            ),
          }))
        )
          return;
      }
      const result = record
        ? await updateMovimiento(token, profileId, record.id, body)
        : await createMovimiento(token, profileId, body);
      id = result.movimiento.id;
    }
    await refresh();
    // Close after resource creation even if marking an AI action fails; reopening
    // the review must never duplicate a successfully created financial record.
    close();
    toast(tr("Guardado correctamente", "Saved successfully"));
    if (onCreated) await onCreated(id);
  };
  return (
    <Modal
      title={
        kind === "movimientos"
          ? record
            ? tr("Editar movimiento", "Edit transaction")
            : tr("Nuevo movimiento", "New transaction")
          : `${record ? tr("Editar", "Edit") : tr("Crear", "Create")} ${names[kind]}`
      }
      close={close}
      className={kind === "movimientos" ? "movement-modal" : ""}
    >
      {loading ? (
        <Loading />
      ) : catalogError ? (
        <ErrorBox
          error={catalogError}
          retry={() => {
            void accounts.refetch();
            void categories.refetch();
            void currencies.refetch();
          }}
        />
      ) : kind === "movimientos" ? (
        <MovementForm
          initial={normalize(initial, "initial")}
          normalize={normalize}
          onSave={save}
          close={close}
          accounts={accounts.data?.cuentas || []}
          categories={categories.data?.categorias || []}
          currencies={currencies.data?.monedas || []}
        />
      ) : (
        <ResourceForm
          fields={fields[kind]}
          initial={normalize(initial, "initial")}
          normalize={normalize}
          close={close}
          onSave={save}
        />
      )}
    </Modal>
  );
}
