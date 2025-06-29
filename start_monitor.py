#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍实时温度监控系统启动脚本
"""

import sys
import logging
import asyncio
import threading
from pathlib import Path

# 添加当前目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from temperature_sensor_connector import TemperatureSensorConnector, TemperatureDataStorage, TemperatureData

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('temperature_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ContinuousTemperatureMonitor:
    """持续温度监控服务"""
    
    def __init__(self):
        self.connector = TemperatureSensorConnector(auto_reconnect=True)
        self.storage = TemperatureDataStorage()
        self.is_running = False
        self.data_count = 0
        
    def start(self):
        """启动监控服务"""
        logger.info("🌡️ 启动CUST宿舍实时温度监控系统")
        logger.info("=" * 60)
        
        # 设置数据回调
        def on_data_received(data: TemperatureData):
            self.data_count += 1
            logger.info(f"📊 [{self.data_count}] {data}")
            
            # 保存到数据库
            self.storage.save_data(data)
            
            # 显示统计信息
            if self.data_count % 10 == 0:
                self.show_statistics()
        
        self.connector.set_data_callback(on_data_received)
        self.is_running = True
        
        try:
            # 开始持续扫描和连接
            asyncio.run(self.connector.start_continuous_scanning())
        except KeyboardInterrupt:
            logger.info("\n⏹️ 用户停止监控")
            self.stop()
        except Exception as e:
            logger.error(f"❌ 监控服务出错: {e}")
            self.stop()
    
    def stop(self):
        """停止监控服务"""
        self.is_running = False
        if self.connector:
            self.connector.stop_scanning()
        logger.info("🔌 监控服务已停止")
        self.show_final_statistics()
    
    def show_statistics(self):
        """显示统计信息"""
        try:
            recent_data = self.storage.get_latest_data(10)
            if recent_data:
                temps = [d['temperature'] for d in recent_data]
                humids = [d['humidity'] for d in recent_data]
                
                logger.info("📈 最近10条数据统计:")
                logger.info(f"   温度: 最低 {min(temps):.1f}°C, 最高 {max(temps):.1f}°C, 平均 {sum(temps)/len(temps):.1f}°C")
                logger.info(f"   湿度: 最低 {min(humids):.1f}%, 最高 {max(humids):.1f}%, 平均 {sum(humids)/len(humids):.1f}%")
        except Exception as e:
            logger.error(f"统计信息显示失败: {e}")
    
    def show_final_statistics(self):
        """显示最终统计信息"""
        logger.info("📊 监控会话统计:")
        logger.info(f"   总数据点数: {self.data_count}")
        
        try:
            latest = self.storage.get_latest_data(1)
            if latest:
                logger.info(f"   最后记录: {latest[0]['timestamp']}")
                logger.info(f"   最后温度: {latest[0]['temperature']:.1f}°C")
                logger.info(f"   最后湿度: {latest[0]['humidity']:.1f}%")
        except Exception as e:
            logger.error(f"最终统计显示失败: {e}")

def main():
    """主函数"""
    print("🌡️ CUST宿舍实时温度监控系统")
    print("=" * 50)
    print("长春理工大学宿舍环境监测解决方案")
    print()
    
    print("选择运行模式:")
    print("1. 仅数据采集 - 持续扫描连接温度计并保存数据")
    print("2. Web服务 - 启动Web界面和数据采集")
    print("3. 数据查看 - 查看已保存的历史数据")
    
    try:
        choice = input("\n请输入选择 (1-3): ").strip()
        
        if choice == "1":
            # 仅数据采集模式
            monitor = ContinuousTemperatureMonitor()
            monitor.start()
            
        elif choice == "2":
            # Web服务模式
            print("\n🚀 启动Web服务模式...")
            print("请确保已安装Web依赖: pip install flask flask-socketio")
            print("Web界面将在 http://localhost:5000 启动")
            
            try:
                from web_app import app, socketio, monitor as web_monitor
                web_monitor.start()
                socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
            except ImportError:
                print("❌ 缺少Web依赖，请运行: pip install flask flask-socketio")
            except Exception as e:
                print(f"❌ Web服务启动失败: {e}")
                
        elif choice == "3":
            # 数据查看模式
            storage = TemperatureDataStorage()
            print("\n📊 最近10条数据记录:")
            data = storage.get_latest_data(10)
            
            if data:
                for i, record in enumerate(data, 1):
                    timestamp = record['timestamp']
                    temp = record['temperature']
                    humidity = record['humidity']
                    device = record['device_name'] or '未知设备'
                    print(f"{i:2d}. {timestamp} | {temp:5.1f}°C | {humidity:5.1f}% | {device}")
            else:
                print("暂无数据记录")
                
        else:
            print("❌ 无效选择")
            
    except KeyboardInterrupt:
        print("\n👋 程序已退出")
    except Exception as e:
        print(f"❌ 程序出错: {e}")
        logger.error(f"程序异常: {e}", exc_info=True)

if __name__ == "__main__":
    main()
