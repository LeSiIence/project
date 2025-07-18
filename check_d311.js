// 检查D311车次的脚本
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

async function checkD311() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('=== 检查D311车次信息 ===\n');
        
        // 1. 查询所有车次的基本信息
        console.log('1. 所有车次基本信息:');
        const [trains] = await connection.execute('SELECT * FROM trains ORDER BY id');
        trains.forEach(train => {
            console.log(`ID: ${train.id}, 车次: ${train.name}, 路线: ${train.from_station} -> ${train.to_station}`);
        });
        
        // 2. 查询D311的时刻表信息
        console.log('\n2. D311车次时刻表信息:');
        const [d311Schedules] = await connection.execute(`
            SELECT ts.*, t.name as train_name 
            FROM train_schedules ts 
            JOIN trains t ON ts.train_id = t.id 
            WHERE t.name = 'D311'
        `);
        
        if (d311Schedules.length > 0) {
            console.log('D311时刻表:');
            d311Schedules.forEach(schedule => {
                console.log(`  ID: ${schedule.id}, 车次ID: ${schedule.train_id}, 日期: ${schedule.departure_date}`);
            });
        } else {
            console.log('❌ 未找到D311的时刻表信息');
        }
        
        // 3. 查询所有时刻表，按日期分组
        console.log('\n3. 所有时刻表按日期分组:');
        const [allSchedules] = await connection.execute(`
            SELECT ts.departure_date, COUNT(*) as train_count, GROUP_CONCAT(t.name) as train_names
            FROM train_schedules ts 
            JOIN trains t ON ts.train_id = t.id 
            GROUP BY ts.departure_date 
            ORDER BY ts.departure_date
        `);
        
        allSchedules.forEach(schedule => {
            console.log(`  日期: ${schedule.departure_date}, 车次数: ${schedule.train_count}`);
            console.log(`    车次: ${schedule.train_names}`);
        });
        
        // 4. 检查D311的站点信息
        console.log('\n4. D311车次站点信息:');
        const [d311Stations] = await connection.execute(`
            SELECT ts.*, t.name as train_name
            FROM train_stations ts 
            JOIN trains t ON ts.train_id = t.id 
            WHERE t.name = 'D311'
            ORDER BY ts.station_order
        `);
        
        if (d311Stations.length > 0) {
            console.log('D311经停站:');
            d311Stations.forEach(station => {
                console.log(`  顺序: ${station.station_order}, 站名: ${station.station_name}, 到达: ${station.arrival_time}, 出发: ${station.departure_time}`);
            });
        } else {
            console.log('❌ 未找到D311的站点信息');
        }
        
        // 5. 检查D311的车厢和座位信息
        console.log('\n5. D311车次车厢和座位信息:');
        const [d311Carriages] = await connection.execute(`
            SELECT c.*, COUNT(s.id) as seat_count
            FROM carriages c 
            LEFT JOIN seats s ON c.id = s.carriage_id
            JOIN trains t ON c.train_id = t.id 
            WHERE t.name = 'D311'
            GROUP BY c.id
            ORDER BY c.carriage_number
        `);
        
        if (d311Carriages.length > 0) {
            console.log('D311车厢信息:');
            d311Carriages.forEach(carriage => {
                console.log(`  车厢: ${carriage.carriage_number}, 座位类型: ${carriage.seat_type}, 座位数: ${carriage.seat_count}`);
            });
        } else {
            console.log('❌ 未找到D311的车厢信息');
        }
        
        // 6. 比较D311和G101的差异
        console.log('\n6. D311与G101的比较:');
        const [comparison] = await connection.execute(`
            SELECT 
                t.name as train_name,
                COUNT(DISTINCT ts.id) as schedule_count,
                COUNT(DISTINCT c.id) as carriage_count,
                COUNT(DISTINCT s.id) as seat_count,
                GROUP_CONCAT(DISTINCT ts.departure_date) as available_dates
            FROM trains t
            LEFT JOIN train_schedules ts ON t.id = ts.train_id
            LEFT JOIN carriages c ON t.id = c.train_id
            LEFT JOIN seats s ON c.id = s.carriage_id
            WHERE t.name IN ('D311', 'G101')
            GROUP BY t.id, t.name
        `);
        
        comparison.forEach(comp => {
            console.log(`  车次: ${comp.train_name}`);
            console.log(`    时刻表数量: ${comp.schedule_count}`);
            console.log(`    车厢数量: ${comp.carriage_count}`);
            console.log(`    座位数量: ${comp.seat_count}`);
            console.log(`    可用日期: ${comp.available_dates}`);
        });
        
        // 7. 测试D311的可预订性
        console.log('\n7. 测试D311预订查询:');
        
        // 检查2025-07-18的D311
        const [d311Search] = await connection.execute(`
            SELECT DISTINCT t.id, t.name, t.from_station, t.to_station, ts.id as schedule_id, ts.departure_date
            FROM trains t
            JOIN train_schedules ts ON t.id = ts.train_id
            JOIN train_stations ts1 ON t.id = ts1.train_id AND ts1.station_name = '北京'
            JOIN train_stations ts2 ON t.id = ts2.train_id AND ts2.station_name = '上海'
            WHERE t.name = 'D311' AND ts.departure_date = '2025-07-18'
            AND ts1.station_order < ts2.station_order
        `);
        
        if (d311Search.length > 0) {
            console.log('✓ D311在2025-07-18可以从北京到上海');
            console.log(`  车次ID: ${d311Search[0].id}, 时刻表ID: ${d311Search[0].schedule_id}`);
            
            // 检查座位类型
            const [d311SeatTypes] = await connection.execute(`
                SELECT DISTINCT seat_type
                FROM carriages
                WHERE train_id = ?
            `, [d311Search[0].id]);
            
            console.log(`  可用座位类型: ${d311SeatTypes.map(st => st.seat_type).join(', ')}`);
            
        } else {
            console.log('❌ D311在2025-07-18无法从北京到上海');
        }
        
    } catch (error) {
        console.error('❌ 查询失败:', error);
    } finally {
        await connection.end();
    }
}

checkD311(); 