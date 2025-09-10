import { Pool } from "pg";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function pg<T=any>(q: string, p: any[] = []) {
  const c = await pool.connect();
  try { return await c.query<T>(q, p); } finally { c.release(); }
}
