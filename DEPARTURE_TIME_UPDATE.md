# 开车时间功能更新

## 概述

本次更新为火车票预订系统添加了开车时间显示功能，用户现在可以在订票后查看具体的开车时间。

## 更新内容

### 1. 后端 API 更新

- **文件**: `back-end.js`
- **修改**: 订单查询 API (`/orders`)
- **新增字段**: `departureTime` - 出发站的开车时间

#### 修改详情
```javascript
// 新增查询出发站的开车时间
LEFT JOIN train_stations ts_from ON t.id = ts_from.train_id AND ts_from.station_name = o.from_station

// 返回数据中包含开车时间
departureTime: row.departure_time
```

### 2. Qt 客户端更新

- **文件**: `TrainBookingClient/MainWindow.cpp`
- **修改**: 订单显示和预订成功提示

#### 修改详情
- 订单表格的"日期"列现在显示：
  ```
  2025-07-17
  开车时间: 08:00
  ```
- 预订成功提示包含开车时间信息

### 3. Web 前端更新

- **文件**: `booking-system.html`
- **修改**: 订单列表显示

#### 修改详情
- 订单表格的"出发日期时间"列现在显示：
  ```
  2025-07-17
  开车时间: 08:00
  ```

### 4. API 文档更新

- **文件**: `API_DOCUMENTATION.md`
- **新增**: `departureTime` 字段说明

## 使用说明

### 1. 启动服务

```bash
# 启动后端服务
node back-end.js

# 或使用启动脚本
./start-service.bat
```

### 2. 测试功能

```bash
# 运行测试脚本
node test_departure_time.js
```

### 3. 访问前端

- **Web 前端**: `http://localhost:3000/booking-system.html`
- **Qt 客户端**: 编译并运行 `TrainBookingClient` 项目

## 功能特性

✅ **订单查询显示开车时间**
- 后端 API 返回 `departureTime` 字段
- 前端界面显示具体开车时间

✅ **预订成功提示开车时间**
- Qt 客户端预订成功对话框包含开车时间
- 基于当前选中车次的时刻表信息

✅ **响应式设计**
- Web 前端适配移动设备
- 时间信息以小字体显示，不影响整体布局

## 数据库结构

订单查询使用以下 SQL 关联：
```sql
LEFT JOIN train_stations ts_from ON t.id = ts_from.train_id AND ts_from.station_name = o.from_station
```

这样可以获取出发站的 `departure_time` 字段。

## 注意事项

1. **兼容性**: 现有订单数据如果没有开车时间，将显示为空
2. **性能**: 新增的 JOIN 操作可能略微影响查询性能
3. **Qt 编译**: Qt 客户端需要正确配置 Qt6 环境才能编译成功

## 测试验证

使用提供的测试脚本 `test_departure_time.js` 可以验证：
1. 搜索车次
2. 预订车票
3. 查询订单（包含开车时间）

预期输出应包含类似以下信息：
```
开车时间: 08:00
✅ 开车时间功能正常！
``` 