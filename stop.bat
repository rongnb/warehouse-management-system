@echo off
REM 停止后端服务 (Windows)
setlocal
echo [i] 查找 node server.js 进程...
for /f "tokens=2" %%p in ('tasklist /v /fi "imagename eq node.exe" /fo csv ^| findstr /i "server.js"') do (
    set PID=%%~p
    echo [-] 杀掉 PID %%~p
    taskkill /pid %%~p /f >nul 2>nul
)
REM 兜底：杀所有 node 是危险的，所以这里仅按命令行匹配
wmic process where "name='node.exe' and CommandLine like '%%backend\\server.js%%'" call terminate >nul 2>nul
echo [OK] 已尝试停止后端
endlocal
