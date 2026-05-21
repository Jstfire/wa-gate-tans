import type { Next } from 'hono'
import type { ApiContext } from './auth'
import { getUserRoles, hasPermission  } from '../../lib/rbac'
import type {PermissionKey} from '../../lib/rbac';

export interface PermissionVariables {
  userRoles: Array<{ name: string; permissions: Record<string, boolean> }>
}

export function requirePermission(...permissions: PermissionKey[]) {
  return async (c: ApiContext, next: Next): Promise<Response | void> => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const roles = await getUserRoles(user.id)
    const hasAllPermissions = permissions.every((perm) => hasPermission(roles, perm))

    if (!hasAllPermissions) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403)
    }

    await next()
  }
}
