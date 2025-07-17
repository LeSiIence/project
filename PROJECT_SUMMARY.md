# 项目重构总结

## 重构目标

将数据库初始化逻辑从 `back-end.js` 中剥离出来，并添加 CSV 导入功能，放到独立的 `manage_database.js` 模块中。

## 重构内容

### 1. 创建独立的数据库管理模块

**新文件：`manage_database.js`**
- 完整的数据库初始化逻辑
- 表结构创建功能
- 测试数据插入功能
- CSV 导入功能
- 数据库管理工具

### 2. 修改后端服务器

**修改：`back-end.js`**
- 移除所有数据库初始化函数
- 引入 `manage_database.js` 模块
- 保留 API 路由和业务逻辑
- 可选择性地初始化数据库

### 3. 添加 CSV 导入功能

**核心功能：**
- 单文件导入：`importFromCSV()`
- 批量导入：`importMultipleCSV()`
- 字段映射支持
- 错误处理和日志记录

### 4. 创建测试和示例文件

**新文件：**
- `sample-data/trains.csv` - 示例 CSV 文件
- `test-csv-import.js` - 测试脚本
- `DATABASE_MANAGEMENT.md` - 使用说明

## 项目结构

```
project/
├── back-end.js                     # 主服务器文件（简化后）
├── manage_database.js              # 数据库管理模块
├── mysql-test.html                 # Web 测试页面
├── test-csv-import.js              # CSV 导入测试
├── sample-data/
│   └── trains.csv                  # 示例 CSV 文件
├── package.json                    # 项目配置（添加 csv-parse 依赖）
├── DATABASE_MANAGEMENT.md          # 数据库管理说明
├── PROJECT_SUMMARY.md             # 项目总结
└── ...（其他文件）
```

## 新增依赖

```json
{
  "csv-parse": "^5.x.x"
}
```

## 使用方法

### 1. 命令行使用

```bash
# 初始化数据库
node manage_database.js init

# 重建数据库
node manage_database.js rebuild

# 显示表统计
node manage_database.js stats

# 清空所有表
node manage_database.js clear
```

### 2. 代码中使用

```javascript
const { 
    initDatabase, 
    insertTestData,
    importFromCSV
} = require('./manage_database');

// 初始化数据库
await initDatabase();
await insertTestData();

// 导入 CSV 文件
await importFromCSV('trains', 'data/trains.csv');
```

### 3. 启动服务器

```bash
# 带数据库初始化启动（默认）
node back-end.js

# 或使用启动脚本
node start-service.bat
```

## CSV 导入功能详解

### 基本导入
```javascript
await importFromCSV('trains', 'data/trains.csv');
```

### 字段映射导入
```javascript
const columnMapping = {
    'train_name': 'name',
    'start_station': 'from_station',
    'end_station': 'to_station'
};

await importFromCSV('trains', 'data/trains.csv', columnMapping);
```

### 批量导入
```javascript
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

const results = await importMultipleCSV(importConfig);
```

## 测试验证

### 1. 数据库管理功能测试

```bash
# 测试统计功能
node manage_database.js stats

# 输出：
┌──────────────────┬────────┐
│ (index)          │ Values │
├──────────────────┼────────┤
│ trains           │ 4      │
│ train_schedules  │ 56     │
│ stations         │ 9      │
│ train_stations   │ 14     │
│ carriages        │ 13     │
│ seats            │ 968    │
│ seat_allocations │ 0      │
│ prices           │ 65     │
│ orders           │ 0      │
│ users            │ 0      │
└──────────────────┴────────┘
```

### 2. CSV 导入功能测试

```bash
# 测试 CSV 导入
node test-csv-import.js csv

# 成功导入 6 条记录
# 显示导入前后的表统计对比
```

### 3. 服务器启动测试

```bash
# 服务器正常启动
node back-end.js

# 输出：
# 数据库创建成功
# 数据表创建完成
# 测试数据已存在，跳过插入
# 数据库初始化完成
# 火车票售票系统后端已启动，端口：3000
```

## 重构优势

### 1. 模块化设计
- 数据库管理逻辑独立
- 代码结构更清晰
- 易于维护和扩展

### 2. 功能增强
- 支持 CSV 数据导入
- 批量数据处理
- 灵活的字段映射

### 3. 开发效率
- 独立的数据库管理工具
- 丰富的测试脚本
- 详细的使用文档

### 4. 部署灵活性
- 可选择性数据库初始化
- 支持多种启动方式
- 便于自动化部署

## 兼容性

- 保持原有 API 接口不变
- 原有功能完全兼容
- 现有测试页面正常工作

## 扩展可能性

### 1. 数据导出功能
```javascript
// 未来可添加
await exportToCSV('trains', 'output/trains.csv');
```

### 2. 数据验证规则
```javascript
// 数据导入时的验证
const validationRules = {
    'trains': {
        'name': /^[GDK]\d{3}$/,
        'from_station': 'required',
        'to_station': 'required'
    }
};
```

### 3. 增量导入
```javascript
// 只导入新增或修改的数据
await incrementalImport('trains', 'data/trains.csv');
```

### 4. 数据备份和恢复
```javascript
// 数据备份
await backupDatabase('backup/db_backup.sql');

// 数据恢复
await restoreDatabase('backup/db_backup.sql');
```

## 总结

通过这次重构，我们成功地：

1. **分离关注点**：将数据库管理逻辑从业务逻辑中分离
2. **增强功能**：添加了强大的 CSV 导入能力
3. **提高可维护性**：模块化设计使代码更易维护
4. **保持兼容性**：不影响现有功能的正常运行
5. **完善文档**：提供详细的使用说明和示例

这次重构为项目的后续开发和维护奠定了良好的基础，使得数据管理更加灵活和高效。 