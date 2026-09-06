import urllib.request
import urllib.error
import json
import sys
import os
from datetime import datetime

SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo'

def keepalive():
    url = f'{SUPABASE_URL}/rest/v1/keepalive?select=*&limit=1'
    req = urllib.request.Request(url)
    req.add_header('apikey', ANON_KEY)
    req.add_header('Authorization', f'Bearer {ANON_KEY}')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode()
            print(f'[{datetime.now()}] Supabase keepalive OK — status {resp.status}')
            return True
    except urllib.error.HTTPError as e:
        print(f'[{datetime.now()}] Supabase keepalive FAILED — HTTP {e.code}: {e.reason}', file=sys.stderr)
        return False
    except urllib.error.URLError as e:
        print(f'[{datetime.now()}] Supabase keepalive FAILED — {e.reason}', file=sys.stderr)
        return False

def trigger_backup():
    """Trigger backup for org 12 (Hetansh Technologie Solutions) via Edge Function."""
    url = f'{SUPABASE_URL}/functions/v1/create-backup'
    data = json.dumps({"org_id": 12}).encode()
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    if os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
        req.add_header('Authorization', f'Bearer {os.environ["SUPABASE_SERVICE_ROLE_KEY"]}')
        req.add_header('apikey', os.environ['SUPABASE_SERVICE_ROLE_KEY'])
    else:
        req.add_header('apikey', ANON_KEY)
        req.add_header('Authorization', f'Bearer {ANON_KEY}')
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
            result = json.loads(body)
            print(f'[{datetime.now()}] Backup: {result.get("tables",0)} tables, {result.get("records",0)} records, {(result.get("size_bytes",0)/1024):.1f} KB')
            return True
    except Exception as e:
        print(f'[{datetime.now()}] Backup trigger FAILED — {e}', file=sys.stderr)
        return False

def trigger_reminders():
    url = f'{SUPABASE_URL}/functions/v1/send-payment-reminders'
    data = json.dumps({}).encode()
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('apikey', ANON_KEY)
    req.add_header('Authorization', f'Bearer {ANON_KEY}')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            result = json.loads(body)
            print(f'[{datetime.now()}] Payment reminders: sent {result.get("sent",0)} of {result.get("total",0)}')
            return True
    except urllib.error.HTTPError as e:
        print(f'[{datetime.now()}] Reminder trigger FAILED — HTTP {e.code}', file=sys.stderr)
        return False
    except Exception as e:
        print(f'[{datetime.now()}] Reminder trigger FAILED — {e}', file=sys.stderr)
        return False

if __name__ == '__main__':
    ok = keepalive()
    trigger_reminders()
    trigger_backup()
    sys.exit(0 if ok else 1)
