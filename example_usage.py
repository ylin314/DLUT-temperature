#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温度计连接器使用示例
演示如何使用TemperatureSensorConnector类连接温度计并获取数据
"""

import asyncio
import time
from temperature_sensor_connector import TemperatureSensorConnector, TemperatureData

class TemperatureMonitor:
    """温度监控类"""
    
    def __init__(self):
        self.connector = TemperatureSensorConnector()
        self.data_history = []
        self.is_monitoring = False
        
    def on_temperature_data(self, data: TemperatureData):
        """温度数据回调函数"""
        print(f"📊 {data}")
        self.data_history.append(data)
        
        # 保存最近100条记录
        if len(self.data_history) > 100:
            self.data_history.pop(0)
    
    async def scan_and_connect(self):
        """扫描并连接温度计设备"""
        print("🔍 正在扫描蓝牙温度计设备...")
        devices = await self.connector.scan_devices(timeout=15)
        
        if not devices:
            print("❌ 未发现任何温度计设备")
            print("请确保:")
            print("1. 蓝牙已开启")
            print("2. 温度计设备已开机且在附近")
            print("3. 设备名称包含: LYWSD, MHO, CGG, CGDK, MJWSD, TEMP, THERMO")
            return False
        
        print(f"✅ 发现 {len(devices)} 个温度计设备:")
        for i, device in enumerate(devices):
            rssi_info = f" (信号强度: {device['rssi']}dBm)" if device['rssi'] else ""
            print(f"  {i+1}. {device['name']} - {device['address']}{rssi_info}")
        
        # 选择设备
        if len(devices) == 1:
            selected_device = devices[0]
            print(f"🎯 自动选择唯一设备: {selected_device['name']}")
        else:
            try:
                choice = input(f"\n请选择要连接的设备 (1-{len(devices)}): ")
                index = int(choice) - 1
                if 0 <= index < len(devices):
                    selected_device = devices[index]
                else:
                    print("❌ 无效选择")
                    return False
            except (ValueError, KeyboardInterrupt):
                print("❌ 操作取消")
                return False
        
        # 连接设备
        print(f"🔗 正在连接 {selected_device['name']}...")
        success = await self.connector.connect(selected_device['address'])
        
        if success:
            print(f"✅ 成功连接到 {selected_device['name']}")
            # 设置数据回调
            self.connector.set_data_callback(self.on_temperature_data)
            return True
        else:
            print(f"❌ 连接失败")
            return False
    
    async def start_monitoring(self, duration: int = 60):
        """开始监控温度数据"""
        if not self.connector.is_connected:
            print("❌ 设备未连接")
            return
        
        print(f"📈 开始监控温度数据，持续 {duration} 秒...")
        print("按 Ctrl+C 可提前停止监控\n")
        
        self.is_monitoring = True
        start_time = time.time()
        
        try:
            # 先尝试读取当前数据
            current_data = await self.connector.read_current_data()
            if current_data:
                print(f"📊 当前数据: {current_data}")
            else:
                print("⏳ 等待设备推送数据...")
            
            # 监控指定时间
            while self.is_monitoring and (time.time() - start_time) < duration:
                await asyncio.sleep(1)
                
                # 每10秒显示一次统计信息
                if len(self.data_history) > 0 and int(time.time() - start_time) % 10 == 0:
                    self.show_statistics()
        
        except KeyboardInterrupt:
            print("\n⏹️ 用户停止监控")
        
        finally:
            self.is_monitoring = False
            await self.connector.disconnect()
            print("🔌 设备已断开连接")
    
    def show_statistics(self):
        """显示统计信息"""
        if not self.data_history:
            return
        
        temps = [d.temperature for d in self.data_history]
        humids = [d.humidity for d in self.data_history]
        
        print(f"\n📈 统计信息 (基于 {len(self.data_history)} 条记录):")
        print(f"   温度: 最低 {min(temps):.1f}°C, 最高 {max(temps):.1f}°C, 平均 {sum(temps)/len(temps):.1f}°C")
        print(f"   湿度: 最低 {min(humids):.1f}%, 最高 {max(humids):.1f}%, 平均 {sum(humids)/len(humids):.1f}%")
        
        if self.data_history[-1].battery:
            print(f"   电池: {self.data_history[-1].battery}%")
        if self.data_history[-1].voltage:
            print(f"   电压: {self.data_history[-1].voltage}mV")
        print()

async def quick_read_example():
    """快速读取示例"""
    print("🚀 快速读取温度数据示例\n")
    
    monitor = TemperatureMonitor()
    
    # 扫描并连接
    if await monitor.scan_and_connect():
        # 读取一次数据
        data = await monitor.connector.read_current_data()
        if data:
            print(f"📊 读取到数据: {data}")
        else:
            print("⚠️ 无法读取数据，可能需要等待设备推送")
        
        await monitor.connector.disconnect()

async def continuous_monitoring_example():
    """持续监控示例"""
    print("🔄 持续监控温度数据示例\n")
    
    monitor = TemperatureMonitor()
    
    # 扫描并连接
    if await monitor.scan_and_connect():
        # 持续监控
        await monitor.start_monitoring(duration=120)  # 监控2分钟

def main():
    """主函数"""
    print("🌡️ 温度计连接器示例程序")
    print("=" * 50)
    
    print("\n请选择运行模式:")
    print("1. 快速读取 - 连接设备并读取一次数据")
    print("2. 持续监控 - 连接设备并持续监控数据")
    
    try:
        choice = input("\n请输入选择 (1 或 2): ").strip()
        
        if choice == "1":
            asyncio.run(quick_read_example())
        elif choice == "2":
            asyncio.run(continuous_monitoring_example())
        else:
            print("❌ 无效选择")
    
    except KeyboardInterrupt:
        print("\n👋 程序已退出")
    except Exception as e:
        print(f"❌ 程序出错: {e}")

if __name__ == "__main__":
    main()
