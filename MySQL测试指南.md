# MySQL查询逻辑测试指南

## 🚀 快速开始

### 1. 环境准备

#### 安装MySQL服务器
1. 下载MySQL Community Server: https://dev.mysql.com/downloads/mysql/
2. 安装MySQL服务器（Windows版本）
3. 启动MySQL服务：
   ```cmd
   net start mysql
   ```

#### 验证MySQL安装
```cmd
mysql -u root -p
```

### 2. 启动测试系统

#### 方法1: 使用PowerShell脚本（推荐）
```powershell
.\start-mysql-server.ps1
```

#### 方法2: 手动启动
```cmd
npm install
node back-end.js
```

### 3. 访问测试页面

启动成功后，访问：
- 主测试页面: http://localhost:3000/mysql-test.html
- 数据库连接测试: http://localhost:3000/test-db

## 🔍 测试功能

### 1. 数据库连接测试
- 测试MySQL连接状态
- 显示数据库信息
- 验证表结构创建

### 2. 火车信息查询测试
- 查询所有火车信息
- 按出发站和到达站筛选
- 显示座位类型和价格

### 3. 经停站信息查询
- 根据火车ID查询经停站
- 显示各经停站的价格信息
- 支持不同座位类型查询

### 4. 车票预订测试
- 模拟车票预订流程
- 余票扣减逻辑验证
- 价格计算验证

### 5. 订单查询测试
- 按乘客姓名查询订单
- 按身份证号查询订单
- 订单详情显示

### 6. 压力测试
- 并发请求测试
- 性能指标统计
- 数据库连接池测试

## 📊 数据库结构

### 表结构说明

#### trains 表 - 火车信息
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| name | VARCHAR(10) | 火车名称 |
| from_station | VARCHAR(50) | 出发站 |
| to_station | VARCHAR(50) | 到达站 |

#### seat_types 表 - 座位类型
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| train_id | INT | 火车ID |
| type | VARCHAR(20) | 座位类型 |
| price | DECIMAL(10,2) | 价格 |
| available_seats | INT | 余票 |
| total_seats | INT | 总票数 |

#### stops 表 - 经停站
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| train_id | INT | 火车ID |
| station | VARCHAR(50) | 经停站名称 |
| seat_type | VARCHAR(20) | 座位类型 |
| price | DECIMAL(10,2) | 价格 |

#### orders 表 - 订单信息
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| train_id | INT | 火车ID |
| from_station | VARCHAR(50) | 出发站 |
| to_station | VARCHAR(50) | 到达站 |
| seat_type | VARCHAR(20) | 座位类型 |
| passenger_name | VARCHAR(100) | 乘客姓名 |
| passenger_id | VARCHAR(20) | 身份证号 |
| price | DECIMAL(10,2) | 价格 |
| created_at | TIMESTAMP | 创建时间 |

## 🧪 测试案例

### 基础查询测试
```javascript
// 查询所有火车
GET /trains

// 查询北京到上海的火车
GET /trains?from=北京&to=上海

// 查询火车1的经停站
GET /stops/1
```

### 预订测试
```javascript
// 预订车票
POST /book
{
  "trainId": 1,
  "seatType": "二等座",
  "passengerName": "张三",
  "passengerId": "123456789012345678",
  "fromStation": "北京",
  "toStation": "上海"
}
```

### 订单查询测试
```javascript
// 查询订单
GET /orders?passengerName=张三

// 查询所有订单
GET /orders
```

## 🔧 故障排除

### 常见问题

#### 1. 数据库连接失败
- 检查MySQL服务是否启动
- 验证用户名和密码配置
- 确认端口3306是否开放

#### 2. 端口3000被占用
- 使用PowerShell脚本会自动处理
- 手动停止Node.js进程：
  ```powershell
  Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
  ```

#### 3. 依赖安装失败
- 检查网络连接
- 清理npm缓存：
  ```cmd
  npm cache clean --force
  ```

### 配置修改

#### 数据库连接配置
编辑 `back-end.js` 文件中的 `dbConfig` 对象：
```javascript
const dbConfig = {
    host: 'localhost',     // 数据库主机
    user: 'root',          // 用户名
    password: '',          // 密码
    database: 'train_ticket_system'  // 数据库名
};
```

## 📈 性能优化

### 数据库优化
1. 为常用查询字段添加索引
2. 使用连接池减少连接开销
3. 实施查询缓存策略

### 应用优化
1. 使用事务确保数据一致性
2. 实施错误处理和重试机制
3. 添加日志记录

## 🎯 测试目标

### 功能测试
- ✅ 数据库CRUD操作
- ✅ 事务处理
- ✅ 并发控制
- ✅ 数据一致性

### 性能测试
- ✅ 响应时间
- ✅ 并发处理能力
- ✅ 内存使用
- ✅ 数据库连接池

### 稳定性测试
- ✅ 长时间运行
- ✅ 异常处理
- ✅ 资源释放
- ✅ 错误恢复

## 📝 测试报告

测试完成后，系统会生成包含以下信息的测试报告：
- 各项功能测试结果
- 性能指标统计
- 错误日志分析
- 优化建议

## 🚀 生产部署建议

1. **数据库配置**
   - 使用独立的MySQL服务器
   - 配置主从复制
   - 设置定期备份

2. **安全配置**
   - 修改默认密码
   - 限制数据库访问权限
   - 启用SSL连接

3. **监控配置**
   - 添加性能监控
   - 设置告警机制
   - 记录详细日志

---

💡 **提示**: 如果遇到任何问题，请检查控制台输出的详细错误信息，或查看相关日志文件。 