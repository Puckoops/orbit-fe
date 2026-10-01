"use client";

import { Button, Field, Glyph, Input, SearchSelect, TextLink } from "@puckoops/camelot";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { api } from "@/lib/api/client";
import type { WorkspaceDetail } from "@/lib/api/types.gen";
import { CURRENCY_OPTIONS } from "@/lib/reference";
import styles from "./auth.module.css";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const noSubscribe = () => () => {};

function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function OnboardingForm({ name, hasWorkspaces }: { name: string; hasWorkspaces: boolean }) {
  const router = useRouter();
  const [studio, setStudio] = useState(name ? `${name.split(" ")[0]}'s studio` : "");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [currency, setCurrency] = useState("GBP");
  const detectedZone = useSyncExternalStore(noSubscribe, browserZone, () => "UTC");
  const [zoneOverride, setTimezone] = useState<string | null>(null);
  const timezone = zoneOverride ?? detectedZone;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(studio);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studio.trim()) return setError("Name your studio.");
    if (!/^[a-z0-9-]{2,64}$/.test(effectiveSlug)) return setError("The web address can use lowercase letters, digits and dashes.");
    setPending(true);
    setError(null);
    try {
      const created = await api.post<WorkspaceDetail>("/workspaces", {
        name: studio.trim(),
        slug: effectiveSlug,
        base_currency: currency,
        timezone,
      });
      await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspace_id: created.workspace?.id }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setPending(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>Set up your studio</h1>
      <p className={`small ${styles.lede}`}>A workspace holds your clients, projects, work, money and files. You can invite the team next.</p>
      <form className={styles.form} onSubmit={submit} noValidate>
        {error && (
          <div className={`small ${styles.error}`} role="alert">
            <Glyph shape="triangle" className={styles.errorGlyph} />
            <span>{error}</span>
          </div>
        )}
        <Field label="Studio name">
          <Input value={studio} onChange={(e) => setStudio(e.target.value)} placeholder="Nordvik Atelier" autoFocus />
        </Field>
        <Field label="Short name" hint="Lowercase letters, digits and dashes.">
          <Input
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
        </Field>
        <Field label="Billing currency">
          <SearchSelect value={currency} onValueChange={setCurrency} searchPlaceholder="Search currencies" options={CURRENCY_OPTIONS} />
        </Field>
        <Field label="Timezone" hint="Used for due dates and the calendar.">
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" size="lg" className={styles.submit} loading={pending}>
          Create workspace
        </Button>
      </form>
      {hasWorkspaces && (
        <p className={`small ${styles.alt}`}>
          <TextLink as={Link} href="/dashboard" arrow="back">
            Back to your workspace
          </TextLink>
        </p>
      )}
    </>
  );
}
