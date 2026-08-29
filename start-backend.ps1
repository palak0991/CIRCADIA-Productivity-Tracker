# Start Backend (Spring Boot with H2 or PostgreSQL)
Write-Host "Starting 24-Hour Visualizer Backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
$env:SPRING_PROFILES_ACTIVE = "local"
mvn spring-boot:run
