import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Plus,
} from "lucide-react";
import {
  getResumenCategorias,
  getResumenSaldo,
  listMovimientos,
} from "@/lib/api/movimientos";
import { dismissOnboarding, getOnboardingStatus } from "@/lib/api/onboarding";
import {
  useCredentials,
  useProfileQuery,
  useRefresh,
  useText,
  money,
} from "@/lib/hooks";
import { usePrefs } from "@/lib/store";
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageTitle,
  Progress,
} from "@/components/ui";
import MovementTable from "@/components/MovementTable";
import { CoachAvatar } from "@/components/Brand";

export default function Dashboard() {
  const tr = useText();
  const { session, token, profileId } = useCredentials();
  const { prefs } = usePrefs();
  const refresh = useRefresh();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dismissError, setDismissError] = useState<unknown>(null);
  const balance = useProfileQuery(["saldo"], getResumenSaldo);
  const categories = useProfileQuery(["resumen-categorias", month], (t, p) =>
    getResumenCategorias(t, p, month),
  );
  const movements = useProfileQuery(["movimientos", "recent"], (t, p) =>
    listMovimientos(t, p, 1, 5),
  );
  const onboarding = useProfileQuery(["onboarding"], getOnboardingStatus);
  const date = new Date().toLocaleDateString(
    prefs.language === "es" ? "es-CR" : "en-US",
    { weekday: "long", day: "numeric", month: "long" },
  );
  const symbol = balance.data?.moneda?.simbolo || "";
  return (
    <>
      <PageTitle
        title={tr(
          `Buenas, ${session.user.name.split(" ")[0]} 👋`,
          `Hello, ${session.user.name.split(" ")[0]} 👋`,
        )}
        subtitle={tr(
          "Un vistazo a tu dinero. Un paso hacia tus metas.",
          "A look at your money. A step toward your goals.",
        )}
        action={
          <Link to="/agregar" className="button">
            <Plus size={18} />
            {tr("Nuevo movimiento", "New transaction")}
          </Link>
        }
      />
      <div className="date-caption">{date}</div>
      {balance.isPending ? (
        <Loading />
      ) : balance.error ? (
        <ErrorBox error={balance.error} retry={() => void balance.refetch()} />
      ) : (
        <div className="kpi-grid">
          <Card className="balance-card">
            <span className="kpi-label">
              {tr("Saldo total", "Total balance")}
              <span className="mini-icon">↗</span>
            </span>
            <h2>{money(balance.data?.saldo, symbol)}</h2>
            <div className="balance-foot">
              <span className="balance-badge">
                {Number(balance.data?.variacion_pct || 0) >= 0 ? "+" : ""}
                {balance.data?.variacion_pct || 0}%
              </span>
              <small>
                {tr("respecto al mes anterior", "vs. previous month")}
              </small>
            </div>
          </Card>
          <Card className="kpi-card">
            <span className="kpi-label">
              {tr("Ingresos del mes", "Monthly income")}
              <span className="kpi-icon income">
                <ArrowDownLeft size={19} />
              </span>
            </span>
            <h2>{money(balance.data?.ingresos_mes, symbol)}</h2>
            <small>
              {tr(
                "Cada ingreso es una oportunidad.",
                "Every income is an opportunity.",
              )}
            </small>
          </Card>
          <Card className="kpi-card">
            <span className="kpi-label">
              {tr("Gastos del mes", "Monthly expenses")}
              <span className="kpi-icon expense">
                <ArrowUpRight size={19} />
              </span>
            </span>
            <h2>{money(balance.data?.gastos_mes, symbol)}</h2>
            <small>
              {tr(
                "Conoce a dónde va tu dinero.",
                "Know where your money goes.",
              )}
            </small>
          </Card>
        </div>
      )}
      {onboarding.data && !onboarding.data.dismissed && (
        <Card className="onboarding-card">
          <div className="section-heading">
            <div>
              <h3>
                {tr("Dale forma a tu espacio", "Make this space your own")}
              </h3>
              <p>
                {tr(
                  "Tres pequeños pasos para empezar.",
                  "Three small steps to get started.",
                )}
              </p>
            </div>
            <Button
              className="ghost small"
              onClick={async () => {
                try {
                  await dismissOnboarding(token, profileId);
                  await refresh();
                } catch (err) {
                  setDismissError(err);
                }
              }}
            >
              {tr("Omitir por ahora", "Skip for now")}
            </Button>
          </div>
          {dismissError != null && <ErrorBox error={dismissError} />}
          <div className="onboarding-steps">
            {[
              [
                onboarding.data.done_acct,
                "/cuentas",
                tr("Crea tu primera cuenta", "Create your first account"),
              ],
              [
                onboarding.data.done_cat,
                "/categorias",
                tr("Añade una categoría", "Add a category"),
              ],
              [
                onboarding.data.done_ing,
                "/agregar?tipo=ingreso",
                tr("Registra un ingreso", "Record your income"),
              ],
            ].map(([done, to, label], i) => (
              <Link
                key={String(to)}
                to={String(to)}
                className={done ? "done" : ""}
              >
                <span>{done ? <Check size={17} /> : i + 1}</span>
                {String(label)}
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </Card>
      )}
      <div className="dashboard-middle">
        <Card>
          <div className="section-heading">
            <div>
              <h3>{tr("Gasto por categoría", "Spending by category")}</h3>
              <p>{tr("Los detalles cuentan.", "The little things add up.")}</p>
            </div>
            <input
              className="month-input"
              type="month"
              aria-label={tr("Mes del resumen", "Summary month")}
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </div>
          {categories.isPending ? (
            <Loading />
          ) : categories.error ? (
            <ErrorBox
              error={categories.error}
              retry={() => void categories.refetch()}
            />
          ) : !categories.data?.monedas.length ? (
            <Empty
              title={tr("Sin gastos este mes", "No spending this month")}
              body={tr(
                "Aquí verás cómo se distribuyen tus gastos.",
                "Your spending breakdown will appear here.",
              )}
            />
          ) : (
            categories.data.monedas.map((block) => (
              <div className="category-summary" key={block.moneda.id}>
                <div className="section-heading">
                  <strong>{block.moneda.nombre}</strong>
                  <span>{money(block.total, block.moneda.simbolo)}</span>
                </div>
                {block.categorias.map((c, i) => (
                  <div className="category-bar" key={c.categoria_id || "none"}>
                    <div>
                      <span>
                        <i
                          style={{
                            background: [
                              "#0f6e56",
                              "#7c9b6f",
                              "#d5a76d",
                              "#b38bc4",
                              "#7aa7b9",
                            ][i % 5],
                          }}
                        />
                        {c.nombre}
                      </span>
                      <strong>{money(c.total, block.moneda.simbolo)}</strong>
                    </div>
                    <Progress
                      value={
                        (Number(c.total) / (Number(block.total) || 1)) * 100
                      }
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </Card>
        <Card className="coach-nudge">
          <div className="coach-spark">
            <CoachAvatar size={49} />
          </div>
          <span className="eyebrow">
            {tr("TU COACH FINANCIERO", "YOUR FINANCIAL COACH")}
          </span>
          <h2>
            {tr(
              "Tu dinero tiene una historia. Entendámosla.",
              "Your money has a story. Let’s understand it.",
            )}
          </h2>
          <p>
            {tr(
              "Encuentra claridad en tus números y convierte tus preguntas en próximos pasos.",
              "Find clarity in your numbers and turn questions into next steps.",
            )}
          </p>
          <Link to="/coach" className="button secondary">
            {tr("Hablar con el coach", "Talk to your coach")}
            <ArrowUpRight size={17} />
          </Link>
        </Card>
      </div>
      <Card className="table-card">
        <div className="section-heading">
          <div>
            <h3>{tr("Últimos movimientos", "Recent transactions")}</h3>
            <p>{tr("Tu actividad, al día.", "Your latest activity.")}</p>
          </div>
          <Link to="/movimientos" className="text-link">
            {tr("Ver todos", "View all")}
            <ArrowRight size={16} />
          </Link>
        </div>
        {movements.isPending ? (
          <Loading />
        ) : movements.error ? (
          <ErrorBox
            error={movements.error}
            retry={() => void movements.refetch()}
          />
        ) : (
          <MovementTable movements={movements.data?.movimientos || []} />
        )}
      </Card>
    </>
  );
}
