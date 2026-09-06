import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TABLES = [
  'chart_of_accounts', 'parties', 'products', 'product_variants',
  'invoices', 'invoice_lines', 'payments', 'inventory_batches',
  'journal_entries', 'journal_lines', 'godowns',
  'gst_records', 'gst_itc', 'gst_payments',
  'tds_rates', 'tds_certificates', 'tds_challans',
  'cost_centres', 'budgets', 'payment_reminders',
  'bank_statements', 'bank_transactions'
];

Deno.serve(async (req) => {
  try {
    const { org_id } = await req.json();
    if (!org_id) return new Response(JSON.stringify({ error: 'org_id required' }), { status: 400 });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const dump: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*').eq('org_id', org_id);
      if (error) {
        console.log(`Skipping ${table}: ${error.message}`);
        continue;
      }
      dump[table] = data || [];
      totalRecords += (data||[]).length;
    }

    // Also dump org settings and users
    const { data: org } = await supabase.from('organizations').select('*').eq('id', org_id).single();
    if (org) dump.organization = org;

    const { data: users } = await supabase.from('user_profiles').select('*').eq('org_id', org_id);
    if (users) dump.user_profiles = users;

    const json = JSON.stringify(dump, null, 2);
    const fileName = `backup_org${org_id}_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = `${org_id}/${fileName}`;

    // Upload to storage
    const { data: upload, error: uploadError } = await supabase.storage
      .from('org-backups')
      .upload(filePath, json, { contentType: 'application/json', upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('org-backups').getPublicUrl(filePath);

    // Record in org_backups table
    await supabase.from('org_backups').insert({
      org_id,
      file_name: fileName,
      file_url: publicUrl,
      file_size: new TextEncoder().encode(json).length,
      table_count: Object.keys(dump).length,
      record_count: totalRecords,
      status: 'completed'
    });

    return new Response(JSON.stringify({
      success: true,
      file_name: fileName,
      file_url: publicUrl,
      tables: Object.keys(dump).length,
      records: totalRecords,
      size_bytes: json.length
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
