#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CUST宿舍实时温度监控Web应用
提供实时温度数据的Web界面
"""

import asyncio
import json
import threading
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import logging

from temperature_sensor_connector import TemperatureSensorConnector, TemperatureDataStorage, TemperatureData

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'cust_temperature_monitor_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# 全局变量
connector = None
storage = None
latest_data = None
is_monitoring = False

class TemperatureMonitor:
    """温度监控服务"""
    
    def __init__(self):
        self.connector = TemperatureSensorConnector(auto_reconnect=True)
        self.storage = TemperatureDataStorage()
        self.is_running = False
        self.loop = None
        self.thread = None
        
    def start(self):
        """启动监控服务"""
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._run_monitor, daemon=True)
            self.thread.start()
            logger.info("温度监控服务已启动")
    
    def stop(self):
        """停止监控服务"""
        self.is_running = False
        if self.connector:
            self.connector.stop_scanning()
        logger.info("温度监控服务已停止")
    
    def _run_monitor(self):
        """运行监控循环"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        # 设置数据回调
        def on_data_received(data: TemperatureData):
            global latest_data
            latest_data = data
            logger.info(f"接收到数据: {data}")
            
            # 保存到数据库
            self.storage.save_data(data)
            
            # 通过WebSocket发送给前端
            socketio.emit('temperature_update', data.to_dict())
        
        self.connector.set_data_callback(on_data_received)
        
        # 开始持续扫描
        try:
            self.loop.run_until_complete(self.connector.start_continuous_scanning())
        except Exception as e:
            logger.error(f"监控服务出错: {e}")

# 创建监控实例
monitor = TemperatureMonitor()

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/api/latest')
def get_latest_data():
    """获取最新数据API"""
    global latest_data
    if latest_data:
        return jsonify(latest_data.to_dict())
    else:
        # 从数据库获取最新数据
        data = monitor.storage.get_latest_data(1)
        if data:
            return jsonify(data[0])
        else:
            return jsonify({'error': '暂无数据'})

@app.route('/api/history')
def get_history_data():
    """获取历史数据API"""
    hours = request.args.get('hours', 24, type=int)
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)
    
    data = monitor.storage.get_data_by_time_range(start_time, end_time)
    return jsonify(data)

@app.route('/api/status')
def get_status():
    """获取系统状态API - 仅显示连接状态"""
    return jsonify({
        'is_connected': monitor.connector.is_connected if monitor.connector else False,
        'device_name': monitor.connector.current_device_name if monitor.connector else None,
        'device_address': monitor.connector.current_device_address if monitor.connector else None,
        'last_data_time': latest_data.timestamp.isoformat() if latest_data and latest_data.timestamp else None
    })

# 设备控制API已移除 - Web页面仅用于数据展示

@socketio.on('connect')
def handle_connect():
    """WebSocket连接处理"""
    logger.info('客户端已连接')
    emit('status', {
        'is_connected': monitor.connector.is_connected if monitor.connector else False,
        'device_name': monitor.connector.current_device_name if monitor.connector else None
    })

@socketio.on('disconnect')
def handle_disconnect():
    """WebSocket断开处理"""
    logger.info('客户端已断开')

@socketio.on('request_latest')
def handle_request_latest():
    """处理获取最新数据请求"""
    global latest_data
    if latest_data:
        emit('temperature_update', latest_data.to_dict())

if __name__ == '__main__':
    try:
        # 启动监控服务
        monitor.start()
        
        # 启动Web服务器
        logger.info("启动CUST宿舍实时温度监控Web应用")
        logger.info("访问地址: http://localhost:5000")
        
        socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
        
    except KeyboardInterrupt:
        logger.info("正在关闭应用...")
        monitor.stop()
    except Exception as e:
        logger.error(f"应用启动失败: {e}")
        monitor.stop()
