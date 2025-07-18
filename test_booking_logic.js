// 测试订票逻辑脚本
const mysql = require('mysql2/promise');

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

// 测试用例数据
const testCases = [
    {
        name: "正常预订测试",
        trainId: 1,
        seatType: "二等座",
        passengerName: "张三",
        passengerId: "110101199001011001",
        fromStation: "北京",
        toStation: "上海",
        date: "2025-07-17",
        expectedResult: "success"
    },
    {
        name: "区间冲突测试 - 完全重叠",
        trainId: 1,
        seatType: "二等座",
        passengerName: "李四",
        passengerId: "110101199001011002",
        fromStation: "北京",
        toStation: "上海",
        date: "2025-07-17",
        expectedResult: "success"  // 应该能预订不同座位
    },
    {
        name: "区间冲突测试 - 部分重叠",
        trainId: 1,
        seatType: "二等座",
        passengerName: "王五",
        passengerId: "110101199001011003",
        fromStation: "北京",
        toStation: "南京",
        date: "2025-07-17",
        expectedResult: "success"  // 假设有北京到南京的路线
    }
];

// 测试函数
async function runBookingTests() {
    console.log('开始订票逻辑测试...\n');
    
    try {
        // 清理测试数据
        await clearTestData();
        
        // 运行测试用例
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`=== 测试 ${i + 1}: ${testCase.name} ===`);
            
            try {
                const result = await testBooking(testCase);
                console.log(`结果: ${result.success ? '成功' : '失败'}`);
                
                if (result.success) {
                    console.log(`订单ID: ${result.orderId}`);
                    console.log(`座位: ${result.carriageNumber}车厢 ${result.seatNumber}号`);
                    console.log(`价格: ${result.price}元`);
                    
                    // 验证订单和座位分配
                    await verifyBooking(result.orderId);
                }
                
                console.log(`错误信息: ${result.message}\n`);
                
            } catch (error) {
                console.error(`测试失败: ${error.message}\n`);
            }
        }
        
        // 测试区间冲突检查
        await testIntervalConflicts();
        
        // 显示最终状态
        await showFinalState();
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    } finally {
        await pool.end();
    }
}

