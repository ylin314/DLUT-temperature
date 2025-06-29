#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍温度数据采集服务
专门用于连接温度计设备并采集数据，不包含Web界面
"""

import sys
import logging
import asyncio
from pathlib import Path

# 添加当前目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from temperature_sensor_connector import TemperatureSensorConnector, TemperatureDataStorage, TemperatureData

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('temperature_collector.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TemperatureDataCollector:
    """温度数据采集服务"""
    
    def __init__(self):
        self.connector = TemperatureSensorConnector(auto_reconnect=True)
        self.storage = TemperatureDataStorage()
        self.data_count = 0
        self.is_running = False
        
    async def start(self):
        """启动数据采集服务"""
        logger.info("🌡️ 启动CUST宿舍温度数据采集服务")
        logger.info("=" * 60)
        
        # 设置数据回调
        def on_data_received(data: TemperatureData):
            self.data_count += 1
            logger.info(f"📊 [{self.data_count}] {data}")
            
            # 保存到数据库
            self.storage.save_data(data)
            
            # 每10条数据显示一次统计
            if self.data_count % 10 == 0:
                self.show_statistics()
        
        self.connector.set_data_callback(on_data_received)
        self.is_running = True
        
        try:
            logger.info("🔍 开始持续扫描和连接温度计设备...")
            logger.info("💾 数据将自动保存到数据库")
            logger.info("📊 Web展示页面可通过 start_web_display.py 启动")
            logger.info("⏹️  按 Ctrl+C 停止采集")
            logger.info("-" * 60)
            
            # 开始持续扫描和连接
            await self.connector.start_continuous_scanning()
            
        except KeyboardInterrupt:
            logger.info("\n⏹️ 用户停止数据采集")
            self.stop()
        except Exception as e:
            logger.error(f"❌ 数据采集服务出错: {e}")
            self.stop()
    
    def stop(self):
        """停止数据采集服务"""
        self.is_running = False
        if self.connector:
            self.connector.stop_scanning()
        logger.info("🔌 数据采集服务已停止")
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
                logger.info("-" * 40)
        except Exception as e:
            logger.error(f"统计信息显示失败: {e}")
    
    def show_final_statistics(self):
        """显示最终统计信息"""
        logger.info("📊 采集会话统计:")
        logger.info(f"   总数据点数: {self.data_count}")
        
        try:
            latest = self.storage.get_latest_data(1)
            if latest:
                logger.info(f"   最后记录时间: {latest[0]['timestamp']}")
                logger.info(f"   最后温度: {latest[0]['temperature']:.1f}°C")
                logger.info(f"   最后湿度: {latest[0]['humidity']:.1f}%")
                
            # 显示数据库中的总记录数
            all_data = self.storage.get_latest_data(10000)  # 获取大量数据来统计
            logger.info(f"   数据库总记录数: {len(all_data)}")
            
        except Exception as e:
            logger.error(f"最终统计显示失败: {e}")

def check_dependencies():
    """检查依赖包"""
    try:
        import bleak
        return True
    except ImportError:
        print("❌ 缺少bleak依赖包")
        print("🔧 请运行: pip install bleak")
        return False

async def main():
    """主函数"""
    print("🌡️ CUST宿舍温度数据采集服务")
    print("=" * 50)
    print("长春理工大学宿舍环境数据采集程序")
    print()
    
    # 检查依赖
    if not check_dependencies():
        input("按回车键退出...")
        return
    
    print("✅ 依赖检查通过")
    print("🚀 启动数据采集服务...")
    print()
    print("📋 服务说明:")
    print("   • 自动扫描和连接蓝牙温度计")
    print("   • 实时采集温度湿度数据")
    print("   • 自动保存数据到SQLite数据库")
    print("   • 设备断线自动重连")
    print("   • 数据可通过Web界面查看")
    print()
    print("🌐 启动Web数据展示:")
    print("   python start_web_display.py")
    print()
    
    try:
        collector = TemperatureDataCollector()
        await collector.start()
    except Exception as e:
        logger.error(f"程序异常: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())
