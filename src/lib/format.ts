const digitsCache = new Map<string, number>();

/** Fraction digits of a currency's minor unit (GBP 2, JPY 0), which is what orbit-be's integers count. */
export function minorDigits(currency: string) {
  let d = digitsCache.get(currency);
  if (d === undefined) {
    try {
      d = new Intl.NumberFormat("en-GB", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      d = 2;
    }
    digitsCache.set(currency, d);
  }
  return d;
}

export function toMajor(minor: number, currency: string) {
  return minor / 10 ** minorDigits(currency);
}

export function toMinor(major: number, currency: string) {
  return Math.round(major * 10 ** minorDigits(currency));
}

/** £48,320 — whole amounts drop their pence; anything else keeps them. */
export function money(minor: number | null | undefined, currency: string | null | undefined = "GBP") {
  const cur = currency || "GBP";
  const value = toMajor(minor ?? 0, cur);
  const whole = Number.isInteger(value);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: whole ? 0 : minorDigits(cur),
      maximumFractionDigits: whole ? 0 : minorDigits(cur),
    }).format(value);
  } catch {
    return `${cur} ${value.toLocaleString("en-GB")}`;
  }
}

/** Parses "1,250.50" or "£1250" into minor units; null when it is not a number. */
export function parseMoney(input: string, currency: string) {
  const cleaned = input.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? toMinor(n, currency) : null;
}

export function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 02 Oct */
export function shortDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = parts(value);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
}

/** 2 October 2026, for title attributes. */
export function longDate(value: string | Date | null | undefined) {
  if (!value) return undefined;
  const d = parts(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined;
}

/** YYYY-MM-DD in the viewer's calendar, for date inputs and day keys. */
export function isoDay(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = parts(value);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The end of a picked day as an RFC3339 instant, so "due 24 Oct" still counts as due all of the 24th. */
export function dayToInstant(day: string | null | undefined, endOfDay = false) {
  if (!day) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const local = endOfDay ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d, 12, 0, 0);
  return local.toISOString();
}

export function bytes(n: number | null | undefined) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function count(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Five clients active" reads better than "5 clients active" up to ten. */
export function spelled(n: number) {
  return n >= 0 && n <= 10 ? WORDS[n]! : n.toLocaleString("en-GB");
}

export function fileKind(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const kinds: Record<string, string> = {
    pdf: "PDF", doc: "Word", docx: "Word", xls: "Spreadsheet", xlsx: "Spreadsheet", csv: "CSV",
    png: "Image", jpg: "Image", jpeg: "Image", gif: "Image", webp: "Image", svg: "Image",
    zip: "Archive", rar: "Archive", "7z": "Archive", eml: "Email", msg: "Email", fig: "Figma",
    mp4: "Video", mov: "Video", md: "Markdown", txt: "Text", json: "JSON", key: "Slides", ppt: "Slides", pptx: "Slides",
  };
  return kinds[ext] ?? (ext ? ext.toUpperCase() : "File");
}