// 执行预订测试
async function testBooking(testCase) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { trainId: testTrainId, seatType, passengerName, passengerId, fromStation, toStation, date } = testCase;
        
        // 获取车次时刻表ID
        const [scheduleRows] = await connection.execute(`
            SELECT id FROM train_schedules
            WHERE train_id = ? AND departure_date = ?
        `, [testTrainId, date]);
        
        if (scheduleRows.length === 0) {
            await connection.rollback();
            return { success: false, message: '未找到指定日期的车次' };
        }
        
        const scheduleId = scheduleRows[0].id;
        
        // 验证出发站和到达站的顺序
        const [stationOrderRows] = await connection.execute(`
            SELECT 
                ts1.station_order as from_order,
                ts2.station_order as to_order
            FROM train_stations ts1, train_stations ts2
            WHERE ts1.train_id = ? AND ts1.station_name = ?
            AND ts2.train_id = ? AND ts2.station_name = ?
        `, [testTrainId, fromStation, testTrainId, toStation]);
        
        if (stationOrderRows.length === 0) {
            await connection.rollback();
            return { success: false, message: '出发站或到达站不在此车次路线上' };
        }
        
        const { from_order, to_order } = stationOrderRows[0];
        
        if (from_order >= to_order) {
            await connection.rollback();
            return { success: false, message: '出发站必须在到达站之前' };
        }
        
        // 检查可用座位数
        const availableSeatCount = await getAvailableSeats(connection, scheduleId, seatType, fromStation, toStation);
        if (availableSeatCount <= 0) {
            await connection.rollback();
            return { success: false, message: '该座位类型已售完' };
        }
        
        // 查找具体的可用座位
        const availableSeat = await findAvailableSeat(connection, scheduleId, seatType, fromStation, toStation);
        
        if (!availableSeat) {
            await connection.rollback();
            return { success: false, message: '座位分配失败' };
        }
        
        // 计算价格
        const totalPrice = await calculatePrice(connection, testTrainId, fromStation, toStation, seatType);
        
        if (totalPrice <= 0) {
            await connection.rollback();
            return { success: false, message: '价格计算错误' };
        }
        
        // 获取train_id用于订单
        const [trainIdRows] = await connection.execute(`
            SELECT train_id FROM train_schedules WHERE id = ?
        `, [scheduleId]);
        
        const trainId = trainIdRows[0].train_id;
        
        // 创建订单
        const [orderResult] = await connection.execute(`
            INSERT INTO orders (schedule_id, train_id, from_station, to_station, seat_type, passenger_name, passenger_id, price, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `, [scheduleId, trainId, fromStation, toStation, seatType, passengerName, passengerId, totalPrice]);
        
        const orderId = orderResult.insertId;
        
        // 分配座位
        await connection.execute(`
            INSERT INTO seat_allocations (schedule_id, seat_id, from_station, to_station, passenger_name, passenger_id, order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [scheduleId, availableSeat.seatId, fromStation, toStation, passengerName, passengerId, orderId]);
        
        await connection.commit();
        
        return {
            success: true,
            orderId: orderId,
            seatNumber: availableSeat.seatNumber,
            carriageNumber: availableSeat.carriageNumber,
            price: totalPrice,
            message: '预订成功'
        };
        
    } catch (error) {
        await connection.rollback();
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 计算可用座位数
async function getAvailableSeats(connection, scheduleId, seatType, fromStation, toStation) {
    // 获取该车次指定座位类型的所有座位
    const [totalSeatsRows] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM seats s
        JOIN carriages c ON s.carriage_id = c.id
        JOIN train_schedules ts ON c.train_id = ts.train_id
        WHERE ts.id = ? AND s.seat_type = ?
    `, [scheduleId, seatType]);
    
    const totalSeats = totalSeatsRows[0].total;
    
    // 获取火车ID和出发到达站的顺序
    const [trainInfo] = await connection.execute(`
        SELECT ts.train_id, 
               ts_from.station_order as from_order,
               ts_to.station_order as to_order
        FROM train_schedules ts
        JOIN train_stations ts_from ON ts.train_id = ts_from.train_id AND ts_from.station_name = ?
        JOIN train_stations ts_to ON ts.train_id = ts_to.train_id AND ts_to.station_name = ?
        WHERE ts.id = ?
    `, [fromStation, toStation, scheduleId]);
    
    if (trainInfo.length === 0) {
        return 0;
    }
    
    const { from_order, to_order } = trainInfo[0];
    
    // 获取在这个区间内已经被占用的座位数量
    const [occupiedSeatsRows] = await connection.execute(`
        SELECT COUNT(DISTINCT sa.seat_id) as occupied
        FROM seat_allocations sa
        JOIN seats s ON sa.seat_id = s.id
        JOIN carriages c ON s.carriage_id = c.id
        JOIN train_stations ts_from ON c.train_id = ts_from.train_id AND ts_from.station_name = sa.from_station
        JOIN train_stations ts_to ON c.train_id = ts_to.train_id AND ts_to.station_name = sa.to_station
        WHERE sa.schedule_id = ? AND s.seat_type = ? AND sa.is_deleted = FALSE
        AND NOT (ts_to.station_order <= ? OR ts_from.station_order >= ?)
    `, [scheduleId, seatType, from_order, to_order]);
    
    const occupiedSeats = occupiedSeatsRows[0].occupied || 0;
    
    console.log(`  座位统计 - 总座位: ${totalSeats}, 已占用: ${occupiedSeats}, 可用: ${totalSeats - occupiedSeats}`);
    
    return Math.max(0, totalSeats - occupiedSeats);
}

