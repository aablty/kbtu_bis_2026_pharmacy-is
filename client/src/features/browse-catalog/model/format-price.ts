export function formatPrice(price: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KZT",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(Number(price));
}
