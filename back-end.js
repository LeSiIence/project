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

// 引入数据库管理模块
const { initDatabase, insertTestData } = require('./manage_database');



// API路由

// 根路径重定向
app.get('/', (req, res) => {
    res.redirect('/mysql-test.html');
});


// 查询火车信息
app.get('/trains', async (req, res) => {
    try {
        const { from, to, date } = req.query;
        const queryDate = date || '2025-07-17'; // 默认查询2025-07-17的日期
        
        console.log(`查询火车信息 - 日期: ${queryDate}, 出发站: ${from || '全部'}, 到达站: ${to || '全部'}`);
        
        let query = `
            SELECT DISTINCT
                t.id, t.name, t.from_station, t.to_station,
                COALESCE(ts.departure_date, ?) as departure_date,
                GROUP_CONCAT(DISTINCT c.seat_type) as seat_types
            FROM trains t
            LEFT JOIN train_schedules ts ON t.id = ts.train_id AND ts.departure_date = ?
            JOIN carriages c ON t.id = c.train_id
            WHERE c.train_id IS NOT NULL
        `;
        
        const params = [queryDate, queryDate];
        
        if (from && to) {
            query += ' AND t.from_station = ? AND t.to_station = ?';
            params.push(from, to);
        } else if (from) {
            query += ' AND t.from_station = ?';
            params.push(from);
        } else if (to) {
            query += ' AND t.to_station = ?';
            params.push(to);
        }
        
        query += ' GROUP BY t.id, t.name, t.from_station, t.to_station, ts.departure_date';
        query += ' ORDER BY t.id';
        
        const [rows] = await pool.execute(query, params);
        
        console.log(`查询结果: ${rows.length} 个车次`);
        
        // 获取每个车次的详细信息
        const trains = [];
        for (const row of rows) {
            const trainInfo = {
                id: row.id,
                name: row.name,
                from: row.from_station,
                to: row.to_station,
                date: row.departure_date,
                seatTypes: []
            };
            
            // 获取时刻表
            const [scheduleRows] = await pool.execute(`
                SELECT station_name, station_order, arrival_time, departure_time, distance_km
                FROM train_stations
                WHERE train_id = ?
                ORDER BY station_order
            `, [row.id]);
            
            trainInfo.schedule = scheduleRows.map(s => ({
                station: s.station_name,
                order: s.station_order,
                arrival: s.arrival_time,
                departure: s.departure_time,
                distance: s.distance_km
            }));
            
            // 获取座位类型和可用座位数
            const seatTypes = row.seat_types.split(',');
            for (const seatType of seatTypes) {
                const [availableSeats] = await pool.execute(`
                    SELECT COUNT(*) as total_seats, 
                           COUNT(*) as available_seats
                    FROM seats s
                    JOIN carriages c ON s.carriage_id = c.id
                    WHERE c.train_id = ? AND s.seat_type = ?
                `, [row.id, seatType]);
                
                // 获取价格（全程价格）
                const [priceRows] = await pool.execute(`
                    SELECT price
                    FROM prices
                    WHERE train_id = ? AND from_station = ? AND to_station = ? AND seat_type = ?
                `, [row.id, row.from_station, row.to_station, seatType]);
                
                trainInfo.seatTypes.push({
                    type: seatType,
                    price: priceRows.length > 0 ? priceRows[0].price : 0,
                    availableSeats: availableSeats[0].available_seats || 0,
                    totalSeats: availableSeats[0].total_seats || 0
                });
            }
            
            trains.push(trainInfo);
        }
        
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
        
        // 获取车次的经停站时刻表
        const [scheduleRows] = await pool.execute(`
            SELECT station_name, station_order, arrival_time, departure_time, distance_km
            FROM train_stations
            WHERE train_id = ?
            ORDER BY station_order
        `, [trainId]);
        
        // 获取车次的座位类型
        const [seatTypeRows] = await pool.execute(`
            SELECT DISTINCT seat_type
            FROM carriages
            WHERE train_id = ?
        `, [trainId]);
        
        // 获取火车的起始和终点站
        const [trainRows] = await pool.execute(`
            SELECT from_station, to_station
            FROM trains
            WHERE id = ?
        `, [trainId]);
        
        if (trainRows.length === 0) {
            return sendError(res, '未找到指定的火车', 404);
        }
        
        const train = trainRows[0];
        const stops = [];
        
        for (const schedule of scheduleRows) {
            const stopInfo = {
                station: schedule.station_name,
                order: schedule.station_order,
                arrival: schedule.arrival_time,
                departure: schedule.departure_time,
                distance: schedule.distance_km,
                seatTypes: []
            };
            
            // 为每个经停站获取到各个座位类型的价格
            for (const seatTypeRow of seatTypeRows) {
                const seatType = seatTypeRow.seat_type;
                
                // 获取从火车起始站到当前站的价格
                const [priceRows] = await pool.execute(`
                    SELECT price
                    FROM prices
                    WHERE train_id = ? AND from_station = ? AND to_station = ? AND seat_type = ?
                `, [trainId, train.from_station, schedule.station_name, seatType]);
                
                if (priceRows.length > 0) {
                    stopInfo.seatTypes.push({
                        type: seatType,
                        price: priceRows[0].price
                    });
                }
            }
            
            stops.push(stopInfo);
        }
        
        sendSuccess(res, stops, '查询经停站信息成功');
        
    } catch (error) {
        console.error('查询经停站信息失败:', error);
        sendError(res, '查询经停站信息失败');
    }
});


