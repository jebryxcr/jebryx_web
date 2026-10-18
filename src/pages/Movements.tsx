import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Download, Plus } from "lucide-react";
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
import MovementTable from "@/components/MovementTable";
import Editor from "@/components/Editors";
import { exportMovements } from "@/lib/export";

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
  const { accounts, categories } = useCatalogs();
  const filtered = !!(search || type || category || account || from || to);
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
          const date = (m.fecha || m.created_at || m.created || "").slice(
            0,
            10,
          );
          return (
            (!type || m.tipo === type) &&
            (!category || m.categoria_id === category) &&
            (!account || m.cuenta_id === account) &&
            (!from || date >= from) &&
            (!to || date <= to) &&
            `${m.descripcion || m.description || ""} ${m.categoria?.nombre || ""} ${m.cuenta?.nombre || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())
          );
        },
      ),
    [filtered, all.data, query.data, type, category, account, from, to, search],
  );
  const active = filtered ? all : query;
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
    <>
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
      <Card className="filter-card">
        <div className="filters">
          <input
            type="search"
            placeholder={tr("Buscar movimientos…", "Search transactions…")}
            aria-label={tr("Buscar movimientos", "Search transactions")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label={tr("Tipo", "Type")}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">{tr("Todos los tipos", "All types")}</option>
            <option value="ingreso">{tr("Ingresos", "Income")}</option>
            <option value="gasto">{tr("Gastos", "Expenses")}</option>
          </select>
          <select
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
          </select>
          <select
            aria-label={tr("Cuenta", "Account")}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="">{tr("Todas las cuentas", "All accounts")}</option>
            {accounts.data?.cuentas.map((c) => (
              <option value={c.id} key={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="date-filters">
          <Field label={tr("Desde", "From")}>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label={tr("Hasta", "To")}>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          {filtered && (
            <Button
              className="ghost"
              onClick={() => {
                setSearch("");
                setType("");
                setCategory("");
                setAccount("");
                setFrom("");
                setTo("");
              }}
            >
              {tr("Limpiar filtros", "Clear filters")}
            </Button>
          )}
        </div>
      </Card>
      <Card className="table-card">
        {active.isPending ? (
          <Loading />
        ) : active.error ? (
          <ErrorBox error={active.error} retry={() => void active.refetch()} />
        ) : (
          <MovementTable
            movements={list}
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
      </Card>
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
    </>
  );
}
