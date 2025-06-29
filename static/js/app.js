// CUST宿舍实时温度监控系统 JavaScript

class TemperatureMonitor {
    constructor() {
        this.socket = io();
        this.chart = null;
        this.lastTemperature = null;
        this.lastHumidity = null;
        this.historyData = [];
        
        this.initializeSocket();
        this.initializeChart();
        this.loadInitialData();
        this.startAutoRefresh();
    }

    // 初始化WebSocket连接
    initializeSocket() {
        this.socket.on('connect', () => {
            console.log('WebSocket连接成功');
            this.updateConnectionStatus(true);
            this.socket.emit('request_latest');
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket连接断开');
            this.updateConnectionStatus(false);
        });

        this.socket.on('temperature_update', (data) => {
            console.log('接收到温度数据:', data);
            this.updateTemperatureData(data);
        });

        this.socket.on('status', (status) => {
            console.log('系统状态:', status);
            this.updateSystemStatus(status);
        });
    }

    // 初始化图表
    initializeChart() {
        const ctx = document.getElementById('temperatureChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '温度 (°C)',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: '湿度 (%)',
                    data: [],
                    borderColor: '#0dcaf0',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '时间'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '温度 (°C)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '湿度 (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toFixed(1);
                                if (context.datasetIndex === 0) {
                                    label += '°C';
                                } else {
                                    label += '%';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // 更新温度数据显示
    updateTemperatureData(data) {
        // 更新主要显示
        const tempElement = document.getElementById('temperature-value');
        const humidityElement = document.getElementById('humidity-value');
        
        if (tempElement) {
            tempElement.textContent = `${data.temperature.toFixed(1)}°C`;
            tempElement.classList.add('data-updated');
            setTimeout(() => tempElement.classList.remove('data-updated'), 500);
        }
        
        if (humidityElement) {
            humidityElement.textContent = `${data.humidity.toFixed(1)}%`;
            humidityElement.classList.add('data-updated');
            setTimeout(() => humidityElement.classList.remove('data-updated'), 500);
        }

        // 更新趋势指示器
        this.updateTrends(data.temperature, data.humidity);

        // 更新其他信息
        this.updateDeviceInfo(data);
        
        // 更新最后更新时间
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            const updateTime = new Date(data.timestamp || Date.now());
            lastUpdateElement.textContent = updateTime.toLocaleTimeString();
        }

        // 保存当前值用于趋势计算
        this.lastTemperature = data.temperature;
        this.lastHumidity = data.humidity;
    }

    // 更新趋势指示器
    updateTrends(currentTemp, currentHumidity) {
        const tempTrend = document.getElementById('temperature-trend');
        const humidityTrend = document.getElementById('humidity-trend');

        if (this.lastTemperature !== null && tempTrend) {
            const tempDiff = currentTemp - this.lastTemperature;
            if (Math.abs(tempDiff) < 0.1) {
                tempTrend.innerHTML = '<i class="bi bi-dash trend-stable"></i> 稳定';
            } else if (tempDiff > 0) {
                tempTrend.innerHTML = '<i class="bi bi-arrow-up trend-up"></i> 上升';
            } else {
                tempTrend.innerHTML = '<i class="bi bi-arrow-down trend-down"></i> 下降';
            }
        }

        if (this.lastHumidity !== null && humidityTrend) {
            const humidityDiff = currentHumidity - this.lastHumidity;
            if (Math.abs(humidityDiff) < 1) {
                humidityTrend.innerHTML = '<i class="bi bi-dash trend-stable"></i> 稳定';
            } else if (humidityDiff > 0) {
                humidityTrend.innerHTML = '<i class="bi bi-arrow-up trend-up"></i> 上升';
            } else {
                humidityTrend.innerHTML = '<i class="bi bi-arrow-down trend-down"></i> 下降';
            }
        }
    }

    // 更新设备信息
    updateDeviceInfo(data) {
        const deviceNameElement = document.getElementById('device-name');
        const batteryElement = document.getElementById('battery-level');

        if (deviceNameElement && data.device_name) {
            deviceNameElement.textContent = data.device_name;
            deviceNameElement.className = 'badge bg-success';
        }

        if (batteryElement && data.battery) {
            batteryElement.textContent = `${data.battery}%`;
            if (data.battery > 50) {
                batteryElement.className = 'badge bg-success';
            } else if (data.battery > 20) {
                batteryElement.className = 'badge bg-warning';
            } else {
                batteryElement.className = 'badge bg-danger';
            }
        }
    }

    // 更新连接状态
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const iconElement = document.getElementById('connection-icon');

        if (connected) {
            statusElement.textContent = '已连接';
            statusElement.className = 'badge bg-success';
            iconElement.className = 'bi bi-wifi connected';
        } else {
            statusElement.textContent = '未连接';
            statusElement.className = 'badge bg-danger';
            iconElement.className = 'bi bi-wifi-off disconnected';
        }
    }

    // 更新系统状态
    updateSystemStatus(status) {
        this.updateConnectionStatus(status.is_connected);

        if (status.device_name) {
            const deviceNameElement = document.getElementById('device-name');
            if (deviceNameElement) {
                deviceNameElement.textContent = status.device_name;
                deviceNameElement.className = 'badge bg-success';
            }
        }

        // 更新最后数据时间
        if (status.last_data_time) {
            const lastUpdateElement = document.getElementById('last-update');
            if (lastUpdateElement) {
                const updateTime = new Date(status.last_data_time);
                lastUpdateElement.textContent = updateTime.toLocaleTimeString();
            }
        }
    }

    // 加载初始数据
    async loadInitialData() {
        try {
            // 加载最新数据
            const response = await fetch('/api/latest');
            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    this.updateTemperatureData(data);
                }
            }

            // 加载24小时历史数据
            await this.loadHistory(24);

            // 加载系统状态
            const statusResponse = await fetch('/api/status');
            if (statusResponse.ok) {
                const status = await statusResponse.json();
                this.updateSystemStatus(status);
            }
        } catch (error) {
            console.error('加载初始数据失败:', error);
        }
    }