//------------最主要的逻辑，涉及座位区间冲突，座位分配------------//
// 查询可预订车次
app.post('/search-bookable-trains', async (req, res) => {
    try {
        const { fromStation, toStation, date } = req.body;
        const queryDate = date || new Date().toISOString().split('T')[0];
        
        // 输入验证
        if (!fromStation || !toStation) {
            return sendError(res, '请填写出发站和到达站', 400);
        }
        
        // 查询可预订的车次
        const [trains] = await pool.execute(`
            SELECT DISTINCT t.id, t.name, t.from_station, t.to_station, ts.id as schedule_id, ts.departure_date
            FROM trains t
            JOIN train_schedules ts ON t.id = ts.train_id
            JOIN train_stations ts1 ON t.id = ts1.train_id AND ts1.station_name = ?
            JOIN train_stations ts2 ON t.id = ts2.train_id AND ts2.station_name = ?
            WHERE ts.departure_date = ?
            AND ts1.station_order < ts2.station_order
            ORDER BY t.id
        `, [fromStation, toStation, queryDate]);
        
        if (trains.length === 0) {
            return sendSuccess(res, [], '未找到符合条件的车次');
        }
        
        // 为每个车次获取详细信息
        const result = [];
        
        for (const trainRow of trains) {
            const trainInfo = {
                id: trainRow.id,
                name: trainRow.name,
                from: trainRow.from_station,
                to: trainRow.to_station,
                date: trainRow.departure_date,
                scheduleId: trainRow.schedule_id,
                seatTypes: []
            };
            
            // 获取时刻表信息
            const [scheduleRows] = await pool.execute(`
                SELECT station_name, station_order, arrival_time, departure_time
                FROM train_stations
                WHERE train_id = ?
                ORDER BY station_order
            `, [trainRow.id]);
            
            trainInfo.schedule = scheduleRows.map(s => ({
                station: s.station_name,
                order: s.station_order,
                arrival: s.arrival_time,
                departure: s.departure_time
            }));
            
            // 获取座位类型和可用座位
            const [seatTypeRows] = await pool.execute(`
                SELECT DISTINCT seat_type
                FROM carriages
                WHERE train_id = ?
            `, [trainRow.id]);
            
            for (const seatTypeRow of seatTypeRows) {
                const seatType = seatTypeRow.seat_type;
                
                // 计算可用座位数（考虑区间冲突）
                const availableSeats = await getAvailableSeats(trainRow.schedule_id, seatType, fromStation, toStation);
                
                if (availableSeats > 0) {
                    // 获取价格
                    const [priceRows] = await pool.execute(`
                        SELECT price
                        FROM prices
                        WHERE train_id = ? AND from_station = ? AND to_station = ? AND seat_type = ?
                    `, [trainRow.id, fromStation, toStation, seatType]);
                    
                    trainInfo.seatTypes.push({
                        type: seatType,
                        price: priceRows.length > 0 ? priceRows[0].price : 0,
                        availableSeats: availableSeats,
                        totalSeats: await getTotalSeats(trainRow.id, seatType)
                    });
                }
            }
            
            // 只有有可用座位的车次才添加到结果中
            if (trainInfo.seatTypes.length > 0) {
                result.push(trainInfo);
            }
        }
        
        sendSuccess(res, result, '查询成功');
        
    } catch (error) {
        console.error('查询可预订车次失败:', error);
        sendError(res, '查询失败');
    }
});

