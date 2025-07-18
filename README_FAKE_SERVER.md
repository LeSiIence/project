# 火车票售票系统 Fake Server

这是一个用于测试Qt前端的C++ fake server，模拟了完整的火车票售票系统API。

## 功能特性

- ✅ 完整的API接口模拟
- ✅ 支持CORS跨域请求
- ✅ 多线程处理并发请求
- ✅ 模拟数据持久化（内存存储）
- ✅ 支持所有HTTP方法（GET, POST, PUT, DELETE, OPTIONS）

## API接口列表

### 1. 查询火车信息
- **GET** `/trains`
- 支持查询参数：`from`, `to`, `date`

### 2. 查询经停站信息
- **GET** `/stops/:trainId`

### 3. 查询可预订车次
- **POST** `/search-bookable-trains`
- 请求体：`{"fromStation": "北京", "toStation": "上海", "date": "2025-07-17"}`

### 4. 预订车票
- **POST** `/book`
- 请求体：`{"trainId": 1, "seatType": "二等座", "passengerName": "张三", "passengerId": "110101199001011234", "fromStation": "北京", "toStation": "上海", "date": "2025-07-17"}`

### 5. 查询订单
- **GET** `/orders`
- 支持查询参数：`passengerName`, `passengerId`

### 6. 取消订单
- **DELETE** `/orders/:orderId`

### 7. 恢复订单
- **PUT** `/orders/:orderId/restore`

### 8. 查询已删除订单
- **GET** `/orders/deleted`
- 支持查询参数：`passengerName`, `passengerId`

### 9. 数据库连接测试
- **GET** `/test-db`

## 编译和运行

### Windows

1. **安装编译器**
   - 安装MinGW或Visual Studio
   - 确保`g++`命令可用

2. **编译**
   ```bash
   # 方法1：使用批处理文件
   compile_fake_server.bat
   
   # 方法2：手动编译
   g++ -std=c++17 -O2 -o fake_server.exe simple_fake_server.cpp -lws2_32 -lpthread
   ```

3. **运行**
   ```bash
   fake_server.exe
   ```

### Linux/macOS

1. **编译**
   ```bash
   g++ -std=c++17 -O2 -o fake_server simple_fake_server.cpp -lpthread
   ```

2. **运行**
   ```bash
   ./fake_server
   ```

## 测试API

### 使用Python测试脚本

1. **安装依赖**
   ```bash
   pip install requests
   ```

2. **运行测试**
   ```bash
   python test_api.py
   ```

### 使用curl测试

```bash
# 测试数据库连接
curl http://localhost:3000/test-db

# 查询火车信息
curl http://localhost:3000/trains

# 查询经停站信息
curl http://localhost:3000/stops/1

# 查询可预订车次
curl -X POST http://localhost:3000/search-bookable-trains \
  -H "Content-Type: application/json" \
  -d '{"fromStation": "北京", "toStation": "上海", "date": "2025-07-17"}'

# 预订车票
curl -X POST http://localhost:3000/book \
  -H "Content-Type: application/json" \
  -d '{"trainId": 1, "seatType": "二等座", "passengerName": "张三", "passengerId": "110101199001011234", "fromStation": "北京", "toStation": "上海", "date": "2025-07-17"}'

# 查询订单
curl "http://localhost:3000/orders?passengerName=张三&passengerId=110101199001011234"

# 取消订单
curl -X DELETE http://localhost:3000/orders/1

# 恢复订单
curl -X PUT http://localhost:3000/orders/1/restore

# 查询已删除订单
curl "http://localhost:3000/orders/deleted?passengerName=张三"
```

## 模拟数据

Fake server包含以下模拟数据：

### 火车信息
- **G1**: 北京 → 上海 (08:00-13:00)
- **G2**: 上海 → 北京 (14:00-19:00)

### 座位类型
- 一等座：553.5元
- 二等座：553.5元

### 车站
- 北京
- 上海

## 响应格式

所有API都返回统一的JSON格式：

### 成功响应
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息"
}
```

## 注意事项

1. **端口占用**: 确保端口3000未被占用
2. **防火墙**: 如果使用防火墙，请允许端口3000的访问
3. **CORS**: 已配置CORS头，支持跨域请求
4. **数据持久化**: 数据存储在内存中，重启服务器后数据会丢失
5. **并发安全**: 使用互斥锁保证多线程安全

## 故障排除

### 编译错误
- 确保安装了C++17兼容的编译器
- Windows用户需要链接`ws2_32`库
- Linux/macOS用户需要链接`pthread`库

### 运行错误
- 检查端口3000是否被占用
- 确保有足够的权限绑定端口
- 检查防火墙设置

### 连接错误
- 确保服务器正在运行
- 检查URL是否正确
- 验证网络连接

## 开发说明

### 添加新的API接口

1. 在`Router`类中添加新的处理方法
2. 在`handleClient`函数中添加路由规则
3. 更新API文档

### 修改模拟数据

编辑`initializeMockData()`函数来修改初始数据。

### 扩展功能

- 添加数据库支持
- 实现更复杂的业务逻辑
- 添加认证和授权
- 支持更多的HTTP方法

## 许可证

本项目仅供学习和测试使用。 