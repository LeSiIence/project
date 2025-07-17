Write-Host "===============================================" -ForegroundColor Green
Write-Host "         Train Ticket System Startup" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

try {
    Write-Host "Step 1: Checking MySQL service status..." -ForegroundColor Cyan
    $service = Get-Service -Name "MySQL80" -ErrorAction SilentlyContinue
    if ($service -eq $null) {
        Write-Host "✗ MySQL80 service not found" -ForegroundColor Red
        Write-Host "Please check MySQL installation" -ForegroundColor Yellow
        Read-Host "Press Enter to exit..."
        exit 1
    }
    
    if ($service.Status -ne "Running") {
        Write-Host "MySQL service is not running, starting it..." -ForegroundColor Yellow
        try {
            Start-Service -Name "MySQL80"
            Start-Sleep -Seconds 2
            $serviceCheck = Get-Service -Name "MySQL80"
            if ($serviceCheck.Status -eq "Running") {
                Write-Host "✓ MySQL service started successfully" -ForegroundColor Green
            } else {
                throw "Service failed to start"
            }
        } catch {
            Write-Host "✗ Error starting MySQL service: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Please run as Administrator" -ForegroundColor Yellow
            Read-Host "Press Enter to exit..."
            exit 1
        }
    } else {
        Write-Host "✓ MySQL service is running" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Step 2: Checking port 3000..." -ForegroundColor Cyan
    $portUsed = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($portUsed) {
        Write-Host "Port 3000 is occupied, stopping existing process..." -ForegroundColor Yellow
        foreach ($connection in $portUsed) {
            $processId = $connection.OwningProcess
            Write-Host "Stopping process ID: $processId" -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        Write-Host "✓ Port 3000 freed" -ForegroundColor Green
    } else {
        Write-Host "✓ Port 3000 is available" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Step 3: Installing dependencies..." -ForegroundColor Cyan
    $installResult = & npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 4: Testing MySQL connection..." -ForegroundColor Cyan
    $testScript = @"
const mysql = require('mysql2/promise');
async function test() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'gnx051103'
        });
        await connection.execute('SELECT 1');
        await connection.end();
        console.log('MySQL connection successful');
        process.exit(0);
    } catch (error) {
        console.log('MySQL connection failed: ' + error.message);
        process.exit(1);
    }
}
test();
"@
    
    $testResult = & node -e $testScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "✗ MySQL connection failed" -ForegroundColor Red
        Write-Host "Please configure password:" -ForegroundColor Yellow
        Write-Host "1. Run: node configure-mysql-password.js" -ForegroundColor White
        Write-Host "2. Or run: .\mysql-reset-password-complete.ps1" -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "✓ MySQL connection successful" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 5: Starting Node.js server..." -ForegroundColor Cyan
    Write-Host "Server will start at: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "Test page: http://localhost:3000/mysql-test.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Green
    Write-Host ""
    
    & node back-end.js
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
} 