// 计算可用座位数（考虑区间冲突）
async function getAvailableSeats(scheduleId, seatType, fromStation, toStation) {
    const connection = await pool.getConnection();
    try {
        // 获取该车次指定座位类型的所有座位
        const [totalSeatsRows] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM seats s
            JOIN carriages c ON s.carriage_id = c.id
            JOIN train_schedules ts ON c.train_id = ts.train_id
            WHERE ts.id = ? AND s.seat_type = ?
        `, [scheduleId, seatType]);
        
        const totalSeats = totalSeatsRows[0].total;
        
        // 获取在这个区间内已经被占用的座位
        const [occupiedSeatsRows] = await connection.execute(`
            SELECT COUNT(DISTINCT sa.seat_id) as occupied
            FROM seat_allocations sa
            JOIN seats s ON sa.seat_id = s.id
            JOIN carriages c ON s.carriage_id = c.id
            JOIN train_stations ts1 ON c.train_id = ts1.train_id AND ts1.station_name = sa.from_station
            JOIN train_stations ts2 ON c.train_id = ts2.train_id AND ts2.station_name = sa.to_station
            JOIN train_stations ts3 ON c.train_id = ts3.train_id AND ts3.station_name = ?
            JOIN train_stations ts4 ON c.train_id = ts4.train_id AND ts4.station_name = ?
            WHERE sa.schedule_id = ? AND s.seat_type = ? AND sa.is_deleted = FALSE
            AND NOT (ts2.station_order <= ts3.station_order OR ts1.station_order >= ts4.station_order)
        `, [fromStation, toStation, scheduleId, seatType]);
        
        const occupiedSeats = occupiedSeatsRows[0].occupied || 0;
        
        return Math.max(0, totalSeats - occupiedSeats);
        
    } finally {
        connection.release();
    }
}

// 获取总座位数
async function getTotalSeats(trainId, seatType) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM seats s
            JOIN carriages c ON s.carriage_id = c.id
            WHERE c.train_id = ? AND s.seat_type = ?
        `, [trainId, seatType]);
        
        return rows[0].total;
        
    } finally {
        connection.release();
    }
}

// 查找可用座位
async function findAvailableSeat(scheduleId, seatType, fromStation, toStation) {
    const connection = await pool.getConnection();
    try {
        // 查找所有该座位类型的座位
        const [seatRows] = await connection.execute(`
            SELECT s.id, s.seat_number, c.carriage_number
            FROM seats s
            JOIN carriages c ON s.carriage_id = c.id
            JOIN train_schedules ts ON c.train_id = ts.train_id
            WHERE ts.id = ? AND s.seat_type = ?
            ORDER BY c.carriage_number, s.seat_number
        `, [scheduleId, seatType]);
        
        // 检查每个座位是否在指定区间内可用
        for (const seat of seatRows) {
            const [conflictRows] = await connection.execute(`
                SELECT COUNT(*) as conflicts
                FROM seat_allocations sa
                JOIN train_stations ts1 ON sa.schedule_id = ? AND EXISTS (
                    SELECT 1 FROM train_schedules ts 
                    JOIN train_stations tst ON ts.train_id = tst.train_id 
                    WHERE ts.id = sa.schedule_id AND tst.station_name = sa.from_station
                ) AND EXISTS (
                    SELECT 1 FROM train_schedules ts 
                    JOIN train_stations tst ON ts.train_id = tst.train_id 
                    WHERE ts.id = sa.schedule_id AND tst.station_name = sa.to_station
                )
                JOIN train_stations ts2 ON EXISTS (
                    SELECT 1 FROM train_schedules ts 
                    JOIN train_stations tst ON ts.train_id = tst.train_id 
                    WHERE ts.id = sa.schedule_id AND tst.station_name = ?
                ) AND EXISTS (
                    SELECT 1 FROM train_schedules ts 
                    JOIN train_stations tst ON ts.train_id = tst.train_id 
                    WHERE ts.id = sa.schedule_id AND tst.station_name = ?
                )
                WHERE sa.seat_id = ? AND sa.schedule_id = ? AND sa.is_deleted = FALSE
                AND NOT (
                    (SELECT station_order FROM train_stations tst JOIN train_schedules ts ON tst.train_id = ts.train_id WHERE ts.id = sa.schedule_id AND tst.station_name = sa.to_station) <= 
                    (SELECT station_order FROM train_stations tst JOIN train_schedules ts ON tst.train_id = ts.train_id WHERE ts.id = sa.schedule_id AND tst.station_name = ?) OR
                    (SELECT station_order FROM train_stations tst JOIN train_schedules ts ON tst.train_id = ts.train_id WHERE ts.id = sa.schedule_id AND tst.station_name = sa.from_station) >= 
                    (SELECT station_order FROM train_stations tst JOIN train_schedules ts ON tst.train_id = ts.train_id WHERE ts.id = sa.schedule_id AND tst.station_name = ?)
                )
            `, [scheduleId, fromStation, toStation, seat.id, scheduleId, fromStation, toStation]);
            
            if (conflictRows[0].conflicts === 0) {
                return {
                    seatId: seat.id,
                    seatNumber: seat.seat_number,
                    carriageNumber: seat.carriage_number
                };
            }
        }
        
        return null;
        
    } finally {
        connection.release();
    }
}

