// 温度监控系统 JavaScript

class TemperatureMonitor {
    constructor() {
        // 优化Socket.IO配置，强制使用HTTP长轮询（修复WebSocket错误）
        this.socket = io({
            transports: ['polling'],   // 仅使用HTTP长轮询，避免WebSocket问题
            upgrade: false,            // 禁用协议升级
            rememberUpgrade: false,    // 不记住升级状态
            timeout: 20000,            // 连接超时20秒
            forceNew: false,           // 重用连接
            reconnection: true,        // 启用自动重连
            reconnectionDelay: 1000,   // 重连延迟1秒
            reconnectionAttempts: 5,   // 最多重连5次
            maxReconnectionAttempts: 5,
            // 长轮询优化配置
            polling: {
                extraHeaders: {
                    'X-Polling-Mode': 'true'  // 标识使用长轮询模式
                }
            }
        });

        this.chart = null;
        this.lastTemperature = null;
        this.lastHumidity = null;
        this.historyData = [];
        this.currentTimeRange = 24; // 默认24小时

        // 等待i18n初始化完成后再初始化组件
        this.waitForI18n().then(() => {
            this.initializeSocket();
            this.initializeChart();
            this.loadInitialData();
            this.setupResponsiveChart();
            this.setupLanguageChangeListener();

            // 多次尝试更新图表标签，确保正确显示
            this.ensureChartLabelsCorrect();
        });
    }

    async waitForI18n() {
        // 等待i18n初始化完成
        while (!window.i18n || !window.i18n.currentLanguage) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 额外等待，确保翻译完全加载
        await new Promise(resolve => setTimeout(resolve, 200));

        // 调试信息：验证国际化系统状态
        console.log('i18n系统初始化完成:', {
            currentLanguage: window.i18n.currentLanguage,
            translations: window.i18n.translations,
            chartAxesTemp: window.i18n.t('chart.axes.temperature'),
            chartAxesHumidity: window.i18n.t('chart.axes.humidity'),
            chartAxesTime: window.i18n.t('chart.axes.time')
        });
    }

    // 确保图表标签正确显示的方法
    ensureChartLabelsCorrect() {
        let attempts = 0;
        const maxAttempts = 10;

        const checkAndUpdate = () => {
            attempts++;

            // 检查翻译是否正确
            const tempLabel = window.i18n.t('chart.axes.temperature');
            const humidityLabel = window.i18n.t('chart.axes.humidity');
            const timeLabel = window.i18n.t('chart.axes.time');

            console.log(`第${attempts}次检查图表标签:`, {
                temperature: tempLabel,
                humidity: humidityLabel,
                time: timeLabel,
                isCorrect: !tempLabel.includes('chart.axes')
            });

            // 如果翻译正确（不包含键名），则更新图表
            if (!tempLabel.includes('chart.axes') && !humidityLabel.includes('chart.axes') && !timeLabel.includes('chart.axes')) {
                console.log('翻译正确，更新图表标签');
                this.updateChartLabels();
                return;
            }

            // 如果翻译还不正确且未达到最大尝试次数，继续尝试
            if (attempts < maxAttempts) {
                setTimeout(checkAndUpdate, 300);
            } else {
                console.warn('达到最大尝试次数，图表标签可能显示不正确');
                // 强制更新一次
                this.updateChartLabels();
            }
        };

        // 立即开始第一次检查
        checkAndUpdate();
    }

    setupLanguageChangeListener() {
        window.addEventListener('languageChanged', (event) => {
            // 语言切换时重新初始化图表标签
            this.updateChartLabels();

            // 强制更新所有状态标签
            this.refreshAllStatusLabels();

            // 重新请求数据以更新状态标签
            this.socket.emit('request_latest');

            // 重新加载当前时间范围的历史数据
            const activeButton = document.querySelector('.btn-group .btn.active');
            if (activeButton) {
                const timeRange = this.getTimeRangeFromButton(activeButton);
                this.loadHistory(timeRange);
            }
        });
    }

    getTimeRangeFromButton(button) {
        const text = button.textContent.trim();
        if (text.includes('1') && (text.includes('小时') || text.includes('Hour'))) return 1;
        if (text.includes('6') && (text.includes('小时') || text.includes('Hours'))) return 6;
        if (text.includes('24') && (text.includes('小时') || text.includes('Hours'))) return 24;
        if (text.includes('7') && (text.includes('天') || text.includes('Days'))) return 168;
        return 24; // 默认24小时
    }

