"use client";

import { Band, Button, Card, Field, Grid, GridItem, Input, Page, PageHeader, SegmentedControl, Select, Stack, Table, TBody, Td, Th, THead, Tr, toast, useTheme, type ThemePreference } from "@puckoops/camelot";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useInvitations, useMembers, useWsKey } from "@/lib/api/hooks";
import type { InvitationCreated } from "@/lib/api/types.gen";
import { shortDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const ROLES = [
  { value: "member", label: "Member" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
];

export function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
  const key = useWsKey();
  const { user, member, path, isOwner, workspace } = useWorkspace();
  const { preference, setPreference } = useTheme();
  const members = useMembers();
  const invitations = useInvitations("pending", isOwner);
  const [displayName, setDisplayName] = useState(member.display_name ?? "");
  const [weekly, setWeekly] = useState(String(member.weekly_capacity_hours ?? 40));
  const [reviews, setReviews] = useState(String(member.review_capacity_per_day ?? 4));
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(done);
      await Promise.all([qc.invalidateQueries({ queryKey: key("members") }), qc.invalidateQueries({ queryKey: key("invitations") })]);
      router.refresh();
    } catch (e) {
      toast.error("That didn't work", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  const invite = () =>
    run(
      "invite",
      async () => {
        const res = await api.post<InvitationCreated>(path("/invitations"), { email: inviteEmail.trim(), role: inviteRole });
        setInviteLink(`${window.location.origin}/invite?token=${res.token}`);
        setInviteEmail("");
      },
      "Invitation created",
    );

  const revoke = (id: string) => run(`revoke-${id}`, () => api.delete(path(`/invitations/${id}`)), "Invitation revoked");

  return (
    <Page>
      <PageHeader title="Profile settings" subtitle={`You, and how you work in ${workspace.name}.`} />
      <Grid>
        <GridItem span={6}>
          <Card>
            <h2 className="h3">Profile</h2>
            <Stack gap={16} style={{ marginTop: 16 }}>
              <Field label="Name" hint="From your Puckoops account, which you sign in with across Puckoops products.">
                <Input value={user.name} disabled />
              </Field>
              <Field label="Email" hint="Your sign-in address.">
                <Input value={user.email} disabled />
              </Field>
            </Stack>
          </Card>
        </GridItem>
        <GridItem span={6}>
          <Card>
            <h2 className="h3">In this workspace</h2>
            <Stack gap={16} style={{ marginTop: 16 }}>
              <Field label="Display name" hint="How the team sees you on the board and in activity.">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Weekly capacity (hours)">
                  <Input value={weekly} onChange={(e) => setWeekly(e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Reviews per day">
                  <Input value={reviews} onChange={(e) => setReviews(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <div>
                <Button
                  variant="primary"
                  loading={busy === "member"}
                  onClick={() =>
                    run(
                      "member",
                      () =>
                        api.patch(path(`/members/${member.id}`), {
                          display_name: displayName.trim() || undefined,
                          weekly_capacity_hours: Number(weekly),
                          review_capacity_per_day: Number(reviews),
                        }),
                      "Saved",
                    )
                  }
                >
                  Save
                </Button>
              </div>
            </Stack>
          </Card>
        </GridItem>
      </Grid>

      <Band heading="Appearance" caption="Light is the default; dark is a toggle.">
        <SegmentedControl<ThemePreference>
          aria-label="Appearance"
          value={preference}
          onValueChange={setPreference}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ]}
        />
      </Band>

      {isOwner && (
        <Band heading="People" caption="Invite the studio. Invitations last seven days; emails arrive once notifications are on, until then share the link.">
          <Stack direction="row" gap={12} align="flex-end" wrap style={{ marginBottom: 16 }}>
            <Field label="Email" className="grow">
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" placeholder="priya@studio.com" />
            </Field>
            <Field label="Role">
              <Select value={inviteRole} onValueChange={setInviteRole} options={ROLES} />
            </Field>
            <Button variant="primary" onClick={invite} loading={busy === "invite"} disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail)}>
              Invite
            </Button>
          </Stack>
          {inviteLink && (
            <Card style={{ minHeight: 0, marginBottom: 16 }}>
              <p className="small text-2">Share this link with them:</p>
              <Stack direction="row" gap={8} align="center" style={{ marginTop: 8 }}>
                <Input value={inviteLink} readOnly onFocus={(e) => e.currentTarget.select()} />
                <Button onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success("Link copied"))}>Copy</Button>
              </Stack>
            </Card>
          )}
          <Table density="compact">
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th aria-label="Actions" />
              </tr>
            </THead>
            <TBody>
              {(members.data ?? [])
                .filter((m) => m.is_active !== false)
                .map((m) => (
                  <Tr key={m.id}>
                    <Td primary>{m.display_name}</Td>
                    <Td>{m.email}</Td>
                    <Td>{ROLES.find((r) => r.value === m.role)?.label ?? m.role}</Td>
                    <Td />
                  </Tr>
                ))}
              {(invitations.data ?? []).map((inv) => (
                <Tr key={inv.id}>
                  <Td className="text-3">Invited · until {shortDate(inv.expires_at)}</Td>
                  <Td>{inv.email}</Td>
                  <Td>{ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}</Td>
                  <Td numeric>
                    <Button size="sm" variant="quiet" loading={busy === `revoke-${inv.id}`} onClick={() => revoke(inv.id!)}>
                      Revoke
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Band>
      )}
    </Page>
  );
}