// 计算区间价格的辅助函数
async function calculatePrice(trainId, fromStation, toStation, seatType) {
    const connection = await pool.getConnection();
    try {
        // 直接从价格表查询
        const [priceRows] = await connection.execute(`
            SELECT price
            FROM prices
            WHERE train_id = ? AND from_station = ? AND to_station = ? AND seat_type = ?
        `, [trainId, fromStation, toStation, seatType]);
        
        return priceRows.length > 0 ? priceRows[0].price : 0;
        
    } finally {
        connection.release();
    }
}

// 预订车票
app.post('/book', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { trainId, seatType, passengerName, passengerId, fromStation, toStation, date } = req.body;
        const queryDate = date || new Date().toISOString().split('T')[0];
        
        // 输入验证
        if (!trainId || !seatType || !passengerName || !passengerId || !fromStation || !toStation) {
            return sendError(res, '请填写完整的预订信息', 400);
        }
        
        await connection.beginTransaction();
        
        // 获取车次时刻表ID
        const [scheduleRows] = await connection.execute(`
            SELECT id FROM train_schedules
            WHERE train_id = ? AND departure_date = ?
        `, [trainId, queryDate]);
        
        if (scheduleRows.length === 0) {
            await connection.rollback();
            return sendError(res, '未找到指定日期的车次', 404);
        }
        
        const scheduleId = scheduleRows[0].id;
        
        // 验证出发站和到达站的顺序
        const [stationOrderRows] = await connection.execute(`
            SELECT 
                (SELECT station_order FROM train_stations WHERE train_id = ? AND station_name = ?) as from_order,
                (SELECT station_order FROM train_stations WHERE train_id = ? AND station_name = ?) as to_order
        `, [trainId, fromStation, trainId, toStation]);
        
        if (stationOrderRows.length === 0 || !stationOrderRows[0].from_order || !stationOrderRows[0].to_order) {
            await connection.rollback();
            return sendError(res, '出发站或到达站不在此车次路线上', 404);
        }
        
        if (stationOrderRows[0].from_order >= stationOrderRows[0].to_order) {
            await connection.rollback();
            return sendError(res, '出发站必须在到达站之前', 400);
        }
        
        // 查找可用座位
        const availableSeat = await findAvailableSeat(scheduleId, seatType, fromStation, toStation);
        
        if (!availableSeat) {
            await connection.rollback();
            return sendError(res, '该座位类型已售完或无可用座位', 400);
        }
        
        // 计算价格
        const totalPrice = await calculatePrice(trainId, fromStation, toStation, seatType);
        
        if (totalPrice <= 0) {
            await connection.rollback();
            return sendError(res, '价格计算错误', 400);
        }
        
        // 创建订单
        const [orderResult] = await connection.execute(`
            INSERT INTO orders (schedule_id, from_station, to_station, seat_type, passenger_name, passenger_id, price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [scheduleId, fromStation, toStation, seatType, passengerName, passengerId, totalPrice]);
        
        // 分配座位
        await connection.execute(`
            INSERT INTO seat_allocations (schedule_id, seat_id, from_station, to_station, passenger_name, passenger_id, order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [scheduleId, availableSeat.seatId, fromStation, toStation, passengerName, passengerId, orderResult.insertId]);
        
        await connection.commit();
        
        sendSuccess(res, {
            orderId: orderResult.insertId,
            trainId,
            seatType,
            seatNumber: availableSeat.seatNumber,
            carriageNumber: availableSeat.carriageNumber,
            passengerName,
            passengerId,
            fromStation,
            toStation,
            date: queryDate,
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
                o.id, o.schedule_id, o.from_station, o.to_station,
                o.seat_type, o.passenger_name, o.passenger_id, o.price, o.status, o.created_at,
                t.name as train_name, ts.departure_date,
                sa.seat_id, s.seat_number, c.carriage_number
            FROM orders o
            JOIN train_schedules ts ON o.schedule_id = ts.id
            JOIN trains t ON ts.train_id = t.id
            LEFT JOIN seat_allocations sa ON o.id = sa.order_id AND sa.is_deleted = FALSE
            LEFT JOIN seats s ON sa.seat_id = s.id
            LEFT JOIN carriages c ON s.carriage_id = c.id
            WHERE o.is_deleted = FALSE
        `;
        
        const params = [];
        
        if (passengerName && passengerId) {
            query += ' AND o.passenger_name = ? AND o.passenger_id = ?';
            params.push(passengerName, passengerId);
        } else if (passengerName) {
            query += ' AND o.passenger_name = ?';
            params.push(passengerName);
        } else if (passengerId) {
            query += ' AND o.passenger_id = ?';
            params.push(passengerId);
        }
        
        query += ' ORDER BY o.created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        
        // 整理数据格式
        const orders = rows.map(row => ({
            id: row.id,
            trainName: row.train_name,
            date: row.departure_date,
            fromStation: row.from_station,
            toStation: row.to_station,
            seatType: row.seat_type,
            seatNumber: row.seat_number,
            carriageNumber: row.carriage_number,
            passengerName: row.passenger_name,
            passengerId: row.passenger_id,
            price: row.price,
            status: row.status,
            createdAt: row.created_at
        }));
        
        sendSuccess(res, orders, '查询订单成功');
        
    } catch (error) {
        console.error('查询订单失败:', error);
        sendError(res, '查询订单失败');
    }
});

// 取消订单（软删除）
app.delete('/orders/:orderId', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const orderId = req.params.orderId;
        
        // 输入验证
        if (!orderId || isNaN(orderId)) {
            return sendError(res, '请提供有效的订单ID', 400);
        }
        
        await connection.beginTransaction();
        
        // 检查订单是否存在且未删除
        const [orderRows] = await connection.execute(`
            SELECT id, status FROM orders 
            WHERE id = ? AND is_deleted = FALSE
        `, [orderId]);
        
        if (orderRows.length === 0) {
            await connection.rollback();
            return sendError(res, '订单不存在或已被删除', 404);
        }
        
        // 软删除订单
        await connection.execute(`
            UPDATE orders 
            SET is_deleted = TRUE, deleted_at = NOW(), status = 'cancelled'
            WHERE id = ?
        `, [orderId]);
        
        // 软删除对应的座位分配
        await connection.execute(`
            UPDATE seat_allocations 
            SET is_deleted = TRUE, deleted_at = NOW()
            WHERE order_id = ?
        `, [orderId]);
        
        await connection.commit();
        
        sendSuccess(res, { orderId: parseInt(orderId) }, '订单取消成功');
        
    } catch (error) {
        await connection.rollback();
        console.error('取消订单失败:', error);
        sendError(res, '取消订单失败');
    } finally {
        connection.release();
    }
});

// 恢复订单（取消软删除）
app.put('/orders/:orderId/restore', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const orderId = req.params.orderId;
        
        // 输入验证
        if (!orderId || isNaN(orderId)) {
            return sendError(res, '请提供有效的订单ID', 400);
        }
        
        await connection.beginTransaction();
        
        // 检查订单是否存在且已删除
        const [orderRows] = await connection.execute(`
            SELECT id, status FROM orders 
            WHERE id = ? AND is_deleted = TRUE
        `, [orderId]);
        
        if (orderRows.length === 0) {
            await connection.rollback();
            return sendError(res, '订单不存在或未被删除', 404);
        }
        
        // 检查座位是否仍然可用
        const [seatRows] = await connection.execute(`
            SELECT sa.seat_id, sa.from_station, sa.to_station, sa.schedule_id,
                   s.seat_type, s.seat_number, c.carriage_number
            FROM seat_allocations sa
            JOIN seats s ON sa.seat_id = s.id
            JOIN carriages c ON s.carriage_id = c.id
            WHERE sa.order_id = ? AND sa.is_deleted = TRUE
        `, [orderId]);
        
        if (seatRows.length === 0) {
            await connection.rollback();
            return sendError(res, '未找到订单的座位信息', 404);
        }
        
        // 检查座位是否已被其他订单占用
        for (const seat of seatRows) {
            const availableSeats = await getAvailableSeats(
                seat.schedule_id, 
                seat.seat_type, 
                seat.from_station, 
                seat.to_station
            );
            
            if (availableSeats <= 0) {
                await connection.rollback();
                return sendError(res, '该座位已被其他订单占用，无法恢复', 400);
            }
        }
        
        // 恢复订单
        await connection.execute(`
            UPDATE orders 
            SET is_deleted = FALSE, deleted_at = NULL, status = 'confirmed'
            WHERE id = ?
        `, [orderId]);
        
        // 恢复座位分配
        await connection.execute(`
            UPDATE seat_allocations 
            SET is_deleted = FALSE, deleted_at = NULL
            WHERE order_id = ?
        `, [orderId]);
        
        await connection.commit();
        
        sendSuccess(res, { orderId: parseInt(orderId) }, '订单恢复成功');
        
    } catch (error) {
        await connection.rollback();
        console.error('恢复订单失败:', error);
        sendError(res, '恢复订单失败');
    } finally {
        connection.release();
    }
});

// 查询已删除的订单
app.get('/orders/deleted', async (req, res) => {
    try {
        const { passengerName, passengerId } = req.query;
        
        let query = `
            SELECT 
                o.id, o.schedule_id, o.from_station, o.to_station,
                o.seat_type, o.passenger_name, o.passenger_id, o.price, o.status, 
                o.created_at, o.deleted_at,
                t.name as train_name, ts.departure_date
            FROM orders o
            JOIN train_schedules ts ON o.schedule_id = ts.id
            JOIN trains t ON ts.train_id = t.id
            WHERE o.is_deleted = TRUE
        `;
        
        const params = [];
        
        if (passengerName && passengerId) {
            query += ' AND o.passenger_name = ? AND o.passenger_id = ?';
            params.push(passengerName, passengerId);
        } else if (passengerName) {
            query += ' AND o.passenger_name = ?';
            params.push(passengerName);
        } else if (passengerId) {
            query += ' AND o.passenger_id = ?';
            params.push(passengerId);
        }
        
        query += ' ORDER BY o.deleted_at DESC';
        
        const [rows] = await pool.execute(query, params);
        
        // 整理数据格式
        const orders = rows.map(row => ({
            id: row.id,
            trainName: row.train_name,
            date: row.departure_date,
            fromStation: row.from_station,
            toStation: row.to_station,
            seatType: row.seat_type,
            passengerName: row.passenger_name,
            passengerId: row.passenger_id,
            price: row.price,
            status: row.status,
            createdAt: row.created_at,
            deletedAt: row.deleted_at
        }));
        
        sendSuccess(res, orders, '查询已删除订单成功');
        
    } catch (error) {
        console.error('查询已删除订单失败:', error);
        sendError(res, '查询已删除订单失败');
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
async function startServer(shouldInitDB = true) {
    try {
        // 可选择性地初始化数据库
        if (shouldInitDB) {
            console.log('正在初始化数据库...');
            await initDatabase();
            await insertTestData();
        }
        
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