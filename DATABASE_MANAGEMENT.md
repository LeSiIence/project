# 数据库管理模块完整说明

## 概述

`manage_database.js` 是一个功能强大的数据库管理模块，从 `back-end.js` 中剥离出来，提供了完整的数据库管理和CSV导入导出功能。

## 主要功能

### 1. 数据库管理
- `initDatabase()` - 创建数据库和表结构
- `createTables()` - 创建所有必需的表
- `insertTestData()` - 插入测试数据
- `clearAllTables()` - 清空所有表
- `rebuildDatabase()` - 重建数据库
- `getTableStats()` - 获取表统计信息

### 2. 通用CSV导入导出
- `importFromCSV(tableName, csvFilePath, columnMapping)` - 导入单个CSV文件
- `importMultipleCSV(importConfig)` - 批量导入多个CSV文件
- `exportToCSV(tableName, csvFilePath, options)` - 导出单个表到CSV
- `exportMultipleCSV(exportConfig)` - 批量导出多个表
- `exportAllTables(outputDir, options)` - 导出所有表到目录

### 3. 智能导入导出
- `smartImport(csvFilePath)` - 根据文件名自动识别表并导入
- `smartExport(tableName, csvFilePath)` - 智能导出，自动选择最佳导出方式

### 4. 专门的表导入导出函数
每个主要表都有专门的导入导出函数，优化了字段选择和排序：
- `importTrains()` / `exportTrains()` - 火车表
- `importStations()` / `exportStations()` - 车站表
- `importPrices()` / `exportPrices()` - 价格表
- `importOrders()` / `exportOrders()` - 订单表
- `importUsers()` / `exportUsers()` - 用户表
- `importSeatAllocations()` / `exportSeatAllocations()` - 座位分配表
- `importTrainSchedules()` / `exportTrainSchedules()` - 车次时刻表
- `importTrainStations()` / `exportTrainStations()` - 经停站表
- `importCarriages()` / `exportCarriages()` - 车厢表
- `importSeats()` / `exportSeats()` - 座位表

## 命令行使用

### 数据库管理命令
```bash
# 初始化数据库
node manage_database.js init

# 重建数据库
node manage_database.js rebuild

# 清空所有表
node manage_database.js clear

# 显示表统计
node manage_database.js stats
```

### CSV导入命令
```bash
# 导入单个表
node manage_database.js import <table> <file>

# 从目录导入所有表（根据文件名匹配）
node manage_database.js import-all <dir>

# 智能导入（自动识别表）
node manage_database.js smart-import <file>
```

### CSV导出命令
```bash
# 导出单个表
node manage_database.js export <table> <file>

# 导出所有表到目录
node manage_database.js export-all <dir>

# 智能导出
node manage_database.js smart-export <table> <file>
```

## 使用示例

### 基本使用
```bash
# 导入trains表
node manage_database.js import trains ./data/trains.csv

# 导出orders表
node manage_database.js export orders ./exports/orders.csv

# 导出所有表
node manage_database.js export-all ./exports/

# 智能导入（自动识别为stations表）
node manage_database.js smart-import ./data/stations_backup.csv
```

### 在代码中使用
```javascript
const { 
    initDatabase, 
    insertTestData,
    importFromCSV,
    exportToCSV,
    exportAllTables,
    smartImport,
    smartExport,
    getTableStats
} = require('./manage_database');

// 数据库管理
await initDatabase();
await insertTestData();

// 通用CSV操作
await importFromCSV('trains', 'data/trains.csv');
await exportToCSV('stations', 'output/stations.csv');
await exportAllTables('./exports/');

// 智能操作
await smartImport('./data/trains.csv');
await smartExport('prices', './output/prices.csv');

// 获取统计信息
const stats = await getTableStats();
console.table(stats);
```

## CSV文件格式

### 专门导出的CSV格式（推荐）
专门的导出函数只包含业务字段，便于导入：

#### trains.csv
```csv
name,from_station,to_station
G101,北京,上海
G102,上海,北京
D201,广州,深圳
```

#### stations.csv
```csv
name,city
北京,北京
上海,上海
广州,广东
```

#### prices.csv
```csv
train_id,from_station,to_station,seat_type,price
1,北京,上海,二等座,553.00
1,北京,上海,一等座,884.50
```

### 通用导出的CSV格式
通用导出包含所有字段，包括id和timestamp：

