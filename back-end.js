// 使用Node.js和Express实现一个简单的火车票售票系统后端（MySQL版本）

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT || 3000;

// 添加中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件中间件
app.use(express.static('.'));

// CORS中间件
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

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

// 工具函数
function sendSuccess(res, data, message = '操作成功') {
    res.json({
        success: true,
        data: data,
        message: message
    });
}

function sendError(res, message = '操作失败', status = 500) {
    res.status(status).json({
        success: false,
        message: message
    });
}

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
        
        // 插入测试数据
        await insertTestData();
        
        console.log('数据库初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        throw error;
    }
}

// 创建表格
async function createTables() {
    const connection = await pool.getConnection();
    try {
        // 创建火车表
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
        
        // 创建席位类型表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS seat_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                type VARCHAR(20) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                available_seats INT NOT NULL,
                total_seats INT NOT NULL,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
            )
        `);
        
        // 创建经停站表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS stops (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                station VARCHAR(50) NOT NULL,
                seat_type VARCHAR(20) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
            )
        `);
        
        // 创建订单表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                train_id INT NOT NULL,
                from_station VARCHAR(50) NOT NULL,
                to_station VARCHAR(50) NOT NULL,
                seat_type VARCHAR(20) NOT NULL,
                passenger_name VARCHAR(100) NOT NULL,
                passenger_id VARCHAR(20) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('数据表创建完成');
    } finally {
        connection.release();
    }
}

// 插入测试数据
async function insertTestData() {
    const connection = await pool.getConnection();
    try {
        // 检查是否已有数据
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM trains');
        if (rows[0].count > 0) {
            console.log('测试数据已存在，跳过插入');
            return;
        }
        
        // 插入火车数据
        await connection.execute(`
            INSERT INTO trains (name, from_station, to_station) VALUES
            ('G101', '北京', '上海'),
            ('G102', '上海', '北京'),
            ('D201', '广州', '深圳'),
            ('K301', '西安', '成都')
        `);
        
        // 插入席位类型数据
        const seatTypesData = [
            [1, '二等座', 500, 80, 80],
            [1, '一等座', 800, 20, 20],
            [1, '商务座', 1500, 10, 10],
            [2, '二等座', 500, 80, 80],
            [2, '一等座', 800, 20, 20],
            [2, '商务座', 1500, 10, 10],
            [3, '二等座', 50, 100, 100],
            [3, '一等座', 80, 30, 30],
            [4, '硬座', 150, 200, 200],
            [4, '硬卧', 300, 50, 50],
            [4, '软卧', 450, 20, 20]
        ];
        
        for (const seatType of seatTypesData) {
            await connection.execute(
                'INSERT INTO seat_types (train_id, type, price, available_seats, total_seats) VALUES (?, ?, ?, ?, ?)',
                seatType
            );
        }
        
        // 插入经停站数据
        const stopsData = [
            [1, '天津', '二等座', 100],
            [1, '天津', '一等座', 160],
            [1, '天津', '商务座', 300],
            [1, '济南', '二等座', 200],
            [1, '济南', '一等座', 320],
            [1, '济南', '商务座', 600],
            [1, '南京', '二等座', 350],
            [1, '南京', '一等座', 560],
            [1, '南京', '商务座', 1050],
            [2, '南京', '二等座', 150],
            [2, '南京', '一等座', 240],
            [2, '南京', '商务座', 450],
            [2, '济南', '二等座', 300],
            [2, '济南', '一等座', 480],
            [2, '济南', '商务座', 900],
            [2, '天津', '二等座', 400],
            [2, '天津', '一等座', 640],
            [2, '天津', '商务座', 1200]
        ];
        
        for (const stop of stopsData) {
            await connection.execute(
                'INSERT INTO stops (train_id, station, seat_type, price) VALUES (?, ?, ?, ?)',
                stop
            );
        }
        
        console.log('测试数据插入完成');
    } finally {
        connection.release();
    }
}

// API路由

// 根路径重定向
app.get('/', (req, res) => {
    res.redirect('/mysql-test.html');
});

