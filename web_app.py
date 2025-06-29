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
import io
import pandas as pd
import xlsxwriter
from flask import Flask, render_template, jsonify, request, send_file
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
online_users = 0  # 在线用户数统计

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

@app.route('/api/data-range')
def get_data_range():
    """获取数据库中数据的时间范围API"""
    try:
        time_range = monitor.storage.get_data_time_range()
        return jsonify(time_range)
    except Exception as e:
        logger.error(f"获取数据时间范围失败: {e}")
        return jsonify({'error': f'获取数据时间范围失败: {str(e)}'}), 500

@app.route('/api/export-excel')
def export_excel():
    """导出Excel数据API"""
    try:
        start_time_str = request.args.get('start_time', None)
        end_time_str = request.args.get('end_time', None)
        
        # 解析时间参数
        if start_time_str:
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        else:
            start_time = datetime.now() - timedelta(days=1)  # 默认导出过去一天数据
            
        if end_time_str:
            end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        else:
            end_time = datetime.now()
            
        # 获取数据
        data = monitor.storage.get_data_by_time_range(start_time, end_time)
        
        if not data:
            return jsonify({'error': '指定时间范围内无数据'}), 404
            
        # 创建DataFrame
        df = pd.DataFrame(data)
        
        # 创建一个内存文件作为Excel输出
        output = io.BytesIO()
        
        # 创建Excel工作簿和工作表
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # 写入数据
            df.to_excel(writer, sheet_name='温湿度数据', index=False)
            
            # 获取工作簿和工作表对象
            workbook = writer.book
            worksheet = writer.sheets['温湿度数据']
            
            # 添加图表
            chart = workbook.add_chart({'type': 'line'})
            
            # 配置图表数据范围
            # 假设第一列是时间戳，第二列是温度，第三列是湿度
            # 添加温度数据系列
            chart.add_series({
                'name': '温度',
                'categories': ['温湿度数据', 1, 0, len(data), 0],  # 时间列
                'values': ['温湿度数据', 1, 1, len(data), 1],      # 温度列
                'line': {'color': '#ff6b6b'},
            })
            
            # 添加湿度数据系列
            chart.add_series({
                'name': '湿度',
                'categories': ['温湿度数据', 1, 0, len(data), 0],  # 时间列
                'values': ['温湿度数据', 1, 2, len(data), 2],      # 湿度列
                'line': {'color': '#74b9ff'},
            })
            
            # 设置图表标题和坐标轴
            chart.set_title({'name': 'CUST宿舍温湿度变化图'})
            chart.set_x_axis({'name': '时间'})
            chart.set_y_axis({'name': '数值', 'major_gridlines': {'visible': True}})
            
            # 插入图表到工作表
            worksheet.insert_chart('E2', chart, {'x_scale': 2, 'y_scale': 1})
            
            # 设置列宽
            worksheet.set_column('A:A', 20)  # 时间戳列宽
            worksheet.set_column('B:C', 10)  # 温度湿度列宽
            
            # 添加格式
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'align': 'center',
                'bg_color': '#D7E4BC',
                'border': 1
            })
            
            # 应用表头格式
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
        
        # 准备文件下载
        output.seek(0)
        
        # 生成文件名，格式为"CUST温湿度数据_起始时间_结束时间.xlsx"
        filename = f"CUST温湿度数据_{start_time.strftime('%Y%m%d%H%M')}_{end_time.strftime('%Y%m%d%H%M')}.xlsx"
        
        return send_file(
            output, 
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"导出Excel失败: {e}")
        return jsonify({'error': f'导出Excel失败: {str(e)}'}), 500

# 设备控制API已移除 - Web页面仅用于数据展示

@socketio.on('connect')
def handle_connect():
    """WebSocket连接处理"""
    global online_users
    online_users += 1
    logger.info(f'客户端已连接，当前在线人数: {online_users}')

    # 发送系统状态
    emit('status', {
        'is_connected': monitor.connector.is_connected if monitor.connector else False,
        'device_name': monitor.connector.current_device_name if monitor.connector else None
    })

    # 广播在线人数更新给所有客户端
    socketio.emit('online_users_update', {'online_users': online_users})

@socketio.on('disconnect')
def handle_disconnect():
    """WebSocket断开处理"""
    global online_users
    online_users = max(0, online_users - 1)  # 确保不会小于0
    logger.info(f'客户端已断开，当前在线人数: {online_users}')

    # 广播在线人数更新给所有客户端
    socketio.emit('online_users_update', {'online_users': online_users})

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
        
        socketio.run(app, host='0.0.0.0', port=5000, debug=False)
        
    except KeyboardInterrupt:
        logger.info("正在关闭应用...")
        monitor.stop()
    except Exception as e:
        logger.error(f"应用启动失败: {e}")
        monitor.stop()