```csv
id,name,from_station,to_station,created_at,updated_at
1,G101,北京,上海,2025-07-17T16:36:13.000Z,2025-07-17T16:36:13.000Z
2,G102,上海,北京,2025-07-17T16:36:13.000Z,2025-07-17T16:36:13.000Z
```

## 高级功能

### 1. 字段映射
```javascript
const columnMapping = {
    'train_name': 'name',
    'start_station': 'from_station',
    'end_station': 'to_station'
};

await importFromCSV('trains', 'data/trains.csv', columnMapping);
```

### 2. 条件导出
```javascript
// 只导出未删除的订单
await exportOrders('./exports/active_orders.csv', false);

// 导出指定日期范围的车次
await exportTrainSchedules('./exports/schedules.csv', {
    start: '2025-07-17',
    end: '2025-07-31'
});
```

### 3. 批量处理
```javascript
// 批量导入
const importConfig = [
    {
        tableName: 'trains',
        csvFilePath: 'data/trains.csv',
        columnMapping: null
    },
    {
        tableName: 'stations',
        csvFilePath: 'data/stations.csv',
        columnMapping: {
            'station_name': 'name',
            'city_name': 'city'
        }
    }
];

const importResults = await importMultipleCSV(importConfig);

// 批量导出
const exportConfig = [
    {
        tableName: 'trains',
        csvFilePath: 'exports/trains.csv',
        options: { orderBy: 'name' }
    },
    {
        tableName: 'stations',
        csvFilePath: 'exports/stations.csv',
        options: { orderBy: 'city, name' }
    }
];

const exportResults = await exportMultipleCSV(exportConfig);
```

### 4. 智能识别
智能导入会根据文件名自动识别表：
- `trains.csv` -> trains表
- `stations_backup.csv` -> stations表
- `prices_2025.csv` -> prices表
- `orders_export.csv` -> orders表

## 错误处理

### 导入错误处理
- 无效数据会被跳过并记录日志
- 使用数据库事务确保数据一致性
- 重复数据会报错但不会中止导入

### 导出错误处理
- 空表会创建带标题的空CSV文件
- 自动创建目录结构
- 数据类型自动转换

## 性能优化

### 导入优化
- 使用prepared statements
- 批量插入减少网络开销
- 事务处理保证数据一致性

### 导出优化
- 流式处理大数据量
- 只选择必要字段
- 合理的排序和索引使用

## 测试

### 运行测试
```bash
# 运行所有测试
node test-csv-functions.js

# 运行特定测试
node test-csv-functions.js export
node test-csv-functions.js import
node test-csv-functions.js specialized

# 清理测试文件
node test-csv-functions.js cleanup
```

### 测试覆盖
- CSV导出功能测试
- CSV导入功能测试
- 专门函数测试
- 智能导入导出测试
- 批量处理测试

## 扩展功能

### 可以扩展的功能
1. **数据验证规则**
   ```javascript
   const validationRules = {
       'trains': {
           'name': /^[GDK]\d{3}$/,
           'from_station': 'required',
           'to_station': 'required'
       }
   };
   ```

2. **增量导入**
   ```javascript
   await incrementalImport('trains', 'data/trains.csv', 'name');
   ```

3. **数据转换**
   ```javascript
   const transformers = {
       'price': (value) => parseFloat(value),
       'date': (value) => new Date(value)
   };
   ```

4. **备份和恢复**
   ```javascript
   await backupDatabase('./backup/');
   await restoreDatabase('./backup/');
   ```

## 最佳实践

### 1. 数据导入
- 使用专门的导入函数而不是通用函数
- 在导入前备份数据
- 验证CSV文件格式
- 使用字段映射处理格式差异

### 2. 数据导出
- 使用专门的导出函数获得最佳格式
- 定期导出重要数据
- 考虑数据隐私，不导出敏感字段

### 3. 性能考虑
- 大数据量时分批处理
- 合理使用WHERE条件和ORDER BY
- 监控磁盘空间

## 故障排除

### 常见问题
1. **文件路径错误** - 使用绝对路径或正确的相对路径
2. **权限问题** - 确保有读写权限
3. **数据格式错误** - 检查CSV文件编码和格式
4. **数据库连接失败** - 检查数据库配置和服务状态

### 调试技巧
- 查看详细日志输出
- 使用stats命令监控数据变化
- 分步骤测试复杂操作
- 使用测试脚本验证功能

---

这个数据库管理模块为火车票售票系统提供了完整的数据管理解决方案，支持灵活的CSV导入导出，便于数据维护和系统管理。 