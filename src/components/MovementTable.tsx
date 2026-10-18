import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Movimiento } from "@/lib/api/movimientos";
import { localDate, money, useText } from "@/lib/hooks";
import { EditActions, Empty } from "./ui";

export default function MovementTable({
  movements,
  edit,
  remove,
}: {
  movements: Movimiento[];
  edit?: (m: Movimiento) => void;
  remove?: (m: Movimiento) => void;
}) {
  const tr = useText();
  if (!movements.length)
    return (
      <Empty
        title={tr("Sin movimientos por aquí", "No transactions here yet")}
        body={tr(
          "Registra un ingreso o gasto para empezar a ver tu actividad.",
          "Record income or an expense to see your activity.",
        )}
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{tr("Movimiento", "Transaction")}</th>
            <th>{tr("Categoría", "Category")}</th>
            <th>{tr("Cuenta", "Account")}</th>
            <th>{tr("Fecha", "Date")}</th>
            <th className="align-right">{tr("Monto", "Amount")}</th>
            {edit && (
              <th>
                <span className="sr-only">{tr("Acciones", "Actions")}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id}>
              <td>
                <div className="transaction-name">
                  <span className={`transaction-icon ${m.tipo}`}>
                    {m.tipo === "ingreso" ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {m.descripcion ||
                        m.description ||
                        m.categoria?.nombre ||
                        tr(
                          m.tipo === "ingreso" ? "Ingreso" : "Gasto",
                          m.tipo === "ingreso" ? "Income" : "Expense",
                        )}
                    </strong>
                    <small>
                      {m.tipo === "ingreso"
                        ? tr("Ingreso", "Income")
                        : tr("Gasto", "Expense")}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <span className="pill">
                  {m.categoria?.nombre || tr("Sin categoría", "Uncategorized")}
                </span>
              </td>
              <td>{m.cuenta?.nombre || "—"}</td>
              <td>{localDate(m.fecha || m.created_at || m.created)}</td>
              <td
                className={`amount align-right ${m.tipo === "ingreso" ? "positive" : ""}`}
              >
                {m.tipo === "ingreso" ? "+" : "−"}
                {money(m.monto, m.moneda?.simbolo || "")}
              </td>
              {edit && (
                <td>
                  <EditActions
                    edit={() => edit(m)}
                    remove={remove ? () => remove(m) : undefined}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
