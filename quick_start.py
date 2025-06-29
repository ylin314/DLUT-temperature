#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍实时温度监控 - 快速启动脚本
一键启动Web界面和温度监控
"""

import sys
import os
import subprocess
import webbrowser
import time
import threading

def check_dependencies():
    """检查依赖包"""
    required_packages = ['bleak', 'flask', 'flask_socketio']
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
        print("   pip install -r requirements.txt")
        print("   或者:")
        print("   pip install bleak flask flask-socketio eventlet")
        return False
    
    return True

def open_browser_delayed():
    """延迟打开浏览器"""
    time.sleep(3)
    try:
        webbrowser.open('http://localhost:5000')
        print("🌐 浏览器已自动打开 http://localhost:5000")
    except:
        pass

def main():
    """主函数"""
    print("🌡️ CUST宿舍实时温度监控系统")
    print("=" * 50)
    print("长春理工大学宿舍环境监测解决方案")
    print()
    
    # 检查依赖
    if not check_dependencies():
        input("\n按回车键退出...")
        return
    
    print("✅ 依赖检查通过")
    print("🚀 正在启动Web服务...")
    print()
    
    try:
        # 导入并启动服务
        from web_app import app, socketio, monitor
        
        # 启动监控服务
        monitor.start()
        
        # 延迟打开浏览器
        browser_thread = threading.Thread(target=open_browser_delayed, daemon=True)
        browser_thread.start()
        
        print("🎉 启动成功！")
        print()
        print("📱 Web界面地址:")
        print("   http://localhost:5000")
        print()
        print("🔧 系统功能:")
        print("   • 实时温度湿度显示")
        print("   • 自动设备搜索和连接")
        print("   • 历史数据图表")
        print("   • 手机平板支持")
        print()
        print("⏹️  按 Ctrl+C 停止服务")
        print("=" * 50)
        
        # 启动Web服务器
        socketio.run(
            app, 
            host='0.0.0.0', 
            port=5000, 
            debug=False,
            allow_unsafe_werkzeug=True,
            log_output=False
        )
        
    except KeyboardInterrupt:
        print("\n⏹️  正在关闭...")
        try:
            monitor.stop()
        except:
            pass
        print("👋 已关闭")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("\n🔧 可能的解决方案:")
        print("1. 确保蓝牙已开启")
        print("2. 检查防火墙设置")
        print("3. 尝试以管理员身份运行")
        input("\n按回车键退出...")

if __name__ == "__main__":
    main()
