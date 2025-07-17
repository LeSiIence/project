#!/usr/bin/env pwsh

# 火车票售票系统 - MySQL版本启动脚本

Write-Host "=== 火车票售票系统 MySQL版本启动脚本 ===" -ForegroundColor Green
Write-Host ""

# 检查Node.js是否可用
Write-Host "检查Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到Node.js，请确保已安装Node.js" -ForegroundColor Red
    exit 1
}

# 检查npm是否可用
Write-Host "检查npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到npm" -ForegroundColor Red
    exit 1
}

# 停止现有的Node.js进程
Write-Host "停止现有的Node.js进程..." -ForegroundColor Yellow
try {
    $processes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
    if ($processes) {
        $processes | Stop-Process -Force
        Write-Host "已停止 $($processes.Count) 个Node.js进程" -ForegroundColor Green
    } else {
        Write-Host "没有找到运行中的Node.js进程" -ForegroundColor Green
    }
} catch {
    Write-Host "警告: 停止进程时出现错误，继续执行..." -ForegroundColor Yellow
}

# 安装依赖
Write-Host "安装依赖..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "依赖安装完成" -ForegroundColor Green
} catch {
    Write-Host "错误: 依赖安装失败" -ForegroundColor Red
    exit 1
}

# 检查MySQL是否可用
Write-Host "检查MySQL连接..." -ForegroundColor Yellow
Write-Host "注意: 请确保MySQL服务已启动并且配置正确" -ForegroundColor Cyan
Write-Host "默认配置: host=localhost, user=root, password=空, database=train_ticket_system" -ForegroundColor Cyan

# 启动服务器
Write-Host "启动服务器..." -ForegroundColor Yellow
Write-Host "服务器将在http://localhost:3000启动" -ForegroundColor Green
Write-Host "测试页面: http://localhost:3000/mysql-test.html" -ForegroundColor Green
Write-Host ""
Write-Host "按Ctrl+C停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动Node.js服务器
try {
    node back-end.js
} catch {
    Write-Host "错误: 服务器启动失败" -ForegroundColor Red
    exit 1
} 