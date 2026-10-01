import type * as G from "./types.gen";

export type Id = string;

/** The signed-in person's user-svc account. */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface Me {
  user: User;
  memberships: Membership[];
}

export type Membership = G.Membership;
export type Workspace = G.Workspace;
export type Member = G.MemberResponse;
export type Invitation = G.InvitationView;
export type Client = G.ClientResponse;
export type Project = G.ProjectResponse;
export type Task = G.TaskResponse;
export type TaskDetail = G.TaskDetailResponse;
export type Review = G.Review;
export type FileItem = G.FileView;
export type Invoice = G.InvoiceResponse;
export type Obligation = G.ObligationResponse;
export type ObligationDetail = G.ObligationDetailResponse;
export type ObligationSummary = G.ObligationSummary;
export type Payment = G.Payment;
export type Dashboard = G.DashboardResponse;
export type Calendar = G.CalendarResponse;
export type Activity = G.ActivityView;
export type TimeEntry = G.TimeEntryView;
export type SearchResults = G.SearchResponse;
export type Money = G.CurrencyAmount;
export type ListResponse<T> = G.ListResponse<T>;
