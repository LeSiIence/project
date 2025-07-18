// 更新列车时刻表脚本 - 提供多样化的发车时间
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

// 更新后的多样化时刻表数据
const newTrainSchedules = {
    // G101: 北京 → 上海 (高速动车)
    1: [
        { station: '北京', order: 1, arrival: null, departure: '06:30:00', distance: 0 },
        { station: '天津', order: 2, arrival: '07:05:00', departure: '07:07:00', distance: 137 },
        { station: '济南', order: 3, arrival: '08:52:00', departure: '08:54:00', distance: 497 },
        { station: '南京', order: 4, arrival: '11:28:00', departure: '11:32:00', distance: 1023 },
        { station: '上海', order: 5, arrival: '12:58:00', departure: null, distance: 1318 }
    ],
    
    // G102: 上海 → 北京 (高速动车)
    2: [
        { station: '上海', order: 1, arrival: null, departure: '07:45:00', distance: 0 },
        { station: '南京', order: 2, arrival: '09:17:00', departure: '09:21:00', distance: 295 },
        { station: '济南', order: 3, arrival: '12:03:00', departure: '12:05:00', distance: 821 },
        { station: '天津', order: 4, arrival: '13:57:00', departure: '13:59:00', distance: 1181 },
        { station: '北京', order: 5, arrival: '14:33:00', departure: null, distance: 1318 }
    ],
    
    // D201: 广州 → 深圳 (动车)
    3: [
        { station: '广州', order: 1, arrival: null, departure: '08:15:00', distance: 0 },
        { station: '深圳', order: 2, arrival: '09:45:00', departure: null, distance: 140 }
    ],
    
    // K301: 西安 → 成都 (快速列车)
    4: [
        { station: '西安', order: 1, arrival: null, departure: '20:30:00', distance: 0 },
        { station: '成都', order: 2, arrival: '09:15:00', departure: null, distance: 842 }
    ]
};

// 新增更多车次的时刻表
const additionalTrains = [
    // G103: 北京 → 上海 (下午班次)
    {
        name: 'G103',
        from_station: '北京',
        to_station: '上海',
        schedule: [
            { station: '北京', order: 1, arrival: null, departure: '14:20:00', distance: 0 },
            { station: '天津', order: 2, arrival: '14:55:00', departure: '14:57:00', distance: 137 },
            { station: '济南', order: 3, arrival: '16:42:00', departure: '16:44:00', distance: 497 },
            { station: '南京', order: 4, arrival: '19:18:00', departure: '19:22:00', distance: 1023 },
            { station: '上海', order: 5, arrival: '20:48:00', departure: null, distance: 1318 }
        ]
    },
    
    // G104: 上海 → 北京 (晚班)
    {
        name: 'G104',
        from_station: '上海',
        to_station: '北京',
        schedule: [
            { station: '上海', order: 1, arrival: null, departure: '16:35:00', distance: 0 },
            { station: '南京', order: 2, arrival: '18:07:00', departure: '18:11:00', distance: 295 },
            { station: '济南', order: 3, arrival: '20:53:00', departure: '20:55:00', distance: 821 },
            { station: '天津', order: 4, arrival: '22:47:00', departure: '22:49:00', distance: 1181 },
            { station: '北京', order: 5, arrival: '23:23:00', departure: null, distance: 1318 }
        ]
    },
    
    // D301: 广州 → 深圳 (早班)
    {
        name: 'D301',
        from_station: '广州',
        to_station: '深圳',
        schedule: [
            { station: '广州', order: 1, arrival: null, departure: '06:00:00', distance: 0 },
            { station: '深圳', order: 2, arrival: '07:30:00', departure: null, distance: 140 }
        ]
    },
    
    // D302: 深圳 → 广州 (返程)
    {
        name: 'D302',
        from_station: '深圳',
        to_station: '广州',
        schedule: [
            { station: '深圳', order: 1, arrival: null, departure: '10:20:00', distance: 0 },
            { station: '广州', order: 2, arrival: '11:50:00', departure: null, distance: 140 }
        ]
    },
    
    // K401: 西安 → 成都 (早班快车)
    {
        name: 'K401',
        from_station: '西安',
        to_station: '成都',
        schedule: [
            { station: '西安', order: 1, arrival: null, departure: '10:45:00', distance: 0 },
            { station: '成都', order: 2, arrival: '23:30:00', departure: null, distance: 842 }
        ]
    }
];

