"use client";

import { Button, Glyph } from "@puckoops/camelot";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import type { WorkspaceDetail } from "@/lib/api/types.gen";
import styles from "./auth.module.css";

export function AcceptInvite() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(/^[0-9a-f]{64}$/.test(token) ? null : "This invitation link is incomplete.");
  const [pending, setPending] = useState(false);

  const accept = async () => {
    setPending(true);
    setError(null);
    try {
      const joined = await api.post<WorkspaceDetail>("/invitations/accept", { token });
      await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspace_id: joined.workspace?.id }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That invitation could not be accepted.");
      setPending(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>Join the studio</h1>
      <p className={`small ${styles.lede}`}>You have been invited to a workspace on Orbit.</p>
      <div className={styles.form}>
        {error && (
          <div className={`small ${styles.error}`} role="alert">
            <Glyph shape="triangle" className={styles.errorGlyph} />
            <span>{error}</span>
          </div>
        )}
        <Button variant="primary" size="lg" className={styles.submit} onClick={accept} loading={pending} disabled={!/^[0-9a-f]{64}$/.test(token)}>
          Accept invitation
        </Button>
      </div>
    </>
  );
}
