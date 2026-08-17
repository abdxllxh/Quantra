$ErrorActionPreference = "Stop"

$taskName = "Quantura Backend"
$backendDir = "C:\Users\DELL\Desktop\DATA ANALYST\backend"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Quantura virtual-environment Python was not found."
}

$action = New-ScheduledTaskAction `
    -Execute $pythonExe `
    -Argument "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" `
    -WorkingDirectory $backendDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 99 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Runs the Quantura FastAPI backend continuously in the background." `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
