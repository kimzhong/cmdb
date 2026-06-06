@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   CMDB 配置管理平台启动脚本
echo ========================================
echo.

cd /d "%~dp0"

:: 检查端口占用并清理
echo [1/4] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
    echo     杀掉占用8081端口的进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo     杀掉占用3000端口的进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [2/4] 启动后端服务...
start "CMDB Backend" cmd /k "cd /d %~dp0 && go run cmd/server/main.go"

:: 等待后端启动
echo     等待后端启动...
:wait_backend
timeout /t 1 /nobreak >nul
curl -s http://localhost:8081/api/v1/stats >nul 2>&1
if errorlevel 1 (
    goto wait_backend
)
echo     后端启动成功 (http://localhost:8081)

echo.
echo [3/4] 启动前端服务...
start "CMDB Frontend" cmd /k "cd /d %~dp0web && npm run serve"

:: 等待前端启动
echo     等待前端启动...
:wait_frontend
timeout /t 1 /nobreak >nul
curl -s -o nul -w "" http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    goto wait_frontend
)
echo     前端启动成功 (http://localhost:3000)

echo.
echo ========================================
echo   启动完成！
echo   后端: http://localhost:8081
echo   前端: http://localhost:3000
echo   账号: admin / admin123
echo ========================================
echo.
echo 按任意键打开浏览器...
pause >nul
start http://localhost:3000
