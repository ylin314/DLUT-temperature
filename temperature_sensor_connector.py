#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温度计连接器 - 基于Telink Flasher网页代码提取的关键方法
用于连接蓝牙温度计设备并获取温度湿度数据
"""

import asyncio
import struct
import logging
import json
import sqlite3
from typing import Dict, Optional, Tuple, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

try:
    from bleak import BleakClient, BleakScanner
    from bleak.backends.characteristic import BleakGATTCharacteristic
except ImportError:
    print("请安装bleak库: pip install bleak")
    exit(1)

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TemperatureData:
    """温度湿度数据结构"""
    temperature: float  # 温度 (°C)
    humidity: float     # 湿度 (%)
    battery: Optional[int] = None  # 电池电量 (%)
    voltage: Optional[int] = None  # 电压 (mV)
    timestamp: Optional[datetime] = None
    device_name: Optional[str] = None  # 设备名称
    device_address: Optional[str] = None  # 设备地址

    def __str__(self):
        result = f"温度: {self.temperature:.2f}°C, 湿度: {self.humidity:.2f}%"
        if self.battery is not None:
            result += f", 电池: {self.battery}%"
        if self.voltage is not None:
            result += f", 电压: {self.voltage}mV"
        if self.timestamp:
            result += f", 时间: {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
        if self.device_name:
            result += f", 设备: {self.device_name}"
        return result

    def to_dict(self):
        """转换为字典格式"""
        data = asdict(self)
        if self.timestamp:
            data['timestamp'] = self.timestamp.isoformat()
        return data

class TemperatureSensorConnector:
    """温度计连接器类"""
    
    # 蓝牙服务和特征UUID (基于网页代码中的定义)
    SERVICES = {
        'MI_MAIN': 'ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6',
        'CUSTOM': '22210000-554a-4546-5542-46534450464d',
        'DEVICE_INFO': '0000180a-0000-1000-8000-00805f9b34fb',
        'CUSTOM_SETTINGS': '00001f10-0000-1000-8000-00805f9b34fb'
    }
    
    CHARACTERISTICS = {
        'MI_TEMP': 'ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6',  # Mi温度特征
        'CUSTOM_NOTIFY': '00001f1f-0000-1000-8000-00805f9b34fb',  # 自定义通知
        'CUSTOM_WRITE': '0000fffe-0000-1000-8000-00805f9b34fb',   # 自定义写入
        'QINGPING_NOTIFY': '00000100-0000-0000-0000-000000000000'  # 青萍通知
    }
    
    def __init__(self, device_name_filter: Optional[str] = None, auto_reconnect: bool = True):
        """
        初始化温度计连接器

        Args:
            device_name_filter: 设备名称过滤器，用于筛选特定设备
            auto_reconnect: 是否自动重连
        """
        self.device_name_filter = device_name_filter
        self.auto_reconnect = auto_reconnect
        self.client: Optional[BleakClient] = None
        self.is_connected = False
        self.data_callback: Optional[Callable[[TemperatureData], None]] = None
        self.current_device_address: Optional[str] = None
        self.current_device_name: Optional[str] = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.is_scanning = False
        
    async def scan_devices(self, timeout: int = 10) -> list:
        """
        扫描附近的蓝牙温度计设备
        
        Args:
            timeout: 扫描超时时间(秒)
            
        Returns:
            设备列表
        """
        logger.info(f"开始扫描蓝牙设备，超时时间: {timeout}秒")
        
        devices = await BleakScanner.discover(timeout=timeout)
        temperature_devices = []
        
        for device in devices:
            # 根据设备名称过滤温度计设备
            if device.name and any(keyword in device.name.upper() for keyword in 
                                 ['LYWSD', 'MHO', 'CGG', 'CGDK', 'MJWSD', 'TEMP', 'THERMO']):
                if not self.device_name_filter or self.device_name_filter.upper() in device.name.upper():
                    temperature_devices.append({
                        'name': device.name,
                        'address': device.address,
                        'rssi': device.rssi if hasattr(device, 'rssi') else None
                    })
                    logger.info(f"发现温度计设备: {device.name} ({device.address})")
        
        return temperature_devices
    
    async def connect(self, device_address: str, device_name: str = None) -> bool:
        """
        连接到指定的温度计设备

        Args:
            device_address: 设备MAC地址
            device_name: 设备名称

        Returns:
            连接是否成功
        """
        try:
            logger.info(f"正在连接设备: {device_address}")
            self.client = BleakClient(device_address, disconnected_callback=self._on_disconnect)
            await self.client.connect()
            self.is_connected = True
            self.current_device_address = device_address
            self.current_device_name = device_name
            self.reconnect_attempts = 0
            logger.info("设备连接成功")

            # 启动数据监听
            await self._setup_notifications()
            return True

        except Exception as e:
            logger.error(f"连接设备失败: {e}")
            self.is_connected = False
            return False

    def _on_disconnect(self, client: BleakClient):
        """设备断开连接回调"""
        logger.warning("设备连接断开")
        self.is_connected = False

        if self.auto_reconnect and self.reconnect_attempts < self.max_reconnect_attempts:
            self.reconnect_attempts += 1
            logger.info(f"尝试重连 ({self.reconnect_attempts}/{self.max_reconnect_attempts})")
            asyncio.create_task(self._reconnect())

    async def _reconnect(self):
        """自动重连"""
        if not self.current_device_address:
            return

        await asyncio.sleep(5)  # 等待5秒后重连

        try:
            await self.connect(self.current_device_address, self.current_device_name)
        except Exception as e:
            logger.error(f"重连失败: {e}")
            if self.reconnect_attempts < self.max_reconnect_attempts:
                await asyncio.sleep(10)  # 失败后等待更长时间
                await self._reconnect()
    
    async def disconnect(self):
        """断开设备连接"""
        if self.client and self.is_connected:
            await self.client.disconnect()
            self.is_connected = False
            logger.info("设备已断开连接")
    
    async def _setup_notifications(self):
        """设置数据通知监听"""
        if not self.client or not self.is_connected:
            return
        
        # 尝试不同的特征UUID来接收数据
        characteristics_to_try = [
            self.CHARACTERISTICS['MI_TEMP'],
            self.CHARACTERISTICS['CUSTOM_NOTIFY'],
            '0000ffe1-0000-1000-8000-00805f9b34fb',  # 常见的自定义特征
        ]
        
        for char_uuid in characteristics_to_try:
            try:
                await self.client.start_notify(char_uuid, self._notification_handler)
                logger.info(f"成功启动通知监听: {char_uuid}")
                break
            except Exception as e:
                logger.debug(f"无法启动通知 {char_uuid}: {e}")
                continue
    
    def _notification_handler(self, characteristic: BleakGATTCharacteristic, data: bytearray):
        """
        处理接收到的数据通知
        
        Args:
            characteristic: 蓝牙特征
            data: 接收到的数据
        """
        try:
            temp_data = self._parse_temperature_data(data)
            if temp_data and self.data_callback:
                self.data_callback(temp_data)
        except Exception as e:
            logger.error(f"解析数据失败: {e}")
    
    def _parse_temperature_data(self, data: bytearray) -> Optional[TemperatureData]:
        """
        解析温度湿度数据 (基于网页代码中的解析逻辑)
        
        Args:
            data: 原始数据
            
        Returns:
            解析后的温度数据
        """
        if len(data) < 3:
            return None
        
        try:
            # 方法1: Mi设备格式 (基于网页代码第784-787行)
            if len(data) >= 5:
                temp = struct.unpack('<h', data[0:2])[0] / 100.0  # 温度 (°C)
                humidity = data[2]  # 湿度 (%)
                voltage = struct.unpack('<H', data[3:5])[0] if len(data) >= 5 else None  # 电压 (mV)
                
                return TemperatureData(
                    temperature=temp,
                    humidity=humidity,
                    voltage=voltage,
                    timestamp=datetime.now(),
                    device_name=self.current_device_name,
                    device_address=self.current_device_address
                )
            
            # 方法2: 自定义格式解析 (基于网页代码第933-949行)
            elif len(data) >= 9:
                voltage = struct.unpack('<H', data[1:3])[0]  # 电压
                temp = struct.unpack('<h', data[3:5])[0] / 100.0  # 温度
                humidity = struct.unpack('<H', data[5:7])[0] / 100.0  # 湿度
                
                return TemperatureData(
                    temperature=temp,
                    humidity=humidity,
                    voltage=voltage,
                    timestamp=datetime.now(),
                    device_name=self.current_device_name,
                    device_address=self.current_device_address
                )
            
            # 方法3: 青萍设备格式 (基于网页代码第645-647行)
            elif len(data) >= 6:
                command_id = struct.unpack('<H', data[0:2])[0]
                if command_id == 0x1706:  # 温湿度数据命令ID
                    temp = struct.unpack('<h', data[2:4])[0] / 10.0
                    humidity = struct.unpack('<h', data[4:6])[0] / 10.0
                    
                    return TemperatureData(
                        temperature=temp,
                        humidity=humidity,
                        timestamp=datetime.now(),
                        device_name=self.current_device_name,
                        device_address=self.current_device_address
                    )
            
        except struct.error as e:
            logger.debug(f"数据解析错误: {e}")
        
        return None
    
    def set_data_callback(self, callback: Callable[[TemperatureData], None]):
        """
        设置数据回调函数
        
        Args:
            callback: 当接收到新数据时调用的回调函数
        """
        self.data_callback = callback
    
    async def read_current_data(self) -> Optional[TemperatureData]:
        """
        读取当前温湿度数据
        
        Returns:
            当前的温度数据，如果读取失败返回None
        """
        if not self.client or not self.is_connected:
            logger.error("设备未连接")
            return None
        
        # 尝试从不同特征读取数据
        characteristics_to_read = [
            self.CHARACTERISTICS['MI_TEMP'],
            self.CHARACTERISTICS['CUSTOM_NOTIFY'],
        ]
        
        for char_uuid in characteristics_to_read:
            try:
                data = await self.client.read_gatt_char(char_uuid)
                temp_data = self._parse_temperature_data(data)
                if temp_data:
                    return temp_data
            except Exception as e:
                logger.debug(f"无法从特征 {char_uuid} 读取数据: {e}")
                continue
        
        logger.warning("无法读取温度数据")
        return None

    async def start_continuous_scanning(self):
        """开始持续扫描和连接"""
        self.is_scanning = True
        logger.info("开始持续扫描模式")

        while self.is_scanning:
            try:
                if not self.is_connected:
                    logger.info("扫描温度计设备...")
                    devices = await self.scan_devices(timeout=10)

                    if devices:
                        # 尝试连接第一个设备
                        device = devices[0]
                        logger.info(f"尝试连接设备: {device['name']}")
                        await self.connect(device['address'], device['name'])
                    else:
                        logger.info("未发现设备，5秒后重新扫描...")
                        await asyncio.sleep(5)
                else:
                    # 已连接，等待一段时间后检查连接状态
                    await asyncio.sleep(10)

            except Exception as e:
                logger.error(f"扫描过程出错: {e}")
                await asyncio.sleep(5)

    def stop_scanning(self):
        """停止持续扫描"""
        self.is_scanning = False
        logger.info("停止持续扫描")

# 示例使用函数
async def main():
    """主函数示例"""
    connector = TemperatureSensorConnector()
    
    # 设置数据回调
    def on_data_received(data: TemperatureData):
        print(f"接收到数据: {data}")
    
    connector.set_data_callback(on_data_received)
    
    # 扫描设备
    devices = await connector.scan_devices(timeout=10)
    if not devices:
        print("未发现温度计设备")
        return
    
    print("发现的设备:")
    for i, device in enumerate(devices):
        print(f"{i+1}. {device['name']} - {device['address']}")
    
    # 连接第一个设备
    if await connector.connect(devices[0]['address']):
        print("连接成功，开始监听数据...")
        
        # 读取当前数据
        current_data = await connector.read_current_data()
        if current_data:
            print(f"当前数据: {current_data}")
        
        # 持续监听30秒
        await asyncio.sleep(30)
        
        await connector.disconnect()
    else:
        print("连接失败")

class TemperatureDataStorage:
    """温度数据存储类"""

    def __init__(self, db_path: str = "temperature_data.db"):
        """
        初始化数据存储

        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """初始化数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS temperature_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL NOT NULL,
                battery INTEGER,
                voltage INTEGER,
                device_name TEXT,
                device_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON temperature_data(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_device ON temperature_data(device_address)')

        conn.commit()
        conn.close()
        logger.info(f"数据库初始化完成: {self.db_path}")

    def save_data(self, data: TemperatureData):
        """保存温度数据"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO temperature_data
                (timestamp, temperature, humidity, battery, voltage, device_name, device_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.timestamp.isoformat() if data.timestamp else datetime.now().isoformat(),
                data.temperature,
                data.humidity,
                data.battery,
                data.voltage,
                data.device_name,
                data.device_address
            ))

            conn.commit()
            conn.close()
            logger.debug(f"数据已保存: {data}")

        except Exception as e:
            logger.error(f"保存数据失败: {e}")

    def get_latest_data(self, limit: int = 1) -> list:
        """获取最新的温度数据"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT timestamp, temperature, humidity, battery, voltage, device_name, device_address
                FROM temperature_data
                ORDER BY created_at DESC
                LIMIT ?
            ''', (limit,))

            rows = cursor.fetchall()
            conn.close()

            result = []
            for row in rows:
                result.append({
                    'timestamp': row[0],
                    'temperature': row[1],
                    'humidity': row[2],
                    'battery': row[3],
                    'voltage': row[4],
                    'device_name': row[5],
                    'device_address': row[6]
                })

            return result

        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return []

    def get_data_by_time_range(self, start_time: datetime, end_time: datetime) -> list:
        """根据时间范围获取数据"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT timestamp, temperature, humidity, battery, voltage, device_name, device_address
                FROM temperature_data
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp DESC
            ''', (start_time.isoformat(), end_time.isoformat()))

            rows = cursor.fetchall()
            conn.close()

            result = []
            for row in rows:
                result.append({
                    'timestamp': row[0],
                    'temperature': row[1],
                    'humidity': row[2],
                    'battery': row[3],
                    'voltage': row[4],
                    'device_name': row[5],
                    'device_address': row[6]
                })

            return result

        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return []

if __name__ == "__main__":
    asyncio.run(main())
