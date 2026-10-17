"use client";

import { useActionState, useState } from "react";
import { addUser, clearUserPassword, editUser, resetUserPassword } from "@/app/admin-actions";
import { Field, Message } from "@/app/login/forms";
import type { ListedUser as User } from "@/lib/users";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { ImportUsers } from "./ImportUsers";

export function UsersAdmin({ users, meId }: { users: User[]; meId: string }) {
  const [adding, setAdding] = useState<"one" | "import" | null>(null);
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
      {adding === "one" && <AddUser onDone={() => setAdding(null)} />}
      {adding === "import" && <ImportUsers onDone={() => setAdding(null)} />}
      {!adding && (
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setAdding("one")}>
            Add user
          </button>
          <button className="btn-secondary" onClick={() => setAdding("import")}>
            Import users
          </button>
        </div>
      )}
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
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs">
          {!user.active ? "Inactive" : user.has_password ? <span className="text-emerald-700">Active</span> : <span className="text-amber-700">Password not set</span>}
        </td>
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
              <ResetPassword user={user} isMe={isMe} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const ROLE_BADGE = {
  user: "bg-slate-100 text-slate-700",
  clinical: "bg-emerald-100 text-emerald-800",
  admin: "bg-brand-100 text-brand-700",
} as const;

function RoleSelect({ defaultValue, disabled }: { defaultValue: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
      <select name="role" className="input" defaultValue={defaultValue} disabled={disabled}>
        {ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
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

function ResetPassword({ user, isMe }: { user: User; isMe: boolean }) {
  const [state, action, pending] = useActionState(resetUserPassword, {});
  const [cleared, clear, clearing] = useActionState(clearUserPassword, {});
  if (isMe) return <p className="text-sm text-slate-600">Change your own password on your Account page.</p>;
  return (
    <div className="space-y-4">
      <form
        action={clear}
        className="space-y-2"
        onSubmit={(e) => {
          if (!window.confirm(`Clear ${user.first_name}'s password? They'll sign in with just their email and choose a new one.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={user.id} />
        <button className="btn-secondary" disabled={clearing}>
          {clearing ? "Clearing…" : "Clear password"}
        </button>
        <p className="text-xs text-slate-500">
          For a forgotten password: signs them out everywhere; they sign in with just their email and choose a new one.
        </p>
        <Message state={cleared} />
      </form>
      <form action={action} className="space-y-2 border-t border-slate-200 pt-3">
        <input type="hidden" name="id" value={user.id} />
        <Field label="Or set a temporary password" name="password" type="password" autoComplete="new-password" />
        <p className="text-xs text-slate-500">Signs them out everywhere; they must choose their own at the next sign-in.</p>
        <button className="btn-secondary" disabled={pending}>{pending ? "Resetting…" : "Set temporary password"}</button>
        <Message state={state} />
      </form>
    </div>
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
        <Field label="Temporary password (optional)" name="password" type="password" autoComplete="new-password" required={false} />
      </div>
      <p className="text-xs text-slate-500">
        Leave the password blank and they sign in with just their email the first time and choose one. Either way they set
        their own password at first sign-in.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add user"}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Done</button>
        <Message state={state} />
      </div>
    </form>
  );
}
