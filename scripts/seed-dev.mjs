// Seeds a local orbit-be (never a shared environment) with a small studio to click through,
// signing in through a local user-svc that shares its JWT secret.
// Usage: ORBIT_API_URL=http://127.0.0.1:8088/orbit-be/api/v1 USER_SVC_URL=http://127.0.0.1:8080/user-svc-smm/api/v1 node scripts/seed-dev.mjs
import { randomUUID } from "node:crypto";

const BASE = (process.env.ORBIT_API_URL ?? "http://127.0.0.1:8088/orbit-be/api/v1").replace(/\/+$/, "");
const USERS = (process.env.USER_SVC_URL ?? "http://127.0.0.1:8080/user-svc-smm/api/v1").replace(/\/+$/, "");
for (const url of [BASE, USERS]) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) {
    console.error(`Refusing to seed through ${url}: this script only talks to local services.`);
    process.exit(1);
  }
}

const OWNER = { name: "Annika Revell", email: "owner@orbit.test", password: "Local-dev-Orbit-1!" };

let token = "";
let ownerId = "";
async function call(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`${method} ${path} → ${res.status}: ${json.message ?? res.statusText}`);
  return json.data;
}

const day = (offset, hour = 17) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const ymd = (offset) => day(offset).slice(0, 10);
const gbp = (pounds) => Math.round(pounds * 100);

