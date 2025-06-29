# CUST宿舍实时温度监控系统

> 长春理工大学宿舍环境数据采集与展示解决方案

基于蓝牙低功耗(BLE)技术的智能温湿度监控系统，专为宿舍环境设计，提供实时数据采集、存储和Web可视化展示。

## ✨ 核心特性

### 🔗 智能连接
- **自动设备发现** - 智能扫描附近的蓝牙温湿度计
- **多设备支持** - 兼容小米、青萍等主流品牌温湿度计
- **断线重连** - 设备断开后自动重新连接，确保数据连续性
- **连接状态监控** - 实时显示设备连接状态和信号强度

### 📊 数据管理
- **实时采集** - 持续监控温湿度变化，数据更新频率可配置
- **本地存储** - SQLite数据库安全存储历史数据
- **数据完整性** - 包含温度、湿度、电池电量、时间戳等完整信息
- **历史查询** - 支持按时间范围查询历史数据

### 🌐 Web展示界面
- **实时监控** - "CUST宿舍实时温度"主题的专业监控界面
- **响应式设计** - 完美适配手机、平板、电脑等各种设备
- **数据可视化** - Chart.js驱动的实时温湿度趋势图表
- **WebSocket推送** - 毫秒级实时数据更新，无需刷新页面

### 🏗️ 架构设计
- **服务分离** - 数据采集与Web展示服务独立运行
- **模块化设计** - 核心功能模块化，易于扩展和维护
- **异步处理** - 基于asyncio的高性能异步架构
- **日志系统** - 完整的日志记录，便于问题排查

## 🎯 支持设备

### 小米生态链设备
- **LYWSD03MMC** - 米家蓝牙温湿度计2
- **LYWSD02** - 米家蓝牙温湿度计
- **MJWSD05MMC** - 米家温湿度计Pro
- **MJWSD06MMC** - 米家温湿度计

### 青萍设备
- **CGG1** - 青萍蓝牙温湿度计
- **CGDK2** - 青萍温湿度计

### 其他兼容设备
- 支持标准BLE温湿度广播协议的设备

## 🚀 快速开始

### 环境要求
- **操作系统**: Windows 10/11 (支持蓝牙BLE)
- **Python版本**: 3.7+
- **硬件要求**: 蓝牙4.0+适配器
- **网络**: 可选，用于局域网访问

### 一键安装
```bash
# 克隆项目
git clone https://github.com/your-repo/custTemperature.git
cd custTemperature

# 安装依赖
pip install -r requirements.txt
```

### 🎮 启动方式

#### 方式一：分离式启动（推荐生产环境）

**1. 启动数据采集服务**
```bash
python start_data_collector.py
```
- ✅ 后台持续采集温湿度数据
- ✅ 自动设备搜索和连接
- ✅ 数据库自动存储
- ✅ 断线自动重连

**2. 启动Web展示服务**
```bash
python start_web_display.py
```
- ✅ 启动"CUST宿舍实时温度"Web界面
- ✅ 仅数据展示，不干扰设备连接
- ✅ 自动打开浏览器访问
- ✅ 支持局域网多设备访问

#### 方式二：一键启动（推荐个人使用）
```bash
python quick_start.py
```
或双击运行：`启动CUST温度监控.bat`

#### 方式三：交互式启动
```bash
python start_monitor.py
```
提供三种运行模式选择：
1. **仅数据采集** - 后台采集，无Web界面
2. **完整服务** - 数据采集 + Web展示
3. **数据查看** - 查看历史数据统计

### 🌐 Web界面访问

**本地访问**
```
http://localhost:5000
```

**局域网访问**
```
http://[你的IP地址]:5000
```

## 📱 Web界面功能

### 实时监控面板
- **温度显示** - 大字体实时温度显示，支持华氏度切换
- **湿度显示** - 实时湿度百分比，舒适度指示
- **设备状态** - 连接状态、设备名称、信号强度
- **电池监控** - 设备电池电量实时显示

