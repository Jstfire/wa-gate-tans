import { Hono } from 'hono'
import { eq, desc, sql  } from 'drizzle-orm'
import { db, dbInduk } from '../../db'
import { roles_wagate, user_roles_wagate } from '../../db/schema'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

const users = new Hono()

users.use('*', authMiddleware)

// GET /users — list users from dbInduk (read-only)
users.get('/', requirePermission('users'), async (c) => {
  try {
    const rows = await dbInduk.execute(
      sql`SELECT id, username, email, nama, is_active FROM users ORDER BY username ASC`
    )
    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// --- Role routes (static paths BEFORE dynamic /:id routes) ---

// GET /users/roles — list all roles
users.get('/roles', requirePermission('users'), async (c) => {
  try {
    const rows = await db.select().from(roles_wagate)
      .orderBy(desc(roles_wagate.createdAt))
    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch roles' }, 500)
  }
})

// POST /users/roles — create role
users.post('/roles', requirePermission('users'), async (c) => {
  try {
    const body = await c.req.json()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'Field "name" is required' }, 400)
    }
    if (typeof body.permissions !== 'object' || body.permissions === null) {
      return c.json({ error: 'Field "permissions" is required' }, 400)
    }

    const p = body.permissions as Record<string, boolean>
    const [row] = await db.insert(roles_wagate).values({
      name: body.name.trim(),
      permissions: {
        wa_connect: p.wa_connect ?? false,
        wa_send: p.wa_send ?? false,
        wa_blast: p.wa_blast ?? false,
        templates: p.templates ?? false,
        chatbot: p.chatbot ?? false,
        content: p.content ?? false,
        api_keys: p.api_keys ?? false,
        users: p.users ?? false,
      },
    }).returning()

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to create role' }, 500)
  }
})

// PUT /users/roles/:id — update role
users.put('/roles/:id', requirePermission('users'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const body = await c.req.json()

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

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

    const [row] = await db.update(roles_wagate)
      .set(updateData)
      .where(eq(roles_wagate.id, id))
      .returning()

    if (!row) return c.json({ error: 'Role not found' }, 404)
    return c.json(row)
  } catch {
    return c.json({ error: 'Failed to update role' }, 500)
  }
})

// DELETE /users/roles/:id — delete role
users.delete('/roles/:id', requirePermission('users'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const [row] = await db.delete(roles_wagate)
      .where(eq(roles_wagate.id, id))
      .returning()

    if (!row) return c.json({ error: 'Role not found' }, 404)
    return c.json({ message: 'Role deleted' })
  } catch {
    return c.json({ error: 'Failed to delete role' }, 500)
  }
})

// --- User-role assignment routes (dynamic /:id paths) ---

// GET /users/:id/roles — get roles for a user
users.get('/:id/roles', requirePermission('users'), async (c) => {
  try {
    const userId = c.req.param('id') as string
    const rows = await db
      .select({
        id: user_roles_wagate.id,
        roleId: user_roles_wagate.roleId,
        roleName: roles_wagate.name,
        permissions: roles_wagate.permissions,
        assignedAt: user_roles_wagate.createdAt,
      })
      .from(user_roles_wagate)
      .innerJoin(roles_wagate, eq(user_roles_wagate.roleId, roles_wagate.id))
      .where(eq(user_roles_wagate.userId, userId))

    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch user roles' }, 500)
  }
})

// POST /users/:id/roles — assign role to user
users.post('/:id/roles', requirePermission('users'), async (c) => {
  try {
    const userId = c.req.param('id') as string
    const body = await c.req.json()

    if (typeof body.roleId !== 'string' || !body.roleId.trim()) {
      return c.json({ error: 'Field "roleId" is required' }, 400)
    }

    const [role] = await db.select().from(roles_wagate)
      .where(eq(roles_wagate.id, body.roleId)).limit(1)

    if (!role) return c.json({ error: 'Role not found' }, 404)

    const [row] = await db.insert(user_roles_wagate).values({
      userId,
      roleId: body.roleId,
    }).returning()

    return c.json(row, 201)
  } catch {
    return c.json({ error: 'Failed to assign role' }, 500)
  }
})

// DELETE /users/:id/roles/:roleId — remove role from user
users.delete('/:id/roles/:roleId', requirePermission('users'), async (c) => {
  try {
    const userId = c.req.param('id') as string
    const roleId = c.req.param('roleId') as string

    const [row] = await db.delete(user_roles_wagate)
      .where(
        sql`${user_roles_wagate.userId} = ${userId} AND ${user_roles_wagate.roleId} = ${roleId}`
      )
      .returning()

    if (!row) return c.json({ error: 'User role assignment not found' }, 404)
    return c.json({ message: 'Role removed from user' })
  } catch {
    return c.json({ error: 'Failed to remove role' }, 500)
  }
})

export default users
