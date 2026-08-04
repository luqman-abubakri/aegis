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

async function main() {
  const repoRoot = path.join(__dirname, '..');
  const env = parseEnv(path.join(repoRoot, '.env'));
  const pubUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = env['Database password'] || env.DATABASE_PASSWORD || env.POSTGRES_PASSWORD || env.SUPABASE_DB_PASSWORD || env.DB_PASSWORD;
  if (!pubUrl || !dbPassword) {
    throw new Error('Missing DB connection info');
  }
  const m = pubUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  if (!m) throw new Error('Bad Supabase URL');
  const host = `db.${m[1]}.supabase.co`;
  const client = new Client({ host, port: 5432, user: 'postgres', password: dbPassword, database: 'postgres', ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = ['profiles','interviews','feedback','resume_uploads','learning_roadmaps'];
  console.log('TABLES:');
  for (const t of tables) {
    const r = await client.query(`SELECT to_regclass('public.${t}') AS exists`);
    console.log(`  ${t}:`, r.rows[0].exists !== null);
  }

  console.log('\nCOLUMNS for interviews:');
  const cols = await client.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' ORDER BY ordinal_position`);
  for (const row of cols.rows) console.log(`  ${row.column_name} ${row.data_type} ${row.is_nullable}`);

  console.log('\nPOLICIES:');
  const policies = await client.query(`SELECT table_schema, table_name, policy_name, permissive, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_check FROM pg_policies WHERE schemaname='public' ORDER BY table_name, policy_name`);
  for (const row of policies.rows) console.log(`  ${row.table_name}.${row.policy_name} [${row.cmd}] using=${row.has_using} check=${row.has_check}`);

  console.log('\nFUNCTIONS:');
  const funcs = await client.query(`SELECT proname, prosrc FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace=pg_namespace.oid WHERE nspname='public' AND proname IN ('set_updated_at','handle_new_user')`);
  for (const row of funcs.rows) console.log(`  ${row.proname}: ${row.prosrc.slice(0, 120).replace(/\s+/g,' ')}...`);

  console.log('\nTRIGGERS:');
  const triggers = await client.query(`SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name`);
  for (const row of triggers.rows) console.log(`  ${row.event_object_table}.${row.trigger_name} ${row.action_timing} ${row.event_manipulation} ${row.action_statement}`);

  console.log('\nSTORAGE BUCKETS:');
  const buckets = await client.query(`SELECT id, name, public FROM storage.buckets ORDER BY id`);
  for (const row of buckets.rows) console.log(`  ${row.id} ${row.name} public=${row.public}`);

  console.log('\nSTORAGE POLICIES:');
  const storagePolicies = await client.query(`SELECT table_schema, table_name, policy_name, cmd FROM pg_policies WHERE schemaname='storage' ORDER BY policy_name`);
  for (const row of storagePolicies.rows) console.log(`  ${row.table_name}.${row.policy_name} [${row.cmd}]`);

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