### 数据可视化
- **实时图表** - 温湿度变化趋势实时更新
- **历史数据** - 可选择1小时、6小时、24小时、7天等时间范围
- **数据导出** - 支持CSV格式数据导出
- **统计信息** - 最高、最低、平均值统计

### 响应式设计
- **手机适配** - 完美适配各种手机屏幕
- **平板优化** - 平板设备专门优化布局
- **桌面版本** - 大屏幕多列布局展示

## 🔧 API接口

### REST API
- `GET /api/latest` - 获取最新温湿度数据
- `GET /api/history?hours=24` - 获取指定时间范围的历史数据
- `GET /api/status` - 获取设备连接状态和系统信息

### WebSocket事件
- `temperature_update` - 实时温湿度数据推送
- `connection_status` - 设备连接状态变化
- `device_info` - 设备信息更新

## 💻 开发者指南

### 核心类库

#### TemperatureSensorConnector
主要的蓝牙连接器类，提供设备连接和数据读取功能。

**基础使用示例:**
```python
import asyncio
from temperature_sensor_connector import TemperatureSensorConnector

async def basic_usage():
    # 创建连接器实例
    connector = TemperatureSensorConnector()

    try:
        # 扫描附近的温湿度计设备
        print("🔍 扫描设备中...")
        devices = await connector.scan_devices(timeout=10)

        if not devices:
            print("❌ 未发现任何设备")
            return

        # 显示发现的设备
        for i, device in enumerate(devices):
            print(f"{i+1}. {device['name']} ({device['address']})")

        # 连接第一个设备
        device = devices[0]
        print(f"🔗 连接设备: {device['name']}")

        if await connector.connect(device['address']):
            print("✅ 连接成功")

            # 读取当前数据
            data = await connector.read_current_data()
            if data:
                print(f"🌡️ 温度: {data.temperature}°C")
                print(f"💧 湿度: {data.humidity}%")
                print(f"🔋 电池: {data.battery}%")

            # 断开连接
            await connector.disconnect()
            print("🔌 已断开连接")
        else:
            print("❌ 连接失败")

    except Exception as e:
        print(f"❌ 错误: {e}")

# 运行示例
asyncio.run(basic_usage())
```

**持续监控示例:**
```python
import asyncio
from temperature_sensor_connector import TemperatureSensorConnector, TemperatureData

async def continuous_monitoring():
    connector = TemperatureSensorConnector()

    # 设置数据回调函数
    def on_data_received(data: TemperatureData):
        print(f"📊 [{data.timestamp}] 温度: {data.temperature}°C, 湿度: {data.humidity}%")

        # 温度异常检测
        if data.temperature > 30:
            print("🔥 警告: 温度过高!")
        elif data.temperature < 10:
            print("🧊 警告: 温度过低!")

        # 湿度异常检测
        if data.humidity > 70:
            print("💧 警告: 湿度过高!")
        elif data.humidity < 30:
            print("🏜️ 警告: 湿度过低!")

    # 设置连接状态回调
    def on_connection_changed(connected: bool, device_name: str = None):
        if connected:
            print(f"✅ 设备已连接: {device_name}")
        else:
            print("❌ 设备已断开，正在重连...")

    connector.set_data_callback(on_data_received)
    connector.set_connection_callback(on_connection_changed)

    try:
        print("🚀 开始持续监控...")
        await connector.start_continuous_scanning()
    except KeyboardInterrupt:
        print("\n⏹️ 停止监控")
        connector.stop_scanning()

# 运行持续监控
asyncio.run(continuous_monitoring())
```

#### TemperatureDataStorage
数据存储管理类，负责SQLite数据库操作。

