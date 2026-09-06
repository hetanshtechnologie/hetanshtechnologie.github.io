<#
.SYNOPSIS
  Backup or restore Supabase data for EduERP.
.DESCRIPTION
  Uses REST API (service_role key) to dump all tables as INSERT SQL.
  Restore uses supabase db query --linked.
.EXAMPLE
  .\scripts\backup.ps1 -Key "your_service_role_key"
  .\scripts\backup.ps1 -Restore .\backups\backup_2026-07-09.sql
#>

param(
  [string]$Key,
  [switch]$Restore,
  [string]$RestorePath
)

$projRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backupDir = Join-Path $projRoot "backups"
$script = Join-Path $PSScriptRoot "backup.mjs"

function New-Backup {
  if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

  if (-not $Key) {
    Write-Host "To back up, you need your Supabase service_role key." -ForegroundColor Yellow
    Write-Host "Get it: Supabase Dashboard > Project Settings > API > service_role key" -ForegroundColor Yellow
    $Key = Read-Host "Paste your service_role key (or press Enter to cancel)"
    if (-not $Key) { Write-Host "Cancelled." -ForegroundColor Red; exit 0 }
  }

  $env:SUPABASE_SERVICE_KEY = $Key
  node $script
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

function Restore-Backup {
  if (-not $RestorePath -or -not (Test-Path $RestorePath)) {
    Write-Host "Usage: .\scripts\backup.ps1 -Restore -RestorePath .\backups\backup_2026-07-09.sql" -ForegroundColor Yellow
    Write-Host "Available backups:" -ForegroundColor Yellow
    Get-ChildItem $backupDir -Name
    exit 1
  }

  Write-Host "WARNING: This will INSERT data into your linked Supabase project." -ForegroundColor Yellow
  Write-Host "  Source: $RestorePath" -ForegroundColor Yellow
  $confirm = Read-Host "  Type 'RESTORE' to confirm"
  if ($confirm -ne "RESTORE") { Write-Host "Cancelled." -ForegroundColor Red; exit 0 }

  Write-Host "Restoring data..." -NoNewline
  $r = & supabase db query --linked -f $RestorePath 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Host " FAILED" -ForegroundColor Red; exit 1 }
  Write-Host " done" -ForegroundColor Green
  Write-Host "Restore complete." -ForegroundColor Green
}

if ($Restore) { Restore-Backup } else { New-Backup }
