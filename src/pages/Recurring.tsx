import { useState } from "react";
import { Check, Pause, Play, Plus, Repeat2 } from "lucide-react";
import * as api from "@/lib/api/planes-recurrentes";
import { dueDate, type RecurringPlan } from "@/lib/recurring";
import { currencyCode } from "@/lib/currency";
import {
  localDate,
  money,
  useCatalogs,
  useCredentials,
  useProfileQuery,
  useRefresh,
  useText,
} from "@/lib/hooks";
import {
  Button,
  Card,
  EditActions,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  Modal,
  PageTitle,
  Progress,
  useToast,
} from "@/components/ui";
import { ResourceForm, type FieldSpec } from "@/components/ResourceForm";
import { useConfirm } from "@/components/Confirmation";

export default function Recurring() {
  const tr = useText();
  const { token, profileId } = useCredentials();
  const refresh = useRefresh();
  const toast = useToast();
  const confirm = useConfirm();
  const plans = useProfileQuery(
    ["planes-recurrentes"],
    api.listarPlanesRecurrentes,
  );
  const { accounts, categories, currencies } = useCatalogs();
  const [editor, setEditor] = useState<RecurringPlan | "new" | null>(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const list = (plans.data?.plans || []).filter(
    (p) => filter === "all" || p.kind === filter,
  );
  const fields: FieldSpec[] = [
    {
      name: "name",
      label: tr("Nombre del plan", "Plan name"),
      required: true,
      maxLength: 120,
    },
    {
      name: "kind",
      label: tr("Tipo", "Type"),
      options: [
        { value: "recurring", label: tr("Recurrente", "Recurring") },
        { value: "installments", label: tr("Cuotas", "Installments") },
      ],
    },
    {
      name: "amount",
      label: tr("Monto de cada pago", "Amount per payment"),
      type: "number",
      min: 0.01,
      step: "0.01",
      required: true,
    },
    {
      name: "currencyId",
      label: tr("Moneda", "Currency"),
      options: [
        { value: "", label: tr("Selecciona una moneda", "Select a currency") },
        ...(currencies.data?.monedas.map((c) => ({
          value: c.id,
          label: `${c.simbolo} · ${c.nombre}`,
        })) || []),
      ],
      required: true,
    },
    {
      name: "accountId",
      label: tr("Cuenta", "Account"),
      options: [
        { value: "", label: tr("Selecciona una cuenta", "Select an account") },
        ...(accounts.data?.cuentas
          .filter((c) => !c.archivada)
          .map((c) => ({ value: c.id, label: c.nombre })) || []),
      ],
      required: true,
    },
    {
      name: "categoryId",
      label: tr("Categoría", "Category"),
      options: [
        { value: "", label: tr("Sin categoría", "Uncategorized") },
        ...(categories.data?.categorias.map((c) => ({
          value: c.id,
          label: c.nombre,
        })) || []),
      ],
    },
    {
      name: "frequency",
      label: tr("Frecuencia", "Frequency"),
      options: [
        { value: "monthly", label: tr("Mensual", "Monthly") },
        { value: "biweekly", label: tr("Cada 14 días", "Every 14 days") },
        { value: "weekly", label: tr("Semanal", "Weekly") },
      ],
    },
    {
      name: "startDate",
      label: tr("Primer vencimiento", "First due date"),
      type: "date",
      required: true,
    },
    {
      name: "totalInstallments",
      label: tr(
        "Número de cuotas (solo planes de cuotas)",
        "Number of installments (installment plans only)",
      ),
      type: "number",
      min: 1,
      step: "1",
    },
  ];
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };
  const initial: Record<string, string> = {
    startDate: new Date().toLocaleDateString("en-CA"),
    frequency: "monthly",
  };
  if (editor && editor !== "new")
    for (const [key, value] of Object.entries(editor))
      if (value != null) initial[key] = String(value);
  const save = async (v: Record<string, string>) => {
    if (
      v.kind === "installments" &&
      (!v.totalInstallments || !Number.isInteger(Number(v.totalInstallments)))
    )
      throw new Error(
        tr(
          "Indica un número entero de cuotas.",
          "Enter a whole number of installments.",
        ),
      );
    const currency = currencies.data?.monedas.find(
      (c) => c.id === v.currencyId,
    );
    const account = accounts.data?.cuentas.find((c) => c.id === v.accountId);
    const code = currencyCode(currency);
    if (account?.color && code && account.color !== code)
      throw new Error(
        tr(
          "La moneda debe coincidir con la cuenta.",
          "The currency must match the account.",
        ),
      );
    const body: api.PlanRecurrenteInput = {
      name: v.name,
      kind: v.kind === "installments" ? "installments" : "recurring",
      frequency: v.frequency as RecurringPlan["frequency"],
      startDate: v.startDate,
      amount: v.amount,
      currencyId: v.currencyId,
      accountId: v.accountId,
      categoryId: v.categoryId || null,
      totalInstallments:
        v.kind === "installments" ? Number(v.totalInstallments) : null,
    };
    if (editor && editor !== "new")
      await api.actualizarPlanRecurrente(token, profileId, editor.id, body);
    else await api.crearPlanRecurrente(token, profileId, body);
    await refresh();
    setEditor(null);
    toast(tr("Plan guardado", "Plan saved"));
  };
  const catalogError = accounts.error || categories.error || currencies.error;
  return (
    <>
      <PageTitle
        title={tr("Recurrentes y cuotas", "Recurring & installments")}
        subtitle={tr(
          "Anticípate a los pagos que vienen.",
          "Stay one step ahead of upcoming payments.",
        )}
        action={
          <Button onClick={() => setEditor("new")}>
            <Plus size={18} />
            {tr("Nuevo plan", "New plan")}
          </Button>
        }
      />
      <div className="filters">
        <div className="segmented">
          {[
            ["all", tr("Todos", "All")],
            ["recurring", tr("Recurrentes", "Recurring")],
            ["installments", tr("Cuotas", "Installments")],
          ].map(([v, label]) => (
            <button
              className={filter === v ? "active" : ""}
              key={v}
              onClick={() => setFilter(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error != null && <ErrorBox error={error} />}
      {plans.isPending ? (
        <Loading />
      ) : plans.error ? (
        <ErrorBox error={plans.error} retry={() => void plans.refetch()} />
      ) : list.length ? (
        <div className="resource-grid">
          {list.map((plan) => {
            const currency = currencies.data?.monedas.find(
              (c) => c.id === plan.currencyId,
            );
            const complete =
              plan.kind === "installments" &&
              plan.paidCount >= (plan.totalInstallments || 0);
            return (
              <Card key={plan.id}>
                <div className="section-heading">
                  <span className="category-icon">
                    <Repeat2 size={22} />
                  </span>
                  <EditActions
                    edit={() => setEditor(plan)}
                    remove={async () => {
                      if (
                        await confirm({
                          title: tr("Eliminar plan", "Delete plan"),
                          message: tr(
                            "¿Eliminar el plan? Los pagos registrados se conservan.",
                            "Delete the plan? Recorded payments will be kept.",
                          ),
                        })
                      )
                        void run(plan.id, () =>
                          api.eliminarPlanRecurrente(token, profileId, plan.id),
                        );
                    }}
                  />
                </div>
                <h3>{plan.name}</h3>
                <p>
                  {plan.kind === "installments"
                    ? tr("Plan de cuotas", "Installment plan")
                    : tr("Pago recurrente", "Recurring payment")}{" "}
                  ·{" "}
                  {plan.frequency === "weekly"
                    ? tr("Semanal", "Weekly")
                    : plan.frequency === "biweekly"
                      ? tr("Cada 14 días", "Every 14 days")
                      : tr("Mensual", "Monthly")}
                </p>
                <h2>{money(plan.amount, currency?.simbolo || "")}</h2>
                <p>
                  {tr("Próximo pago", "Next payment")}:{" "}
                  {complete
                    ? tr("Completado", "Completed")
                    : localDate(dueDate(plan))}
                </p>
                {plan.kind === "installments" && (
                  <>
                    <Progress
                      value={
                        (plan.paidCount / (plan.totalInstallments || 1)) * 100
                      }
                    />
                    <small>
                      {plan.paidCount} / {plan.totalInstallments}{" "}
                      {tr("cuotas pagadas", "installments paid")}
                    </small>
                  </>
                )}
                <div className="card-footer">
                  <Button
                    className="secondary small"
                    busy={busy === plan.id}
                    disabled={!plan.active || complete || busy != null}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: tr("Registrar pago", "Record payment"),
                          tone: "primary",
                          confirmLabel: tr("Registrar pago", "Record payment"),
                          message: tr(
                            "¿Registrar este pago y descontarlo de la cuenta?",
                            "Record this payment and deduct it from the account?",
                          ),
                        })
                      )
                        void run(plan.id, () =>
                          api.registrarPagoRecurrente(
                            token,
                            profileId,
                            plan.id,
                          ),
                        );
                    }}
                  >
                    <Check size={15} />
                    {tr("Registrar pago", "Record payment")}
                  </Button>
                  <IconButton
                    disabled={busy != null}
                    label={
                      plan.active
                        ? tr("Pausar plan", "Pause plan")
                        : tr("Reanudar plan", "Resume plan")
                    }
                    onClick={() =>
                      void run(plan.id, () =>
                        api.actualizarPlanRecurrente(
                          token,
                          profileId,
                          plan.id,
                          { active: !plan.active },
                        ),
                      )
                    }
                  >
                    {plan.active ? <Pause size={18} /> : <Play size={18} />}
                  </IconButton>
                </div>
                <span className="pill">
                  {complete
                    ? tr("Completado", "Complete")
                    : plan.active
                      ? tr("Activo", "Active")
                      : tr("Pausado", "Paused")}
                </span>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          action={
            <Button onClick={() => setEditor("new")}>
              {tr("Crear mi primer plan", "Create my first plan")}
            </Button>
          }
        />
      )}
      {editor && (
        <Modal
          title={
            editor === "new"
              ? tr("Nuevo plan", "New plan")
              : tr("Editar plan", "Edit plan")
          }
          close={() => setEditor(null)}
        >
          {accounts.isPending ||
          categories.isPending ||
          currencies.isPending ? (
            <Loading />
          ) : catalogError ? (
            <ErrorBox error={catalogError} />
          ) : (
            <ResourceForm
              fields={fields}
              initial={initial}
              onSave={save}
              close={() => setEditor(null)}
            />
          )}
        </Modal>
      )}
    </>
  );
}
