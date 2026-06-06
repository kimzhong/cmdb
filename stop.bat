@echo off
chcp 65001 >nul
echo ========================================
echo   CMDB 配置管理平台停止脚本
echo ========================================
echo.

cd /d "%~dp0"

:: 杀掉后端进程
echo [1/2] 停止后端服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
    echo     停止进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: 杀掉前端进程 (node)
echo [2/2] 停止前端服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo     停止进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================
echo   服务已停止
echo ========================================
pause
