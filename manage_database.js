const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1103',
    database: 'train_ticket_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 数据库初始化函数
async function initDatabase() {
    try {
        // 创建数据库（如果不存在）
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();
        
        console.log('数据库创建成功');
        
        // 创建表格
        await createTables();
        
        console.log('数据库初始化完成');
        return true;
    } catch (error) {
        console.error('数据库初始化失败:', error);
        throw error;
    }
}

// 创建表格
async function createTables() {
    const connection = await pool.getConnection();
    try {
        // 创建基础火车表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS trains (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(10) NOT NULL,
                from_station VARCHAR(50) NOT NULL,
                to_station VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // 创建车次时刻表（每日具体车次）
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS train_schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                departure_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE,
                UNIQUE KEY unique_train_date (train_id, departure_date)
            )
        `);
        
        // 创建车站表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS stations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                city VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 创建车次经停站时刻表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS train_stations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                station_name VARCHAR(50) NOT NULL,
                station_order INT NOT NULL,
                arrival_time TIME,
                departure_time TIME NOT NULL,
                distance_km INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE,
                UNIQUE KEY unique_train_station (train_id, station_name)
            )
        `);
        
        // 创建车厢表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS carriages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                carriage_number VARCHAR(5) NOT NULL,
                seat_type VARCHAR(20) NOT NULL,
                total_seats INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE,
                UNIQUE KEY unique_train_carriage (train_id, carriage_number)
            )
        `);
        
        // 创建座位表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS seats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                carriage_id INT NOT NULL,
                seat_number VARCHAR(5) NOT NULL,
                seat_type VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (carriage_id) REFERENCES carriages(id) ON DELETE CASCADE,
                UNIQUE KEY unique_carriage_seat (carriage_id, seat_number)
            )
        `);
        
        // 创建座位分配表（跟踪每个座位的区间占用）
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS seat_allocations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                schedule_id INT NOT NULL,
                seat_id INT NOT NULL,
                from_station VARCHAR(50) NOT NULL,
                to_station VARCHAR(50) NOT NULL,
                passenger_name VARCHAR(100) NOT NULL,
                passenger_id VARCHAR(20) NOT NULL,
                order_id INT,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (schedule_id) REFERENCES train_schedules(id) ON DELETE CASCADE,
                FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
                INDEX idx_schedule_seat (schedule_id, seat_id),
                INDEX idx_passenger (passenger_name, passenger_id),
                INDEX idx_deleted (is_deleted, deleted_at)
            )
        `);
        
        // 创建价格表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS prices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                from_station VARCHAR(50) NOT NULL,
                to_station VARCHAR(50) NOT NULL,
                seat_type VARCHAR(20) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE,
                UNIQUE KEY unique_route_price (train_id, from_station, to_station, seat_type)
            )
        `);
        
        // 创建订单表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                schedule_id INT NOT NULL,
                from_station VARCHAR(50) NOT NULL,
                to_station VARCHAR(50) NOT NULL,
                seat_type VARCHAR(20) NOT NULL,
                passenger_name VARCHAR(100) NOT NULL,
                passenger_id VARCHAR(20) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (schedule_id) REFERENCES train_schedules(id) ON DELETE CASCADE,
                INDEX idx_passenger (passenger_name, passenger_id),
                INDEX idx_schedule (schedule_id),
                INDEX idx_deleted (is_deleted, deleted_at)
            )
        `);
        
        // 创建用户表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                id_number VARCHAR(20) NOT NULL UNIQUE,
                phone VARCHAR(20),
                email VARCHAR(100),
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_deleted (is_deleted, deleted_at)
            )
        `);
        
        console.log('数据表创建完成');
    } finally {
        connection.release();
    }
}

// 清空所有数据表
async function clearAllTables() {
    const connection = await pool.getConnection();
    try {
        console.log('开始清空所有数据表...');
        
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        const tables = [
            'seat_allocations',
            'orders',
            'prices',
            'seats',
            'carriages',
            'train_schedules',
            'train_stations',
            'trains',
            'stations',
            'users'
        ];
        
        for (const table of tables) {
            await connection.execute(`TRUNCATE TABLE ${table}`);
            console.log(`已清空表: ${table}`);
        }
        
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('所有数据表清空完成');
    } finally {
        connection.release();
    }
}