// 查询火车信息
app.get('/trains', async (req, res) => {
    try {
        const { from, to } = req.query;
        
        let query = `
            SELECT 
                t.id, t.name, t.from_station, t.to_station,
                st.type, st.price, st.available_seats, st.total_seats
            FROM trains t
            JOIN seat_types st ON t.id = st.train_id
        `;
        
        const params = [];
        
        if (from && to) {
            query += ' WHERE t.from_station = ? AND t.to_station = ?';
            params.push(from, to);
        } else if (from) {
            query += ' WHERE t.from_station = ?';
            params.push(from);
        } else if (to) {
            query += ' WHERE t.to_station = ?';
            params.push(to);
        }
        
        query += ' ORDER BY t.id, st.type';
        
        const [rows] = await pool.execute(query, params);
        
        // 整理数据格式
        const trainsMap = new Map();
        
        for (const row of rows) {
            if (!trainsMap.has(row.id)) {
                trainsMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    from: row.from_station,
                    to: row.to_station,
                    seatTypes: []
                });
            }
            
            trainsMap.get(row.id).seatTypes.push({
                type: row.type,
                price: row.price,
                availableSeats: row.available_seats,
                totalSeats: row.total_seats
            });
        }
        
        const trains = Array.from(trainsMap.values());
        sendSuccess(res, trains, '查询火车信息成功');
        
    } catch (error) {
        console.error('查询火车信息失败:', error);
        sendError(res, '查询火车信息失败');
    }
});

// 查询经停站信息
app.get('/stops/:trainId', async (req, res) => {
    try {
        const trainId = req.params.trainId;
        
        const [rows] = await pool.execute(`
            SELECT station, seat_type, price
            FROM stops
            WHERE train_id = ?
            ORDER BY station, seat_type
        `, [trainId]);
        
        // 整理数据格式
        const stopsMap = new Map();
        
        for (const row of rows) {
            if (!stopsMap.has(row.station)) {
                stopsMap.set(row.station, {
                    station: row.station,
                    seatTypes: []
                });
            }
            
            stopsMap.get(row.station).seatTypes.push({
                type: row.seat_type,
                price: row.price
            });
        }
        
        const stops = Array.from(stopsMap.values());
        sendSuccess(res, stops, '查询经停站信息成功');
        
    } catch (error) {
        console.error('查询经停站信息失败:', error);
        sendError(res, '查询经停站信息失败');
    }
});

