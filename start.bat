@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   CMDB 配置管理平台启动脚本
echo ========================================
echo.

cd /d "%~dp0"

:: 检查端口占用并清理
echo [1/5] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":27017" ^| findstr "LISTENING"') do (
    echo     杀掉占用27017端口的进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
    echo     杀掉占用8081端口的进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo     杀掉占用3000端口的进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [2/5] 启动 MongoDB (数据库)...
where mongod >nul 2>&1
if errorlevel 1 (
    echo     警告: 未检测到 mongod，请确认 MongoDB 已安装并加入 PATH
    echo     手动启动: "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath D:\mongodb\data --logpath D:\mongodb\log\mongod.log --port 27017 --bind_ip 127.0.0.1
) else (
    if not exist "D:\mongodb\data" mkdir "D:\mongodb\data"
    if not exist "D:\mongodb\log" mkdir "D:\mongodb\log"
    start "CMDB MongoDB" cmd /k "mongod --dbpath D:\mongodb\data --logpath D:\mongodb\log\mongod.log --port 27017 --bind_ip 127.0.0.1"
    echo     MongoDB 启动中...
    :wait_mongo
    timeout /t 1 /nobreak >nul
    powershell -Command "Test-NetConnection localhost -Port 27017 -InformationLevel Quiet" >nul 2>&1
    if errorlevel 1 goto wait_mongo
    echo     MongoDB 就绪 (http://localhost:27017)
)

echo.
echo [3/5] 启动后端服务...
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

:: 提示：首次启动需要在 MongoDB 中手动创建 admin 用户
echo     如首次使用，请先在 MongoDB 中创建 admin 账号:
echo       python -c "import pymongo,bcrypt; from datetime import datetime,timezone; db=pymongo.MongoClient('mongodb://localhost:27017/')['cmdb']; db.users.delete_many({}); db.users.insert_one({'username':'admin','password':bcrypt.hashpw(b'admin123',bcrypt.gensalt()).decode(),'role':'admin','status':1,'source':'local','create_at':datetime.now(timezone.utc),'modify_at':datetime.now(timezone.utc)})"

echo.
echo [4/5] 启动前端服务...
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
echo [5/5] 全部就绪
echo ========================================
echo   CMDB 平台已就绪
echo   前端: http://localhost:3000
echo   后端: http://localhost:8081
echo   数据库: mongodb://localhost:27017/cmdb
echo   默认账号: admin / admin123
echo ========================================
echo.
echo 按任意键打开浏览器...
pause >nul
start http://localhost:3000
