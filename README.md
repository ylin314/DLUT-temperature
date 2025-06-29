# 文档由AI编写,未经审计
# 温度计连接器 (Temperature Sensor Connector)

基于Telink Flasher网页代码提取的关键方法，用于连接蓝牙温度计设备并获取温度湿度数据的Python库。

## 功能特性

- 🔍 **自动扫描** - 扫描附近的蓝牙温度计设备
- 🔗 **智能连接** - 支持多种温度计设备类型，自动重连
- 📊 **数据解析** - 解析温度、湿度、电池等数据
- 📈 **实时监控** - 持续监控温度变化，永不中断
- 🔄 **多格式支持** - 支持Mi设备、青萍设备等多种数据格式
- 💾 **数据存储** - SQLite数据库存储历史数据
- 🌐 **Web界面** - 美观的实时温度监控网页
- 📱 **响应式设计** - 支持手机、平板、电脑访问
- 📊 **数据可视化** - 实时图表显示温度湿度趋势
- 🔔 **实时推送** - WebSocket实时数据推送

## 支持的设备

基于网页代码中的设备列表，支持以下温度计设备：

- **小米系列**:  MJWSD06MMC


## 安装依赖

```bash
# 基础依赖
pip install -r requirements.txt

# 或者手动安装
pip install bleak flask flask-socketio python-socketio eventlet
```

## 快速开始

### 🚀 分离式启动（推荐）

#### 1. 启动数据采集服务
```bash
python start_data_collector.py
```
- 自动扫描连接蓝牙温度计
- 持续采集数据并保存到数据库
- 设备断线自动重连

#### 2. 启动Web数据展示
```bash
python start_web_display.py
```
- 启动"CUST宿舍实时温度"网页界面
- 仅用于数据展示，不控制设备
- 自动打开浏览器访问 http://localhost:5000

### 🌐 Web界面访问

Web数据展示地址：
```
http://localhost:5000
```

### 📋 一体化启动（备选）

```bash
python start_monitor.py
```

选择运行模式：
- **模式1**: 仅数据采集
- **模式2**: Web服务（数据采集+Web展示）
- **模式3**: 数据查看

### 1. 基本使用

```python
import asyncio
from temperature_sensor_connector import TemperatureSensorConnector

async def main():
    connector = TemperatureSensorConnector()
    
    # 扫描设备
    devices = await connector.scan_devices()
    if devices:
        # 连接第一个设备
        if await connector.connect(devices[0]['address']):
            # 读取数据
            data = await connector.read_current_data()
            print(f"温度: {data.temperature}°C, 湿度: {data.humidity}%")
            await connector.disconnect()

asyncio.run(main())
```

### 2. 持续监控

```python
import asyncio
from temperature_sensor_connector import TemperatureSensorConnector

async def main():
    connector = TemperatureSensorConnector()
    
    # 设置数据回调
    def on_data(data):
        print(f"新数据: {data}")
    
    connector.set_data_callback(on_data)
    
    # 连接并监控
    devices = await connector.scan_devices()
    if devices and await connector.connect(devices[0]['address']):
        await asyncio.sleep(60)  # 监控60秒
        await connector.disconnect()

asyncio.run(main())
```

### 3. 持续监控模式

```bash
# 启动持续监控（自动重连）
from temperature_sensor_connector import TemperatureSensorConnector, TemperatureDataStorage

connector = TemperatureSensorConnector(auto_reconnect=True)
storage = TemperatureDataStorage()

def on_data(data):
    print(f"数据: {data}")
    storage.save_data(data)  # 自动保存到数据库

connector.set_data_callback(on_data)
await connector.start_continuous_scanning()  # 持续扫描，永不停止
```

### 4. Web应用模式

```bash
python web_app.py
```

访问 http://localhost:5000 查看"CUST宿舍实时温度"监控界面

## 🌐 Web界面功能

### 主要特性
- **实时数据显示** - 大屏显示当前温度和湿度
- **连接状态监控** - 实时显示设备连接状态
- **历史数据图表** - 可选择1小时、6小时、24小时、7天的数据趋势
- **数据统计** - 显示最高、最低、平均值等统计信息
- **数据刷新控制** - 手动刷新和自动刷新功能
- **响应式设计** - 支持手机、平板、电脑访问
- **实时推送** - 无需刷新页面，数据自动更新

### 设计理念
- **纯展示界面** - Web页面仅用于数据查看，不包含设备控制
- **分离式架构** - 数据采集和Web展示分离，提高系统稳定性
- **实时同步** - 数据采集程序保存到数据库，Web界面实时读取显示

### 界面布局
1. **状态栏** - 连接状态、设备信息、电池电量
2. **主数据区** - 大字体显示温度和湿度，带趋势指示
3. **图表区** - 历史数据可视化图表
4. **控制面板** - 系统控制按钮
5. **统计信息** - 数据统计卡片