    // 强制刷新所有状态标签
    refreshAllStatusLabels() {
        // 更新连接状态标签为未知状态
        const connectionElements = [
            document.getElementById('connection-status'),
            document.getElementById('connection-status-mobile')
        ];

        connectionElements.forEach(element => {
            if (element) {
                element.textContent = window.i18n.t('status.unknown');
                element.className = 'badge bg-secondary';
            }
        });

        // 更新设备名称标签
        const deviceElements = [
            document.getElementById('device-name'),
            document.getElementById('device-name-mobile')
        ];

        deviceElements.forEach(element => {
            if (element) {
                element.textContent = window.i18n.t('status.disconnected');
                element.className = 'badge bg-info';
            }
        });

        // 更新趋势标签
        const tempTrendElements = [
            document.getElementById('temperature-trend'),
            document.getElementById('humidity-trend')
        ];

        tempTrendElements.forEach(element => {
            if (element && element.innerHTML.includes('trend-')) {
                const currentIcon = element.querySelector('i');
                if (currentIcon) {
                    let trendText = window.i18n.t('data.trend.stable');
                    if (currentIcon.classList.contains('trend-up')) {
                        trendText = window.i18n.t('data.trend.rising');
                    } else if (currentIcon.classList.contains('trend-down')) {
                        trendText = window.i18n.t('data.trend.falling');
                    }

                    const iconClass = currentIcon.className;
                    element.innerHTML = `<i class="${iconClass}"></i> ${trendText}`;
                }
            }
        });
    }

