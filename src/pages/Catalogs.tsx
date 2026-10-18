import { useState } from "react";
import {
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  Star,
  Tags,
  Wallet,
} from "lucide-react";
import {
  listCuentas,
  deleteCuenta,
  updateCuenta,
  type Cuenta,
} from "@/lib/api/cuentas";
import {
  listCategorias,
  deleteCategoria,
  type Categoria,
} from "@/lib/api/categorias";
import {
  listPresupuestos,
  deletePresupuesto,
  type Presupuesto,
} from "@/lib/api/presupuestos";
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
  EditActions,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  PageTitle,
  Progress,
  useToast,
} from "@/components/ui";
import Editor, { type EditorKind } from "@/components/Editors";
import { useConfirm } from "@/components/Confirmation";

export default function Catalogs({
  kind,
}: {
  kind: "cuentas" | "categorias" | "presupuestos";
}) {
  const tr = useText();
  const { token, profileId } = useCredentials();
  const refresh = useRefresh();
  const toast = useToast();
  const confirm = useConfirm();
  const [editor, setEditor] = useState<{
    kind: EditorKind;
    record?: Cuenta | Categoria | Presupuesto;
  } | null>(null);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<unknown>(null);
  const accounts = useProfileQuery(["cuentas", "all"], (t, p) =>
    listCuentas(t, p, { archivada: "all" }),
  );
  const categories = useProfileQuery(["categorias"], listCategorias);
  const budgets = useProfileQuery(["presupuestos"], listPresupuestos);
  const query =
    kind === "cuentas"
      ? accounts
      : kind === "categorias"
        ? categories
        : budgets;
  const title =
    kind === "cuentas"
      ? tr("Tus cuentas", "Your accounts")
      : kind === "categorias"
        ? tr("Categorías", "Categories")
        : tr("Presupuestos", "Budgets");
  const remove = async (id: string) => {
    if (
      !(await confirm({
        title: kind === "cuentas"
          ? tr("Eliminar cuenta", "Delete account")
          : kind === "categorias"
            ? tr("Eliminar categoría", "Delete category")
            : tr("Eliminar presupuesto", "Delete budget"),
        message: tr(
          "¿Eliminar este registro? Esta acción no se puede deshacer.",
          "Delete this record? This cannot be undone.",
        ),
      }))
    )
      return;
    try {
      setError(null);
      await (
        kind === "cuentas"
          ? deleteCuenta
          : kind === "categorias"
            ? deleteCategoria
            : deletePresupuesto
      )(token, profileId, id);
      await refresh();
      toast(tr("Registro eliminado", "Record deleted"));
    } catch (err) {
      setError(err);
    }
  };
  const toggleFav = async (c: Cuenta) => {
    try {
      await updateCuenta(token, profileId, c.id, {
        nombre: c.nombre,
        fav: !c.fav,
      });
      await refresh();
    } catch (err) {
      setError(err);
    }
  };
  const accountList = (accounts.data?.cuentas || [])
    .filter(
      (c) =>
        (filter === "all" ||
          (filter === "archived"
            ? c.archivada
            : filter === "favorites"
              ? c.fav && !c.archivada
              : !c.archivada)) &&
        `${c.nombre} ${c.alias || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => Number(b.fav) - Number(a.fav));
  const categoryList = (categories.data?.categorias || []).filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase()),
  );
  const budgetList = (budgets.data?.presupuestos || []).filter((b) =>
    (b.categoria?.nombre || "").toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={title}
        subtitle={
          kind === "cuentas"
            ? tr(
                "Cada cuenta, en su lugar. Todo tu dinero, a la vista.",
                "Every account in place. All your money in view.",
              )
            : kind === "categorias"
              ? tr(
                  "Organiza tus movimientos a tu manera.",
                  "Organize transactions your way.",
                )
              : tr(
                  "Ponle intención a cada gasto.",
                  "Give every expense a purpose.",
                )
        }
        action={
          <Button onClick={() => setEditor({ kind })}>
            <Plus size={18} />
            {tr("Agregar", "Add")}
          </Button>
        }
      />
      {error != null && <ErrorBox error={error} />}
      <div className="filters">
        <input
          type="search"
          aria-label={tr("Buscar", "Search")}
          placeholder={tr("Buscar por nombre…", "Search by name…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {kind === "cuentas" && (
          <div className="segmented">
            {[
              ["active", tr("Activas", "Active")],
              ["favorites", tr("Favoritas", "Favorites")],
              ["archived", tr("Archivadas", "Archived")],
              ["all", tr("Todas", "All")],
            ].map(([v, label]) => (
              <button
                key={v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {kind === "cuentas" &&
            (accountList.length ? (
              <div className="resource-grid">
                {accountList.map((c) => {
                  const Icon =
                    c.icono === "bank"
                      ? Landmark
                      : c.icono === "credit"
                        ? CreditCard
                        : c.icono === "savings"
                          ? PiggyBank
                          : Wallet;
                  return (
                    <Card key={c.id} className="account-card">
                      <div className="account-heading">
                        <span
                          className="account-icon"
                          style={{ color: c.hex_color || "var(--accent)" }}
                        >
                          <Icon size={24} />
                        </span>
                        <IconButton
                          label={
                            c.fav
                              ? tr("Quitar favorita", "Remove favorite")
                              : tr("Marcar favorita", "Mark favorite")
                          }
                          onClick={() => void toggleFav(c)}
                        >
                          <Star
                            size={18}
                            fill={c.fav ? "#d6a95e" : "none"}
                            color={c.fav ? "#d6a95e" : "currentColor"}
                          />
                        </IconButton>
                      </div>
                      <h3>{c.alias || c.nombre}</h3>
                      <p>
                        {c.alias
                          ? c.nombre
                          : c.icono === "bank"
                            ? tr("Cuenta bancaria", "Bank account")
                            : c.icono === "credit"
                              ? tr("Tarjeta de crédito", "Credit card")
                              : c.icono === "savings"
                                ? tr("Ahorro", "Savings")
                                : tr("Efectivo", "Cash")}
                        {c.digits && ` · •••• ${c.digits}`}
                      </p>
                      <h2 className={Number(c.saldo) < 0 ? "negative" : ""}>
                        {money(c.saldo, c.color || "")}
                      </h2>
                      <div className="card-footer">
                        <span className="pill">
                          {c.archivada
                            ? tr("Archivada", "Archived")
                            : tr("Activa", "Active")}
                        </span>
                        <EditActions
                          edit={() => setEditor({ kind, record: c })}
                          remove={() => void remove(c.id)}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Empty
                action={
                  <Button onClick={() => setEditor({ kind })}>
                    {tr("Crear una cuenta", "Create an account")}
                  </Button>
                }
              />
            ))}
          {kind === "categorias" &&
            (categoryList.length ? (
              <div className="resource-grid">
                {categoryList.map((c) => (
                  <Card key={c.id}>
                    <div className="category-card-heading">
                      <span
                        className="category-icon"
                        style={{
                          backgroundColor: `${c.color || "#0f6e56"}18`,
                          color: c.color || "#0f6e56",
                        }}
                      >
                        <Tags size={22} />
                      </span>
                      <EditActions
                        edit={() => setEditor({ kind, record: c })}
                        remove={() => void remove(c.id)}
                      />
                    </div>
                    <h3>{c.nombre}</h3>
                    <p>
                      {c.cuenta?.nombre ||
                        accounts.data?.cuentas.find((a) => a.id === c.cuenta_id)
                          ?.nombre ||
                        tr("Sin cuenta vinculada", "No linked account")}
                    </p>
                    <span className="pill">{c.icono}</span>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty
                action={
                  <Button onClick={() => setEditor({ kind })}>
                    {tr("Crear una categoría", "Create a category")}
                  </Button>
                }
              />
            ))}
          {kind === "presupuestos" &&
            (budgetList.length ? (
              <div className="resource-grid">
                {budgetList.map((b) => {
                  const pct =
                    b.porcentaje_usado ??
                    (Number(b.gastado || 0) / (Number(b.monto) || 1)) * 100;
                  return (
                    <Card key={b.id}>
                      <div className="section-heading">
                        <h3>{b.categoria?.nombre || "—"}</h3>
                        <EditActions
                          edit={() => setEditor({ kind, record: b })}
                          remove={() => void remove(b.id)}
                        />
                      </div>
                      <p>{tr("Presupuesto mensual", "Monthly budget")}</p>
                      <h2>{money(b.monto, b.moneda?.simbolo || "")}</h2>
                      <Progress value={pct} danger={pct >= 90} />
                      <div className="budget-detail">
                        <span>
                          {money(b.gastado, b.moneda?.simbolo || "")}{" "}
                          {tr("usado", "spent")}
                        </span>
                        <strong className={pct > 100 ? "negative" : ""}>
                          {Math.round(pct)}%
                        </strong>
                      </div>
                      <small>
                        {tr("Disponible", "Available")}:{" "}
                        {money(
                          b.disponible ??
                            Number(b.monto) - Number(b.gastado || 0),
                          b.moneda?.simbolo || "",
                        )}
                      </small>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Empty
                action={
                  <Button onClick={() => setEditor({ kind })}>
                    {tr("Crear un presupuesto", "Create a budget")}
                  </Button>
                }
              />
            ))}
        </>
      )}
      {editor && <Editor {...editor} close={() => setEditor(null)} />}
    </>
  );
}
