#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍实时温度监控系统 - 安装脚本
自动安装所需依赖包
"""

import sys
import subprocess
import os

def run_command(command):
    """运行命令并显示输出"""
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True, encoding='utf-8')
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def check_python_version():
    """检查Python版本"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print(f"❌ Python版本过低: {version.major}.{version.minor}")
        print("   需要Python 3.7或更高版本")
        return False
    
    print(f"✅ Python版本: {version.major}.{version.minor}.{version.micro}")
    return True

def install_packages():
    """安装依赖包"""
    packages = [
        "bleak>=0.20.0",
        "flask>=2.3.0", 
        "flask-socketio>=5.3.0",
        "python-socketio>=5.8.0",
        "eventlet>=0.33.0",
        "python-engineio>=4.7.0"
    ]
    
    print("📦 开始安装依赖包...")
    
    for package in packages:
        print(f"   正在安装 {package}...")
        success, output = run_command(f"pip install {package}")
        
        if success:
            print(f"   ✅ {package} 安装成功")
        else:
            print(f"   ❌ {package} 安装失败")
            print(f"      错误: {output}")
            return False
    
    return True

def test_imports():
    """测试导入"""
    test_modules = [
        ('bleak', '蓝牙库'),
        ('flask', 'Web框架'),
        ('flask_socketio', 'WebSocket支持'),
        ('socketio', 'Socket.IO'),
        ('eventlet', '异步网络库')
    ]
    
    print("🧪 测试模块导入...")
    
    for module, description in test_modules:
        try:
            __import__(module)
            print(f"   ✅ {description} ({module})")
        except ImportError as e:
            print(f"   ❌ {description} ({module}) - {e}")
            return False
    
    return True

def main():
    """主函数"""
    print("🌡️ CUST宿舍实时温度监控系统 - 安装程序")
    print("=" * 60)
    print("长春理工大学宿舍环境监测解决方案")
    print()
    
    # 检查Python版本
    if not check_python_version():
        input("按回车键退出...")
        return
    
    print()
    
    # 升级pip
    print("🔧 升级pip...")
    success, output = run_command("python -m pip install --upgrade pip")
    if success:
        print("✅ pip升级成功")
    else:
        print("⚠️ pip升级失败，继续安装...")
    
    print()
    
    # 安装依赖包
    if not install_packages():
        print("\n❌ 依赖包安装失败")
        input("按回车键退出...")
        return
    
    print()
    
    # 测试导入
    if not test_imports():
        print("\n❌ 模块导入测试失败")
        input("按回车键退出...")
        return
    
    print()
    print("🎉 安装完成！")
    print()
    print("🚀 现在可以运行以下命令启动系统:")
    print("   python quick_start.py")
    print("   或双击: 启动CUST温度监控.bat")
    print()
    print("📱 Web界面地址: http://localhost:5000")
    print()
    
    # 询问是否立即启动
    try:
        choice = input("是否立即启动系统？(y/n): ").lower().strip()
        if choice in ['y', 'yes', '是', '']:
            print("\n🚀 启动系统...")
            os.system("python quick_start.py")
    except KeyboardInterrupt:
        print("\n👋 安装完成")

if __name__ == "__main__":
    main()
