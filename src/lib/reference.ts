import { currencySymbol } from "./format";

const REGIONS =
  "AE AR AT AU BD BE BG BR CA CH CL CN CO CY CZ DE DK EE EG ES FI FR GB GH GR HK HR HU ID IE IL IN IS IT JP KE KR LK LT LU LV MA MT MX MY NG NL NO NZ PE PH PK PL PT QA RO RS SA SE SG SI SK TH TR TW UA US VN ZA".split(" ");

const displayNames = new Map<string, Intl.DisplayNames | null>();
function displayName(type: "region" | "currency", code: string) {
  try {
    if (!displayNames.has(type)) displayNames.set(type, new Intl.DisplayNames(["en-GB"], { type }));
    return displayNames.get(type)?.of(code) ?? code;
  } catch {
    return code;
  }
}

export const LOCATIONS = REGIONS.map((code) => ({ value: displayName("region", code), label: displayName("region", code), keywords: [code] })).sort((a, b) =>
  a.label.localeCompare(b.label),
);

const CURRENCIES = ["GBP", "EUR", "USD", "INR", "AUD", "CAD", "NZD", "SGD", "AED", "CHF", "SEK", "NOK", "DKK", "JPY", "ZAR", "HKD"];

export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: `${c} — ${currencySymbol(c)}`, keywords: [displayName("currency", c)] }));
