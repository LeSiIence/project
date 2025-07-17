Write-Host "===============================================" -ForegroundColor Green
Write-Host "      MySQL Password Reset Tool (PowerShell)" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "This script will reset MySQL root password to empty" -ForegroundColor Yellow
Write-Host "Please run this script as Administrator" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to continue..."

try {
    Write-Host ""
    Write-Host "Step 1: Stopping MySQL service..." -ForegroundColor Cyan
    Stop-Service -Name "MySQL80" -Force
    Write-Host "✓ MySQL service stopped" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Cannot stop MySQL service, please run as Administrator" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

try {
    Write-Host ""
    Write-Host "Step 2: Creating password reset SQL file..." -ForegroundColor Cyan
    
    # Create temporary directory
    if (-not (Test-Path "C:\temp")) {
        New-Item -ItemType Directory -Path "C:\temp" | Out-Null
    }
    
    # Create reset SQL file
    $resetSQL = @"
USE mysql;
UPDATE user SET authentication_string='' WHERE User='root' AND Host='localhost';
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
"@
    
    $resetSQL | Out-File -FilePath "C:\temp\reset-mysql-password.sql" -Encoding UTF8
    Write-Host "✓ Password reset file created" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 3: Starting MySQL safe mode..." -ForegroundColor Cyan
    Write-Host "Please wait for MySQL to start in safe mode and execute reset..." -ForegroundColor Yellow
    
    # Start MySQL safe mode
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
    $arguments = "--skip-grant-tables --init-file=C:\temp\reset-mysql-password.sql --console"
    
    Write-Host "Starting MySQL safe mode..." -ForegroundColor Yellow
    Start-Process -FilePath $mysqlPath -ArgumentList $arguments -Wait -WindowStyle Minimized
    
    Write-Host "✓ MySQL safe mode execution completed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 4: Restarting MySQL service..." -ForegroundColor Cyan
    Start-Service -Name "MySQL80"
    Write-Host "✓ MySQL service restarted" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 5: Cleaning up temporary files..." -ForegroundColor Cyan
    Remove-Item -Path "C:\temp\reset-mysql-password.sql" -Force
    Write-Host "✓ Temporary files cleaned up" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "          Password Reset Complete!" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "MySQL root password has been reset to empty (no password)" -ForegroundColor Yellow
    Write-Host "You can now connect to MySQL with empty password" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Test connection:" -ForegroundColor Cyan
    Write-Host "  mysql -u root" -ForegroundColor White
    Write-Host ""
    Write-Host "Start Node.js server:" -ForegroundColor Cyan
    Write-Host "  node back-end.js" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check MySQL installation path and permissions" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit..." 