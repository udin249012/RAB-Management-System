export function formatCurrency(amount: number, currency = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDateTime(isoDate?: string): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
