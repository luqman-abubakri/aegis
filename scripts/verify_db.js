import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function parseEnv(envPath) {
  const text = fs.readFileSync(envPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const out = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[key] = v;
  }
  return out;
}

async function run() {
  const repoRoot = path.join(__dirname, '..');
  const env = parseEnv(path.join(repoRoot, '.env'));
  const pubUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = env['Database password'] || env.DATABASE_PASSWORD || env.POSTGRES_PASSWORD || env.SUPABASE_DB_PASSWORD || env.DB_PASSWORD;
  const m = pubUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  const projectRef = m[1];
  const host = `db.${projectRef}.supabase.co`;

  const client = new Client({ host, port: 5432, user: 'postgres', password: dbPassword, database: 'postgres', ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = ['interviews','feedback','resume_uploads'];
  for (const t of tables) {
    const r = await client.query("SELECT to_regclass('public." + t + "') AS exists");
    console.log(t, 'exists?', r.rows[0].exists !== null);
  }

  const bucket = await client.query("SELECT id, name FROM storage.buckets WHERE id='resumes'");
  console.log('resumes bucket found:', bucket.rows.length > 0);

  await client.end();
}

run().catch(e=>{ console.error(e); process.exit(1); });
