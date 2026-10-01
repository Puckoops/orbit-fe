"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useWorkspace } from "../workspace";
import { api, type Query } from "./client";
import type {
  Activity,
  Calendar,
  Client,
  Dashboard,
  FileItem,
  Invitation,
  Invoice,
  ListResponse,
  Member,
  Obligation,
  ObligationDetail,
  ObligationSummary,
  Project,
  SearchResults,
  Task,
  TaskDetail,
  TimeEntry,
} from "./models";

export const MAX_PAGE = 200;

export function useWsKey() {
  const { workspace } = useWorkspace();
  return (...parts: unknown[]): QueryKey => ["ws", workspace.id, ...parts];
}

function useList<T>(resource: string, query: Query = {}, enabled = true) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({
    queryKey: key(resource, query),
    queryFn: () => api.get<ListResponse<T>>(path(`/${resource}`), query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

function useOne<T>(resource: string, id: string | null | undefined, query?: Query) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({
    queryKey: key(resource, id, query ?? {}),
    queryFn: () => api.get<T>(path(`/${resource}/${id}`), query),
    enabled: Boolean(id),
  });
}

export const useClients = (q: Query = {}) => useList<Client>("clients", { page_size: MAX_PAGE, ...q });
export const useClient = (id?: string | null) => useOne<Client>("clients", id);
export const useProjects = (q: Query = {}) => useList<Project>("projects", { page_size: MAX_PAGE, ...q });
export const useProject = (id?: string | null) => useOne<Project>("projects", id);
export const useTasks = (q: Query = {}, enabled = true) => useList<Task>("tasks", { page_size: MAX_PAGE, ...q }, enabled);
export const useTask = (id?: string | null) => useOne<TaskDetail>("tasks", id);
export const useFiles = (q: Query = {}) => useList<FileItem>("files", { page_size: 50, ...q });
export const useInvoices = (q: Query = {}, enabled = true) => useList<Invoice>("invoices", { page_size: MAX_PAGE, ...q }, enabled);
export const useObligations = (q: Query = {}, enabled = true) => useList<Obligation>("obligations", { page_size: MAX_PAGE, ...q }, enabled);
export const useObligation = (id?: string | null) => useOne<ObligationDetail>("obligations", id);
export const useTimeEntries = (q: Query = {}) => useList<TimeEntry>("time-entries", { page_size: MAX_PAGE, ...q });
export const useActivity = (q: Query = {}, enabled = true) => useList<Activity>("activity", { page_size: 50, ...q }, enabled);

export function useMembers() {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({ queryKey: key("members"), queryFn: () => api.get<Member[]>(path("/members")), staleTime: 5 * 60_000 });
}

export function useInvitations(status: string, enabled = true) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({ queryKey: key("invitations", status), queryFn: () => api.get<Invitation[]>(path("/invitations"), { status }), enabled });
}

export function useDashboard() {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({ queryKey: key("dashboard"), queryFn: () => api.get<Dashboard>(path("/dashboard")) });
}

export function useObligationSummary(enabled = true) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({
    queryKey: key("obligations-summary"),
    queryFn: () => api.get<ObligationSummary[]>(path("/obligations/summary")),
    enabled,
  });
}

export function useCalendar(from: string, to: string, layers: string[]) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({
    queryKey: key("calendar", from, to, layers),
    queryFn: () => api.get<Calendar>(path("/calendar"), { from, to, layers: layers.join(",") }),
    enabled: layers.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useSearch(q: string) {
  const { path } = useWorkspace();
  const key = useWsKey();
  return useQuery({
    queryKey: key("search", q),
    queryFn: () => api.get<SearchResults>(path("/search"), { q, limit: 5 }),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/** A mutation against the current workspace that refreshes every query of the listed resources. */
export function useWsMutation<TVars, TData = unknown>(fn: (vars: TVars, path: (p: string) => string) => Promise<TData>, invalidates: string[]) {
  const { path, workspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => fn(vars, path),
    onSuccess: () =>
      Promise.all(invalidates.map((resource) => qc.invalidateQueries({ queryKey: ["ws", workspace.id, resource] }))),
  });
}

/** id → record maps for the lists screens join against, loaded once per workspace. */
export function useLookups() {
  const clients = useClients();
  const projects = useProjects({ include_archived: true, include_drafts: true });
  const members = useMembers();
  const clientById = new Map((clients.data?.items ?? []).map((c) => [c.id!, c]));
  const projectById = new Map((projects.data?.items ?? []).map((p) => [p.id!, p]));
  const memberByUser = new Map((members.data ?? []).map((m) => [m.user_id!, m]));
  return {
    clients: clients.data?.items ?? [],
    projects: projects.data?.items ?? [],
    members: (members.data ?? []).filter((m) => m.is_active !== false),
    clientById,
    projectById,
    memberByUser,
    clientName: (id?: string | null) => (id ? (clientById.get(id)?.name ?? "—") : "Internal"),
    projectName: (id?: string | null) => (id ? (projectById.get(id)?.name ?? "—") : "—"),
    personName: (userId?: string | null) => (userId ? (memberByUser.get(userId)?.display_name ?? "—") : "—"),
    loading: clients.isLoading || projects.isLoading || members.isLoading,
  };
}
