import { eq } from 'drizzle-orm'
import { db } from '../db'
import { roles_wagate, user_roles_wagate } from '../db/schema'

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
  name: string
  permissions: PermissionSet
}

export async function getUserRoles(userId: string): Promise<UserRoleWithPermissions[]> {
  const rows = await db
    .select({ name: roles_wagate.name, permissions: roles_wagate.permissions })
    .from(user_roles_wagate)
    .innerJoin(roles_wagate, eq(user_roles_wagate.roleId, roles_wagate.id))
    .where(eq(user_roles_wagate.userId, userId))

  return rows
}

export async function userHasPermission(userId: string, permission: PermissionKey): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.some((role) => role.permissions[permission] === true)
}

export function hasPermission(roles: UserRoleWithPermissions[], permission: PermissionKey): boolean {
  return roles.some((role) => role.permissions[permission] === true)
}