// 插入测试数据
async function insertTestData() {
    const connection = await pool.getConnection();
    try {
        // 检查所有关键表是否都有数据
        const [trainCountRows] = await connection.execute('SELECT COUNT(*) as count FROM trains');
        const [scheduleCountRows] = await connection.execute('SELECT COUNT(*) as count FROM train_schedules');
        const [carriageCountRows] = await connection.execute('SELECT COUNT(*) as count FROM carriages');
        
        const hasTrains = trainCountRows[0].count > 0;
        const hasSchedules = scheduleCountRows[0].count > 0;
        const hasCarriages = carriageCountRows[0].count > 0;
        
        if (hasTrains && hasSchedules && hasCarriages) {
            console.log('测试数据已存在，跳过插入');
            return;
        }
        
        // 如果数据不完整，清空所有表重新插入
        if (hasTrains || hasSchedules || hasCarriages) {
            console.log('数据不完整，清空所有表重新插入...');
            await clearAllTables();
        }
        
        // 1. 插入车站数据
        console.log('插入车站数据...');
        const stationsData = [
            ['北京', '北京'],
            ['天津', '天津'],
            ['济南', '山东'],
            ['南京', '江苏'],
            ['上海', '上海'],
            ['广州', '广东'],
            ['深圳', '广东'],
            ['西安', '陕西'],
            ['成都', '四川']
        ];
        
        for (const [name, city] of stationsData) {
            await connection.execute(
                'INSERT IGNORE INTO stations (name, city) VALUES (?, ?)',
                [name, city]
            );
        }
        
        // 2. 插入基础火车数据
        console.log('插入火车数据...');
        await connection.execute(`
            INSERT INTO trains (name, from_station, to_station) VALUES
            ('G101', '北京', '上海'),
            ('G102', '上海', '北京'),
            ('D201', '广州', '深圳'),
            ('K301', '西安', '成都')
        `);
        
        // 3. 插入车次经停站时刻表
        console.log('插入车次时刻表...');
        const trainStationsData = [
            // G101: 北京 → 上海
            [1, '北京', 1, null, '08:00:00', 0],
            [1, '天津', 2, '08:35:00', '08:37:00', 137],
            [1, '济南', 3, '10:22:00', '10:24:00', 497],
            [1, '南京', 4, '12:58:00', '13:02:00', 1023],
            [1, '上海', 5, '14:28:00', null, 1318],
            
            // G102: 上海 → 北京
            [2, '上海', 1, null, '09:00:00', 0],
            [2, '南京', 2, '10:32:00', '10:36:00', 295],
            [2, '济南', 3, '13:18:00', '13:20:00', 821],
            [2, '天津', 4, '15:12:00', '15:14:00', 1181],
            [2, '北京', 5, '15:48:00', null, 1318],
            
            // D201: 广州 → 深圳
            [3, '广州', 1, null, '07:00:00', 0],
            [3, '深圳', 2, '08:30:00', null, 140],
            
            // K301: 西安 → 成都
            [4, '西安', 1, null, '18:00:00', 0],
            [4, '成都', 2, '08:30:00', null, 842]
        ];
        
        for (const [trainId, station, order, arrival, departure, distance] of trainStationsData) {
            await connection.execute(
                'INSERT INTO train_stations (train_id, station_name, station_order, arrival_time, departure_time, distance_km) VALUES (?, ?, ?, ?, ?, ?)',
                [trainId, station, order, arrival, departure, distance]
            );
        }
        
        // 4. 插入车厢数据
        console.log('插入车厢数据...');
        const carriagesData = [
            // G101
            [1, '01', '二等座', 100],
            [1, '02', '二等座', 100],
            [1, '03', '一等座', 60],
            [1, '04', '商务座', 24],
            
            // G102
            [2, '01', '二等座', 100],
            [2, '02', '二等座', 100],
            [2, '03', '一等座', 60],
            [2, '04', '商务座', 24],
            
            // D201
            [3, '01', '二等座', 118],
            [3, '02', '一等座', 68],
            
            // K301
            [4, '01', '硬座', 118],
            [4, '02', '硬卧', 60],
            [4, '03', '软卧', 36]
        ];
        
        for (const [trainId, carriageNum, seatType, totalSeats] of carriagesData) {
            await connection.execute(
                'INSERT INTO carriages (train_id, carriage_number, seat_type, total_seats) VALUES (?, ?, ?, ?)',
                [trainId, carriageNum, seatType, totalSeats]
            );
        }
        
        // 5. 插入座位数据
        console.log('插入座位数据...');
        const [carriageRows] = await connection.execute('SELECT id, carriage_number, seat_type, total_seats FROM carriages');
        
        for (const carriage of carriageRows) {
            const seatNumbers = generateSeatNumbers(carriage.seat_type, carriage.total_seats);
            
            for (const seatNumber of seatNumbers) {
                await connection.execute(
                    'INSERT INTO seats (carriage_id, seat_number, seat_type) VALUES (?, ?, ?)',
                    [carriage.id, seatNumber, carriage.seat_type]
                );
            }
        }
        
        // 6. 插入价格数据
        console.log('插入价格数据...');
        const pricesData = [
            // G101 价格
            [1, '北京', '天津', '二等座', 54.50],
            [1, '北京', '天津', '一等座', 87.00],
            [1, '北京', '天津', '商务座', 163.50],
            [1, '北京', '济南', '二等座', 184.50],
            [1, '北京', '济南', '一等座', 295.00],
            [1, '北京', '济南', '商务座', 553.50],
            [1, '北京', '南京', '二等座', 443.50],
            [1, '北京', '南京', '一等座', 709.50],
            [1, '北京', '南京', '商务座', 1331.50],
            [1, '北京', '上海', '二等座', 553.00],
            [1, '北京', '上海', '一等座', 884.50],
            [1, '北京', '上海', '商务座', 1657.50],
            [1, '天津', '济南', '二等座', 130.00],
            [1, '天津', '济南', '一等座', 208.00],
            [1, '天津', '济南', '商务座', 390.00],
            [1, '天津', '南京', '二等座', 389.00],
            [1, '天津', '南京', '一等座', 622.50],
            [1, '天津', '南京', '商务座', 1168.00],
            [1, '天津', '上海', '二等座', 498.50],
            [1, '天津', '上海', '一等座', 797.50],
            [1, '天津', '上海', '商务座', 1494.00],
            [1, '济南', '南京', '二等座', 259.00],
            [1, '济南', '南京', '一等座', 414.50],
            [1, '济南', '南京', '商务座', 778.00],
            [1, '济南', '上海', '二等座', 368.50],
            [1, '济南', '上海', '一等座', 589.50],
            [1, '济南', '上海', '商务座', 1104.00],
            [1, '南京', '上海', '二等座', 109.50],
            [1, '南京', '上海', '一等座', 175.00],
            [1, '南京', '上海', '商务座', 326.00],
            
            // G102 价格（反向）
            [2, '上海', '南京', '二等座', 109.50],
            [2, '上海', '南京', '一等座', 175.00],
            [2, '上海', '南京', '商务座', 326.00],
            [2, '上海', '济南', '二等座', 368.50],
            [2, '上海', '济南', '一等座', 589.50],
            [2, '上海', '济南', '商务座', 1104.00],
            [2, '上海', '天津', '二等座', 498.50],
            [2, '上海', '天津', '一等座', 797.50],
            [2, '上海', '天津', '商务座', 1494.00],
            [2, '上海', '北京', '二等座', 553.00],
            [2, '上海', '北京', '一等座', 884.50],
            [2, '上海', '北京', '商务座', 1657.50],
            [2, '南京', '济南', '二等座', 259.00],
            [2, '南京', '济南', '一等座', 414.50],
            [2, '南京', '济南', '商务座', 778.00],
            [2, '南京', '天津', '二等座', 389.00],
            [2, '南京', '天津', '一等座', 622.50],
            [2, '南京', '天津', '商务座', 1168.00],
            [2, '南京', '北京', '二等座', 443.50],
            [2, '南京', '北京', '一等座', 709.50],
            [2, '南京', '北京', '商务座', 1331.50],
            [2, '济南', '天津', '二等座', 130.00],
            [2, '济南', '天津', '一等座', 208.00],
            [2, '济南', '天津', '商务座', 390.00],
            [2, '济南', '北京', '二等座', 184.50],
            [2, '济南', '北京', '一等座', 295.00],
            [2, '济南', '北京', '商务座', 553.50],
            [2, '天津', '北京', '二等座', 54.50],
            [2, '天津', '北京', '一等座', 87.00],
            [2, '天津', '北京', '商务座', 163.50],
            
            // D201 价格
            [3, '广州', '深圳', '二等座', 79.50],
            [3, '广州', '深圳', '一等座', 127.00],
            
            // K301 价格
            [4, '西安', '成都', '硬座', 155.50],
            [4, '西安', '成都', '硬卧', 269.50],
            [4, '西安', '成都', '软卧', 416.50]
        ];
        
        for (const [trainId, fromStation, toStation, seatType, price] of pricesData) {
            await connection.execute(
                'INSERT INTO prices (train_id, from_station, to_station, seat_type, price) VALUES (?, ?, ?, ?, ?)',
                [trainId, fromStation, toStation, seatType, price]
            );
        }
        
        // 7. 生成未来14天的车次安排
        console.log('生成未来14天的车次安排...');
        const today = new Date('2025-07-17');
        const [trainRows] = await connection.execute('SELECT id FROM trains');
        
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            for (const train of trainRows) {
                await connection.execute(
                    'INSERT INTO train_schedules (train_id, departure_date) VALUES (?, ?)',
                    [train.id, dateStr]
                );
            }
        }
        
        console.log('测试数据插入完成');
    } finally {
        connection.release();
    }
}

