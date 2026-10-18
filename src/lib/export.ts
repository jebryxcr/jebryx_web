import type { Movimiento } from "./api/movimientos";

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  // Prevent spreadsheet formula execution when opening exported user text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function exportMovements(rows: Movimiento[]) {
  const header = [
    "id",
    "tipo",
    "monto",
    "moneda",
    "categoria",
    "cuenta",
    "descripcion",
    "fecha",
  ];
  const data = rows.map((m) => [
    m.id,
    m.tipo,
    m.monto,
    m.moneda?.nombre,
    m.categoria?.nombre,
    m.cuenta?.nombre,
    m.descripcion || m.description,
    m.fecha || m.created_at || m.created,
  ]);
  const blob = new Blob(
    [
      "\uFEFF",
      [header, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jebryx-movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
