@echo off
chcp 65001 >nul
title CUST宿舍实时温度监控系统

echo.
echo ========================================
echo    CUST宿舍实时温度监控系统
echo    长春理工大学宿舍环境监测解决方案
echo ========================================
echo.

echo 🔍 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Python，请先安装Python 3.7+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python环境正常
echo.

echo 🚀 启动温度监控系统...
echo.
echo 📱 Web界面将在 http://localhost:5000 启动
echo 🌐 浏览器将自动打开
echo.
echo ⏹️  按 Ctrl+C 可停止服务
echo ========================================
echo.

python quick_start.py

echo.
echo 👋 系统已关闭
pause
