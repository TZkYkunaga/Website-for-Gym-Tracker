import { neon } from '@netlify/neon';

const sql = neon();

export const handler = async (event) => {
  try {
    const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
    const token = auth && auth.replace(/^Bearer\s+/i, '');
    const ADMIN = process.env.ADMIN_TOKEN;
    if (!ADMIN || !token || token !== ADMIN) {
      return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
    }

    // simple dump of users table
    const rows = await sql`SELECT id, username FROM users ORDER BY id`;
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
