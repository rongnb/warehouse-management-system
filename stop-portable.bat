@echo off
chcp 65001 >nul
echo =====================================
echo 🛑 停止便携版所有服务
echo =====================================

echo 正在停止MongoDB...
taskkill /f /im mongod.exe >nul 2>&1

echo 正在停止Node.js服务...
taskkill /f /im node.exe >nul 2>&1

echo ✅ 所有服务已停止
echo 💡 数据已保存在 data\db 目录
pause
