/** Standard integer number formatter */
export const intFmt = (n: number) => new Intl.NumberFormat().format(n);

/** Standard currency number formatter */
export const currencyFmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);

/** Standard percentage formatter */
export const percentFmt = (n: number, digits = 1) =>
  new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