// 预订车票
app.post('/book', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { trainId, seatType, passengerName, passengerId, fromStation, toStation } = req.body;
        
        // 输入验证
        if (!trainId || !seatType || !passengerName || !passengerId || !fromStation || !toStation) {
            return sendError(res, '请填写完整的预订信息', 400);
        }
        
        await connection.beginTransaction();
        
        // 检查余票
        const [seatRows] = await connection.execute(`
            SELECT available_seats, price
            FROM seat_types
            WHERE train_id = ? AND type = ?
        `, [trainId, seatType]);
        
        if (seatRows.length === 0) {
            await connection.rollback();
            return sendError(res, '未找到指定的座位类型', 404);
        }
        
        if (seatRows[0].available_seats <= 0) {
            await connection.rollback();
            return sendError(res, '该座位类型已售完', 400);
        }
        
        // 计算价格
        let totalPrice = seatRows[0].price;  // 默认全程价格
        
        // 获取火车信息
        const [trainInfo] = await connection.execute(`
            SELECT from_station, to_station FROM trains WHERE id = ?
        `, [trainId]);
        
        if (trainInfo.length === 0) {
            await connection.rollback();
            return sendError(res, '未找到指定的火车', 404);
        }
        
        const train = trainInfo[0];
        
        // 价格计算逻辑
        if (fromStation === train.from_station && toStation === train.to_station) {
            // 情况1: 全程票 - 使用全程价格
            totalPrice = seatRows[0].price;
        } else {
            // 情况2: 区间票 - 需要计算区间价格
            let fromPrice = 0;  // 起始站到火车起点的价格
            let toPrice = 0;    // 终点站到火车起点的价格
            
            // 查询出发站价格（如果不是火车起始站）
            if (fromStation !== train.from_station) {
                const [fromStopRows] = await connection.execute(`
                    SELECT price FROM stops
                    WHERE train_id = ? AND station = ? AND seat_type = ?
                `, [trainId, fromStation, seatType]);
                
                if (fromStopRows.length > 0) {
                    fromPrice = fromStopRows[0].price;
                } else {
                    // 如果找不到出发站，可能是终点站
                    if (fromStation === train.to_station) {
                        fromPrice = seatRows[0].price;  // 终点站价格就是全程价格
                    } else {
                        await connection.rollback();
                        return sendError(res, '未找到出发站信息', 404);
                    }
                }
            }
            
            // 查询到达站价格（如果不是火车终点站）
            if (toStation !== train.to_station) {
                const [toStopRows] = await connection.execute(`
                    SELECT price FROM stops
                    WHERE train_id = ? AND station = ? AND seat_type = ?
                `, [trainId, toStation, seatType]);
                
                if (toStopRows.length > 0) {
                    toPrice = toStopRows[0].price;
                } else {
                    await connection.rollback();
                    return sendError(res, '未找到到达站信息', 404);
                }
            } else {
                // 如果到达站是火车终点站，使用全程价格
                toPrice = seatRows[0].price;
            }
            
            // 计算区间价格：到达站价格 - 出发站价格
            totalPrice = toPrice - fromPrice;
            
            // 确保价格不为负数
            if (totalPrice <= 0) {
                await connection.rollback();
                return sendError(res, '价格计算错误，请检查出发站和到达站顺序', 400);
            }
        }
        
        // 创建订单
        const [orderResult] = await connection.execute(`
            INSERT INTO orders (train_id, from_station, to_station, seat_type, passenger_name, passenger_id, price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [trainId, fromStation, toStation, seatType, passengerName, passengerId, totalPrice]);
        
        // 更新余票
        await connection.execute(`
            UPDATE seat_types
            SET available_seats = available_seats - 1
            WHERE train_id = ? AND type = ?
        `, [trainId, seatType]);
        
        await connection.commit();
        
        sendSuccess(res, {
            orderId: orderResult.insertId,
            trainId,
            seatType,
            passengerName,
            passengerId,
            fromStation,
            toStation,
            price: totalPrice
        }, '预订成功');
        
    } catch (error) {
        await connection.rollback();
        console.error('预订失败:', error);
        sendError(res, '预订失败');
    } finally {
        connection.release();
    }
});

// 查询订单
app.get('/orders', async (req, res) => {
    try {
        const { passengerName, passengerId } = req.query;
        
        let query = `
            SELECT 
                o.id, o.train_id, o.from_station, o.to_station,
                o.seat_type, o.passenger_name, o.passenger_id, o.price, o.created_at,
                t.name as train_name
            FROM orders o
            JOIN trains t ON o.train_id = t.id
        `;
        
        const params = [];
        
        if (passengerName && passengerId) {
            query += ' WHERE o.passenger_name = ? AND o.passenger_id = ?';
            params.push(passengerName, passengerId);
        } else if (passengerName) {
            query += ' WHERE o.passenger_name = ?';
            params.push(passengerName);
        } else if (passengerId) {
            query += ' WHERE o.passenger_id = ?';
            params.push(passengerId);
        }
        
        query += ' ORDER BY o.created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        
        sendSuccess(res, rows, '查询订单成功');
        
    } catch (error) {
        console.error('查询订单失败:', error);
        sendError(res, '查询订单失败');
    }
});

// 测试数据库连接
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM trains');
        sendSuccess(res, {
            connected: true,
            trainCount: rows[0].count,
            database: 'MySQL',
            timestamp: new Date().toISOString()
        }, '数据库连接测试成功');
    } catch (error) {
        console.error('数据库连接测试失败:', error);
        sendError(res, '数据库连接失败: ' + error.message);
    }
});

// 启动服务器
async function startServer() {
    try {
        // 初始化数据库
        await initDatabase();
        
        // 启动HTTP服务器
        app.listen(PORT, () => {
            console.log(`火车票售票系统后端已启动，端口：${PORT}`);
            console.log(`数据库：MySQL`);
            console.log(`访问测试页面：http://localhost:${PORT}/mysql-test.html`);
        });
        
    } catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

// 启动服务器
startServer(); 