// 生成座位号的辅助函数
function generateSeatNumbers(seatType, totalSeats) {
    const seatNumbers = [];
    
    if (seatType === '二等座') {
        // 二等座：5个一排，A-F（C除外）
        const letters = ['A', 'B', 'C', 'D', 'F'];
        let currentRow = 1;
        let currentSeat = 0;
        
        for (let i = 0; i < totalSeats; i++) {
            seatNumbers.push(`${currentRow}${letters[currentSeat]}`);
            currentSeat++;
            if (currentSeat >= letters.length) {
                currentSeat = 0;
                currentRow++;
            }
        }
    } else if (seatType === '一等座') {
        // 一等座：4个一排，A-D
        const letters = ['A', 'C', 'D', 'F'];
        let currentRow = 1;
        let currentSeat = 0;
        
        for (let i = 0; i < totalSeats; i++) {
            seatNumbers.push(`${currentRow}${letters[currentSeat]}`);
            currentSeat++;
            if (currentSeat >= letters.length) {
                currentSeat = 0;
                currentRow++;
            }
        }
    } else if (seatType === '商务座') {
        // 商务座：2个一排，A-C
        const letters = ['A', 'C'];
        let currentRow = 1;
        let currentSeat = 0;
        
        for (let i = 0; i < totalSeats; i++) {
            seatNumbers.push(`${currentRow}${letters[currentSeat]}`);
            currentSeat++;
            if (currentSeat >= letters.length) {
                currentSeat = 0;
                currentRow++;
            }
        }
    } else if (seatType === '硬座') {
        // 硬座：简单数字编号
        for (let i = 1; i <= totalSeats; i++) {
            seatNumbers.push(i.toString());
        }
    } else if (seatType === '硬卧') {
        // 硬卧：上中下铺
        const positions = ['上', '中', '下'];
        let currentCompartment = 1;
        let currentPosition = 0;
        
        for (let i = 0; i < totalSeats; i++) {
            seatNumbers.push(`${currentCompartment}${positions[currentPosition]}`);
            currentPosition++;
            if (currentPosition >= positions.length) {
                currentPosition = 0;
                currentCompartment++;
            }
        }
    } else if (seatType === '软卧') {
        // 软卧：上下铺
        const positions = ['上', '下'];
        let currentCompartment = 1;
        let currentPosition = 0;
        
        for (let i = 0; i < totalSeats; i++) {
            seatNumbers.push(`${currentCompartment}${positions[currentPosition]}`);
            currentPosition++;
            if (currentPosition >= positions.length) {
                currentPosition = 0;
                currentCompartment++;
            }
        }
    }
    
    return seatNumbers;
}