### API接口
- `GET /api/latest` - 获取最新数据
- `GET /api/history?hours=24` - 获取历史数据
- `GET /api/status` - 获取连接状态和设备信息

注：设备控制API已移除，Web界面仅用于数据展示

## 核心类和方法

### TemperatureSensorConnector

主要的连接器类，提供以下方法：

#### 方法说明

- `scan_devices(timeout=10)` - 扫描蓝牙温度计设备
- `connect(device_address, device_name)` - 连接到指定设备
- `disconnect()` - 断开设备连接
- `read_current_data()` - 读取当前温度数据
- `set_data_callback(callback)` - 设置数据回调函数
- `start_continuous_scanning()` - 开始持续扫描和连接（新增）
- `stop_scanning()` - 停止持续扫描（新增）

#### 新增特性
- **自动重连** - 设备断开后自动重新连接
- **持续扫描** - 未连接时持续扫描设备
- **连接状态回调** - 实时监控连接状态变化

### TemperatureDataStorage

数据存储类，提供以下方法：

#### 方法说明

- `save_data(data)` - 保存温度数据到SQLite数据库
- `get_latest_data(limit)` - 获取最新的N条数据
- `get_data_by_time_range(start, end)` - 根据时间范围获取数据

#### 数据库结构
```sql
CREATE TABLE temperature_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    battery INTEGER,
    voltage INTEGER,
    device_name TEXT,
    device_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 数据结构

```python
@dataclass
class TemperatureData:
    temperature: float      # 温度 (°C)
    humidity: float        # 湿度 (%)
    battery: Optional[int] # 电池电量 (%)
    voltage: Optional[int] # 电压 (mV)
    timestamp: Optional[datetime] # 时间戳
```

## 技术实现

### 数据解析逻辑

基于网页代码中的解析方法，支持多种数据格式：

1. **Mi设备格式** (基于网页代码第784-787行)
   ```javascript
   let temp = value.getInt16(0, true) / 100;
   let hum = value.getUint8(2);
   let vbat = value.getUint16(3,true);
   ```

2. **自定义格式** (基于网页代码第933-949行)
   ```javascript
   let temp = value.getInt16(3, true) / 100.0;
   let humi = value.getUint16(5, true) / 100.0;
   ```

3. **青萍设备格式** (基于网页代码第645-647行)
   ```javascript
   let temp = value.getInt16(2, true)/10;
   let humi = value.getInt16(4, true)/10;
   ```

### 蓝牙服务和特征

```python
SERVICES = {
    'MI_MAIN': 'ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6',
    'CUSTOM': '22210000-554a-4546-5542-46534450464d',
    'DEVICE_INFO': '0000180a-0000-1000-8000-00805f9b34fb'
}

CHARACTERISTICS = {
    'MI_TEMP': 'ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6',
    'CUSTOM_NOTIFY': '00001f1f-0000-1000-8000-00805f9b34fb'
}
```

## 故障排除

### 常见问题

1. **扫描不到设备**
   - 确保蓝牙已开启
   - 确保温度计设备已开机且在附近
   - 检查设备名称是否包含支持的关键词

2. **连接失败**
   - 尝试重启蓝牙
   - 确保设备未被其他程序占用
   - 检查设备是否处于配对模式

3. **无法读取数据**
   - 某些设备需要等待自动推送数据
   - 尝试不同的特征UUID
   - 检查设备固件版本

### 调试模式

启用详细日志：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 参考资料

- 原始网页代码: Telink Flasher v11.1
- 蓝牙协议: BLE GATT
- Python蓝牙库: [Bleak](https://github.com/hbldh/bleak)

## 📁 项目结构

```
custTemperature/
├── temperature_sensor_connector.py  # 核心连接器和数据存储
├── web_app.py                      # Web应用服务器
├── start_data_collector.py         # 数据采集服务（推荐）
├── start_web_display.py           # Web数据展示服务（推荐）
├── start_monitor.py                # 一体化启动脚本
├── example_usage.py                # 使用示例
├── requirements.txt                # 依赖包列表
├── README.md                       # 项目说明
├── templates/
│   └── index.html                  # Web界面模板
├── static/
│   ├── css/
│   │   └── style.css              # 样式文件
│   └── js/
│       └── app.js                 # 前端JavaScript
├── temperature_data.db             # SQLite数据库（自动创建）
└── temperature_monitor.log         # 日志文件（自动创建）
```

## 🔧 配置说明

### 环境要求
- Python 3.7+
- Windows 10/11 (支持蓝牙BLE)
- 蓝牙适配器

### 网络访问
- 本地访问: http://localhost:5000
- 局域网访问: http://[你的IP]:5000
- 支持手机、平板访问

## 许可证

本项目基于原始网页代码提取，仅供学习和研究使用。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

---

**注意**: 本代码基于网页版Telink Flasher的JavaScript代码提取和转换，针对CUST宿舍环境监测需求进行了优化和扩展。
