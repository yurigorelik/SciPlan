"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Markdown from "./Markdown";

export interface AdminPlan {
  id: string;
  title: string;
  updatedAt: string;
  finalized: boolean;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "USER" | "ADMIN";
  blocked: boolean;
  createdAt: string;
  plans: AdminPlan[];
}

export type ResearchStatus = "draft" | "processing" | "done" | "error";

export interface AdminResearch {
  id: string;
  title: string;
  owner: string;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
  status: ResearchStatus;
  summary: string;
}

type Tab = "users" | "research";

export default function AdminDashboard({
  initialUsers,
  currentUserId,
  research,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
  research: AdminResearch[];
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState(initialUsers);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const regularUsers = users.filter((u) => u.role !== "ADMIN");
  const stats = {
    users: users.length,
    blocked: users.filter((u) => u.blocked).length,
    plans: research.length,
    finalized: research.filter((r) => r.status === "done").length,
  };

  async function setBlocked(id: string, blocked: boolean) {
    setBusy(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, blocked } : u)),
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user and all of their plans? This cannot be undone.")) {
      return;
    }
    setBusy(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function bulk(action: "deleteAll" | "blockAll" | "unblockAll") {
    const labels = {
      deleteAll: "delete ALL non-admin users and their plans",
      blockAll: "block ALL non-admin users",
      unblockAll: "unblock ALL non-admin users",
    };
    if (!confirm(`Are you sure you want to ${labels[action]}? This cannot be undone.`)) {
      return;
    }
    setBusy("bulk");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (action === "deleteAll") {
        setUsers((prev) => prev.filter((u) => u.role === "ADMIN"));
      } else {
        const blocked = action === "blockAll";
        setUsers((prev) =>
          prev.map((u) => (u.role !== "ADMIN" ? { ...u, blocked } : u)),
        );
      }
      setMsg(`Done — affected ${json.count} user(s).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Blocked" value={stats.blocked} tone="amber" />
        <StatCard label="Research plans" value={stats.plans} />
        <StatCard label="Finalized" value={stats.finalized} tone="emerald" />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex w-fit gap-px border border-slate-300 bg-slate-300">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          Users
        </TabButton>
        <TabButton active={tab === "research"} onClick={() => setTab("research")}>
          Submitted research
          <span className="ml-1.5 border border-current/20 px-1.5 font-mono text-[10px]">
            {research.length}
          </span>
        </TabButton>
      </div>

      {tab === "users" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => bulk("blockAll")}
              disabled={busy !== null || regularUsers.length === 0}
              className="btn btn-xs border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
            >
              Block all users
            </button>
            <button
              onClick={() => bulk("unblockAll")}
              disabled={busy !== null || regularUsers.length === 0}
              className="btn btn-secondary btn-xs px-3 py-1.5 text-sm"
            >
              Unblock all
            </button>
            <button
              onClick={() => bulk("deleteAll")}
              disabled={busy !== null || regularUsers.length === 0}
              className="btn btn-xs border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
            >
              Delete all users
            </button>
            {msg && <span className="text-sm text-slate-500">{msg}</span>}
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-label text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Plans</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No users yet.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === currentUserId}
                    busy={busy === u.id}
                    expanded={expanded === u.id}
                    onToggleExpand={() =>
                      setExpanded((e) => (e === u.id ? null : u.id))
                    }
                    onBlock={(b) => setBlocked(u.id, b)}
                    onDelete={() => deleteUser(u.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <ResearchTable research={research} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "emerald";
}) {
  const tones = {
    slate: "text-slate-900",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="card px-4 py-3">
      <p className="eyebrow">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 font-mono text-[11px] uppercase tracking-label transition ${
        active
          ? "bg-brand-700 text-white"
          : "bg-white text-slate-500 hover:bg-citron-50 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

const STATUS_META: Record<
  ResearchStatus,
  { label: string; className: string }
> = {
  done: { label: "Finalized", className: "bg-emerald-50 text-emerald-700" },
  processing: { label: "Finalizing…", className: "bg-brand-50 text-brand-700" },
  error: { label: "Review failed", className: "bg-red-50 text-red-700" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-500" },
};

function ResearchTable({ research }: { research: AdminResearch[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ResearchStatus>("all");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return research.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        (r.ownerName ?? "").toLowerCase().includes(q)
      );
    });
  }, [research, query, statusFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or user…"
          className="field w-64 py-1.5"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ResearchStatus)}
          className="field w-auto py-1.5"
        >
          <option value="all">All statuses</option>
          <option value="done">Finalized</option>
          <option value="processing">Finalizing</option>
          <option value="draft">Draft</option>
          <option value="error">Review failed</option>
        </select>
        <span className="text-xs text-slate-400">
          {filtered.length} of {research.length} plan(s)
        </span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-label text-slate-500">
            <tr>
              <th className="px-4 py-3">Research plan</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No research plans match.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const meta = STATUS_META[r.status];
              const isOpen = open === r.id;
              return (
                <ResearchRow
                  key={r.id}
                  r={r}
                  meta={meta}
                  isOpen={isOpen}
                  onToggle={() => setOpen((o) => (o === r.id ? null : r.id))}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResearchRow({
  r,
  meta,
  isOpen,
  onToggle,
}: {
  r: AdminResearch;
  meta: { label: string; className: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3">
          <p className="font-medium text-slate-900">{r.title}</p>
          <p className="text-xs text-slate-400">
            created {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </td>
        <td className="px-4 py-3">
          <p className="text-slate-700">{r.ownerName || "(no name)"}</p>
          <p className="text-xs text-slate-400">{r.owner}</p>
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-500">
          {new Date(r.updatedAt).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            {r.summary && (
              <button
                onClick={onToggle}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
              >
                {isOpen ? "Hide summary ▲" : "Summary ▾"}
              </button>
            )}
            <Link
              href={`/plan/${r.id}`}
              className="rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              Open →
            </Link>
          </div>
        </td>
      </tr>
      {isOpen && r.summary && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-6 py-4">
            <div className="max-h-96 overflow-y-auto border border-slate-200 bg-white p-5">
              <Markdown>{r.summary}</Markdown>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function UserRow({
  user,
  isSelf,
  busy,
  expanded,
  onToggleExpand,
  onBlock,
  onDelete,
}: {
  user: AdminUser;
  isSelf: boolean;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onBlock: (blocked: boolean) => void;
  onDelete: () => void;
}) {
  const isAdmin = user.role === "ADMIN";
  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900">
            {user.name || "(no name)"}
          </div>
          <div className="text-xs text-slate-400">{user.email}</div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isAdmin
                ? "bg-brand-50 text-brand-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {user.role}
          </span>
        </td>
        <td className="px-4 py-3">
          {user.blocked ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Blocked
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Active
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={onToggleExpand}
            disabled={user.plans.length === 0}
            className="text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline"
          >
            {user.plans.length} {expanded ? "▲" : "▾"}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            {!isAdmin && (
              <button
                onClick={() => onBlock(!user.blocked)}
                disabled={busy}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {user.blocked ? "Unblock" : "Block"}
              </button>
            )}
            {!isAdmin && !isSelf && (
              <button
                onClick={onDelete}
                disabled={busy}
                className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-4 py-3">
            <ul className="space-y-1">
              {user.plans.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <span className="font-medium text-slate-800">{p.title}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      updated {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                    {p.finalized && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        finalized
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/plan/${p.id}`}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    View (read-only) →
                  </Link>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
