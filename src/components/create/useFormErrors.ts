import { useState } from "react";

export function useFormErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const check = (rules: [K, boolean, string][]) => {
    const next: Partial<Record<K, string>> = {};
    for (const [field, bad, message] of rules) if (bad && !next[field]) next[field] = message;
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  return { errors, check, clear: () => setErrors({}) };
}
