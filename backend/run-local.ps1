$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing backend/.env. Copy backend/.env.example to backend/.env and fill in your local values."
}

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
        return
    }

    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2 -or -not $parts[0].Trim()) {
        throw "Invalid .env line: $line"
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim("'").Trim('"')
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

$requiredVariables = @("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")
foreach ($name in $requiredVariables) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if (-not $value -or $value -match "replace_me") {
        throw "Missing $name in backend/.env. Add your Stripe test value before starting the backend."
    }
}

$bundledMaven = Join-Path $PSScriptRoot "..\tools\apache-maven-3.9.11\bin"
if (Test-Path -LiteralPath $bundledMaven) {
    $env:Path = "$bundledMaven;$env:Path"
}

Push-Location $PSScriptRoot
try {
    mvn.cmd spring-boot:run
} finally {
    Pop-Location
}
