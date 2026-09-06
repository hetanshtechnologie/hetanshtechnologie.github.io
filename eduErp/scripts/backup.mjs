const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SKEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';

if (!SKEY) {
  console.error('Usage: set SUPABASE_SERVICE_KEY=<your_key> then run this script');
  console.error('Find key at: Supabase Dashboard > Project Settings > API > service_role key');
  process.exit(1);
}

const HEADERS = { apikey: ANON_KEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json' };

const TABLES = [
  'organizations', 'plans', 'payments',
  'profiles', 'students', 'teachers', 'classes', 'subjects', 'class_schedules',
  'attendance', 'exams', 'exam_scores', 'syllabus',
  'fees', 'donations', 'expenses', 'events',
  'assignments', 'submissions', 'notes',
  'library_books', 'library_members', 'library_transactions', 'library_fines',
  'parent_students', 'parent_communications'
];

// Skip columns that are auto-generated
const SKIP = { id: 1, created_at: 1, updated_at: 1 };

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function genInsert(table, rows, cols) {
  if (!rows.length) return '';
  const cList = cols.join(', ');
  const vals = rows.map(r => '(' + cols.map(c => escapeSQL(r[c])).join(', ') + ')').join(',\n');
  return `INSERT INTO ${table} (${cList}) VALUES\n${vals};\n\n`;
}

async function fetchAll(table) {
  let all = [];
  let from = 0;
  const limit = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${limit}&offset=${from}&order=id.asc`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      const text = await res.text();
      // Skip tables that don't exist or have no access
      if (res.status === 404 || res.status === 403 || res.status === 401) return null;
      throw new Error(`HTTP ${res.status} for ${table}: ${text}`);
    }
    const rows = await res.json();
    if (!rows || !rows.length) break;
    all = all.concat(rows);
    if (rows.length < limit) break;
    from += limit;
  }
  return all;
}

(async () => {
  console.log(`-> Backing up ${SUPABASE_URL}\n`);

  let output = '-- Supabase backup generated ' + new Date().toISOString().split('T')[0] + '\n\n';

  for (const table of TABLES) {
    process.stdout.write(`  ${table}...`);
    try {
      const rows = await fetchAll(table);
      if (rows === null) { console.log(' SKIP (no access)'); continue; }
      console.log(` ${rows.length} rows`);
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]).filter(k => !SKIP[k] && k !== 'org_id');
      output += `-- ${table}: ${rows.length} rows\n`;
      output += genInsert(table, rows, cols);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
  }

  const fs = require('fs');
  const path = require('path');
  const date = new Date().toISOString().split('T')[0];
  const dir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `backup_${date}.sql`);
  fs.writeFileSync(file, output);
  const size = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`\nDone. Saved to ${file} (${size} KB)`);
})();
