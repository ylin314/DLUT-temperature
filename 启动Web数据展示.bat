@echo off
chcp 65001 >nul
title DLUT宿舍实时温度数据展示

echo.
echo ========================================
echo    DLUT宿舍实时温度数据展示
echo    大连理工大学宿舍环境数据查看平台
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

echo 🌐 启动Web数据展示服务...
echo.
echo 📊 功能说明:
echo    • 实时温度湿度数据展示
echo    • 历史数据图表查看
echo    • 设备连接状态显示
echo    • 仅用于数据展示，不控制设备
echo.
echo 📱 Web界面: http://localhost:5001
echo 🌐 浏览器将自动打开
echo.
echo ⏹️  按 Ctrl+C 可停止服务
echo ========================================
echo.

python start_web_display.py

echo.
echo 👋 Web服务已关闭
pause
