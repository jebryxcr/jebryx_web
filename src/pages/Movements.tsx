import Select2 from "@/components/Select2";
import DatePicker from "@/components/DatePicker";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  deleteMovimiento,
  listAllMovimientos,
  listMovimientos,
  type Movimiento,
} from "@/lib/api/movimientos";
import {
  useCatalogs,
  useCredentials,
  useProfileQuery,
  useRefresh,
  useText,
  money,
} from "@/lib/hooks";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Loading,
  PageTitle,
  useToast,
} from "@/components/ui";
import MovementHistory, {
  movementDay,
  movementTotals,
} from "@/components/MovementHistory";
import Editor from "@/components/Editors";
import { exportMovements } from "@/lib/export";
import "@/movements.css";

export default function Movements({ create = false }: { create?: boolean }) {
  const tr = useText();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { token, profileId } = useCredentials();
  const refresh = useRefresh();
  const toast = useToast();
  const [editor, setEditor] = useState<Movimiento | "new" | null>(
    create ? "new" : null,
  );
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currency, setCurrency] = useState("");
  const { accounts, categories, currencies } = useCatalogs();
  const filtered = !!(
    search ||
    type ||
    category ||
    account ||
    currency ||
    from ||
    to
  );
  const query = useProfileQuery(["movimientos", page], (t, p) =>
    listMovimientos(t, p, page, 25),
  );
  const all = useQuery({
    queryKey: [profileId, "movimientos", "all"],
    queryFn: () => listAllMovimientos(token, profileId),
    enabled: filtered,
  });
  useEffect(() => {
    if (create) setEditor("new");
  }, [create]);
  const list = useMemo(
    () =>
      (filtered ? all.data || [] : query.data?.movimientos || []).filter(
        (m) => {
          const date = movementDay(m);
          return (
            (!type || m.tipo === type) &&
            (!category || m.categoria_id === category) &&
            (!account || m.cuenta_id === account) &&
            (!currency || m.moneda_id === currency) &&
            (!from || date >= from) &&
            (!to || date <= to) &&
            `${m.descripcion || m.description || ""} ${m.categoria?.nombre || ""} ${m.cuenta?.nombre || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())
          );
        },
      ),
    [
      filtered,
      all.data,
      query.data,
      type,
      category,
      account,
      currency,
      from,
      to,
      search,
    ],
  );
  const active = filtered ? all : query;
  const totals = movementTotals(list);
  const clearFilters = () => {
    setSearch("");
    setType("");
    setCategory("");
    setAccount("");
    setCurrency("");
    setFrom("");
    setTo("");
  };
  const close = () => {
    setEditor(null);
    if (create) navigate("/movimientos", { replace: true });
  };
  const remove = async (m: Movimiento) => {
    if (
      !window.confirm(
        tr(
          "¿Eliminar este movimiento? También se actualizará el saldo de la cuenta.",
          "Delete this transaction? The account balance will also be updated.",
        ),
      )
    )
      return;
    try {
      await deleteMovimiento(token, profileId, m.id);
      await refresh();
      toast(tr("Movimiento eliminado", "Transaction deleted"));
    } catch (err) {
      setError(err);
    }
  };
  return (
    <div className="movements-page">
      <PageTitle
        title={tr("Movimientos", "Transactions")}
        subtitle={tr(
          "Lo que entra, lo que sale y todo lo que cuenta.",
          "Money in, money out, and everything that counts.",
        )}
        action={
          <div className="row-actions">
            <Button
              className="secondary"
              busy={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  exportMovements(
                    filtered
                      ? list
                      : await listAllMovimientos(token, profileId),
                  );
                } catch (err) {
                  setError(err);
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download size={17} />
              CSV
            </Button>
            <Link to="/agregar" className="button">
              <Plus size={18} />
              {tr("Agregar", "Add")}
            </Link>
          </div>
        }
      />
      {error != null && <ErrorBox error={error} />}
      <div className="movement-summary-heading">
        <span className="eyebrow">
          {tr("TU ACTIVIDAD FINANCIERA", "YOUR FINANCIAL ACTIVITY")}
        </span>
        <span>
          {filtered
            ? tr("Resumen de los resultados", "Summary of results")
            : tr("Resumen de esta página", "Summary of this page")}
        </span>
      </div>
      <div className="movement-summary">
        {(
          [
            {
              label: tr("Ingresos", "Income"),
              kind: "income",
              icon: ArrowDownLeft,
            },
            {
              label: tr("Gastos", "Expenses"),
              kind: "expense",
              icon: ArrowUpRight,
            },
            {
              label: tr("Balance del período", "Period balance"),
              kind: "balance",
              icon: Wallet,
            },
          ] as const
        ).map((item) => (
          <section className={`movement-stat ${item.kind}`} key={item.kind}>
            <div className="movement-stat-label">
              <span>{item.label}</span>
              <span className="movement-stat-icon">
                <item.icon size={19} />
              </span>
            </div>
            <div className="movement-stat-values">
              {active.isPending || active.error || !totals.length ? (
                <strong>—</strong>
              ) : (
                totals.map((total) => (
                  <strong key={total.id} title={total.name}>
                    {money(
                      item.kind === "income"
                        ? total.income
                        : item.kind === "expense"
                          ? total.expense
                          : total.income - total.expense,
                      total.symbol,
                    )}
                  </strong>
                ))
              )}
            </div>
            <small>
              {item.kind === "income"
                ? tr("Lo que entra", "Money coming in")
                : item.kind === "expense"
                  ? tr("Lo que sale", "Money going out")
                  : tr("Ingresos menos gastos", "Income minus expenses")}
            </small>
          </section>
        ))}
      </div>
      <Card className="movement-filter-card">
        <div className="movement-toolbar">
          <div className="movement-search">
            <Search size={18} />
            <input
              type="search"
              placeholder={tr("Buscar movimientos…", "Search transactions…")}
              aria-label={tr("Buscar movimientos", "Search transactions")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div
            className="movement-type-filters"
            aria-label={tr("Tipo", "Type")}
          >
            {[
              { value: "", label: tr("Todos", "All") },
              { value: "ingreso", label: tr("Ingresos", "Income") },
              { value: "gasto", label: tr("Gastos", "Expenses") },
            ].map((item) => (
              <button
                type="button"
                key={item.value}
                aria-pressed={type === item.value}
                className={type === item.value ? "selected" : ""}
                onClick={() => setType(item.value)}
              >
                {item.value && (
                  <span className={`movement-filter-dot ${item.value}`} />
                )}
                {item.label}
              </button>
            ))}
          </div>
          <Button
            className={`secondary movement-filter-toggle ${showFilters ? "selected" : ""}`}
            aria-expanded={showFilters}
            aria-controls="movement-advanced-filters"
            onClick={() => setShowFilters((value) => !value)}
          >
            <SlidersHorizontal size={16} />
            {tr("Filtros", "Filters")}
            {(category || account || currency || from || to) && (
              <span className="movement-filter-count">
                {
                  [category, account, currency, from || to].filter(Boolean)
                    .length
                }
              </span>
            )}
          </Button>
        </div>
        <div
          id="movement-advanced-filters"
          className="movement-advanced-filters"
          hidden={!showFilters}
        >
          <Field label={tr("Categoría", "Category")}>
            <Select2
              aria-label={tr("Categoría", "Category")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">
                {tr("Todas las categorías", "All categories")}
              </option>
              {categories.data?.categorias.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select2>
          </Field>
          <Field label={tr("Cuenta", "Account")}>
            <Select2
              aria-label={tr("Cuenta", "Account")}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">
                {tr("Todas las cuentas", "All accounts")}
              </option>
              {accounts.data?.cuentas.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select2>
          </Field>
          <Field label={tr("Moneda", "Currency")}>
            <Select2
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="">
                {tr("Todas las monedas", "All currencies")}
              </option>
              {currencies.data?.monedas.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.simbolo} · {item.nombre}
                </option>
              ))}
            </Select2>
          </Field>
          <Field label={tr("Desde", "From")}>
            <DatePicker
              label={tr("Desde", "From")}
              value={from}
              max={to || undefined}
              onChange={setFrom}
            />
          </Field>
          <Field label={tr("Hasta", "To")}>
            <DatePicker
              label={tr("Hasta", "To")}
              value={to}
              min={from || undefined}
              onChange={setTo}
            />
          </Field>
        </div>
        {filtered && (
          <div className="movement-filter-status">
            <span>
              <CalendarDays size={14} />
              {from || to
                ? `${from || "…"} — ${to || "…"}`
                : tr("Filtros activos", "Filters active")}
            </span>
            <button type="button" onClick={clearFilters}>
              <X size={13} />
              {tr("Limpiar filtros", "Clear filters")}
            </button>
          </div>
        )}
      </Card>
      <section className="movement-history-shell">
        <div className="movement-history-heading">
          <div>
            <h2>{tr("Tu historial", "Your history")}</h2>
            <p>
              {tr(
                "Cada movimiento cuenta tu historia.",
                "Every transaction tells your story.",
              )}
            </p>
          </div>
          <span>
            {filtered ? list.length : (query.data?.meta?.total ?? list.length)}{" "}
            {tr("movimientos", "transactions")}
          </span>
        </div>
        {active.isPending ? (
          <Loading />
        ) : active.error ? (
          <ErrorBox error={active.error} retry={() => void active.refetch()} />
        ) : (
          <MovementHistory
            movements={list}
            categories={categories.data?.categorias || []}
            edit={setEditor}
            remove={(m) => void remove(m)}
          />
        )}
        <div className="pagination">
          <span>
            {filtered
              ? `${list.length} ${tr("resultados", "results")}`
              : `${tr("Página", "Page")} ${page} · ${query.data?.meta?.total ?? list.length} ${tr("movimientos", "transactions")}`}
          </span>
          {!filtered && (
            <div className="row-actions">
              <Button
                className="secondary small"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                {tr("Anterior", "Previous")}
              </Button>
              <Button
                className="secondary small"
                disabled={!query.data?.meta?.has_next || query.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                {tr("Siguiente", "Next")}
              </Button>
            </div>
          )}
        </div>
      </section>
      {editor && (
        <Editor
          kind="movimientos"
          record={editor === "new" ? undefined : editor}
          defaults={{
            tipo: params.get("tipo") === "ingreso" ? "ingreso" : "gasto",
          }}
          close={close}
        />
      )}
    </div>
  );
}
