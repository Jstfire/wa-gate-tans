import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getWagateClient, getIndukClient } from '../../lib/supabase-rest'

interface AkunPengguna {
  id: number
  username: string
  email: string
  pegawai_id: string | null
}

interface RolePermissions {
  wa_connect: boolean
  wa_send: boolean
  wa_blast: boolean
  templates: boolean
  chatbot: boolean
  content: boolean
  api_keys: boolean
  users: boolean
}

interface RoleRow {
  id: string
  name: string
  permissions: RolePermissions
  created_at: string
  updated_at: string | null
}

interface UserRoleRow {
  id: string
  user_id: string
  role_id: string
  created_at: string
}

const users = new Hono()

users.use('*', authMiddleware)

users.get('/', requirePermission('users'), async (c) => {
  try {
    const client = getIndukClient()
    const rows = await client.select<AkunPengguna>('akun_pengguna', {
      select: 'id,username,email,pegawai_id',
      order: 'username.asc',
    })
    return c.json({ data: rows })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return c.json({ error: 'Failed to fetch users', detail: msg }, 500)
  }
})

users.get('/roles', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const rows = await client.select<RoleRow>('roles_wagate', { order: 'created_at.desc' })
    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch roles' }, 500)
  }
})

users.post('/roles', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const body = await c.req.json<Record<string, unknown>>()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'Field "name" is required' }, 400)
    }
    if (typeof body.permissions !== 'object' || body.permissions === null) {
      return c.json({ error: 'Field "permissions" is required' }, 400)
    }

    const p = body.permissions as Record<string, boolean>
    const permissions: RolePermissions = {
      wa_connect: p.wa_connect ?? false,
      wa_send: p.wa_send ?? false,
      wa_blast: p.wa_blast ?? false,
      templates: p.templates ?? false,
      chatbot: p.chatbot ?? false,
      content: p.content ?? false,
      api_keys: p.api_keys ?? false,
      users: p.users ?? false,
    }

    const [row] = await client.insert<RoleRow>('roles_wagate', {
      name: body.name.trim(),
      permissions: permissions as unknown as Record<string, string>,
    })

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to create role' }, 500)
  }
})

users.put('/roles/:id', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id')
    const body = await c.req.json<Record<string, unknown>>()

    const updateData: Record<string, string | boolean | Record<string, boolean>> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim()
    }
    if (typeof body.permissions === 'object' && body.permissions !== null) {
      const p = body.permissions as Record<string, boolean>
      updateData.permissions = {
        wa_connect: p.wa_connect ?? false,
        wa_send: p.wa_send ?? false,
        wa_blast: p.wa_blast ?? false,
        templates: p.templates ?? false,
        chatbot: p.chatbot ?? false,
        content: p.content ?? false,
        api_keys: p.api_keys ?? false,
        users: p.users ?? false,
      }
    }

    const [row] = await client.update<RoleRow>('roles_wagate', updateData, { id: `eq.${id}` })
    if (!row) return c.json({ error: 'Role not found' }, 404)
    return c.json(row)
  } catch {
    return c.json({ error: 'Failed to update role' }, 500)
  }
})

users.delete('/roles/:id', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id')
    const [row] = await client.delete<RoleRow>('roles_wagate', { id: `eq.${id}` })
    if (!row) return c.json({ error: 'Role not found' }, 404)
    return c.json({ message: 'Role deleted' })
  } catch {
    return c.json({ error: 'Failed to delete role' }, 500)
  }
})

users.get('/:userId/roles', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const userId = c.req.param('userId')

    const userRoles = await client.select<UserRoleRow>('user_roles_wagate', {
      filter: { user_id: `eq.${userId}` },
    })

    if (userRoles.length === 0) return c.json({ data: [] })

    const roleIds = userRoles.map((ur) => ur.role_id)
    const roles = await client.select<RoleRow>('roles_wagate', {
      filter: { id: `in.(${roleIds.join(',')})` },
    })

    const roleMap = new Map(roles.map((r) => [r.id, r]))

    const data = userRoles.map((ur) => {
      const role = roleMap.get(ur.role_id)
      return {
        id: ur.id,
        role_id: ur.role_id,
        role_name: role?.name ?? null,
        permissions: role?.permissions ?? null,
        assigned_at: ur.created_at,
      }
    })

    return c.json({ data })
  } catch {
    return c.json({ error: 'Failed to fetch user roles' }, 500)
  }
})

users.post('/:userId/roles', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const userId = c.req.param('userId') ?? ''
    const body = await c.req.json<Record<string, unknown>>()

    if (typeof body.roleId !== 'string' || !body.roleId.trim()) {
      return c.json({ error: 'Field "roleId" is required' }, 400)
    }

    const roleId = String(body.roleId)
    const role = await client.selectOne<RoleRow>('roles_wagate', { filter: { id: `eq.${roleId}` } })
    if (!role) return c.json({ error: 'Role not found' }, 404)

    const [row] = await client.insert<UserRoleRow>('user_roles_wagate', {
      user_id: userId,
      role_id: roleId,
    })

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to assign role' }, 500)
  }
})

users.delete('/:userId/roles/:roleId', requirePermission('users'), async (c) => {
  try {
    const client = getWagateClient()
    const userId = c.req.param('userId')
    const roleId = c.req.param('roleId')

    const [row] = await client.delete<UserRoleRow>('user_roles_wagate', {
      user_id: `eq.${userId}`,
      role_id: `eq.${roleId}`,
    })

    if (!row) return c.json({ error: 'User role assignment not found' }, 404)
    return c.json({ message: 'Role removed from user' })
  } catch {
    return c.json({ error: 'Failed to remove role' }, 500)
  }
})

export default users
