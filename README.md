# 🌡️ 智能温湿度监控系统

> 基于蓝牙BLE技术的通用温湿度监控解决方案

一个功能完整的智能温湿度监控系统，支持多品牌蓝牙设备，提供实时数据采集、存储和Web可视化展示。**支持国际化多语言界面，可快速配置为任何学校或机构使用**。

## ✨ 核心特性

### 🌍 国际化与配置化
- **多语言支持** - 内置中文/英文界面，支持动态语言切换
- **学校定制** - 一键配置学校名称、图标、链接等信息
- **通用模板** - 可快速适配任何学校或机构使用
- **品牌配置** - 支持自定义页脚、技术支持等信息

### 🔗 智能连接
- **自动设备发现** - 智能扫描附近的蓝牙温湿度计
- **多设备支持** - 兼容小米、青萍等主流品牌温湿度计
- **断线重连** - 设备断开后自动重新连接，确保数据连续性
- **连接状态监控** - 实时显示设备连接状态和信号强度

### 📊 数据管理
- **实时采集** - 持续监控温湿度变化，数据更新频率可配置
- **本地存储** - SQLite数据库安全存储历史数据
- **数据完整性** - 包含温度、湿度、电池电量、时间戳等完整信息
- **数据导出** - 支持Excel格式数据导出，可选择时间范围

### 🌐 Web展示界面
- **响应式设计** - 完美适配手机、平板、电脑等各种设备
- **实时监控** - WebSocket驱动的毫秒级实时数据更新
- **数据可视化** - Chart.js驱动的智能图表，支持移动端优化
- **在线人数** - 实时显示当前访问人数

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
git clone https://github.com/ylin314/DUT-temperature.git
cd DUT-temperature

# 安装依赖
pip install -r requirements.txt
```

### 依赖包说明
```
bleak>=0.20.0          # 蓝牙低功耗库，用于BLE设备连接
flask>=2.3.0           # Web框架
flask-socketio>=5.3.0  # WebSocket支持
python-socketio>=5.8.0 # Socket.IO客户端
eventlet>=0.33.0       # 异步网络库
python-engineio>=4.7.0 # Engine.IO支持
```

### ⚙️ 快速配置（适配其他学校）

**1. 复制配置模板**
```bash
cp config.example.json static/config.json
```

**2. 编辑学校信息**
```json
{
  "school": {
    "name_zh": "你的大学名称",
    "name_en": "Your University Name",
    "short_name_zh": "大学简称",
    "short_name_en": "UNI",
    "favicon_url": "https://your-university.edu.cn/favicon.ico",
    "location_zh": "宿舍",
    "location_en": "Dormitory"
  },
  "app": {
    "powered_by": "Powered by Your IT Department",
    "powered_by_url": "https://your-university.edu"
  }
}
```

**3. 常见学校配置示例**
```json
// 北京大学
{
  "school": {
    "name_zh": "北京大学", "name_en": "Peking University",
    "short_name_zh": "北大", "short_name_en": "PKU",
    "favicon_url": "https://www.pku.edu.cn/favicon.ico"
  }
}

// 清华大学
{
  "school": {
    "name_zh": "清华大学", "name_en": "Tsinghua University",
    "short_name_zh": "清华", "short_name_en": "THU",
    "favicon_url": "https://www.tsinghua.edu.cn/favicon.ico"
  }
}
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
- ✅ 启动多语言Web界面
- ✅ 仅数据展示，不干扰设备连接
- ✅ 自动打开浏览器访问
- ✅ 支持局域网多设备访问

#### 方式二：一键启动（推荐个人使用）
```bash
python run_web_server.py
```
或双击运行：`启动Web数据展示.bat`

## 🌟 更新日志

### v2.0.1 (大连理工大学特供版本)

- 修改配置信息为大连理工大学
- 可手动指定设备号 (位于配置文件 config.json 中)，防止错误连接其他温度计

### v2.0.0 (最新版本)
- ✨ 新增国际化(i18n)支持，支持中英文切换
- ✨ 新增学校配置化功能，可快速适配任何学校
- ✨ 新增在线用户数显示功能
- ✨ 新增24小时默认图表显示，00:00分割线
- ✨ 新增移动端自适应数据采样
- ✨ 新增本地化前端资源，避免CDN问题
- 🔧 优化响应式布局，改进移动端体验
- 🔧 优化数据导出功能，支持模态弹窗
- 🔧 优化连接稳定性和重连机制

### v1.0.0
- 🎉 初始版本发布
- 📡 基础蓝牙BLE连接功能
- 📊 Web数据展示界面
- 💾 SQLite数据存储

---

<div align="center">
  <strong>🌡️ 智能温湿度监控系统</strong><br>
  <em>让环境数据可视化，让监控更智能</em><br><br>
  <strong>🌍 支持国际化 | 📱 响应式设计 | ⚙️ 高度可配置</strong><br><br>
  <img src="https://img.shields.io/badge/Python-3.7+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Platform-Windows-lightgrey.svg" alt="Platform">
</div>
