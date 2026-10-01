"use client";

import { Button, Field, Glyph, Input } from "@puckoops/camelot";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./auth.module.css";

// user-svc's sign-up rule, shared by every product's form.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.startsWith("/api/") ? value : "/dashboard";
}

function post(path: string, body: unknown) {
  return fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const carry = next !== "/dashboard" ? next : undefined;
  const nextQuery = carry ? `?next=${encodeURIComponent(carry)}` : "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  // Sign-up ends at the inbox: the account can't sign in until its address is confirmed.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const resend = async (to: string) => {
    setPending(true);
    const res = await post("/api/auth/resend", { email: to, next: carry });
    setPending(false);
    if (res?.ok) setResent(true);
    else setError("We couldn't send a new link. Try again in a moment.");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) errs.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter your email address.";
    if (mode === "signup" && !PASSWORD_RULE.test(password))
      errs.password = "Use at least 8 characters with an uppercase letter, a lowercase letter, a digit and a symbol.";
    if (mode === "login" && !password) errs.password = "Enter your password.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    setError(null);
    setUnconfirmed(null);
    setResent(false);
    const res = await post(
      `/api/auth/${mode}`,
      mode === "signup" ? { name: name.trim(), email: email.trim(), password, next: carry } : { email: email.trim(), password },
    );
    const body = await res?.json().catch(() => null);
    setPending(false);
    if (!res?.ok) {
      if (res?.status === 403) setUnconfirmed(email.trim());
      setError(body?.message ?? "That didn't work. Try again.");
      return;
    }
    if (mode === "signup") {
      setSentTo(email.trim());
      return;
    }
    router.push(next);
    router.refresh();
  };

  const alert = error && (
    <div className={`small ${styles.error}`} role="alert">
      <Glyph shape="triangle" className={styles.errorGlyph} />
      <span>{error}</span>
    </div>
  );

  if (sentTo) {
    return (
      <>
        <h1 className={styles.title}>Check your email</h1>
        <p className={`small ${styles.lede}`}>
          We sent a link to <strong>{sentTo}</strong>. Open it to confirm your address, then sign in. It expires in 24 hours.
        </p>
        <div className={styles.form}>
          {alert}
          <Button variant="ghost" size="lg" className={styles.submit} loading={pending} disabled={resent} onClick={() => resend(sentTo)}>
            {resent ? "Link sent again" : "Send it again"}
          </Button>
        </div>
        <p className={`small ${styles.alt}`}>
          Confirmed already? <Link href={`/login${nextQuery}`}>Sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>{mode === "login" ? "Sign in to Orbit" : "Start your studio"}</h1>
      <p className={`small ${styles.lede}`}>
        {mode === "login" ? "Every client, every hour, every invoice." : "One tracker for clients, projects, work, money and files."}
      </p>
      <form className={styles.form} onSubmit={submit} noValidate>
        {alert}
        {unconfirmed && (
          <p className={`small ${styles.notice}`}>
            {resent ? (
              <>A new link is on its way to {unconfirmed}.</>
            ) : (
              <>
                Didn&rsquo;t get the link?{" "}
                <button type="button" className={styles.inlineAction} disabled={pending} onClick={() => resend(unconfirmed)}>
                  Send a new one
                </button>
              </>
            )}
          </p>
        )}
        {mode === "signup" && (
          <Field label="Your name" error={fieldErrors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
          </Field>
        )}
        <Field label="Email" error={fieldErrors.email}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" autoFocus={mode === "login"} />
        </Field>
        <Field label="Password" error={fieldErrors.password} hint={mode === "signup" ? "8+ characters, with upper and lower case, a digit and a symbol." : undefined}>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className={styles.submit} loading={pending}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <p className={`small ${styles.alt}`}>
        {mode === "login" ? (
          <>
            New to Orbit? <Link href={`/signup${nextQuery}`}>Create an account</Link>
          </>
        ) : (
          <>
            Already have a Puckoops account? <Link href={`/login${nextQuery}`}>Sign in</Link>
          </>
        )}
      </p>
    </>
  );
}