**基础使用示例:**
```python
from temperature_sensor_connector import TemperatureDataStorage, TemperatureData
from datetime import datetime, timedelta

# 创建存储实例
storage = TemperatureDataStorage()

# 创建示例数据
sample_data = TemperatureData(
    temperature=23.5,
    humidity=65.2,
    battery=85,
    voltage=3200,
    timestamp=datetime.now(),
    device_name="LYWSD03MMC",
    device_address="A4:C1:38:XX:XX:XX"
)

# 保存数据到数据库
storage.save_data(sample_data)
print("✅ 数据已保存")

# 获取最新的10条数据
latest_data = storage.get_latest_data(limit=10)
print(f"📊 最新数据条数: {len(latest_data)}")

# 获取最近24小时的数据
end_time = datetime.now()
start_time = end_time - timedelta(hours=24)
history_data = storage.get_data_by_time_range(start_time, end_time)
print(f"📈 24小时数据条数: {len(history_data)}")

# 数据统计分析
if history_data:
    temperatures = [d.temperature for d in history_data]
    humidities = [d.humidity for d in history_data]

    print(f"🌡️ 温度统计:")
    print(f"   最高: {max(temperatures):.1f}°C")
    print(f"   最低: {min(temperatures):.1f}°C")
    print(f"   平均: {sum(temperatures)/len(temperatures):.1f}°C")

    print(f"💧 湿度统计:")
    print(f"   最高: {max(humidities):.1f}%")
    print(f"   最低: {min(humidities):.1f}%")
    print(f"   平均: {sum(humidities)/len(humidities):.1f}%")
```

**高级查询示例:**
```python
import sqlite3
from datetime import datetime, timedelta

def advanced_data_analysis():
    """高级数据分析示例"""
    conn = sqlite3.connect('temperature_data.db')
    cursor = conn.cursor()

    # 查询每小时平均温湿度
    query = """
    SELECT
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
        AVG(temperature) as avg_temp,
        AVG(humidity) as avg_humidity,
        COUNT(*) as data_count
    FROM temperature_data
    WHERE timestamp >= datetime('now', '-24 hours')
    GROUP BY strftime('%Y-%m-%d %H', timestamp)
    ORDER BY hour
    """

    cursor.execute(query)
    hourly_data = cursor.fetchall()

    print("📊 每小时平均数据:")
    for hour, temp, humidity, count in hourly_data:
        print(f"   {hour}: {temp:.1f}°C, {humidity:.1f}%, {count}条数据")

    # 查询温度变化趋势
    trend_query = """
    SELECT
        temperature,
        LAG(temperature) OVER (ORDER BY timestamp) as prev_temp,
        timestamp
    FROM temperature_data
    WHERE timestamp >= datetime('now', '-1 hour')
    ORDER BY timestamp
    """

    cursor.execute(trend_query)
    trend_data = cursor.fetchall()

    rising_count = 0
    falling_count = 0

    for temp, prev_temp, timestamp in trend_data:
        if prev_temp is not None:
            if temp > prev_temp:
                rising_count += 1
            elif temp < prev_temp:
                falling_count += 1

    print(f"\n📈 温度趋势分析:")
    print(f"   上升次数: {rising_count}")
    print(f"   下降次数: {falling_count}")

    if rising_count > falling_count:
        print("   🔥 总体趋势: 温度上升")
    elif falling_count > rising_count:
        print("   🧊 总体趋势: 温度下降")
    else:
        print("   ➡️ 总体趋势: 温度稳定")

    conn.close()

# 运行高级分析
advanced_data_analysis()
```

### 数据结构

```python
@dataclass
class TemperatureData:
    temperature: float      # 温度 (°C)
    humidity: float        # 湿度 (%)
    battery: Optional[int] # 电池电量 (%)
    voltage: Optional[int] # 电压 (mV)
    timestamp: Optional[datetime] # 时间戳
    device_name: Optional[str]    # 设备名称
    device_address: Optional[str] # 设备地址
```

### 数据库结构

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

## 📁 项目结构

