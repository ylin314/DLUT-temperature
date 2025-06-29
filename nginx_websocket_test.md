# Nginx WebSocket 代理配置测试指南

## 🔧 优化后的完整配置

```nginx
server {
    server_name cust.foreverlink.love;
    
    # 通用代理设置
    location / {
        proxy_pass http://localhost:1370;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 添加缓冲区设置
        proxy_buffering off;
        proxy_cache off;
    }
    
    # Socket.IO WebSocket代理
    location /socket.io/ {
        proxy_pass http://localhost:1370/socket.io/;
        
        # WebSocket升级头
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 基础代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 关键：禁用缓冲和缓存
        proxy_buffering off;
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        # 超时设置（重要）
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # WebSocket特定设置
        proxy_redirect off;
        proxy_set_header X-Forwarded-Host $server_name;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/cust.foreverlink.love/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cust.foreverlink.love/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = cust.foreverlink.love) {
        return 301 https://$host$request_uri;
    }
    
    server_name cust.foreverlink.love;
    listen 80;
    return 404;
}
```

## 🔍 主要修复点

### 1. 超时设置优化
```nginx
# ❌ 原配置（可能导致问题）
proxy_read_timeout 86400;    # 24小时太长，可能导致连接不稳定
proxy_send_timeout 86400;    # 24小时太长

# ✅ 优化后
proxy_connect_timeout 60s;   # 连接超时
proxy_send_timeout 60s;      # 发送超时
proxy_read_timeout 60s;      # 读取超时
```

### 2. 缓冲控制
```nginx
# ✅ 新增关键设置
proxy_buffering off;         # 禁用代理缓冲
proxy_cache off;             # 禁用缓存
proxy_no_cache 1;            # 不缓存响应
proxy_cache_bypass 1;        # 绕过缓存
```

### 3. WebSocket特定优化
```nginx
proxy_redirect off;                           # 禁用重定向
proxy_set_header X-Forwarded-Host $server_name;  # 转发主机名
```

## 🧪 测试步骤

### 1. 应用新配置
```bash
# 测试配置语法
sudo nginx -t

# 重新加载配置
sudo nginx -s reload

# 或重启nginx
sudo systemctl restart nginx
```

### 2. 检查WebSocket连接
```bash
# 查看nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 查看访问日志
sudo tail -f /var/log/nginx/access.log
```

### 3. 浏览器测试
1. 打开开发者工具 (F12)
2. 访问 https://cust.foreverlink.love
3. 查看 Network 标签页
4. 观察 WebSocket 连接状态

### 4. 连接状态监控
在浏览器控制台中运行：
```javascript
// 监控Socket.IO连接状态
console.log('Socket connected:', window.app.socket.connected);
console.log('Socket transport:', window.app.socket.io.engine.transport.name);

// 监听连接事件
window.app.socket.on('connect', () => console.log('✅ Connected'));
window.app.socket.on('disconnect', () => console.log('❌ Disconnected'));
```

## 🔧 故障排除

### 问题1: 连接频繁断开
**可能原因**: 超时设置过长或缓冲问题
**解决方案**: 
- 使用优化后的超时设置 (60秒)
- 禁用代理缓冲

### 问题2: WebSocket升级失败
**可能原因**: 缺少升级头或HTTP版本问题
**解决方案**:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 问题3: SSL证书问题
**检查命令**:
```bash
# 检查证书有效性
sudo certbot certificates

# 更新证书
sudo certbot renew
```

### 问题4: 端口占用
**检查命令**:
```bash
# 检查1370端口是否被占用
sudo netstat -tlnp | grep :1370

# 检查nginx进程
sudo ps aux | grep nginx
```

## 📊 性能监控

### 1. 连接数监控
```bash
# 查看当前连接数
sudo netstat -an | grep :443 | wc -l

# 查看WebSocket连接
sudo netstat -an | grep :1370
```

### 2. 日志分析
```bash
# 分析访问模式
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# 查看错误统计
sudo grep "error" /var/log/nginx/error.log | tail -20
```

## 🚀 进一步优化建议

### 1. 启用gzip压缩
```nginx
location / {
    # ... 现有配置 ...
    
    # 启用压缩（但不压缩WebSocket）
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### 2. 添加速率限制
```nginx
# 在http块中添加
limit_req_zone $binary_remote_addr zone=websocket:10m rate=10r/s;

# 在location /socket.io/ 中添加
limit_req zone=websocket burst=20 nodelay;
```

### 3. 监控脚本
创建监控脚本检查WebSocket健康状态：
```bash
#!/bin/bash
# websocket_health_check.sh

URL="wss://cust.foreverlink.love/socket.io/?transport=websocket"
if curl -s --max-time 10 "$URL" > /dev/null; then
    echo "✅ WebSocket endpoint is healthy"
else
    echo "❌ WebSocket endpoint is down"
    # 可以添加重启服务的逻辑
fi
```

## 📝 配置验证清单

- [ ] nginx配置语法正确 (`nginx -t`)
- [ ] SSL证书有效
- [ ] 后端服务运行在1370端口
- [ ] WebSocket升级头正确设置
- [ ] 超时设置合理 (60秒)
- [ ] 缓冲和缓存已禁用
- [ ] 防火墙允许443和1370端口
- [ ] 浏览器控制台无WebSocket错误

完成这些配置后，WebSocket连接应该会更加稳定！
