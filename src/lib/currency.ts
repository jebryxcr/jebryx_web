export const ACCOUNT_CURRENCIES = [
  { code: "CRC", symbol: "₡" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "MXN", symbol: "MX$" },
  { code: "CAD", symbol: "C$" },
];
export function currencyCode(currency?: { codigo: string; simbolo: string }) {
  if (!currency) return undefined;
  return (
    ACCOUNT_CURRENCIES.find((c) => c.symbol === currency.simbolo)?.code ||
    currency.codigo
  );
}