    // 初始化Socket.IO连接（HTTP长轮询模式）
    initializeSocket() {
        this.socket.on('connect', () => {
            console.log(window.i18n.t('console.websocket_connected'));
            this.updateConnectionStatus(true);
            this.socket.emit('request_latest');
        });

        this.socket.on('disconnect', (reason) => {
            console.log(window.i18n.t('console.websocket_disconnected'), 'Reason:', reason);
            this.updateConnectionStatus(false);
        });

        // 添加重连事件监听
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
            this.socket.emit('request_latest');
            this.updateConnectionStatus(true);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}`);
        });

        this.socket.on('reconnect_error', (error) => {
            console.log('❌ Reconnection failed:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.log('❌ Reconnection failed after maximum attempts');
            this.showConnectionError();
        });

        this.socket.on('temperature_update', (data) => {
            console.log(window.i18n.t('console.received_data'), data);
            this.updateTemperatureData(data);
        });

        this.socket.on('status', (status) => {
            console.log(window.i18n.t('console.system_status'), status);
            this.updateSystemStatus(status);
        });

        this.socket.on('online_users_update', (data) => {
            console.log(window.i18n.t('console.online_users_update'), data);
            this.updateOnlineUsers(data.online_users);
        });
    }

    // 初始化图表
    initializeChart() {
        const ctx = document.getElementById('temperatureChart').getContext('2d');

        // 调试信息：检查国际化系统状态
        console.log('初始化图表时的i18n状态:', {
            i18nExists: !!window.i18n,
            currentLanguage: window.i18n?.currentLanguage,
            temperatureLabel: window.i18n?.t('chart.axes.temperature'),
            humidityLabel: window.i18n?.t('chart.axes.humidity')
        });

        // 获取翻译标签，如果失败则使用备用标签
        const getTempLabel = () => {
            const label = window.i18n.t('chart.axes.temperature');
            return label.includes('chart.axes') ? '温度 (°C)' : label;
        };
        const getHumidityLabel = () => {
            const label = window.i18n.t('chart.axes.humidity');
            return label.includes('chart.axes') ? '湿度 (%)' : label;
        };
        const getTimeLabel = () => {
            const label = window.i18n.t('chart.axes.time');
            return label.includes('chart.axes') ? '时间' : label;
        };

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: getTempLabel(),
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ff6b6b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#ff6b6b',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                    yAxisID: 'y'
                }, {
                    label: getHumidityLabel(),
                    data: [],
                    borderColor: '#74b9ff',
                    backgroundColor: 'rgba(116, 185, 255, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#74b9ff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#74b9ff',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
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
                elements: {
                    line: {
                        borderJoinStyle: 'round',
                        borderCapStyle: 'round'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: getTimeLabel(),
                            color: '#666',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 11
                            },
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: getTempLabel(),
                            color: '#ff6b6b',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 107, 107, 0.2)',
                            lineWidth: 1,
                            drawOnChartArea: true,
                        },
                        ticks: {
                            color: '#ff6b6b',
                            font: {
                                size: 11,
                                weight: 'bold'
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: getHumidityLabel(),
                            color: '#74b9ff',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#74b9ff',
                            font: {
                                size: 11,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                size: 13,
                                weight: 'bold'
                            },
                            color: '#333'
                        }
                    },
                    annotation: {
                        annotations: {}
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return window.i18n.t('chart.tooltip.time') + ': ' + context[0].label;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toFixed(1);
                                if (context.datasetIndex === 0) {
                                    label += window.i18n.t('chart.tooltip.temperature_unit');
                                } else {
                                    label += window.i18n.t('chart.tooltip.humidity_unit');
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // 图表创建后立即更新标签，确保显示正确的翻译
        this.updateChartLabels();
    }

    // 更新图表标签（语言切换时调用）
    updateChartLabels() {
        if (!this.chart) {
            console.warn('图表未初始化，无法更新标签');
            return;
        }

        // 获取翻译结果
        const tempLabel = window.i18n.t('chart.axes.temperature');
        const humidityLabel = window.i18n.t('chart.axes.humidity');
        const timeLabel = window.i18n.t('chart.axes.time');

        console.log('更新图表标签:', {
            temperature: tempLabel,
            humidity: humidityLabel,
            time: timeLabel,
            hasKeyNames: tempLabel.includes('chart.axes') || humidityLabel.includes('chart.axes') || timeLabel.includes('chart.axes')
        });

        // 如果翻译结果仍然包含键名，使用备用翻译
        const finalTempLabel = tempLabel.includes('chart.axes') ? '温度 (°C)' : tempLabel;
        const finalHumidityLabel = humidityLabel.includes('chart.axes') ? '湿度 (%)' : humidityLabel;
        const finalTimeLabel = timeLabel.includes('chart.axes') ? '时间' : timeLabel;

        // 更新数据集标签
        if (this.chart.data.datasets[0]) {
            this.chart.data.datasets[0].label = finalTempLabel;
        }
        if (this.chart.data.datasets[1]) {
            this.chart.data.datasets[1].label = finalHumidityLabel;
        }

        // 更新坐标轴标题
        if (this.chart.options.scales.x && this.chart.options.scales.x.title) {
            this.chart.options.scales.x.title.text = finalTimeLabel;
        }
        if (this.chart.options.scales.y && this.chart.options.scales.y.title) {
            this.chart.options.scales.y.title.text = finalTempLabel;
        }
        if (this.chart.options.scales.y1 && this.chart.options.scales.y1.title) {
            this.chart.options.scales.y1.title.text = finalHumidityLabel;
        }

        // 更新图表，使用 'none' 模式强制立即更新
        this.chart.update('none');

        console.log('图表标签更新完成');
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
                tempTrend.innerHTML = `<i class="bi bi-dash trend-stable"></i> ${window.i18n.t('data.trend.stable')}`;
            } else if (tempDiff > 0) {
                tempTrend.innerHTML = `<i class="bi bi-arrow-up trend-up"></i> ${window.i18n.t('data.trend.rising')}`;
            } else {
                tempTrend.innerHTML = `<i class="bi bi-arrow-down trend-down"></i> ${window.i18n.t('data.trend.falling')}`;
            }
        }

        if (this.lastHumidity !== null && humidityTrend) {
            const humidityDiff = currentHumidity - this.lastHumidity;
            if (Math.abs(humidityDiff) < 1) {
                humidityTrend.innerHTML = `<i class="bi bi-dash trend-stable"></i> ${window.i18n.t('data.trend.stable')}`;
            } else if (humidityDiff > 0) {
                humidityTrend.innerHTML = `<i class="bi bi-arrow-up trend-up"></i> ${window.i18n.t('data.trend.rising')}`;
            } else {
                humidityTrend.innerHTML = `<i class="bi bi-arrow-down trend-down"></i> ${window.i18n.t('data.trend.falling')}`;
            }
        }
    }

    // 更新设备信息
    updateDeviceInfo(data) {
        const deviceNameElement = document.getElementById('device-name');

        if (deviceNameElement && data.device_name) {
            deviceNameElement.textContent = data.device_name;
            deviceNameElement.className = 'badge bg-success';
        }
    }

    // 更新在线人数
    updateOnlineUsers(count) {
        const onlineUsersElement = document.getElementById('online-users');
        const onlineUsersElementMobile = document.getElementById('online-users-mobile');

        // 根据在线人数设置不同的颜色
        let badgeClass;
        if (count === 0) {
            badgeClass = 'badge bg-secondary';
        } else if (count <= 5) {
            badgeClass = 'badge bg-info';
        } else if (count <= 10) {
            badgeClass = 'badge bg-primary';
        } else {
            badgeClass = 'badge bg-success';
        }

        // 更新桌面端
        if (onlineUsersElement) {
            onlineUsersElement.textContent = count;
            onlineUsersElement.className = badgeClass;
        }

        // 更新移动端
        if (onlineUsersElementMobile) {
            onlineUsersElementMobile.textContent = count;
            onlineUsersElementMobile.className = badgeClass;
        }
    }

    // 显示连接错误
    showConnectionError() {
        // 可以在这里添加用户友好的错误提示
        const errorMessage = window.i18n ? window.i18n.t('status.connection_failed') : 'Connection failed';
        console.error(errorMessage);

        // 可以添加页面提示
        const statusElements = [
            document.getElementById('connection-status'),
            document.getElementById('connection-status-mobile')
        ];

        statusElements.forEach(element => {
            if (element) {
                element.textContent = errorMessage;
                element.className = 'badge bg-danger';
            }
        });
    }

    // 更新连接状态
    updateConnectionStatus(connected) {
        // 确保i18n已初始化
        if (!window.i18n || !window.i18n.currentLanguage) {
            setTimeout(() => this.updateConnectionStatus(connected), 100);
            return;
        }

        // 桌面端元素
        const statusElement = document.getElementById('connection-status');
        const iconElement = document.getElementById('connection-icon');

        // 移动端元素
        const statusElementMobile = document.getElementById('connection-status-mobile');
        const iconElementMobile = document.getElementById('connection-icon-mobile');

        const statusText = connected ? window.i18n.t('status.connected') : window.i18n.t('status.disconnected');
        const statusClass = connected ? 'badge bg-success' : 'badge bg-danger';
        const iconClass = connected ? 'bi bi-wifi connected' : 'bi bi-wifi-off disconnected';

        // 更新桌面端
        if (statusElement) {
            statusElement.textContent = statusText;
            statusElement.className = statusClass;
        }
        if (iconElement) {
            iconElement.className = iconClass;
        }

        // 更新移动端
        if (statusElementMobile) {
            statusElementMobile.textContent = statusText;
            statusElementMobile.className = statusClass;
        }
        if (iconElementMobile) {
            iconElementMobile.className = iconClass;
        }
    }

    // 更新系统状态
    updateSystemStatus(status) {
        this.updateConnectionStatus(status.is_connected);

        // 更新设备名称
        const deviceNameElement = document.getElementById('device-name');
        const deviceNameElementMobile = document.getElementById('device-name-mobile');

        if (status.device_name) {
            const deviceText = status.device_name;
            const deviceClass = 'badge bg-success';

            if (deviceNameElement) {
                deviceNameElement.textContent = deviceText;
                deviceNameElement.className = deviceClass;
            }
            if (deviceNameElementMobile) {
                deviceNameElementMobile.textContent = deviceText;
                deviceNameElementMobile.className = deviceClass;
            }
        } else {
            // 确保i18n已初始化
            if (window.i18n && window.i18n.currentLanguage) {
                const disconnectedText = window.i18n.t('status.disconnected');
                const disconnectedClass = 'badge bg-info';

                if (deviceNameElement) {
                    deviceNameElement.textContent = disconnectedText;
                    deviceNameElement.className = disconnectedClass;
                }
                if (deviceNameElementMobile) {
                    deviceNameElementMobile.textContent = disconnectedText;
                    deviceNameElementMobile.className = disconnectedClass;
                }
            }
        }

        // 更新最后数据时间
        if (status.last_data_time) {
            const lastUpdateElement = document.getElementById('last-update');
            const lastUpdateElementMobile = document.getElementById('last-update-mobile');

            const updateTime = new Date(status.last_data_time);
            const timeText = updateTime.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            if (lastUpdateElement) {
                lastUpdateElement.textContent = timeText;
            }
            if (lastUpdateElementMobile) {
                lastUpdateElementMobile.textContent = timeText;
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

            // 默认加载24小时历史数据，如果数据不足24小时则显示所有数据
            await this.loadHistory(24);

            // 加载系统状态
            const statusResponse = await fetch('/api/status');
            if (statusResponse.ok) {
                const status = await statusResponse.json();
                this.updateSystemStatus(status);
            }
        } catch (error) {
            console.error(window.i18n.t('console.load_initial_failed'), error);
        }
    }

    // 加载历史数据
    async loadHistory(hours) {
        try {
            const response = await fetch(`/api/history?hours=${hours}`);
            if (response.ok) {
                const data = await response.json();
                this.historyData = data; // 保存历史数据
                this.currentTimeRange = hours; // 保存当前时间范围
                this.updateChart(data);
                this.updateStatistics(data);

                // 更新按钮状态
                document.querySelectorAll('.btn-group .btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                if (event && event.target) {
                    event.target.classList.add('active');
                }
            }
        } catch (error) {
            console.error(window.i18n.t('console.load_history_failed'), error);
        }
    }

    // 更新图表
    updateChart(data) {
        const isMobile = window.innerWidth <= 768;
        let groupedData;

        // 一小时数据特殊处理
        if (this.currentTimeRange === 1) {
            if (isMobile) {
                // 移动端：5分钟间隔采样（一小时12个点）
                console.log('移动端一小时数据：使用5分钟间隔采样');
                groupedData = this.groupDataByTimeInterval(data.reverse(), 5);
            } else {
                // PC端：显示全部数据点
                console.log('PC端一小时数据：显示全部数据点，不进行采样');
                groupedData = data.reverse().map(item => ({
                    temperature: parseFloat(item.temperature.toFixed(1)),
                    humidity: parseFloat(item.humidity.toFixed(1)),
                    timestamp: new Date(item.timestamp)
                }));
            }
        } else if (isMobile) {
            // 其他时间范围：小型设备使用智能采样算法
            groupedData = this.smartSampleForMobile(data.reverse());
        } else {
            // 其他时间范围：PC大屏按十分钟间隔对数据进行分组和平均
            groupedData = this.groupDataByTimeInterval(data.reverse(), 10);
        }

        const labels = [];
        const temperatures = [];
        const humidities = [];

        groupedData.forEach(item => {
            const date = new Date(item.timestamp);
            let timeLabel;

            if (isMobile) {
                // 移动端显示简化的时间格式
                timeLabel = date.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                // 桌面端显示完整时间
                timeLabel = date.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }

            labels.push(timeLabel);
            temperatures.push(item.temperature);
            humidities.push(item.humidity);
        });

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = temperatures;
        this.chart.data.datasets[1].data = humidities;

        // 根据设备类型调整曲线平滑度和点的显示
        this.chart.data.datasets.forEach(dataset => {
            if (isMobile) {
                // 移动设备：更高的平滑度，更小的点，更细的线条
                dataset.tension = 0.6;
                dataset.pointRadius = 2;
                dataset.pointHoverRadius = 4;
                dataset.borderWidth = 2;
            } else {
                // PC设备：标准设置
                dataset.tension = 0.4;
                dataset.pointRadius = 4;
                dataset.pointHoverRadius = 6;
                dataset.borderWidth = 3;
            }
        });

        // 根据屏幕大小调整图表配置
        if (isMobile) {
            // 移动设备优化配置
            this.chart.options.scales.x.ticks.maxTicksLimit = Math.min(6, Math.max(3, Math.floor(labels.length / 4)));
            this.chart.options.plugins.legend.labels.padding = 15;
            this.chart.options.plugins.legend.labels.font.size = 12;

            // 优化移动设备上的网格线显示
            this.chart.options.scales.x.grid.display = false; // 隐藏垂直网格线
            this.chart.options.scales.y.grid.lineWidth = 0.5; // 更细的水平网格线
            this.chart.options.scales.y1.grid.display = false; // 隐藏右侧网格线
        } else {
            // PC设备标准配置
            this.chart.options.scales.x.ticks.maxTicksLimit = 8;
            this.chart.options.plugins.legend.labels.padding = 20;
            this.chart.options.plugins.legend.labels.font.size = 13;

            // 恢复PC设备的网格线显示
            this.chart.options.scales.x.grid.display = true;
            this.chart.options.scales.y.grid.lineWidth = 1;
            this.chart.options.scales.y1.grid.display = false;
        }

        // 添加00:00时刻的竖虚线分割
        this.addMidnightLines(groupedData);

        // 确保图表标签正确显示（防止被数据更新覆盖）
        this.chart.data.datasets[0].label = window.i18n.t('chart.axes.temperature');
        this.chart.data.datasets[1].label = window.i18n.t('chart.axes.humidity');

        this.chart.update('none'); // 使用 'none' 模式提高性能
    }

    // 添加00:00时刻的竖虚线分割
    addMidnightLines(data) {
        if (!data || data.length === 0) return;

        const annotations = {};
        const processedDates = new Set();

        data.forEach((item, index) => {
            const date = new Date(item.timestamp);
            const dateKey = date.toDateString();

            // 检查是否是00:00时刻（允许一些误差，比如00:00-00:10之间）
            if (date.getHours() === 0 && date.getMinutes() <= 10 && !processedDates.has(dateKey)) {
                processedDates.add(dateKey);

                const annotationId = `midnight-${dateKey}`;
                annotations[annotationId] = {
                    type: 'line',
                    xMin: index,
                    xMax: index,
                    borderColor: 'rgba(128, 128, 128, 0.6)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                        content: '00:00',
                        enabled: true,
                        position: 'top',
                        backgroundColor: 'rgba(128, 128, 128, 0.8)',
                        color: 'white',
                        font: {
                            size: 10
                        }
                    }
                };
            }
        });

        // 更新图表的注释配置
        this.chart.options.plugins.annotation.annotations = annotations;
    }

    // 小型设备智能采样算法
    smartSampleForMobile(data) {
        if (!data || data.length === 0) return [];

        // 计算时间范围（小时）
        const sortedData = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const startTime = new Date(sortedData[0].timestamp);
        const endTime = new Date(sortedData[sortedData.length - 1].timestamp);
        const timeRangeHours = (endTime - startTime) / (1000 * 60 * 60);

        // 根据屏幕宽度计算合适的点数
        const screenWidth = window.innerWidth;
        let targetPoints;

        if (screenWidth <= 480) {
            // 小屏手机：每小时1-2个点
            targetPoints = Math.max(Math.ceil(timeRangeHours * 1.5), 12);
        } else if (screenWidth <= 768) {
            // 大屏手机/小平板：每小时2-3个点
            targetPoints = Math.max(Math.ceil(timeRangeHours * 2.5), 18);
        } else {
            // 平板：每小时3-4个点
            targetPoints = Math.max(Math.ceil(timeRangeHours * 3.5), 24);
        }

        // 确保每两小时不少于3个点
        const minPointsFor2Hours = Math.ceil(timeRangeHours / 2) * 3;
        targetPoints = Math.max(targetPoints, minPointsFor2Hours);

        // 调试信息
        console.log(window.i18n.t('console.chart_optimization', {
            width: screenWidth,
            hours: timeRangeHours.toFixed(1),
            original: sortedData.length,
            target: targetPoints
        }));

        // 如果原始数据点数少于目标点数，直接返回所有数据
        if (sortedData.length <= targetPoints) {
            console.log(window.i18n.t('console.data_insufficient', {
                actual: sortedData.length,
                target: targetPoints
            }));
            return sortedData.map(item => ({
                temperature: parseFloat(item.temperature.toFixed(1)),
                humidity: parseFloat(item.humidity.toFixed(1)),
                timestamp: new Date(item.timestamp)
            }));
        }

        // 使用均匀采样算法
        const sampledData = this.uniformSample(sortedData, targetPoints);
        console.log(window.i18n.t('console.sampling_complete', {
            original: sortedData.length,
            sampled: sampledData.length
        }));
        return sampledData;
    }

    // 均匀采样算法
    uniformSample(data, targetPoints) {
        const result = [];
        const step = (data.length - 1) / (targetPoints - 1);

        for (let i = 0; i < targetPoints; i++) {
            const index = Math.round(i * step);
            const actualIndex = Math.min(index, data.length - 1);

            // 智能采样：根据数据密度调整采样窗口
            let item;
            if (i === 0 || i === targetPoints - 1) {
                // 保留首尾点的原始值
                item = data[actualIndex];
            } else {
                // 中间点使用自适应窗口进行平滑
                const windowSize = Math.max(1, Math.floor(data.length / targetPoints / 2));
                const startIdx = Math.max(0, actualIndex - windowSize);
                const endIdx = Math.min(data.length - 1, actualIndex + windowSize);
                const samples = data.slice(startIdx, endIdx + 1);

                // 使用加权平均，中心点权重更高
                let totalWeight = 0;
                let weightedTemp = 0;
                let weightedHumidity = 0;

                samples.forEach((sample, idx) => {
                    const centerIdx = Math.floor(samples.length / 2);
                    const distance = Math.abs(idx - centerIdx);
                    const weight = Math.max(0.1, 1 - distance * 0.3); // 距离越远权重越小

                    weightedTemp += sample.temperature * weight;
                    weightedHumidity += sample.humidity * weight;
                    totalWeight += weight;
                });

                item = {
                    temperature: weightedTemp / totalWeight,
                    humidity: weightedHumidity / totalWeight,
                    timestamp: data[actualIndex].timestamp
                };
            }

            result.push({
                temperature: parseFloat(item.temperature.toFixed(1)),
                humidity: parseFloat(item.humidity.toFixed(1)),
                timestamp: new Date(item.timestamp)
            });
        }

        return result;
    }

    // 按时间间隔分组数据并计算平均值
    groupDataByTimeInterval(data, intervalMinutes) {
        if (!data || data.length === 0) return [];
        
        // 按照时间间隔对数据进行分组
        const groupedData = {};
        
        data.forEach(item => {
            const date = new Date(item.timestamp);
            // 计算时间间隔组的标识符（年-月-日-小时-十分钟区间）
            const minutes = date.getMinutes();
            const intervalGroup = Math.floor(minutes / intervalMinutes);
            const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${intervalGroup}`;
            
