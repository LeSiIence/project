# 火车票售票系统 - MySQL版本

一个基于Node.js + Express + MySQL的完整火车票售票系统，支持火车信息查询、经停站价格查询、车票预订、订单管理等功能。

## 🚀 功能特性

- **火车信息查询** - 支持按出发站、到达站筛选
- **经停站价格查询** - 查看火车各经停站的价格信息
- **车票预订** - 完整的预订流程，支持余票管理
- **订单管理** - 订单查询、历史记录
- **区间价格计算** - 准确计算不同起止站点的价格
- **数据库事务支持** - 确保数据一致性
- **Web测试界面** - 完整的测试和管理界面

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **数据库**: MySQL 8.0+
- **前端**: HTML + CSS + JavaScript
- **数据库驱动**: mysql2

## 📋 环境要求

- Node.js (v14+)
- MySQL Server (v8.0+)
- npm

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

**Windows:**
```bash
# 使用批处理文件（推荐）
start-service.bat

# 或使用PowerShell
start-service.ps1

# 或快速启动
quick-start.bat
```

**手动启动:**
```bash
node back-end.js
```

### 5. 访问应用

- **主页**: http://localhost:3000
- **测试页面**: http://localhost:3000/mysql-test.html
- **数据库连接测试**: http://localhost:3000/test-db

## 📊 数据库结构

### 主要表结构：
- `trains` - 火车信息（车次、起点、终点）
- `seat_types` - 座位类型和价格
- `stops` - 经停站价格信息
- `orders` - 订单信息
- `users` - 用户信息（预留）

### 测试数据：
- **G101**: 北京 → 上海（经停：天津、济南、南京）
- **G102**: 上海 → 北京（经停：南京、济南、天津）
- **D201**: 广州 → 深圳
- **K301**: 西安 → 成都

## 🧪 测试功能

### 1. 数据库连接测试
```bash
node mysql-quick-test.js
```

### 2. Web界面测试
访问 http://localhost:3000/mysql-test.html 进行：
- 火车信息查询
- 经停站价格查询
- 车票预订测试
- 订单查询测试
- 压力测试

### 3. API测试
```bash
# 查询所有火车
curl http://localhost:3000/trains

# 查询经停站
curl http://localhost:3000/stops/1

# 测试数据库连接
curl http://localhost:3000/test-db
```

## 💡 价格计算逻辑

系统支持准确的区间价格计算：

- **全程票**：使用全程价格
- **起始站到经停站**：使用经停站价格
- **经停站到终点站**：全程价格 - 经停站价格
- **经停站之间**：到达站价格 - 出发站价格

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
2. **端口3000被占用** - 使用 `taskkill /f /im node.exe` 停止进程
3. **依赖安装失败** - 清理npm缓存并重新安装

### 密码重置工具：
```bash
# 以管理员身份运行
mysql-reset-password-complete.bat
```

## 📁 项目结构

```
project/
├── back-end.js                 # 主服务器文件
├── mysql-test.html             # Web测试页面
├── package.json                # 项目配置
├── start-service.bat           # 完整启动脚本
├── quick-start.bat             # 快速启动脚本
├── mysql-quick-test.js         # 数据库测试脚本
├── configure-mysql-password.js # 密码配置工具
└── README.md                   # 项目说明
```

## 🎯 API端点

- `GET /trains` - 查询火车信息
- `GET /stops/:trainId` - 查询经停站
- `POST /book` - 预订车票
- `GET /orders` - 查询订单
- `GET /test-db` - 测试数据库连接

## 📄 许可证

本项目仅用于学习和研究目的。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 本项目包含完整的MySQL数据库事务支持和并发控制，适合学习Node.js后端开发和数据库操作。 