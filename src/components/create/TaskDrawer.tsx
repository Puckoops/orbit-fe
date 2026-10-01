"use client";

import { Button, DateInput, Drawer, Field, Input, SearchSelect, Select, Stack, Textarea, toast } from "@puckoops/camelot";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useLookups, useWsMutation } from "@/lib/api/hooks";
import type { Task } from "@/lib/api/models";
import { dayToInstant } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useFormErrors } from "./useFormErrors";

export function TaskDrawer({
  open,
  onOpenChange,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}) {
  const { user } = useWorkspace();
  const { projects, members, clientName } = useLookups();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [assignee, setAssignee] = useState(user.id ?? "");
  const [due, setDue] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const { errors, check, clear } = useFormErrors<"title" | "project" | "assignee">();

  const openProjects = projects.filter((p) => p.is_active !== false && p.delivery_status !== "closed" && !p.is_draft);

  const reset = () => {
    setTitle("");
    setProjectId(defaultProjectId ?? "");
    setAssignee(user.id ?? "");
    setDue(null);
    setNotes("");
    clear();
  };

  const create = useWsMutation((body: Record<string, unknown>, path) => api.post<Task>(path("/tasks"), body), ["tasks", "dashboard", "calendar", "search"]);

  const submit = () => {
    const ok = check([
      ["title", !title.trim(), "Name the task."],
      ["project", !projectId, "Choose the project it belongs to."],
      ["assignee", !assignee, "Choose who is doing it."],
    ]);
    if (!ok) return;
    create.mutate(
      {
        project_id: projectId,
        title: title.trim(),
        type: "task",
        assignee_id: assignee,
        target_at: dayToInstant(due, true),
        description: notes.trim() || undefined,
      },
      {
        onSuccess: (task) => {
          toast.success("Task added", task.key ?? undefined);
          reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error("Couldn't add the task", e.message),
      },
    );
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="New task"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>
            Save
          </Button>
        </>
      }
    >
      <Stack gap={16}>
        <Field label="Task name" required error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Draft the type scale" autoFocus />
        </Field>
        <Field label="Project" required error={errors.project}>
          <SearchSelect
            value={projectId}
            onValueChange={setProjectId}
            placeholder="Select a project"
            searchPlaceholder="Search projects or clients"
            options={openProjects.map((p) => ({
              value: p.id!,
              label: p.name ?? "Project",
              meta: clientName(p.client_id),
              keywords: [clientName(p.client_id), p.code ?? ""].filter(Boolean),
            }))}
          />
        </Field>
        <Field label="Assignee" required error={errors.assignee}>
          <Select
            value={assignee}
            onValueChange={setAssignee}
            placeholder="Select a person"
            options={members.map((m) => ({ value: m.user_id!, label: m.display_name ?? "Member" }))}
          />
        </Field>
        <Field label="Due date">
          <DateInput value={due} onChange={setDue} clearable />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the team should know." rows={3} />
        </Field>
      </Stack>
    </Drawer>
  );
}
