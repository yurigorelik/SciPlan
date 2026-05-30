"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function AdminDashboard({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const regularUsers = users.filter((u) => u.role !== "ADMIN");

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => bulk("blockAll")}
          disabled={busy !== null || regularUsers.length === 0}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          Block all users
        </button>
        <button
          onClick={() => bulk("unblockAll")}
          disabled={busy !== null || regularUsers.length === 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Unblock all
        </button>
        <button
          onClick={() => bulk("deleteAll")}
          disabled={busy !== null || regularUsers.length === 0}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Delete all users
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
    </div>
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