            if (!groupedData[timeKey]) {
                groupedData[timeKey] = {
                    temperatures: [],
                    humidities: [],
                    timestamps: []
                };
            }
            
            groupedData[timeKey].temperatures.push(item.temperature);
            groupedData[timeKey].humidities.push(item.humidity);
            groupedData[timeKey].timestamps.push(new Date(item.timestamp).getTime());
        });
        
        // 计算每个组的平均值
        const result = [];
        Object.keys(groupedData).forEach(key => {
            const group = groupedData[key];
            const avgTemperature = group.temperatures.reduce((a, b) => a + b, 0) / group.temperatures.length;
            const avgHumidity = group.humidities.reduce((a, b) => a + b, 0) / group.humidities.length;
            // 使用组内的平均时间戳
            const avgTimestamp = new Date(group.timestamps.reduce((a, b) => a + b, 0) / group.timestamps.length);
            
            result.push({
                temperature: parseFloat(avgTemperature.toFixed(1)),
                humidity: parseFloat(avgHumidity.toFixed(1)),
                timestamp: avgTimestamp
            });
        });
        
        // 按时间升序排序
        return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // 更新统计信息
    updateStatistics(data) {
        if (data.length === 0) return;

        const temperatures = data.map(item => item.temperature);
        const humidities = data.map(item => item.humidity);

        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;

        const minTempText = `${minTemp.toFixed(1)}°C`;
        const maxTempText = `${maxTemp.toFixed(1)}°C`;
        const avgHumidityText = `${avgHumidity.toFixed(1)}%`;
        const dataCountText = data.length.toString();

        // 更新桌面端
        const minTempElement = document.getElementById('min-temp');
        const maxTempElement = document.getElementById('max-temp');
        const avgHumidityElement = document.getElementById('avg-humidity');
        const dataCountElement = document.getElementById('data-count');

        if (minTempElement) minTempElement.textContent = minTempText;
        if (maxTempElement) maxTempElement.textContent = maxTempText;
        if (avgHumidityElement) avgHumidityElement.textContent = avgHumidityText;
        if (dataCountElement) dataCountElement.textContent = dataCountText;

        // 更新移动端
        const minTempMobileElement = document.getElementById('min-temp-mobile');
        const maxTempMobileElement = document.getElementById('max-temp-mobile');
        const avgHumidityMobileElement = document.getElementById('avg-humidity-mobile');
        const dataCountMobileElement = document.getElementById('data-count-mobile');

        if (minTempMobileElement) minTempMobileElement.textContent = minTempText;
        if (maxTempMobileElement) maxTempMobileElement.textContent = maxTempText;
        if (avgHumidityMobileElement) avgHumidityMobileElement.textContent = avgHumidityText;
        if (dataCountMobileElement) dataCountMobileElement.textContent = dataCountText;
    }

    // 设置响应式图表
    setupResponsiveChart() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.chart && this.historyData.length > 0) {
                    // 重新更新图表以适应新的屏幕尺寸
                    console.log(`响应式更新图表，当前时间范围: ${this.currentTimeRange} 小时`);
                    this.updateChart(this.historyData);
                }
            }, 250);
        });
    }
}

