# 火车票售票系统

一个基于Node.js + Express + MySQL的火车票售票系统，支持火车信息查询、经停站价格查询、车票预订、订单管理等功能。

## 🚀 功能特性

- **火车信息查询** - 支持按出发站、到达站筛选
- **经停站价格查询** - 查看火车各经停站的价格信息
- **车票预订** - 完整的预订流程，支持余票管理
- **订单管理** - 订单查询、历史记录
- **软删除功能** - 订单取消、恢复，座位分配管理
- **区间价格计算** - 准确计算不同起止站点的价格
- **数据库事务支持** - 确保数据一致性

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **数据库**: MySQL 8.0+
- **前端**: HTML + CSS + JavaScript/Qt 6
- **数据库驱动**: mysql2

## 📋 环境要求

- Node.js (v14+)
- MySQL Server (v8.0+)
- npm
- Qt6

## 🔧 安装和运行

### 1. 克隆项目
```bash
git clone https://github.com/your-username/train-ticket-system.git
cd train-ticket-system
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动MySQL服务
```bash
# Windows
net start MySQL80

# Linux/Mac
sudo systemctl start mysql
```

### 4. 启动项目

**推荐使用启动脚本：**
```bash
# 完整启动（推荐首次使用）
start-service.bat

# 或使用PowerShell
start-service.ps1

# 快速启动（已配置环境）
quick-start.bat
```

**手动启动：**
```bash
node back-end.js
```

### 5. 访问应用

#### 本地访问
- **主页**: http://localhost:3000
- **测试页面**: http://localhost:3000/mysql-test.html
- **数据库连接测试**: http://localhost:3000/test-db

#### 远程访问
- **远程Web界面**: https://train.cornmax.top/booking-system-remote.html
- **本地远程界面**: http://localhost:3000/booking-system-remote.html

**注意**: 远程访问需要确保服务器支持HTTPS协议，避免混合内容错误。

## 📁 项目结构

```
project/
├── back-end.js                   # 主服务器文件
├── booking-system.html           # 本地Web界面
├── booking-system-remote.html    # 远程Web界面（HTTPS）
├── mysql-test.html               # Web测试页面
├── package.json                  # 项目配置
├── package-lock.json             # 依赖锁定
├── quick-start.bat               # 快速启动脚本
├── start-service.bat             # 完整启动脚本
├── start-service.ps1             # PowerShell启动脚本
├── mysql-reset-password-complete.bat # 密码重置工具
├── .gitignore                    # Git忽略文件
└── README.md                     # 项目说明
```

## 🎯 API端点

- `GET /` - 重定向到测试页面
- `GET /trains` - 查询火车信息
- `GET /stops/:trainId` - 查询经停站
- `POST /search-bookable-trains` - 搜索可预订车次
- `POST /book` - 预订车票
- `GET /orders` - 查询订单
- `DELETE /orders/:orderId` - 取消订单（软删除）
- `PUT /orders/:orderId/restore` - 恢复订单
- `GET /orders/deleted` - 查询已删除订单
- `GET /test-db` - 测试数据库连接

## 🧪 测试功能

### Web界面测试
访问 http://localhost:3000/mysql-test.html 进行：
- 数据库连接测试
- 火车信息查询
- 经停站价格查询
- 车票预订测试
- 订单查询测试
- 订单管理测试（软删除功能）
- 压力测试

### 远程访问测试
访问 https://train.cornmax.top/booking-system-remote.html 进行：
- 远程服务器连接测试
- HTTPS协议验证
- 跨域请求测试
- 完整功能验证

### API测试
```bash
# 查询所有火车
curl http://localhost:3000/trains

# 查询经停站
curl http://localhost:3000/stops/1

# 查询订单
curl http://localhost:3000/orders

# 取消订单（软删除）
curl -X DELETE http://localhost:3000/orders/1

# 恢复订单
curl -X PUT http://localhost:3000/orders/1/restore

# 查询已删除订单
curl http://localhost:3000/orders/deleted

# 测试数据库连接
curl http://localhost:3000/test-db
```

## 🔧 配置

### 数据库配置
在 `back-end.js` 中修改：
```javascript
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1103',  // 修改为您的MySQL密码
    database: 'train_ticket_system'
};
```

### 端口配置
```javascript
const PORT = process.env.PORT || 3000;
```

## 🚨 故障排除

### 常见问题：
1. **MySQL连接失败** - 检查服务状态和密码配置
2. **端口3000被占用** - 使用启动脚本会自动处理
3. **依赖安装失败** - 运行 `npm install` 重新安装
4. **HTTPS混合内容错误** - 确保远程服务器支持HTTPS协议
5. **跨域请求失败** - 检查服务器CORS配置
6. **远程连接超时** - 检查网络连接和服务器状态



## 🌐 远程访问说明

### HTTPS支持
- 远程Web界面使用HTTPS协议确保安全性
- 避免浏览器混合内容错误
- 支持跨域请求和CORS

### 访问方式
1. **直接访问**: https://train.cornmax.top/booking-system-remote.html
2. **本地测试**: http://localhost:3000/booking-system-remote.html
3. **Qt客户端**: 连接本地服务器 http://localhost:3000

### 安全注意事项
- 远程访问需要有效的SSL证书
- 确保服务器支持HTTPS协议
- 注意网络连接稳定性

## 📄 许可证

本项目仅用于学习和研究目的。

---

**注意**: 本项目包含完整的MySQL数据库事务支持和并发控制，适合学习Node.js后端开发和数据库操作。支持本地和远程两种访问方式。 