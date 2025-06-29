#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍实时温度监控Web服务器启动脚本
使用更适合的WSGI服务器
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
    time.sleep(2)  # 等待服务器启动
    try:
        webbrowser.open('http://localhost:5000')
        logger.info("🌐 浏览器已自动打开")
    except Exception as e:
        logger.warning(f"无法自动打开浏览器: {e}")

def main():
    """主函数"""
    print("🌡️ CUST宿舍实时温度监控Web服务器")
    print("=" * 50)
    print("长春理工大学宿舍环境监测Web界面")
    print()
    
    try:
        # 导入Web应用
        from web_app import app, socketio, monitor
        
        # 启动温度监控服务
        logger.info("🚀 启动温度监控服务...")
        monitor.start()
        
        # 延迟打开浏览器
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()
        
        # 显示启动信息
        print("✅ 服务器启动成功！")
        print()
        print("📱 访问地址:")
        print("   本地访问: http://localhost:5000")
        print("   局域网访问: http://[你的IP地址]:5000")
        print()
        print("🔧 功能特性:")
        print("   • 实时温度湿度监控")
        print("   • 自动设备连接和重连")
        print("   • 历史数据图表显示")
        print("   • 响应式设计，支持手机访问")
        print("   • 数据自动保存到数据库")
        print()
        print("⏹️  按 Ctrl+C 停止服务器")
        print("=" * 50)
        
        # 启动Web服务器
        try:
            # 尝试使用eventlet (推荐)
            socketio.run(
                app, 
                host='0.0.0.0', 
                port=5000, 
                debug=False,
                use_reloader=False,
                log_output=False
            )
        except Exception as e:
            logger.warning(f"eventlet启动失败，尝试使用Werkzeug: {e}")
            # 回退到Werkzeug
            socketio.run(
                app, 
                host='0.0.0.0', 
                port=5000, 
                debug=False,
                allow_unsafe_werkzeug=True
            )
            
    except ImportError as e:
        print("❌ 缺少依赖包，请安装:")
        print("   pip install flask flask-socketio eventlet")
        print(f"   错误详情: {e}")
    except KeyboardInterrupt:
        print("\n⏹️  正在关闭服务器...")
        try:
            monitor.stop()
        except:
            pass
        print("👋 服务器已关闭")
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        logger.error(f"服务器异常: {e}", exc_info=True)

if __name__ == "__main__":
    main()
