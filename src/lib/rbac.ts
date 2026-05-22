import { getWagateClient } from './supabase-rest'

export type PermissionKey = 'wa_connect' | 'wa_send' | 'wa_blast' | 'templates' | 'chatbot' | 'content' | 'api_keys' | 'users'

export interface PermissionSet {
  wa_connect: boolean
  wa_send: boolean
  wa_blast: boolean
  templates: boolean
  chatbot: boolean
  content: boolean
  api_keys: boolean
  users: boolean
}

export interface UserRoleWithPermissions {
  id: string
  name: string
  permissions: PermissionSet
}

interface UserRoleWagateRow {
  role_id: string
}

interface RoleWagateRow {
  id: string
  name: string
  permissions: PermissionSet
}

export async function getUserRoles(userId: string): Promise<UserRoleWithPermissions[]> {
  const client = getWagateClient()

  const userRoles = await client.select<UserRoleWagateRow>('user_roles_wagate', {
    select: 'role_id',
    filter: { user_id: `eq.${userId}` },
  })

  const roleIds = [...new Set(userRoles.map((userRole) => userRole.role_id))]
  if (roleIds.length === 0) return []

  const roles = await client.select<RoleWagateRow>('roles_wagate', {
    select: 'id,name,permissions',
    filter: { id: `in.(${roleIds.join(',')})` },
  })

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.permissions,
  }))
}

export function hasPermission(roles: UserRoleWithPermissions[], permission: PermissionKey): boolean
export function hasPermission(userId: string, permission: PermissionKey): Promise<boolean>
export function hasPermission(
  userIdOrRoles: string | UserRoleWithPermissions[],
  permission: PermissionKey,
): boolean | Promise<boolean> {
  if (typeof userIdOrRoles !== 'string') {
    return userIdOrRoles.some((role) => role.permissions[permission] === true)
  }

  return getUserRoles(userIdOrRoles).then((roles) => roles.some((role) => role.permissions[permission] === true))
}
