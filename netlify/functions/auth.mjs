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

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