    // 加载历史数据
    async loadHistory(hours) {
        try {
            const response = await fetch(`/api/history?hours=${hours}`);
            if (response.ok) {
                const data = await response.json();
                this.updateChart(data);
                this.updateStatistics(data);
                
                // 更新按钮状态
                document.querySelectorAll('.btn-group .btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                event.target.classList.add('active');
            }
        } catch (error) {
            console.error('加载历史数据失败:', error);
        }
    }

    // 更新图表
    updateChart(data) {
        const labels = [];
        const temperatures = [];
        const humidities = [];

        data.reverse().forEach(item => {
            const date = new Date(item.timestamp);
            labels.push(date.toLocaleTimeString());
            temperatures.push(item.temperature);
            humidities.push(item.humidity);
        });

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = temperatures;
        this.chart.data.datasets[1].data = humidities;
        this.chart.update();
    }

    // 更新统计信息
    updateStatistics(data) {
        if (data.length === 0) return;

        const temperatures = data.map(item => item.temperature);
        const humidities = data.map(item => item.humidity);

        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;

        document.getElementById('min-temp').textContent = `${minTemp.toFixed(1)}°C`;
        document.getElementById('max-temp').textContent = `${maxTemp.toFixed(1)}°C`;
        document.getElementById('avg-humidity').textContent = `${avgHumidity.toFixed(1)}%`;
        document.getElementById('data-count').textContent = data.length;
    }

    // 开始自动刷新
    startAutoRefresh() {
        setInterval(() => {
            const autoRefreshCheckbox = document.getElementById('autoRefresh');
            if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
                this.refreshData();
            }
        }, 30000); // 每30秒刷新一次
    }

    // 刷新数据
    async refreshData() {
        await this.loadInitialData();
    }
}

// 全局函数 - 仅保留数据刷新功能

function refreshData() {
    if (window.temperatureMonitor) {
        window.temperatureMonitor.refreshData();
        showNotification('数据已刷新', 'info');
    }
}

function loadHistory(hours) {
    if (window.temperatureMonitor) {
        window.temperatureMonitor.loadHistory(hours);
    }
}

function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.temperatureMonitor = new TemperatureMonitor();
    console.log('CUST宿舍实时温度监控系统已初始化');
});
