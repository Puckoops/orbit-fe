"use client";

import { Button, DateInput, Field, Input, Select, Stack, toast } from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { currencySymbol, dayToInstant, isoDay, money, parseMoney, toMajor } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Kind = "payment" | "credit_note" | "write_off" | "refund";

const KINDS: { value: Kind; label: string }[] = [
  { value: "payment", label: "Payment" },
  { value: "credit_note", label: "Credit note" },
  { value: "refund", label: "Refund" },
  { value: "write_off", label: "Write-off" },
];

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
];

/** Records a ledger entry against an obligation. The idempotency key survives retries, so a double click never pays twice. */
export function RecordPayment({
  obligationId,
  currency,
  outstanding,
  paid,
  onDone,
}: {
  obligationId: string;
  currency: string;
  outstanding: number;
  paid: number;
  onDone: () => void;
}) {
  const { path, isOwner, workspace } = useWorkspace();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("payment");
  const [amount, setAmount] = useState(outstanding > 0 ? String(toMajor(outstanding, currency)) : "");
  const [method, setMethod] = useState("bank_transfer");
  const [day, setDay] = useState<string | null>(isoDay(new Date()));
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const key = useRef(crypto.randomUUID());

  const limit = kind === "refund" ? paid : outstanding;
  const submit = async () => {
    const minor = parseMoney(amount, currency);
    if (minor === null || minor <= 0) return toast.error("Enter an amount above zero.");
    if (minor > limit) return toast.error(kind === "refund" ? `You can refund at most ${money(paid, currency)}.` : `Only ${money(outstanding, currency)} is outstanding.`);
    setPending(true);
    try {
      await api.post(
        path(`/obligations/${obligationId}/payments`),
        {
          kind,
          amount: minor,
          currency,
          method: kind === "payment" || kind === "refund" ? method : undefined,
          paid_at: dayToInstant(day),
          note: note.trim() || undefined,
        },
        { "Idempotency-Key": key.current },
      );
      key.current = crypto.randomUUID();
      toast.success(`${KINDS.find((k) => k.value === kind)!.label} recorded`, money(minor, currency));
      await Promise.all(
        ["obligations", "obligations-summary", "invoices", "dashboard", "activity", "calendar"].map((r) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, r] })),
      );
      onDone();
    } catch (e) {
      toast.error("Couldn't record it", e instanceof Error ? e.message : undefined);
    } finally {
      setPending(false);
    }
  };

  return (
    <Stack gap={14}>
      <Field label="Kind">
        <Select value={kind} onValueChange={(v) => setKind(v as Kind)} options={KINDS.filter((k) => k.value !== "write_off" || isOwner)} />
      </Field>
      <Field label="Amount" hint={kind === "refund" ? `Up to ${money(paid, currency)} has been paid.` : `${money(outstanding, currency)} outstanding.`}>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} prefix={currencySymbol(currency)} inputMode="decimal" />
      </Field>
      {(kind === "payment" || kind === "refund") && (
        <Field label="Method">
          <Select value={method} onValueChange={setMethod} options={METHODS} />
        </Field>
      )}
      <Field label="Date">
        <DateInput value={day} onChange={setDay} />
      </Field>
      <Field label="Note">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reference, remittance, reason" />
      </Field>
      <div>
        <Button variant="primary" onClick={submit} loading={pending}>
          Record payment
        </Button>
      </div>
    </Stack>
  );
}