async function updateTrainSchedules() {
    const connection = await pool.getConnection();
    
    try {
        console.log('=== 更新列车时刻表 ===\n');
        
        await connection.beginTransaction();
        
        // 1. 更新现有列车的时刻表
        console.log('1. 更新现有列车时刻表...');
        for (const [trainId, schedules] of Object.entries(newTrainSchedules)) {
            // 删除旧的时刻表数据
            await connection.execute(
                'DELETE FROM train_stations WHERE train_id = ?',
                [trainId]
            );
            
            // 插入新的时刻表数据
            for (const schedule of schedules) {
                await connection.execute(
                    'INSERT INTO train_stations (train_id, station_name, station_order, arrival_time, departure_time, distance_km) VALUES (?, ?, ?, ?, ?, ?)',
                    [trainId, schedule.station, schedule.order, schedule.arrival, schedule.departure, schedule.distance]
                );
            }
            
            console.log(`✓ 更新了车次ID ${trainId} 的时刻表`);
        }
        
        // 2. 添加新的列车和时刻表
        console.log('\n2. 添加新的列车和时刻表...');
        for (const train of additionalTrains) {
            // 检查列车是否已存在
            const [existingTrain] = await connection.execute(
                'SELECT id FROM trains WHERE name = ?',
                [train.name]
            );
            
            let trainId;
            if (existingTrain.length > 0) {
                trainId = existingTrain[0].id;
                console.log(`列车 ${train.name} 已存在，更新时刻表...`);
                
                // 删除旧的时刻表
                await connection.execute(
                    'DELETE FROM train_stations WHERE train_id = ?',
                    [trainId]
                );
            } else {
                // 插入新列车
                const [result] = await connection.execute(
                    'INSERT INTO trains (name, from_station, to_station) VALUES (?, ?, ?)',
                    [train.name, train.from_station, train.to_station]
                );
                trainId = result.insertId;
                console.log(`✓ 添加了新列车 ${train.name}`);
            }
            
            // 插入时刻表
            for (const schedule of train.schedule) {
                await connection.execute(
                    'INSERT INTO train_stations (train_id, station_name, station_order, arrival_time, departure_time, distance_km) VALUES (?, ?, ?, ?, ?, ?)',
                    [trainId, schedule.station, schedule.order, schedule.arrival, schedule.departure, schedule.distance]
                );
            }
            
            // 为新列车添加车厢配置（如果不存在）
            const [existingCarriages] = await connection.execute(
                'SELECT COUNT(*) as count FROM carriages WHERE train_id = ?',
                [trainId]
            );
            
            if (existingCarriages[0].count === 0) {
                // 添加基本车厢配置
                const carriageTypes = train.name.startsWith('G') 
                    ? [
                        { number: '1', seatType: '一等座', totalSeats: 50 },
                        { number: '2', seatType: '二等座', totalSeats: 100 },
                        { number: '3', seatType: '二等座', totalSeats: 100 }
                    ]
                    : train.name.startsWith('D')
                    ? [
                        { number: '1', seatType: '一等座', totalSeats: 45 },
                        { number: '2', seatType: '二等座', totalSeats: 90 }
                    ]
                    : [
                        { number: '1', seatType: '硬卧', totalSeats: 60 },
                        { number: '2', seatType: '软卧', totalSeats: 30 }
                    ];
                
                for (const carriage of carriageTypes) {
                    const [carriageResult] = await connection.execute(
                        'INSERT INTO carriages (train_id, carriage_number, seat_type, total_seats) VALUES (?, ?, ?, ?)',
                        [trainId, carriage.number, carriage.seatType, carriage.totalSeats]
                    );
                    
                    const carriageId = carriageResult.insertId;
                    
                    // 添加座位
                    for (let i = 1; i <= carriage.totalSeats; i++) {
                        const seatNumber = String(i).padStart(2, '0') + (carriage.seatType.includes('卧') ? '' : ['A', 'B', 'C', 'D', 'F'][i % 5]);
                        await connection.execute(
                            'INSERT INTO seats (carriage_id, seat_number, seat_type) VALUES (?, ?, ?)',
                            [carriageId, seatNumber, carriage.seatType]
                        );
                    }
                }
                
                console.log(`✓ 为列车 ${train.name} 添加了车厢和座位配置`);
            }
            
            // 添加价格配置（如果不存在）
            const [existingPrices] = await connection.execute(
                'SELECT COUNT(*) as count FROM prices WHERE train_id = ?',
                [trainId]
            );
            
            if (existingPrices[0].count === 0) {
                const basePrice = train.name.startsWith('G') ? 550 : train.name.startsWith('D') ? 180 : 280;
                const priceData = [
                    [trainId, train.from_station, train.to_station, '一等座', basePrice],
                    [trainId, train.from_station, train.to_station, '二等座', basePrice * 0.65],
                    [trainId, train.from_station, train.to_station, '硬卧', basePrice * 0.8],
                    [trainId, train.from_station, train.to_station, '软卧', basePrice * 1.2]
                ];
                
                for (const price of priceData) {
                    try {
                        await connection.execute(
                            'INSERT INTO prices (train_id, from_station, to_station, seat_type, price) VALUES (?, ?, ?, ?, ?)',
                            price
                        );
                    } catch (error) {
                        // 忽略重复价格配置错误
                    }
                }
                
                console.log(`✓ 为列车 ${train.name} 添加了价格配置`);
            }
            
            // 为新列车生成时刻表安排
            const today = new Date('2025-07-17');
            for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                
                try {
                    await connection.execute(
                        'INSERT INTO train_schedules (train_id, departure_date) VALUES (?, ?)',
                        [trainId, dateStr]
                    );
                } catch (error) {
                    // 忽略重复的时刻表安排错误
                }
            }
        }
        
        await connection.commit();
        
        console.log('\n=== 时刻表更新完成 ===');
        console.log('✅ 所有列车时刻表已更新为多样化时间');
        console.log('✅ 新增了更多班次选择');
        console.log('✅ 涵盖早班、午班、晚班等不同时段');
        
        // 显示更新后的时刻表摘要
        console.log('\n📋 更新后的时刻表摘要：');
        const [trains] = await connection.execute(`
            SELECT t.name, t.from_station, t.to_station, 
                   ts_start.departure_time as start_time,
                   ts_end.arrival_time as end_time
            FROM trains t
            JOIN train_stations ts_start ON t.id = ts_start.train_id AND ts_start.station_order = 1
            JOIN train_stations ts_end ON t.id = ts_end.train_id AND ts_end.station_order = (
                SELECT MAX(station_order) FROM train_stations WHERE train_id = t.id
            )
            ORDER BY t.name
        `);
        
        for (const train of trains) {
            console.log(`${train.name}: ${train.from_station} ${train.start_time} → ${train.to_station} ${train.end_time}`);
        }
        
    } catch (error) {
        await connection.rollback();
        console.error('更新失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 主函数
async function main() {
    try {
        await updateTrainSchedules();
        console.log('\n🎉 时刻表更新成功！现在您有更多样化的出行时间选择。');
        console.log('\n💡 提示：重启后端服务以加载新的时刻表数据。');
    } catch (error) {
        console.error('脚本执行失败:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// 运行脚本
main(); 