// 全局函数 - 用于从页面直接调用

/**
 * 加载历史数据
 * @param {number} hours - 要加载的历史数据小时数
 */
function loadHistory(hours) {
    if (window.temperatureMonitor) {
        console.log(`加载 ${hours} 小时历史数据`);
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

/**
 * 获取数据库中数据的时间范围
 */
async function getDataTimeRange() {
    try {
        const response = await fetch('/api/data-range');
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.error('获取数据时间范围失败');
            return null;
        }
    } catch (error) {
        console.error('获取数据时间范围出错:', error);
        return null;
    }
}

/**
 * 初始化下载弹窗
 */
async function initializeDownloadModal() {
    const modal = document.getElementById('downloadModal');
    if (!modal) return;

    modal.addEventListener('show.bs.modal', async function() {
        const dataRangeText = document.getElementById('dataRangeText');
        const modalStartDate = document.getElementById('modalStartDate');
        const modalEndDate = document.getElementById('modalEndDate');

        // 显示加载状态
        dataRangeText.textContent = window.i18n.t('export.modal.loading');

        try {
            const timeRange = await getDataTimeRange();

            if (timeRange && timeRange.earliest && timeRange.latest) {
                // 显示数据时间范围信息
                const earliestDate = new Date(timeRange.earliest);
                const latestDate = new Date(timeRange.latest);

                dataRangeText.innerHTML = window.i18n.t('export.modal.data_info', {
                    count: timeRange.count,
                    start: earliestDate.toLocaleString(window.i18n.getCurrentLanguage() === 'zh' ? 'zh-CN' : 'en-US'),
                    end: latestDate.toLocaleString(window.i18n.getCurrentLanguage() === 'zh' ? 'zh-CN' : 'en-US')
                });

                // 自动填入时间范围
                modalStartDate.value = timeRange.earliest.slice(0, 16);
                modalEndDate.value = timeRange.latest.slice(0, 16);
            } else {
                dataRangeText.textContent = window.i18n.t('export.modal.no_data');
                // 设置默认值
                const now = new Date();
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);

                modalStartDate.value = oneWeekAgo.toISOString().slice(0, 16);
                modalEndDate.value = now.toISOString().slice(0, 16);
            }
        } catch (error) {
            console.error('初始化下载弹窗失败:', error);
            dataRangeText.textContent = '获取数据时间范围失败';
        }
    });
}

