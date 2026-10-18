import { useState } from "react";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as api from "@/lib/api/reportes";
import {
  money,
  useCredentials,
  useProfileQuery,
  useRefresh,
  useText,
} from "@/lib/hooks";
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageTitle,
  Progress,
} from "@/components/ui";
import SuggestedAction from "@/components/SuggestedAction";

export default function Reports() {
  const tr = useText();
  const { token, profileId } = useCredentials();
  const refresh = useRefresh();
  const [period, setPeriod] = useState<api.ReportPeriod>("month");
  const [generateAI, setGenerateAI] = useState(false);
  const summary = useProfileQuery(["reportes", "resumen", period], (t, p) =>
    api.getReportSummary(t, p, period),
  );
  const series = useProfileQuery(["reportes", "serie", period], (t, p) =>
    api.getReportSeries(t, p, period),
  );
  const categories = useProfileQuery(
    ["reportes", "categorias", period],
    (t, p) => api.getReportCategorias(t, p, period),
  );
  const actions = useProfileQuery(["reportes", "acciones", period], (t, p) =>
    api.listReportActions(t, p, period),
  );
  // AI generation is an explicit operation, so revisiting the page doesn't spend tokens.
  const ai = useProfileQuery(["reportes", "ia", period, generateAI], (t, p) =>
    generateAI ? api.getReportSummaryAI(t, p, period) : Promise.resolve(null),
  );
  const max = Math.max(
    1,
    ...(series.data?.buckets || []).flatMap((b) => [
      Number(b.ingresos),
      Number(b.egresos),
    ]),
  );
  const symbol = summary.data?.moneda?.simbolo || "";
  return (
    <>
      <PageTitle
        title={tr("Reportes", "Reports")}
        subtitle={tr(
          "Tus números, con perspectiva.",
          "Your numbers, in perspective.",
        )}
        action={
          <div className="segmented">
            {(
              [
                ["week", tr("Semana", "Week")],
                ["month", tr("Mes", "Month")],
                ["quarter", tr("Trimestre", "Quarter")],
                ["year", tr("Año", "Year")],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                className={period === v ? "active" : ""}
                onClick={() => {
                  setPeriod(v);
                  setGenerateAI(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {summary.isPending ? (
        <Loading />
      ) : summary.error ? (
        <ErrorBox error={summary.error} retry={() => void summary.refetch()} />
      ) : (
        <div className="report-kpis">
          {[
            [
              tr("Ingresos", "Income"),
              money(summary.data?.ingresos_total, symbol),
              "positive",
            ],
            [
              tr("Egresos", "Expenses"),
              money(summary.data?.egresos_total, symbol),
              "",
            ],
            [
              tr("Balance neto", "Net balance"),
              money(summary.data?.balance_neto, symbol),
              Number(summary.data?.balance_neto) < 0 ? "negative" : "",
            ],
            [
              tr("Tasa de ahorro", "Savings rate"),
              `${summary.data?.tasa_ahorro_pct ?? 0}%`,
              "",
            ],
          ].map(([label, value, cls]) => (
            <Card key={label}>
              <span className="kpi-label">{label}</span>
              <h2 className={cls}>{value}</h2>
            </Card>
          ))}
        </div>
      )}
      <div className="dashboard-middle">
        <Card>
          <div className="section-heading">
            <div>
              <h3>{tr("Ingresos vs. egresos", "Income vs. expenses")}</h3>
              <p>{tr("El ritmo de tu dinero.", "The rhythm of your money.")}</p>
            </div>
            <div className="chart-legend">
              <span>
                <i className="income-dot" />
                {tr("Ingresos", "Income")}
              </span>
              <span>
                <i className="expense-dot" />
                {tr("Egresos", "Expenses")}
              </span>
            </div>
          </div>
          {series.isPending ? (
            <Loading />
          ) : series.error ? (
            <ErrorBox
              error={series.error}
              retry={() => void series.refetch()}
            />
          ) : series.data?.buckets.length ? (
            <div
              className="bar-chart"
              role="img"
              aria-label={tr(
                "Gráfico comparativo de ingresos y egresos",
                "Income and expense comparison chart",
              )}
            >
              {series.data.buckets.map((b, i) => (
                <div className="bar-group" key={`${b.label}-${i}`}>
                  <div className="bar-pair">
                    <div
                      className="bar income-bar"
                      style={{ height: `${(Number(b.ingresos) / max) * 100}%` }}
                      title={`${tr("Ingresos", "Income")}: ${money(b.ingresos, symbol)}`}
                    />
                    <div
                      className="bar expense-bar"
                      style={{ height: `${(Number(b.egresos) / max) * 100}%` }}
                      title={`${tr("Egresos", "Expenses")}: ${money(b.egresos, symbol)}`}
                    />
                  </div>
                  <small>{b.label}</small>
                  <span className="sr-only">
                    {money(b.ingresos, symbol)} / {money(b.egresos, symbol)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Card>
        <Card>
          <div className="section-heading">
            <h3>{tr("Por categoría", "By category")}</h3>
          </div>
          {categories.isPending ? (
            <Loading />
          ) : categories.error ? (
            <ErrorBox
              error={categories.error}
              retry={() => void categories.refetch()}
            />
          ) : categories.data?.categorias.length ? (
            categories.data.categorias.map((c) => (
              <div className="category-bar" key={c.categoria_id || "none"}>
                <div>
                  <span>{c.nombre}</span>
                  <strong>
                    {money(c.monto, categories.data.moneda.simbolo)}
                  </strong>
                </div>
                <Progress value={c.pct} />
              </div>
            ))
          ) : (
            <Empty
              title={tr(
                "Sin gastos en este período",
                "No spending in this period",
              )}
            />
          )}
        </Card>
      </div>
      <Card className="ai-summary">
        <div className="section-heading">
          <div className="row-actions">
            <Sparkles size={22} />
            <h3>{tr("Resumen de Jebryx", "Jebryx summary")}</h3>
          </div>
          <Button
            className="secondary small"
            busy={generateAI && ai.isFetching}
            onClick={() => {
              if (generateAI) void ai.refetch();
              else setGenerateAI(true);
            }}
          >
            {generateAI
              ? tr("Actualizar resumen", "Refresh summary")
              : tr("Generar resumen", "Generate summary")}
          </Button>
        </div>
        {!generateAI ? (
          <p>
            {tr(
              "Pídele a Jebryx una lectura de tus finanzas del período.",
              "Ask Jebryx for insights about your finances this period.",
            )}
          </p>
        ) : ai.isFetching ? (
          <Loading />
        ) : ai.error ? (
          <ErrorBox error={ai.error} retry={() => void ai.refetch()} />
        ) : (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {ai.data?.summary || ""}
            </ReactMarkdown>
          </div>
        )}
      </Card>
      <Card>
        <div className="section-heading">
          <h3>{tr("Acciones sugeridas", "Suggested actions")}</h3>
        </div>
        {actions.isPending ? (
          <Loading />
        ) : actions.error ? (
          <ErrorBox
            error={actions.error}
            retry={() => void actions.refetch()}
          />
        ) : actions.data?.acciones.length ? (
          <div className="action-grid">
            {actions.data.acciones.map((action) => (
              <SuggestedAction
                key={action.id}
                action={action}
                update={async (status, id) => {
                  await api.updateReportAction(token, profileId, action.id, {
                    status,
                    created_resource_id: id,
                  });
                  await refresh();
                }}
              />
            ))}
          </div>
        ) : (
          <p>
            {tr(
              "No hay sugerencias pendientes para este período.",
              "No pending suggestions for this period.",
            )}
          </p>
        )}
      </Card>
    </>
  );
}