```
custTemperature/
├── 📄 README.md                       # 项目说明文档
├── 📄 requirements.txt                # Python依赖包列表
├── 🐍 temperature_sensor_connector.py # 核心连接器和数据存储类
├── 🌐 web_app.py                      # Flask Web应用服务器
├── 🚀 quick_start.py                  # 一键启动脚本
├── 📊 start_data_collector.py         # 数据采集服务启动器
├── 🖥️ start_web_display.py           # Web展示服务启动器
├── ⚙️ start_monitor.py                # 交互式启动脚本
├── 📝 example_usage.py                # 使用示例代码
├── 🖼️ templates/
│   └── index.html                     # Web界面HTML模板
├── 🎨 static/
│   ├── css/
│   │   └── style.css                  # 界面样式文件
│   └── js/
│       └── app.js                     # 前端JavaScript逻辑
├── 🗄️ temperature_data.db             # SQLite数据库（自动创建）
├── 📋 temperature_monitor.log         # 系统日志文件（自动创建）
├── 🖱️ 启动CUST温度监控.bat           # Windows一键启动脚本
└── 🖱️ 启动Web数据展示.bat            # Windows Web服务启动脚本
```

## 🔍 故障排除

### 常见问题

**1. 蓝牙连接失败**
```
❌ 错误: 无法连接到设备
```
**解决方案:**
- 确保蓝牙适配器已启用并正常工作
- 检查温湿度计是否在可发现模式
- 尝试重启蓝牙服务：`services.msc` → 重启 "Bluetooth Support Service"
- 确认设备距离在2-10米有效范围内
- 检查设备是否已被其他程序占用

**2. Web界面无法访问**
```
❌ 错误: 无法访问 http://localhost:5000
```
**解决方案:**
- 检查Windows防火墙设置，允许Python程序通过防火墙
- 确认端口5000未被其他程序占用：`netstat -ano | findstr :5000`
- 尝试使用管理员权限运行程序
- 检查网络适配器设置，确保本地回环正常

**3. 数据采集中断**
```
❌ 错误: 设备连接丢失
```
**解决方案:**
- 检查温湿度计电池电量（低于20%可能影响连接稳定性）
- 确认设备距离在有效范围内，避免障碍物遮挡
- 检查系统资源占用，确保CPU和内存充足
- 查看日志文件 `temperature_monitor.log` 排查具体错误原因

**4. 依赖包安装失败**
```
❌ 错误: pip install 失败
```
**解决方案:**
- 升级pip：`python -m pip install --upgrade pip`
- 使用国内镜像：`pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/`
- 检查Python版本是否为3.7+：`python --version`
- 在虚拟环境中安装：`python -m venv venv && venv\Scripts\activate`

### 性能优化建议

**1. 数据库优化**
- 定期清理历史数据：保留最近30天数据
- 创建索引提高查询速度
- 使用数据压缩减少存储空间

**2. 连接稳定性**
- 调整扫描间隔：默认30秒，可根据需要调整
- 优化重连策略：指数退避算法
- 监控信号强度：RSSI < -80dBm时提醒用户调整位置

**3. Web性能**
- 启用数据缓存：减少数据库查询频率
- 压缩静态资源：CSS/JS文件压缩
- 使用CDN：加速前端资源加载

### 日志系统

**日志文件位置**
- 主日志：`temperature_monitor.log`
- Web访问日志：自动记录在控制台
- 错误日志：包含详细的异常堆栈信息

**日志级别说明**
- `INFO` - 正常运行信息
- `WARNING` - 警告信息（如连接不稳定）
- `ERROR` - 错误信息（如连接失败）
- `DEBUG` - 调试信息（开发模式下启用）

**日志查看命令**
```bash
# 查看最新日志
tail -f temperature_monitor.log

# 搜索错误信息
findstr "ERROR" temperature_monitor.log

# 查看特定时间段日志
findstr "2024-06-29" temperature_monitor.log
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进项目！

## 📞 联系方式

- **项目主页**: [GitHub Repository](https://github.com/your-repo/custTemperature)
- **问题反馈**: [Issues](https://github.com/your-repo/custTemperature/issues)
- **技术支持**: 长春理工大学计算机科学技术学院

---

<div align="center">
  <strong>🌡️ CUST宿舍实时温度监控系统</strong><br>
  <em>让宿舍环境数据可视化，让生活更智能</em>
</div>
