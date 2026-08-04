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
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env not found at', envPath);
    process.exit(1);
  }
  const env = parseEnv(envPath);

  const pubUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = env['Database password'] || env.DATABASE_PASSWORD || env.POSTGRES_PASSWORD || env.SUPABASE_DB_PASSWORD || env.DB_PASSWORD;
  if (!pubUrl || !dbPassword) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or database password in .env');
    process.exit(1);
  }

  const m = pubUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  if (!m) {
    console.error('Unable to parse project ref from NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
  const projectRef = m[1];
  const host = `db.${projectRef}.supabase.co`;

  const client = new Client({
    host,
    port: 5432,
    user: 'postgres',
    password: dbPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('Failed to connect to the database:', err.message || err);
    process.exit(1);
  }

  // Apply all SQL files in supabase/migrations in alphabetical order
  const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
  let files = [];
  if (fs.existsSync(migrationsDir)) {
    files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(f => path.join(migrationsDir, f));
  } else {
    console.warn('No migrations directory found at', migrationsDir);
  }

  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.warn('Skipping missing file', f);
      continue;
    }
    console.log('Applying', f);
    const sql = fs.readFileSync(f, 'utf8');
    try {
      // Run entire file content as a single multi-statement query
      await client.query(sql);
      console.log('Applied', f);
    } catch (err) {
      console.error('Error applying', f, '\n', err && err.message ? err.message : err);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('All migrations applied successfully');
}

run();