async function account(path, body) {
  const res = await fetch(`${USERS}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, type: "orbit" }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && !json.error, data: json.data, message: json.message };
}

// user-svc signs in only confirmed addresses. A new account stops here until it is confirmed: open the
// link if the local stack sends mail, or set is_verified on its document in the local users collection.
async function auth() {
  const login = await account("/user/login", { email: OWNER.email, password: OWNER.password });
  if (login.ok) {
    token = login.data.token;
    ownerId = login.data.user.id;
    console.log("signed in", OWNER.email);
    return;
  }
  if (login.status === 403) {
    console.error(`${OWNER.email} is not confirmed yet; confirm it, then run this again.`);
    process.exit(1);
  }
  const signup = await account("/user/signup", { ...OWNER, role: "member", verify_url: "http://localhost:3000/verify" });
  if (!signup.ok) throw new Error(`sign-up → ${signup.status}: ${signup.message}`);
  console.log(`signed up ${OWNER.email}; confirm it, then run this again.`);
  process.exit(0);
}

async function main() {
  await auth();
  const memberships = await call("GET", "/workspaces");
  let ws = memberships?.[0]?.workspace;
  if (!ws) {
    ws = (await call("POST", "/workspaces", { name: "Nordvik Studio", slug: `nordvik-${randomUUID().slice(0, 6)}`, base_currency: "GBP", timezone: "Europe/London" })).workspace;
    console.log("workspace", ws.name);
  }
  const w = (p) => `/workspaces/${ws.id}${p}`;
  const userId = ownerId;

  const existing = await call("GET", w("/clients?page_size=5"));
  if (existing.total > 0) {
    console.log("workspace already has clients; nothing to do");
    return;
  }

  const clientSpecs = [
    ["Nordvik Atelier", "needs_attention", "Norway", "Design studio"],
    ["Brightwater Foods", "on_track", "United Kingdom", "Food & drink"],
    ["Halcyon Press", "at_risk", "United Kingdom", "Publishing"],
    ["Meridian Cycles", "on_track", "Netherlands", "Retail"],
    ["Saltbox Interiors", "on_track", "Ireland", "Interiors"],
    ["Purslane Studio", "needs_attention", "United Kingdom", "Architecture"],
  ];
  const clients = {};
  for (const [name, health, location, industry] of clientSpecs) {
    clients[name] = await call("POST", w("/clients"), {
      name,
      health,
      location,
      currency: "GBP",
      industry,
      account_owner_id: userId,
      contacts: [{ name: "Studio contact", email: `hello@${name.toLowerCase().replace(/[^a-z]/g, "")}.test`, is_primary: true }],
    });
  }
  console.log("clients", Object.keys(clients).length);

  const projectSpecs = [
    ["Nordvik Atelier", "Brand system rollout", "design", "in_progress", 24000, 2],
    ["Nordvik Atelier", "Identity guidelines", "design", "done", 8400, -9],
    ["Nordvik Atelier", "Signage pilot", "design", "in_review", 6200, 18],
    ["Brightwater Foods", "Packaging art", "design", "in_progress", 9600, 9],
    ["Halcyon Press", "Catalogue layout", "design", "in_progress", 7300, 11],
    ["Meridian Cycles", "Site build — phase 2", "development", "in_progress", 18750, 16],
    ["Saltbox Interiors", "Photography retainer", "audit", "in_progress", 4900, 22],
    ["Purslane Studio", "Rebrand discovery", "design", "backlog", 2750, 30],
  ];
  const projects = {};
  for (const [client, name, type, status, fee, due] of projectSpecs) {
    projects[name] = await call("POST", w("/projects"), {
      client_id: clients[client].id,
      name,
      type,
      status,
      priority: 2,
      assignee_id: userId,
      manager_id: userId,
      currency: "GBP",
      fee: gbp(fee),
      due_at: day(due),
      assigned_at: day(-20, 9),
      work_order: { start_at: day(-20, 9), end_at: day(due) },
    });
  }
  console.log("projects", Object.keys(projects).length);

  const taskSpecs = [
    ["Rebrand discovery", "Rebrand discovery notes", "task", [], 12, 3],
    ["Packaging art", "Packaging die-line audit", "task", [], 15, 2],
    ["Brand system rollout", "Brand system rollout", "deliverable", ["in_progress"], 2, 1],
    ["Site build — phase 2", "Site build — phase 2", "deliverable", ["in_progress"], 16, 1],
    ["Catalogue layout", "Catalogue layout", "task", ["in_progress"], 11, 2],
    ["Packaging art", "Packaging art round 3", "deliverable", ["in_progress", "in_review"], 9, 2],
    ["Photography retainer", "Shoot selects", "task", ["in_progress", "in_review"], 6, 3],
    ["Catalogue layout", "Cover typography", "task", ["in_progress", "in_review", "redo"], 4, 1],
    ["Catalogue layout", "Print spec sign-off", "task", [], 8, 1, true],
    ["Identity guidelines", "Identity guidelines", "deliverable", ["in_progress", "in_review", "done"], -9, 2],
    ["Photography retainer", "Retainer wrap", "task", ["in_progress", "in_review", "done"], -12, 2],
  ];
  for (const [project, title, type, path, due, priority, blocked] of taskSpecs) {
    let t = await call("POST", w("/tasks"), { project_id: projects[project].id, title, type, priority, assignee_id: userId, target_at: day(due) });
    for (const to of path) t = await call("POST", w(`/tasks/${t.id}/transitions`), { version: t.version, to });
    if (blocked) await call("PUT", w(`/tasks/${t.id}/blocked`), { version: t.version, is_blocked: true, reason: "Waiting on the printer's paper stock" });
  }
  console.log("tasks", taskSpecs.length);

  const invoiceSpecs = [
    ["Nordvik Atelier", "Brand system rollout", "Brand system", 14200, -3, "unpaid"],
    ["Meridian Cycles", "Site build — phase 2", "Site build", 18750, 16, "unpaid"],
    ["Brightwater Foods", "Packaging art", "Packaging art", 9600, 9, "unpaid"],
    ["Halcyon Press", "Catalogue layout", "Catalogue layout", 7300, -12, "partial"],
    ["Saltbox Interiors", "Photography retainer", "Photography retainer", 4900, -28, "paid"],
    ["Nordvik Atelier", "Identity guidelines", "Identity guidelines", 8400, -40, "paid"],
    ["Purslane Studio", "Rebrand discovery", "Rebrand discovery", 2750, 20, "draft"],
  ];
  for (const [client, project, name, amount, due, state] of invoiceSpecs) {
    let inv = await call("POST", w("/invoices"), {
      client_id: clients[client].id,
      project_id: projects[project].id,
      name,
      currency: "GBP",
      line_items: [{ description: name, quantity_milli: 1000, unit_amount: gbp(amount) }],
      due_at: day(due),
    });
    if (state === "draft") continue;
    inv = await call("POST", w(`/invoices/${inv.id}/issue`), { version: inv.version, due_at: day(due) });
    if (state === "paid" || state === "partial") {
      await call(
        "POST",
        w(`/obligations/${inv.obligation_id}/payments`),
        { kind: "payment", amount: state === "paid" ? gbp(amount) : gbp(amount / 2), currency: "GBP", method: "bank_transfer", paid_at: day(due - 1) },
        { "Idempotency-Key": randomUUID() },
      );
    }
  }
  console.log("invoices", invoiceSpecs.length);

  const vendor = await call("POST", w("/vendors"), { name: "Harbour Insurance", kind: "company", email: "billing@harbour.test", currency: "GBP" });
  const printer = await call("POST", w("/vendors"), { name: "Fenwick Printers", kind: "company", currency: "GBP" });
  await call("POST", w("/obligations"), { title: "Studio insurance renewal", counterparty_kind: "vendor", counterparty_id: vendor.id, amount: gbp(1880), currency: "GBP", due_at: day(4) });
  await call("POST", w("/obligations"), {
    title: "Print run deposit",
    counterparty_kind: "vendor",
    counterparty_id: printer.id,
    project_id: projects["Catalogue layout"].id,
    amount: gbp(3400),
    currency: "GBP",
    due_at: day(11),
  });
  console.log("payables", 2);

  for (const [project, offset, minutes] of [
    ["Brand system rollout", -1, 240],
    ["Site build — phase 2", -2, 420],
    ["Catalogue layout", 0, 180],
    ["Packaging art", -3, 300],
  ]) {
    await call("POST", w("/time-entries"), { project_id: projects[project].id, work_date: ymd(offset), minutes, billable: true, hourly_rate: gbp(85) });
  }
  console.log("time entries", 4);
  console.log("done — sign in at http://localhost:3000/login as", OWNER.email);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