/**
 * 从弹窗下载Excel数据
 */
function downloadExcelFromModal() {
    const startDateInput = document.getElementById('modalStartDate');
    const endDateInput = document.getElementById('modalEndDate');

    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    // 验证日期
    if (!startDateInput.value || !endDateInput.value) {
        showNotification(window.i18n.t('export.notifications.invalid_dates'), 'error');
        return;
    }

    if (startDate > endDate) {
        showNotification(window.i18n.t('export.notifications.invalid_range'), 'error');
        return;
    }

    // 调用原有的下载函数
    downloadExcelWithDates(startDate, endDate);

    // 关闭弹窗
    const modal = bootstrap.Modal.getInstance(document.getElementById('downloadModal'));
    if (modal) {
        modal.hide();
    }
}

/**
 * 使用指定日期下载Excel数据
 */
function downloadExcelWithDates(startDate, endDate) {
    // 构建API URL
    const url = `/api/export-excel?start_time=${startDate.toISOString()}&end_time=${endDate.toISOString()}`;

    // 显示下载中通知
    showNotification(window.i18n.t('export.notifications.preparing'), 'info');

    // 创建一个隐藏的a标签进行下载
    fetch(url)
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || '下载失败');
                });
            }
            return response.blob();
        })
        .then(blob => {
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            // 生成文件名
            const filename = `CUST温湿度数据_${startDate.toISOString().slice(0, 16).replace(/[:-]/g, '')}_${endDate.toISOString().slice(0, 16).replace(/[:-]/g, '')}.xlsx`;
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showNotification(window.i18n.t('export.notifications.success'), 'success');
        })
        .catch(error => {
            console.error('下载Excel失败:', error);
            showNotification(window.i18n.t('export.notifications.error', { error: error.message }), 'error');
        });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.temperatureMonitor = new TemperatureMonitor();

    // 等待i18n初始化完成后显示初始化消息
    const checkI18n = () => {
        if (window.i18n && window.i18n.currentLanguage) {
            console.log(window.i18n.t('console.system_initialized'));
        } else {
            setTimeout(checkI18n, 100);
        }
    };
    checkI18n();

    // 初始化下载弹窗
    initializeDownloadModal();
});
