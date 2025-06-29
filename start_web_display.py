#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍实时温度数据展示Web服务
仅用于数据展示，不包含设备控制功能
"""

import sys
import logging
import webbrowser
import time
import threading
from pathlib import Path

# 添加当前目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def open_browser():
    """延迟打开浏览器"""
    time.sleep(2)
    try:
        webbrowser.open('http://localhost:5000')
        logger.info("🌐 浏览器已自动打开")
    except Exception as e:
        logger.warning(f"无法自动打开浏览器: {e}")

def check_dependencies():
    """检查依赖包"""
    required_packages = ['flask', 'flask_socketio']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ 缺少以下依赖包:")
        for pkg in missing_packages:
            print(f"   • {pkg}")
        print("\n🔧 请运行以下命令安装:")
        print("   pip install flask flask-socketio eventlet")
        return False
    
    return True

def main():
    """主函数"""
    print("📊 CUST宿舍实时温度数据展示")
    print("=" * 50)
    print("长春理工大学宿舍环境数据查看平台")
    print()
    
    # 检查依赖
    if not check_dependencies():
        input("\n按回车键退出...")
        return
    
    print("✅ 依赖检查通过")
    print("🌐 正在启动Web数据展示服务...")
    print()
    
    try:
        # 导入Web应用（不启动监控服务）
        from web_app import app, socketio
        
        # 延迟打开浏览器
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()
        
        print("🎉 Web服务启动成功！")
        print()
        print("📱 数据展示地址:")
        print("   本地访问: http://localhost:5000")
        print("   局域网访问: http://[你的IP地址]:5000")
        print()
        print("📊 功能说明:")
        print("   • 实时温度湿度数据展示")
        print("   • 历史数据图表查看")
        print("   • 设备连接状态显示")
        print("   • 响应式设计，支持手机访问")
        print("   • 数据自动刷新")
        print()
        print("ℹ️  注意: 此Web服务仅用于数据展示")
        print("   设备连接和数据采集需要单独运行监控程序")
        print()
        print("⏹️  按 Ctrl+C 停止Web服务")
        print("=" * 50)
        
        # 启动Web服务器（仅Web界面，不启动监控）
        try:
            # 优先使用eventlet
            socketio.run(
                app,
                host='0.0.0.0',
                port=5000,
                debug=False,
                log_output=False
            )
        except Exception as e:
            print(f"❌ 启动失败: {e}")
            print("\n🔧 可能的解决方案:")
            print("1. 确保蓝牙已开启")
            print("2. 检查防火墙设置")
            print("3. 尝试以管理员身份运行")
            input("\n按回车键退出...")
        
    except KeyboardInterrupt:
        print("\n⏹️  正在关闭Web服务...")
        print("👋 Web服务已关闭")
    except Exception as e:
        print(f"❌ Web服务启动失败: {e}")
        print("\n🔧 可能的解决方案:")
        print("1. 检查端口5000是否被占用")
        print("2. 检查防火墙设置")
        print("3. 确保已安装flask和flask-socketio")
        print("4. 尝试安装eventlet: pip install eventlet")
        input("\n按回车键退出...")

if __name__ == "__main__":
    main()
