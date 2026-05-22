import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'
import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { DataTable  } from '../../components/data-table/index'
import type {ColumnDef} from '../../components/data-table/index';
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/users')({
  component: UsersPage,
})

type User = {
  id: string
  username: string
  email: string
  nama: string | null
  is_active: boolean
}

type Role = {
  id: string
  name: string
  permissions: Record<string, boolean>
  createdAt: string
}

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url, { headers: authHeader() }).then((r) => {
    if (!r.ok) throw new Error('Failed')
    return r.json() as Promise<T>
  })
}

const PERMISSIONS = ['wa_connect', 'wa_send', 'wa_blast', 'templates', 'chatbot', 'content', 'api_keys', 'users']

function UsersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = createSignal<'users' | 'roles'>('users')
  const [showRoleDialog, setShowRoleDialog] = createSignal(false)
  const [editRole, setEditRole] = createSignal<Role | null>(null)
  const [roleName, setRoleName] = createSignal('')
  const [rolePerms, setRolePerms] = createSignal<Record<string, boolean>>(
    Object.fromEntries(PERMISSIONS.map((p) => [p, false]))
  )

  const usersQuery = createQuery(() => ({
    queryKey: ['users'],
    queryFn: () => fetchJson<User[]>('/api/users'),
  }))

  const rolesQuery = createQuery(() => ({
    queryKey: ['roles'],
    queryFn: () => fetchJson<Role[]>('/api/users/roles'),
  }))

  const saveRoleMutation = createMutation(() => ({
    mutationFn: async (data: { name: string; permissions: Record<string, boolean> }) => {
      const role = editRole()
      const url = role ? `/api/users/roles/${role.id}` : '/api/users/roles'
      const method = role ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setShowRoleDialog(false)
      setEditRole(null)
    },
  }))

  const deleteRoleMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/roles/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  }))

  const openCreate = () => {
    setEditRole(null)
    setRoleName('')
    setRolePerms(Object.fromEntries(PERMISSIONS.map((p) => [p, false])))
    setShowRoleDialog(true)
  }

  const openEdit = (role: Role) => {
    setEditRole(role)
    setRoleName(role.name)
    setRolePerms({ ...role.permissions })
    setShowRoleDialog(true)
  }

  const userColumns: ColumnDef<User>[] = [
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'nama', header: 'Nama' },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: (info) => <Badge variant={info.getValue() ? 'success' : 'destructive'}>{info.getValue() ? 'Aktif' : 'Nonaktif'}</Badge>,
    },
  ]

  const roleColumns: ColumnDef<Role>[] = [
    { accessorKey: 'name', header: 'Nama Role' },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: (info) => {
        const perms = info.row.original.permissions
        const active = Object.entries(perms).filter(([, v]) => v).map(([k]) => k)
        return (
          <div class="flex flex-wrap gap-1">
            <For each={active}>{(p) => <Badge variant="secondary">{p}</Badge>}</For>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: (info) => (
        <div class="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(info.row.original)}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => { if (confirm('Hapus role ini?')) deleteRoleMutation.mutate(info.row.original.id) }}>Hapus</Button>
        </div>
      ),
    },
  ]

  return (
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Users & Roles</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Kelola pengguna dan hak akses</p>
        </div>
        <Show when={tab() === 'roles'}>
          <Button onClick={openCreate}>+ Tambah Role</Button>
        </Show>
      </div>

      <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button type="button" onClick={() => setTab('users')} class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab() === 'users' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Users</button>
        <button type="button" onClick={() => setTab('roles')} class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab() === 'roles' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Roles</button>
      </div>

      <Show when={tab() === 'users'}>
        <DataTable data={usersQuery.data ?? []} columns={userColumns} loading={usersQuery.isLoading} />
      </Show>
      <Show when={tab() === 'roles'}>
        <DataTable data={rolesQuery.data ?? []} columns={roleColumns} loading={rolesQuery.isLoading} />
      </Show>

      <Show when={showRoleDialog()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{editRole() ? 'Edit Role' : 'Tambah Role'}</h2>
            <div class="flex flex-col gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Role</label>
                <input value={roleName()} onInput={(e) => setRoleName(e.currentTarget.value)} class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</label>
                <div class="grid grid-cols-2 gap-2">
                  <For each={PERMISSIONS}>{(perm) => (
                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={rolePerms()[perm]} onChange={(e) => setRolePerms({ ...rolePerms(), [perm]: e.currentTarget.checked })} />
                      {perm}
                    </label>
                  )}</For>
                </div>
              </div>
              <div class="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Batal</Button>
                <Button onClick={() => saveRoleMutation.mutate({ name: roleName(), permissions: rolePerms() })} disabled={saveRoleMutation.isPending}>Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
