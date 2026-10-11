"use client";

import { useActionState, useState } from "react";
import { addUser, editUser, resetUserPassword } from "@/app/admin-actions";
import { Field, Message } from "@/app/login/forms";
import type { User } from "@/lib/auth";

export function UsersAdmin({ users, meId }: { users: User[]; meId: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Last sign-in</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserRow key={u.id} user={u} isMe={u.id === meId} />
            ))}
          </tbody>
        </table>
      </div>
      {adding ? <AddUser onDone={() => setAdding(false)} /> : <button className="btn-primary" onClick={() => setAdding(true)}>Add user</button>}
    </div>
  );
}

function UserRow({ user, isMe }: { user: User; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className={user.active ? "" : "text-slate-400"}>
        <td className="px-4 py-2.5 font-medium">
          {user.first_name} {user.last_name}
          {isMe && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
        </td>
        <td className="px-4 py-2.5">{user.email}</td>
        <td className="px-4 py-2.5">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${user.role === "admin" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-700"}`}>
            {user.role === "admin" ? "Admin" : "User"}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs">{user.active ? <span className="text-emerald-700">Active</span> : "Inactive"}</td>
        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
          {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}
        </td>
        <td className="px-4 py-2.5 text-right">
          <button className="text-sm text-brand-700 hover:underline" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Edit"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-slate-50 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <EditUser user={user} isMe={isMe} />
              <ResetPassword user={user} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function RoleSelect({ defaultValue, disabled }: { defaultValue: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
      <select name="role" className="input" defaultValue={defaultValue} disabled={disabled}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      {/* A disabled select isn't submitted; keep the value. */}
      {disabled && <input type="hidden" name="role" value={defaultValue} />}
    </label>
  );
}

function EditUser({ user, isMe }: { user: User; isMe: boolean }) {
  const [state, action, pending] = useActionState(editUser, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" name="first_name" defaultValue={user.first_name} />
        <Field label="Last name" name="last_name" defaultValue={user.last_name} />
        <Field label="Email" name="email" type="email" defaultValue={user.email} />
        <RoleSelect defaultValue={user.role} disabled={isMe} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={user.active} disabled={isMe} className="size-4 accent-brand-600" />
        {isMe && <input type="hidden" name="active" value="on" />}
        Active (can sign in)
      </label>
      {isMe && <p className="text-xs text-slate-500">You can’t change your own role or deactivate yourself.</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <Message state={state} />
      </div>
    </form>
  );
}

function ResetPassword({ user }: { user: User }) {
  const [state, action, pending] = useActionState(resetUserPassword, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={user.id} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" />
      <p className="text-xs text-slate-500">Signs them out everywhere. Tell them the new password.</p>
      <button className="btn-secondary" disabled={pending}>{pending ? "Resetting…" : "Reset password"}</button>
      <Message state={state} />
    </form>
  );
}

function AddUser({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(addUser, {});
  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="text-base font-semibold text-brand-900">Add user</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" name="first_name" />
        <Field label="Last name" name="last_name" />
        <Field label="Email" name="email" type="email" />
        <RoleSelect defaultValue="user" />
        <Field label="Temporary password (8+ characters)" name="password" type="password" autoComplete="new-password" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add user"}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Done</button>
        <Message state={state} />
      </div>
    </form>
  );
}
