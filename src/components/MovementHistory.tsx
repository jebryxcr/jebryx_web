import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import {
  getMovimientoDescripcion,
  type Movimiento,
} from "@/lib/api/movimientos";
import type { Categoria } from "@/lib/api/categorias";
import { localDate, money, useText } from "@/lib/hooks";
import { EditActions, Empty } from "./ui";
import { FinancialIcon } from "./FinancialIcon";

export function movementDay(movement: Movimiento) {
  const raw = movement.fecha || movement.created_at || movement.created;
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Keep currencies separate: totals never imply an exchange rate. */
export function movementTotals(movements: Movimiento[]) {
  const totals = new Map<
    string,
    { symbol: string; name: string; income: number; expense: number }
  >();
  for (const movement of movements) {
    const key = movement.moneda_id;
    const total = totals.get(key) || {
      symbol: movement.moneda?.simbolo || "",
      name: movement.moneda?.nombre || "",
      income: 0,
      expense: 0,
    };
    total[movement.tipo === "ingreso" ? "income" : "expense"] +=
      Number(movement.monto) || 0;
    totals.set(key, total);
  }
  return [...totals.entries()].map(([id, total]) => ({ id, ...total }));
}

export default function MovementHistory({
  movements,
  categories,
  edit,
  remove,
}: {
  movements: Movimiento[];
  categories: Categoria[];
  edit: (movement: Movimiento) => void;
  remove: (movement: Movimiento) => void;
}) {
  const tr = useText();
  if (!movements.length)
    return (
      <Empty
        title={tr("Sin movimientos por aquí", "No transactions here yet")}
        body={tr(
          "Prueba con otros filtros o registra tu primer movimiento.",
          "Try different filters or record your first transaction.",
        )}
      />
    );
  const groups = new Map<string, Movimiento[]>();
  for (const movement of movements) {
    const day = movementDay(movement);
    groups.set(day, [...(groups.get(day) || []), movement]);
  }
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (
    <div className="movement-history">
      {[...groups.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, items]) => (
          <section className="movement-day" key={day}>
            <div className="movement-day-heading">
              <h3>
                {day === dayKey(today)
                  ? tr("Hoy", "Today")
                  : day === dayKey(yesterday)
                    ? tr("Ayer", "Yesterday")
                    : day
                      ? localDate(day)
                      : tr("Sin fecha", "No date")}
              </h3>
              <div className="movement-day-totals">
                {movementTotals(items).map((total) => (
                  <span
                    key={total.id}
                    className={
                      total.income - total.expense > 0 ? "positive" : ""
                    }
                  >
                    {total.income - total.expense > 0 ? "+" : ""}
                    {money(total.income - total.expense, total.symbol)}
                  </span>
                ))}
              </div>
            </div>
            <div className="movement-day-card">
              {items.map((movement) => {
                const category = categories.find(
                  (item) => item.id === movement.categoria_id,
                );
                const description = getMovimientoDescripcion(movement);
                const income = movement.tipo === "ingreso";
                const title =
                  category?.nombre ||
                  movement.categoria?.nombre ||
                  tr(
                    income ? "Ingreso" : "Gasto",
                    income ? "Income" : "Expense",
                  );
                const color =
                  category?.color && /^#[0-9a-f]{3,8}$/i.test(category.color)
                    ? category.color
                    : undefined;
                return (
                  <article className="movement-entry" key={movement.id}>
                    <button
                      className="movement-entry-main"
                      type="button"
                      onClick={() => edit(movement)}
                    >
                      <span
                        className={`movement-category-icon ${income ? "income" : ""}`}
                        style={
                          color
                            ? ({ "--category-color": color } as CSSProperties)
                            : undefined
                        }
                      >
                        {income ? (
                          <ArrowDownLeft size={21} />
                        ) : (
                          <FinancialIcon
                            name={
                              category?.icono ||
                              movement.categoria?.icono ||
                              "receipt"
                            }
                          />
                        )}
                      </span>
                      <span className="movement-entry-copy">
                        <strong>{description || title}</strong>
                        <span>
                          {title}
                          <i />
                          {movement.cuenta?.nombre ||
                            category?.cuenta?.nombre ||
                            tr("Sin cuenta", "No account")}
                        </span>
                      </span>
                      <span
                        className={`movement-entry-amount ${income ? "positive" : ""}`}
                      >
                        <strong>
                          {income ? "+" : "−"}
                          {money(
                            movement.monto,
                            movement.moneda?.simbolo || "",
                          )}
                        </strong>
                        <span>
                          {movement.moneda?.nombre ||
                            (income
                              ? tr("Ingreso", "Income")
                              : tr("Gasto", "Expense"))}
                        </span>
                      </span>
                      <span className="movement-direction">
                        {income ? (
                          <ArrowDownLeft size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}
                      </span>
                    </button>
                    <EditActions
                      edit={() => edit(movement)}
                      remove={() => remove(movement)}
                    />
                  </article>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}
