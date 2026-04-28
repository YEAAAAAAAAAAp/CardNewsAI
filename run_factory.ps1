$ErrorActionPreference = "Stop"
$env:PYTHONPATH = "src"

$Python = "C:\Users\disco\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if ($args.Count -eq 0) {
    Write-Host "Usage: .\run_factory.ps1 ""카드뉴스 주제"""
    exit 1
}

& $Python main.py --topic @args