// CSV文件导入功能
async function importFromCSV(tableName, csvFilePath, columnMapping = null) {
    const connection = await pool.getConnection();
    
    try {
        // 检查文件是否存在
        if (!fs.existsSync(csvFilePath)) {
            throw new Error(`CSV文件不存在: ${csvFilePath}`);
        }
        
        console.log(`开始导入CSV文件: ${csvFilePath} 到表: ${tableName}`);
        
        // 读取CSV文件
        const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        
        if (records.length === 0) {
            console.log('CSV文件为空，跳过导入');
            return 0;
        }
        
        // 获取表的字段信息
        const [tableColumns] = await connection.execute(`DESCRIBE ${tableName}`);
        const validColumns = tableColumns.map(col => col.Field);
        
        console.log(`表 ${tableName} 的字段:`, validColumns);
        console.log(`CSV文件的字段:`, Object.keys(records[0]));
        
        // 构建INSERT语句
        const csvColumns = Object.keys(records[0]);
        const finalColumns = columnMapping ? 
            csvColumns.filter(col => columnMapping[col] && validColumns.includes(columnMapping[col])) :
            csvColumns.filter(col => validColumns.includes(col));
        
        if (finalColumns.length === 0) {
            throw new Error('CSV文件中没有找到匹配的字段');
        }
        
        const insertColumns = finalColumns.map(col => columnMapping ? columnMapping[col] : col);
        const placeholders = finalColumns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`;
        
        console.log(`准备执行SQL: ${insertSQL}`);
        
        // 批量插入数据
        let successCount = 0;
        let errorCount = 0;
        
        await connection.beginTransaction();
        
        for (const record of records) {
            try {
                const values = finalColumns.map(col => record[col]);
                await connection.execute(insertSQL, values);
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`导入记录失败:`, record, error.message);
            }
        }
        
        await connection.commit();
        
        console.log(`CSV导入完成: 成功 ${successCount} 条，失败 ${errorCount} 条`);
        return successCount;
        
    } catch (error) {
        await connection.rollback();
        console.error('CSV导入失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 批量导入多个CSV文件
async function importMultipleCSV(importConfig) {
    const results = [];
    
    for (const config of importConfig) {
        try {
            const count = await importFromCSV(config.tableName, config.csvFilePath, config.columnMapping);
            results.push({
                tableName: config.tableName,
                csvFilePath: config.csvFilePath,
                success: true,
                importedCount: count
            });
        } catch (error) {
            results.push({
                tableName: config.tableName,
                csvFilePath: config.csvFilePath,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// CSV文件导出功能
async function exportToCSV(tableName, csvFilePath, options = {}) {
    const connection = await pool.getConnection();
    
    try {
        console.log(`开始导出表 ${tableName} 到CSV文件: ${csvFilePath}`);
        
        // 构建查询条件
        let query = `SELECT * FROM ${tableName}`;
        const params = [];
        
        // 添加过滤条件
        if (options.where) {
            query += ` WHERE ${options.where}`;
            if (options.whereParams) {
                params.push(...options.whereParams);
            }
        }
        
        // 添加排序
        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy}`;
        }
        
        // 添加限制
        if (options.limit) {
            query += ` LIMIT ${options.limit}`;
        }
        
        console.log(`执行查询: ${query}`);
        
        // 执行查询
        const [rows] = await connection.execute(query, params);
        
        if (rows.length === 0) {
            console.log(`表 ${tableName} 没有数据，创建空CSV文件`);
            // 获取表结构创建空CSV
            const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
            const headers = columns.map(col => col.Field);
            const csvContent = stringify([headers]);
            
            // 确保目录存在
            const dir = path.dirname(csvFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(csvFilePath, csvContent);
            console.log(`已创建空CSV文件: ${csvFilePath}`);
            return 0;
        }
        
        // 处理数据格式
        const processedRows = rows.map(row => {
            const processedRow = {};
            Object.keys(row).forEach(key => {
                let value = row[key];
                
                // 处理不同数据类型
                if (value === null || value === undefined) {
                    value = '';
                } else if (value instanceof Date) {
                    // 处理日期格式
                    if (key.includes('_date')) {
                        value = value.toISOString().split('T')[0]; // YYYY-MM-DD
                    } else if (key.includes('_time')) {
                        value = value.toTimeString().split(' ')[0]; // HH:MM:SS
                    } else {
                        value = value.toISOString();
                    }
                } else if (typeof value === 'boolean') {
                    value = value ? '1' : '0';
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                
                processedRow[key] = value;
            });
            return processedRow;
        });
        
        // 生成CSV内容
        const csvContent = stringify(processedRows, {
            header: true,
            columns: Object.keys(processedRows[0])
        });
        
        // 确保目录存在
        const dir = path.dirname(csvFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 写入文件
        fs.writeFileSync(csvFilePath, csvContent);
        
        console.log(`CSV导出完成: 导出 ${rows.length} 条记录到 ${csvFilePath}`);
        return rows.length;
        
    } catch (error) {
        console.error('CSV导出失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 批量导出多个表
async function exportMultipleCSV(exportConfig) {
    const results = [];
    
    for (const config of exportConfig) {
        try {
            const count = await exportToCSV(config.tableName, config.csvFilePath, config.options || {});
            results.push({
                tableName: config.tableName,
                csvFilePath: config.csvFilePath,
                success: true,
                exportedCount: count
            });
        } catch (error) {
            results.push({
                tableName: config.tableName,
                csvFilePath: config.csvFilePath,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// 导出所有表
async function exportAllTables(outputDir = './exports', options = {}) {
    const tables = [
        'trains', 'train_schedules', 'stations', 'train_stations',
        'carriages', 'seats', 'seat_allocations', 'prices',
        'orders', 'users'
    ];
    
    const exportConfig = tables.map(table => ({
        tableName: table,
        csvFilePath: path.join(outputDir, `${table}.csv`),
        options: options[table] || {}
    }));
    
    console.log(`开始导出所有表到目录: ${outputDir}`);
    const results = await exportMultipleCSV(exportConfig);
    
    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\n导出完成: 成功 ${successCount} 个表，失败 ${failCount} 个表`);
    
    results.forEach(result => {
        if (result.success) {
            console.log(`✓ ${result.tableName}: ${result.exportedCount} 条记录`);
        } else {
            console.log(`✗ ${result.tableName}: ${result.error}`);
        }
    });
    
    return results;
}

// 专门的表导入导出函数

// 火车表导入导出
async function importTrains(csvFilePath) {
    const columnMapping = {
        'train_name': 'name',
        'start_station': 'from_station',
        'end_station': 'to_station'
    };
    return await importFromCSV('trains', csvFilePath, columnMapping);
}

async function exportTrains(csvFilePath) {
    // 只导出业务字段，排除id和timestamp字段
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute('SELECT name, from_station, to_station FROM trains ORDER BY name');
        
        if (rows.length === 0) {
            console.log('trains表没有数据，创建空CSV文件');
            const csvContent = 'name,from_station,to_station\n';
            fs.writeFileSync(csvFilePath, csvContent);
            return 0;
        }
        
        const { stringify } = require('csv-stringify/sync');
        const csvContent = stringify(rows, {
            header: true,
            columns: ['name', 'from_station', 'to_station']
        });
        
        // 确保目录存在
        const dir = path.dirname(csvFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(csvFilePath, csvContent);
        console.log(`CSV导出完成: 导出 ${rows.length} 条记录到 ${csvFilePath}`);
        return rows.length;
        
    } finally {
        connection.release();
    }
}

// 车站表导入导出
async function importStations(csvFilePath) {
    // 只在需要时使用字段映射
    const columnMapping = {
        'station_name': 'name',
        'city_name': 'city'
    };
    
    // 先尝试不使用映射
    try {
        return await importFromCSV('stations', csvFilePath, null);
    } catch (error) {
        // 如果失败，尝试使用字段映射
        console.log('使用字段映射重试...');
        return await importFromCSV('stations', csvFilePath, columnMapping);
    }
}

async function exportStations(csvFilePath) {
    // 只导出业务字段，排除id和created_at
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute('SELECT name, city FROM stations ORDER BY name');
        
        if (rows.length === 0) {
            console.log('stations表没有数据，创建空CSV文件');
            const csvContent = 'name,city\n';
            fs.writeFileSync(csvFilePath, csvContent);
            return 0;
        }
        
        const { stringify } = require('csv-stringify/sync');
        const csvContent = stringify(rows, {
            header: true,
            columns: ['name', 'city']
        });
        
        // 确保目录存在
        const dir = path.dirname(csvFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(csvFilePath, csvContent);
        console.log(`CSV导出完成: 导出 ${rows.length} 条记录到 ${csvFilePath}`);
        return rows.length;
        
    } finally {
        connection.release();
    }
}

// 价格表导入导出
async function importPrices(csvFilePath) {
    return await importFromCSV('prices', csvFilePath);
}

async function exportPrices(csvFilePath) {
    return await exportToCSV('prices', csvFilePath, {
        orderBy: 'train_id, from_station, to_station, seat_type'
    });
}

// 订单表导入导出
async function importOrders(csvFilePath) {
    return await importFromCSV('orders', csvFilePath);
}

async function exportOrders(csvFilePath, includeDeleted = false) {
    const options = {
        orderBy: 'created_at DESC'
    };
    
    if (!includeDeleted) {
        options.where = 'is_deleted = FALSE';
    }
    
    return await exportToCSV('orders', csvFilePath, options);
}

// 用户表导入导出
async function importUsers(csvFilePath) {
    return await importFromCSV('users', csvFilePath);
}

async function exportUsers(csvFilePath, includeDeleted = false) {
    const options = {
        orderBy: 'created_at DESC'
    };
    
    if (!includeDeleted) {
        options.where = 'is_deleted = FALSE';
    }
    
    return await exportToCSV('users', csvFilePath, options);
}

// 座位分配表导入导出
async function importSeatAllocations(csvFilePath) {
    return await importFromCSV('seat_allocations', csvFilePath);
}

async function exportSeatAllocations(csvFilePath, includeDeleted = false) {
    const options = {
        orderBy: 'created_at DESC'
    };
    
    if (!includeDeleted) {
        options.where = 'is_deleted = FALSE';
    }
    
    return await exportToCSV('seat_allocations', csvFilePath, options);
}

// 车次时刻表导入导出
async function importTrainSchedules(csvFilePath) {
    return await importFromCSV('train_schedules', csvFilePath);
}

async function exportTrainSchedules(csvFilePath, dateRange = null) {
    const options = {
        orderBy: 'departure_date, train_id'
    };
    
    if (dateRange) {
        options.where = 'departure_date BETWEEN ? AND ?';
        options.whereParams = [dateRange.start, dateRange.end];
    }
    
    return await exportToCSV('train_schedules', csvFilePath, options);
}

// 经停站表导入导出
async function importTrainStations(csvFilePath) {
    return await importFromCSV('train_stations', csvFilePath);
}

async function exportTrainStations(csvFilePath) {
    return await exportToCSV('train_stations', csvFilePath, {
        orderBy: 'train_id, station_order'
    });
}

// 车厢表导入导出
async function importCarriages(csvFilePath) {
    return await importFromCSV('carriages', csvFilePath);
}

async function exportCarriages(csvFilePath) {
    return await exportToCSV('carriages', csvFilePath, {
        orderBy: 'train_id, carriage_number'
    });
}

// 座位表导入导出
async function importSeats(csvFilePath) {
    return await importFromCSV('seats', csvFilePath);
}

async function exportSeats(csvFilePath) {
    return await exportToCSV('seats', csvFilePath, {
        orderBy: 'carriage_id, seat_number'
    });
}

// 智能导入导出（基于文件名自动识别表）
async function smartImport(csvFilePath) {
    const fileName = path.basename(csvFilePath, '.csv');
    
    // 定义表名模式匹配
    const tablePatterns = {
        'trains': /^trains/i,
        'stations': /^stations/i,
        'prices': /^prices/i,
        'orders': /^orders/i,
        'users': /^users/i,
        'seat_allocations': /^seat_allocations/i,
        'train_schedules': /^train_schedules/i,
        'train_stations': /^train_stations/i,
        'carriages': /^carriages/i,
        'seats': /^seats/i
    };
    
    const importFunctions = {
        'trains': importTrains,
        'stations': importStations,
        'prices': importPrices,
        'orders': importOrders,
        'users': importUsers,
        'seat_allocations': importSeatAllocations,
        'train_schedules': importTrainSchedules,
        'train_stations': importTrainStations,
        'carriages': importCarriages,
        'seats': importSeats
    };
    
    // 尝试匹配表名
    let matchedTable = null;
    for (const [tableName, pattern] of Object.entries(tablePatterns)) {
        if (pattern.test(fileName)) {
            matchedTable = tableName;
            break;
        }
    }
    
    if (matchedTable && importFunctions[matchedTable]) {
        console.log(`智能导入: 识别为 ${matchedTable} 表`);
        return await importFunctions[matchedTable](csvFilePath);
    } else {
        // 回退到通用导入
        console.log(`智能导入: 使用通用导入方式，表名: ${fileName}`);
        return await importFromCSV(fileName, csvFilePath);
    }
}

async function smartExport(tableName, csvFilePath) {
    const exportFunctions = {
        'trains': exportTrains,
        'stations': exportStations,
        'prices': exportPrices,
        'orders': exportOrders,
        'users': exportUsers,
        'seat_allocations': exportSeatAllocations,
        'train_schedules': exportTrainSchedules,
        'train_stations': exportTrainStations,
        'carriages': exportCarriages,
        'seats': exportSeats
    };
    
    if (exportFunctions[tableName]) {
        console.log(`智能导出: 使用专门的 ${tableName} 导出函数`);
        return await exportFunctions[tableName](csvFilePath);
    } else {
        // 回退到通用导出
        console.log(`智能导出: 使用通用导出方式`);
        return await exportToCSV(tableName, csvFilePath);
    }
}

// 数据库重建（清空+重新初始化）
async function rebuildDatabase() {
    try {
        console.log('开始重建数据库...');
        
        // 清空所有表
        await clearAllTables();
        
        // 重新插入测试数据
        await insertTestData();
        
        console.log('数据库重建完成');
        return true;
    } catch (error) {
        console.error('数据库重建失败:', error);
        throw error;
    }
}

// 获取表的统计信息
async function getTableStats() {
    const connection = await pool.getConnection();
    try {
        const tables = [
            'trains', 'train_schedules', 'stations', 'train_stations',
            'carriages', 'seats', 'seat_allocations', 'prices',
            'orders', 'users'
        ];
        
        const stats = {};
        
        for (const table of tables) {
            const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
            stats[table] = rows[0].count;
        }
        
        return stats;
    } finally {
        connection.release();
    }
}

// 导出主要函数
module.exports = {
    // 数据库连接
    pool,
    
    // 数据库初始化
    initDatabase,
    createTables,
    insertTestData,
    clearAllTables,
    rebuildDatabase,
    
    // 通用CSV导入导出功能
    importFromCSV,
    importMultipleCSV,
    exportToCSV,
    exportMultipleCSV,
    exportAllTables,
    
    // 专门的表导入导出函数
    importTrains,
    exportTrains,
    importStations,
    exportStations,
    importPrices,
    exportPrices,
    importOrders,
    exportOrders,
    importUsers,
    exportUsers,
    importSeatAllocations,
    exportSeatAllocations,
    importTrainSchedules,
    exportTrainSchedules,
    importTrainStations,
    exportTrainStations,
    importCarriages,
    exportCarriages,
    importSeats,
    exportSeats,
    
    // 智能导入导出
    smartImport,
    smartExport,
    
    // 工具函数
    generateSeatNumbers,
    getTableStats
};

// 如果直接运行此文件，则执行数据库初始化
if (require.main === module) {
    console.log('数据库管理工具');
    console.log('==================');
    console.log('可用命令:');
    console.log('');
    console.log('数据库管理:');
    console.log('  node manage_database.js init                    - 初始化数据库');
    console.log('  node manage_database.js rebuild                 - 重建数据库');
    console.log('  node manage_database.js clear                   - 清空所有表');
    console.log('  node manage_database.js stats                   - 显示表统计');
    console.log('');
    console.log('CSV导入:');
    console.log('  node manage_database.js import <table> <file>   - 导入单个表');
    console.log('  node manage_database.js import-all <dir>        - 从目录导入所有表');
    console.log('  node manage_database.js smart-import <file>     - 智能导入（自动识别表）');
    console.log('');
    console.log('CSV导出:');
    console.log('  node manage_database.js export <table> <file>   - 导出单个表');
    console.log('  node manage_database.js export-all <dir>        - 导出所有表到目录');
    console.log('  node manage_database.js smart-export <table> <file> - 智能导出');
    console.log('');
    console.log('示例:');
    console.log('  node manage_database.js import trains ./data/trains.csv');
    console.log('  node manage_database.js export orders ./exports/orders.csv');
    console.log('  node manage_database.js export-all ./exports/');
    console.log('  node manage_database.js smart-import ./data/trains.csv');
    
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    (async () => {
        try {
            switch (command) {
                case 'init':
                    await initDatabase();
                    await insertTestData();
                    break;
                    
                case 'rebuild':
                    await rebuildDatabase();
                    break;
                    
                case 'clear':
                    await clearAllTables();
                    break;
                    
                case 'stats':
                    const stats = await getTableStats();
                    console.log('\n数据库表统计:');
                    console.table(stats);
                    break;
                    
                case 'import':
                    if (!arg1 || !arg2) {
                        console.log('用法: node manage_database.js import <table> <file>');
                        break;
                    }
                    const importCount = await importFromCSV(arg1, arg2);
                    console.log(`导入完成: ${importCount} 条记录`);
                    break;
                    
                case 'export':
                    if (!arg1 || !arg2) {
                        console.log('用法: node manage_database.js export <table> <file>');
                        break;
                    }
                    const exportCount = await exportToCSV(arg1, arg2);
                    console.log(`导出完成: ${exportCount} 条记录`);
                    break;
                    
                case 'export-all':
                    const exportDir = arg1 || './exports';
                    await exportAllTables(exportDir);
                    break;
                    
                case 'import-all':
                    const importDir = arg1 || './data';
                    if (!fs.existsSync(importDir)) {
                        console.log(`目录不存在: ${importDir}`);
                        break;
                    }
                    
                    const csvFiles = fs.readdirSync(importDir).filter(file => file.endsWith('.csv'));
                    const importConfig = csvFiles.map(file => ({
                        tableName: path.basename(file, '.csv'),
                        csvFilePath: path.join(importDir, file)
                    }));
                    
                    const importResults = await importMultipleCSV(importConfig);
                    console.log('\n批量导入结果:');
                    importResults.forEach(result => {
                        if (result.success) {
                            console.log(`✓ ${result.tableName}: ${result.importedCount} 条记录`);
                        } else {
                            console.log(`✗ ${result.tableName}: ${result.error}`);
                        }
                    });
                    break;
                    
                case 'smart-import':
                    if (!arg1) {
                        console.log('用法: node manage_database.js smart-import <file>');
                        break;
                    }
                    const smartImportCount = await smartImport(arg1);
                    console.log(`智能导入完成: ${smartImportCount} 条记录`);
                    break;
                    
                case 'smart-export':
                    if (!arg1 || !arg2) {
                        console.log('用法: node manage_database.js smart-export <table> <file>');
                        break;
                    }
                    const smartExportCount = await smartExport(arg1, arg2);
                    console.log(`智能导出完成: ${smartExportCount} 条记录`);
                    break;
                    
                default:
                    console.log('未知命令，请查看上面的帮助信息');
            }
        } catch (error) {
            console.error('执行失败:', error);
        } finally {
            await pool.end();
        }
    })();
} 