// 查找可用座位
async function findAvailableSeat(connection, scheduleId, seatType, fromStation, toStation) {
    // 获取火车ID和出发到达站的顺序
    const [trainInfo] = await connection.execute(`
        SELECT ts.train_id, 
               ts_from.station_order as from_order,
               ts_to.station_order as to_order
        FROM train_schedules ts
        JOIN train_stations ts_from ON ts.train_id = ts_from.train_id AND ts_from.station_name = ?
        JOIN train_stations ts_to ON ts.train_id = ts_to.train_id AND ts_to.station_name = ?
        WHERE ts.id = ?
    `, [fromStation, toStation, scheduleId]);
    
    if (trainInfo.length === 0) {
        return null;
    }
    
    const { from_order, to_order } = trainInfo[0];
    
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
            JOIN train_stations ts_from ON sa.schedule_id = ? AND EXISTS (
                SELECT 1 FROM train_schedules ts 
                WHERE ts.id = sa.schedule_id AND ts.train_id = (
                    SELECT train_id FROM train_schedules WHERE id = ?
                )
            ) AND EXISTS (
                SELECT 1 FROM train_stations tst 
                WHERE tst.train_id = (SELECT train_id FROM train_schedules WHERE id = ?) 
                AND tst.station_name = sa.from_station
            )
            WHERE sa.seat_id = ? AND sa.schedule_id = ? AND sa.is_deleted = FALSE
            AND NOT (
                (SELECT station_order FROM train_stations WHERE train_id = (SELECT train_id FROM train_schedules WHERE id = ?) AND station_name = sa.to_station) <= ? OR
                (SELECT station_order FROM train_stations WHERE train_id = (SELECT train_id FROM train_schedules WHERE id = ?) AND station_name = sa.from_station) >= ?
            )
        `, [scheduleId, scheduleId, scheduleId, seat.id, scheduleId, scheduleId, from_order, scheduleId, to_order]);
        
        if (conflictRows[0].conflicts === 0) {
            console.log(`  分配座位: ${seat.carriage_number}车厢 ${seat.seat_number}号 (ID: ${seat.id})`);
            return {
                seatId: seat.id,
                seatNumber: seat.seat_number,
                carriageNumber: seat.carriage_number
            };
        }
    }
    
    return null;
}

// 计算价格
async function calculatePrice(connection, trainId, fromStation, toStation, seatType) {
    const [priceRows] = await connection.execute(`
        SELECT price
        FROM prices
        WHERE train_id = ? AND from_station = ? AND to_station = ? AND seat_type = ?
    `, [trainId, fromStation, toStation, seatType]);
    
    return priceRows.length > 0 ? priceRows[0].price : 0;
}

// 验证预订结果
async function verifyBooking(orderId) {
    const connection = await pool.getConnection();
    try {
        // 验证订单
        const [orderRows] = await connection.execute(`
            SELECT * FROM orders WHERE id = ?
        `, [orderId]);
        
        if (orderRows.length === 0) {
            throw new Error('订单未找到');
        }
        
        // 验证座位分配
        const [allocationRows] = await connection.execute(`
            SELECT * FROM seat_allocations WHERE order_id = ?
        `, [orderId]);
        
        if (allocationRows.length === 0) {
            throw new Error('座位分配未找到');
        }
        
        console.log('  ✓ 订单和座位分配验证通过');
        
    } catch (error) {
        console.error('  ✗ 验证失败:', error.message);
    } finally {
        connection.release();
    }
}

// 测试区间冲突
async function testIntervalConflicts() {
    console.log('=== 区间冲突测试 ===');
    
    const connection = await pool.getConnection();
    try {
        // 查询所有座位分配
        const [allocations] = await connection.execute(`
            SELECT sa.id, sa.seat_id, sa.from_station, sa.to_station, 
                   s.seat_number, c.carriage_number,
                   ts_from.station_order as from_order,
                   ts_to.station_order as to_order
            FROM seat_allocations sa
            JOIN seats s ON sa.seat_id = s.id
            JOIN carriages c ON s.carriage_id = c.id
            JOIN train_stations ts_from ON s.carriage_id IN (
                SELECT id FROM carriages WHERE train_id = (
                    SELECT train_id FROM train_schedules WHERE id = sa.schedule_id
                )
            ) AND ts_from.train_id = (
                SELECT train_id FROM train_schedules WHERE id = sa.schedule_id
            ) AND ts_from.station_name = sa.from_station
            JOIN train_stations ts_to ON ts_to.train_id = (
                SELECT train_id FROM train_schedules WHERE id = sa.schedule_id
            ) AND ts_to.station_name = sa.to_station
            WHERE sa.is_deleted = FALSE
            ORDER BY sa.seat_id, sa.from_station
        `);
        
        console.log(`找到 ${allocations.length} 个座位分配:`);
        
        // 检查冲突
        let conflictCount = 0;
        for (let i = 0; i < allocations.length; i++) {
            for (let j = i + 1; j < allocations.length; j++) {
                const alloc1 = allocations[i];
                const alloc2 = allocations[j];
                
                // 相同座位的区间冲突检查
                if (alloc1.seat_id === alloc2.seat_id) {
                    // 检查区间是否冲突
                    const hasConflict = !(alloc1.to_order <= alloc2.from_order || alloc1.from_order >= alloc2.to_order);
                    
                    if (hasConflict) {
                        console.log(`  ✗ 发现冲突: 座位${alloc1.carriage_number}车厢${alloc1.seat_number}号`);
                        console.log(`    区间1: ${alloc1.from_station}(${alloc1.from_order}) -> ${alloc1.to_station}(${alloc1.to_order})`);
                        console.log(`    区间2: ${alloc2.from_station}(${alloc2.from_order}) -> ${alloc2.to_station}(${alloc2.to_order})`);
                        conflictCount++;
                    }
                }
            }
        }
        
        if (conflictCount === 0) {
            console.log('  ✓ 未发现座位区间冲突');
        } else {
            console.log(`  ✗ 发现 ${conflictCount} 个座位区间冲突`);
        }
        
    } catch (error) {
        console.error('区间冲突测试失败:', error);
    } finally {
        connection.release();
    }
}

// 显示最终状态
async function showFinalState() {
    console.log('\n=== 最终状态 ===');
    
    const connection = await pool.getConnection();
    try {
        // 显示所有订单
        const [orders] = await connection.execute(`
            SELECT o.id, o.passenger_name, o.from_station, o.to_station, 
                   o.seat_type, o.price, o.status,
                   sa.seat_id, s.seat_number, c.carriage_number
            FROM orders o
            LEFT JOIN seat_allocations sa ON o.id = sa.order_id AND sa.is_deleted = FALSE
            LEFT JOIN seats s ON sa.seat_id = s.id
            LEFT JOIN carriages c ON s.carriage_id = c.id
            WHERE o.is_deleted = FALSE
            ORDER BY o.id
        `);
        
        console.log('所有订单:');
        orders.forEach(order => {
            console.log(`  订单${order.id}: ${order.passenger_name} | ${order.from_station}->${order.to_station} | ${order.seat_type} | ${order.carriageNumber || '?'}车厢${order.seat_number || '?'}号 | ${order.price}元 | ${order.status}`);
        });
        
        // 显示座位占用情况
        const [seatStats] = await connection.execute(`
            SELECT 
                c.carriage_number,
                s.seat_type,
                COUNT(s.id) as total_seats,
                COUNT(sa.seat_id) as occupied_seats
            FROM carriages c
            JOIN seats s ON c.id = s.carriage_id
            LEFT JOIN seat_allocations sa ON s.id = sa.seat_id AND sa.is_deleted = FALSE
            WHERE c.train_id = 1
            GROUP BY c.carriage_number, s.seat_type
            ORDER BY c.carriage_number, s.seat_type
        `);
        
        console.log('\n座位占用情况:');
        seatStats.forEach(stat => {
            const occupancyRate = (stat.occupied_seats / stat.total_seats * 100).toFixed(1);
            console.log(`  ${stat.carriage_number}车厢 ${stat.seat_type}: ${stat.occupied_seats}/${stat.total_seats} (${occupancyRate}%)`);
        });
        
    } catch (error) {
        console.error('显示最终状态失败:', error);
    } finally {
        connection.release();
    }
}

// 清理测试数据
async function clearTestData() {
    const connection = await pool.getConnection();
    try {
        await connection.execute('DELETE FROM seat_allocations WHERE passenger_id LIKE "11010119900101%"');
        await connection.execute('DELETE FROM orders WHERE passenger_id LIKE "11010119900101%"');
        console.log('测试数据清理完成\n');
    } catch (error) {
        console.error('清理测试数据失败:', error);
    } finally {
        connection.release();
    }
}

// 运行测试
runBookingTests().catch(console.error); 