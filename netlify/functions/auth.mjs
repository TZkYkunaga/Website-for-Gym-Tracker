import { neon } from '@netlify/neon';

const sql = neon(); // uses NETLIFY_DATABASE_URL env var

export const handler = async (event) => {
  try {
    const method = event.httpMethod;
    const url = new URL(event.rawUrl || (`https://dummy${event.path}`));
    const action = url.searchParams.get('action'); // ?action=signup or ?action=signin

    if (method !== 'POST' || !action) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const username = (body.username || '').trim();
    const password = body.password || '';

    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing credentials' }) };
    }

    if (action === 'signup') {
      // check exists
      const [existing] = await sql`SELECT id FROM users WHERE lower(username)=lower(${username})`;
      if (existing) return { statusCode: 409, body: JSON.stringify({ error: 'exists' }) };

      // insert
      const [ins] = await sql`INSERT INTO users(username, password) VALUES (${username}, ${password}) RETURNING id`;
      return { statusCode: 201, body: JSON.stringify({ id: ins.id, username }) };
    }

    if (action === 'signin') {
      const [row] = await sql`SELECT id, username FROM users WHERE username=${username} AND password=${password}`;
      if (!row) return { statusCode: 401, body: JSON.stringify({ error: 'invalid' }) };
      return { statusCode: 200, body: JSON.stringify({ id: row.id, username: row.username }) };
    }

    // Admin actions: list, create (admin), delete
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    // helper to verify admin: either token or admin credentials in body
    async function isAdminRequest(eventBody){
      // token header?
      const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
      const token = auth && auth.replace(/^Bearer\s+/i, '');
      if (ADMIN_TOKEN && token && token === ADMIN_TOKEN) return true;

      // fallback: if ADMIN_TOKEN not set, allow admin by verifying body.adminUsername/adminPassword against DB user 'admin'
      const auser = (eventBody && eventBody.adminUsername) ? String(eventBody.adminUsername).trim() : null;
      const apass = (eventBody && eventBody.adminPassword) ? String(eventBody.adminPassword) : null;
      if (!auser || !apass) return false;
      // check DB for 'admin' user
      const [row] = await sql`SELECT id FROM users WHERE username=${auser} AND password=${apass}`;
      return !!row && auser.toLowerCase() === 'admin';
    }

    if (action === 'list') {
      if (!(await isAdminRequest(body))) return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
      const rows = await sql`SELECT id, username FROM users ORDER BY id`;
      return { statusCode: 200, body: JSON.stringify(rows) };
    }

    if (action === 'create') {
      if (!(await isAdminRequest(body))) return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
      // body should contain username/password
      const [existing] = await sql`SELECT id FROM users WHERE lower(username)=lower(${username})`;
      if (existing) return { statusCode: 409, body: JSON.stringify({ error: 'exists' }) };
      const [ins] = await sql`INSERT INTO users(username, password) VALUES (${username}, ${password}) RETURNING id, username`;
      return { statusCode: 201, body: JSON.stringify(ins) };
    }

    if (action === 'delete') {
      if (!(await isAdminRequest(body))) return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
      const id = body.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'missing id' }) };
      await sql`DELETE FROM users WHERE id=${id}`;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
