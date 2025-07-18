# 火车票售票系统 API 文档

## 基础信息

- **基础URL**: `http://localhost:3000`
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

## 通用响应格式

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

## API 接口列表

### 1. 查询火车信息
**GET** `/trains`

查询所有火车信息，支持按出发站和到达站筛选。

#### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| from | string | 否 | 出发站名称 |
| to | string | 否 | 到达站名称 |
| date | string | 否 | 查询日期 (YYYY-MM-DD)，默认为 2025-07-17 |

#### 请求示例
```
GET /trains?from=北京&to=上海&date=2025-07-17
```

#### 响应示例
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "G1",
            "from": "北京",
            "to": "上海",
            "date": "2025-07-17",
            "schedule": [
                {
                    "station": "北京",
                    "order": 1,
                    "arrival": null,
                    "departure": "08:00",
                    "distance": 0
                },
                {
                    "station": "上海",
                    "order": 2,
                    "arrival": "13:00",
                    "departure": null,
                    "distance": 1318
                }
            ],
            "seatTypes": [
                {
                    "type": "一等座",
                    "price": 553.5,
                    "availableSeats": 50,
                    "totalSeats": 50
                },
                {
                    "type": "二等座",
                    "price": 553.5,
                    "availableSeats": 100,
                    "totalSeats": 100
                }
            ]
        }
    ],
    "message": "查询火车信息成功"
}
```

### 2. 查询经停站信息
**GET** `/stops/:trainId`

查询指定车次的经停站信息。

#### 路径参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| trainId | integer | 是 | 车次ID |

#### 请求示例
```
GET /stops/1
```

#### 响应示例
```json
{
    "success": true,
    "data": [
        {
            "station": "北京",
            "order": 1,
            "arrival": null,
            "departure": "08:00",
            "distance": 0,
            "seatTypes": [
                {
                    "type": "一等座",
                    "price": 0
                },
                {
                    "type": "二等座",
                    "price": 0
                }
            ]
        },
        {
            "station": "上海",
            "order": 2,
            "arrival": "13:00",
            "departure": null,
            "distance": 1318,
            "seatTypes": [
                {
                    "type": "一等座",
                    "price": 553.5
                },
                {
                    "type": "二等座",
                    "price": 553.5
                }
            ]
        }
    ],
    "message": "查询经停站信息成功"
}
```

### 3. 查询可预订车次
**POST** `/search-bookable-trains`

查询可预订的车次，考虑座位区间冲突。

#### 请求体
```json
{
    "fromStation": "北京",
    "toStation": "上海",
    "date": "2025-07-17"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fromStation | string | 是 | 出发站名称 |
| toStation | string | 是 | 到达站名称 |
| date | string | 否 | 查询日期 (YYYY-MM-DD)，默认为当天 |

#### 响应示例
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "G1",
            "from": "北京",
            "to": "上海",
            "date": "2025-07-17",
            "scheduleId": 1,
            "schedule": [
                {
                    "station": "北京",
                    "order": 1,
                    "arrival": null,
                    "departure": "08:00"
                },
                {
                    "station": "上海",
                    "order": 2,
                    "arrival": "13:00",
                    "departure": null
                }
            ],
            "seatTypes": [
                {
                    "type": "一等座",
                    "price": 553.5,
                    "availableSeats": 45,
                    "totalSeats": 50
                },
                {
                    "type": "二等座",
                    "price": 553.5,
                    "availableSeats": 90,
                    "totalSeats": 100
                }
            ]
        }
    ],
    "message": "查询成功"
}
```

### 4. 预订车票 ⚠️ (未完全实现)
**POST** `/book`

预订车票，分配座位。

#### 请求体
```json
{
    "trainId": 1,
    "seatType": "二等座",
    "passengerName": "张三",
    "passengerId": "110101199001011234",
    "fromStation": "北京",
    "toStation": "上海",
    "date": "2025-07-17"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| trainId | integer | 是 | 车次ID |
| seatType | string | 是 | 座位类型 |
| passengerName | string | 是 | 乘客姓名 |
| passengerId | string | 是 | 乘客身份证号 |
| fromStation | string | 是 | 出发站 |
| toStation | string | 是 | 到达站 |
| date | string | 否 | 乘车日期 (YYYY-MM-DD)，默认为当天 |

#### 响应示例
```json
{
    "success": true,
    "data": {
        "orderId": 1,
        "trainId": 1,
        "seatType": "二等座",
        "seatNumber": "01A",
        "carriageNumber": 1,
        "passengerName": "张三",
        "passengerId": "110101199001011234",
        "fromStation": "北京",
        "toStation": "上海",
        "date": "2025-07-17",
        "price": 553.5
    },
    "message": "预订成功"
}
```

### 5. 查询订单
**GET** `/orders`

查询订单信息。

#### 查询参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| passengerName | string | 否 | 乘客姓名 |
| passengerId | string | 否 | 乘客身份证号 |

#### 请求示例
```
GET /orders?passengerName=张三&passengerId=110101199001011234
```

#### 响应示例
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "trainName": "G1",
            "date": "2025-07-17",
            "departureTime": "08:00",
            "fromStation": "北京",
            "toStation": "上海",
            "seatType": "二等座",
            "seatNumber": "01A",
            "carriageNumber": 1,
            "passengerName": "张三",
            "passengerId": "110101199001011234",
            "price": 553.5,
            "status": "confirmed",
            "createdAt": "2025-01-15T10:30:00.000Z"
        }
    ],
    "message": "查询订单成功"
}
```

#### 字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | integer | 订单ID |
| trainName | string | 车次名称 |
| date | string | 开车日期 (YYYY-MM-DD) |
| departureTime | string | 出发站开车时间 (HH:mm) |
| fromStation | string | 出发站 |
| toStation | string | 到达站 |
| seatType | string | 座位类型 |
| seatNumber | string | 座位号 |
| carriageNumber | integer | 车厢号 |
| passengerName | string | 乘客姓名 |
| passengerId | string | 乘客身份证号 |
| price | number | 票价 |
| status | string | 订单状态 |
| createdAt | string | 创建时间 |

### 6. 取消订单
**DELETE** `/orders/:orderId`

取消指定订单（软删除）。

#### 路径参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| orderId | integer | 是 | 订单ID |

#### 请求示例
```
DELETE /orders/1
```

#### 响应示例
```json
{
    "success": true,
    "data": {
        "orderId": 1
    },
    "message": "订单取消成功"
}
```

### 7. 恢复订单
**PUT** `/orders/:orderId/restore`

恢复已取消的订单。

#### 路径参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| orderId | integer | 是 | 订单ID |

#### 请求示例
```
PUT /orders/1/restore
```

#### 响应示例
```json
{
    "success": true,
    "data": {
        "orderId": 1
    },
    "message": "订单恢复成功"
}
```

### 8. 查询已删除订单
**GET** `/orders/deleted`

查询已删除的订单。

#### 查询参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| passengerName | string | 否 | 乘客姓名 |
| passengerId | string | 否 | 乘客身份证号 |

#### 请求示例
```
GET /orders/deleted?passengerName=张三
```

#### 响应示例
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "trainName": "G1",
            "date": "2025-07-17",
            "fromStation": "北京",
            "toStation": "上海",
            "seatType": "二等座",
            "passengerName": "张三",
            "passengerId": "110101199001011234",
            "price": 553.5,
            "status": "cancelled",
            "createdAt": "2025-01-15T10:30:00.000Z",
            "deletedAt": "2025-01-15T11:00:00.000Z"
        }
    ],
    "message": "查询已删除订单成功"
}
```

### 9. 数据库连接测试
**GET** `/test-db`

测试数据库连接状态。

#### 请求示例
```
GET /test-db
```

#### 响应示例
```json
{
    "success": true,
    "data": {
        "connected": true,
        "trainCount": 5,
        "database": "MySQL",
        "timestamp": "2025-01-15T10:30:00.000Z"
    },
    "message": "数据库连接测试成功"
}
```

## 错误码说明

| HTTP状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 注意事项

1. **座位区间冲突**: 系统会检查座位在指定区间的可用性，避免重复预订
2. **软删除**: 订单取消采用软删除方式，数据不会真正删除
3. **事务处理**: 预订和取消操作使用数据库事务确保数据一致性
4. **价格计算**: 价格根据出发站、到达站和座位类型计算
5. **座位分配**: 系统会自动分配可用座位，优先选择靠窗位置

## 测试数据

系统包含以下测试数据：
- 车次：G1（北京-上海）、G2（上海-北京）等
- 座位类型：一等座、二等座、商务座
- 车站：北京、上海、南京、苏州等
- 价格：根据距离和座位类型计算 