import { randomUUID } from 'crypto'
import { pool } from '@/lib/db'
import { adminSessionFromRequest, verifyUploadRequest } from '@/lib/auth-utils'
import { isRecord, readJsonBody, sanitizeText } from '@/lib/input-validation'

export const runtime = 'nodejs'

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
async function isAdmin(request: Request) {
  return verifyUploadRequest(request)
}
function mapRow(row: any) {
  const type = row.action === 'created' ? 'create' : row.action === 'deleted' ? 'delete' : row.action === 'status_changed' ? 'status' : row.action === 'settings_updated' ? 'settings' : row.action === 'login' ? 'login' : row.action === 'logout' ? 'logout' : 'edit'
  return { id: String(row.id), datetime: String(row.created_at), activity: row.action, description: row.description, section: row.entity_type, type, entityId: row.entity_id, actor: row.actor ?? 'system', ip: null, country: null }
}
function mapLoginEvent(row: any) {
  const activity = row.event_type === 'page_view'
    ? 'login_page_view'
    : row.outcome === 'logout'
      ? 'logout'
      : `login_${row.outcome}`
  const location = [row.ip_address, row.country_code].filter(Boolean).join(' · ')
  return {
    id: `login-${row.id}`,
    datetime: String(row.created_at),
    activity,
    description: `${row.username ?? 'Unknown account'}${location ? ` — ${location}` : ''}`,
    section: 'Admin sign-in',
    type: row.outcome === 'logout' ? 'logout' : 'login',
    actor: row.username ?? 'unknown',
    ip: row.ip_address ?? null,
    country: row.country_code ?? null,
  }
}

export async function GET(request: Request) {
  const session = await adminSessionFromRequest(request)
  if (!session || session.mustChangePassword) return json({ error: 'Unauthorized' }, 401)
  try {
    const condition = session.role === 'super_admin' ? '' : ' WHERE actor = $1'
    const values = session.role === 'super_admin' ? [] : [session.username]
    const [audit, logins] = await Promise.all([
      pool.query(`SELECT * FROM audit_logs${condition} ORDER BY created_at DESC LIMIT 500`, values),
      session.role === 'super_admin'
        ? pool.query('SELECT * FROM admin_login_events ORDER BY created_at DESC LIMIT 500')
        : Promise.resolve({ rows: [] }),
    ])
    const events = [...audit.rows.map(mapRow), ...logins.rows.map(mapLoginEvent)]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
      .slice(0, 500)
    return json(events)
  }
  catch (error) { console.error('[audit][GET] error', error); return json({ error: 'Failed to load audit trail' }, 500) }
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return json({ error: 'Unauthorized' }, 401)
  const session = await adminSessionFromRequest(request)
  if (!session) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await readJsonBody(request)
    if (!isRecord(body)) return json({ error: 'Invalid audit record' }, 400)
    if (['action', 'entityType', 'entityId', 'description'].some((field) => body[field] != null && typeof body[field] !== 'string'))
      return json({ error: 'Audit fields must be text' }, 400)
    const action = sanitizeText(body.action)
    const entityType = sanitizeText(body.entityType)
    const entityId = sanitizeText(body.entityId)
    const description = sanitizeText(body.description)
    if (!action || !entityType || !description) return json({ error: 'Audit action, entity type, and description are required' }, 400)
    if (action.length > 100 || entityType.length > 100 || entityId.length > 200 || description.length > 2000)
      return json({ error: 'Audit fields exceed the allowed length' }, 400)
    const result = await pool.query('INSERT INTO audit_logs (id, action, entity_type, entity_id, description, actor, created_at) VALUES ($1,$2,$3,$4,$5,$6,now()) RETURNING *', [randomUUID(), action, entityType, entityId || null, description, session.username])
    return json(mapRow(result.rows[0]), 201)
  } catch (error) { console.error('[audit][POST] error', error); return json({ error: 'Failed to write audit record' }, 500) }
}
