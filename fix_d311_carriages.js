// 为D311车次添加车厢和座位数据
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
    }
    
    return seatNumbers;
}

async function fixD311Carriages() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('=== 为D311车次添加车厢和座位数据 ===\n');
        
        // 1. 检查D311是否存在
        const [d311Train] = await connection.execute(`
            SELECT id, name FROM trains WHERE name = 'D311'
        `);
        
        if (d311Train.length === 0) {
            console.log('❌ 未找到D311车次');
            return;
        }
        
        const trainId = d311Train[0].id;
        console.log(`✓ 找到D311车次，ID: ${trainId}`);
        
        // 2. 检查是否已有车厢数据
        const [existingCarriages] = await connection.execute(`
            SELECT COUNT(*) as count FROM carriages WHERE train_id = ?
        `, [trainId]);
        
        if (existingCarriages[0].count > 0) {
            console.log(`⚠ D311已有 ${existingCarriages[0].count} 个车厢，删除后重新创建...`);
            
            // 删除现有的座位和车厢数据
            await connection.execute(`
                DELETE s FROM seats s 
                JOIN carriages c ON s.carriage_id = c.id 
                WHERE c.train_id = ?
            `, [trainId]);
            
            await connection.execute(`
                DELETE FROM carriages WHERE train_id = ?
            `, [trainId]);
            
            console.log('✓ 已删除现有车厢和座位数据');
        }
        
        // 3. 为D311添加车厢数据
        console.log('\n添加D311车厢数据...');
        const carriagesData = [
            // D311 - 动车组配置
            [trainId, '01', '二等座', 100],
            [trainId, '02', '二等座', 100], 
            [trainId, '03', '一等座', 60],
            [trainId, '04', '商务座', 24]
        ];
        
        const carriageIds = [];
        
        for (const [tId, carriageNum, seatType, totalSeats] of carriagesData) {
            const [result] = await connection.execute(
                'INSERT INTO carriages (train_id, carriage_number, seat_type, total_seats) VALUES (?, ?, ?, ?)',
                [tId, carriageNum, seatType, totalSeats]
            );
            carriageIds.push({
                id: result.insertId,
                carriage_number: carriageNum,
                seat_type: seatType,
                total_seats: totalSeats
            });
            console.log(`  ✓ 添加车厢 ${carriageNum} (${seatType}, ${totalSeats}座)`);
        }
        
        // 4. 为每个车厢添加座位数据
        console.log('\n添加D311座位数据...');
        let totalSeatsAdded = 0;
        
        for (const carriage of carriageIds) {
            const seatNumbers = generateSeatNumbers(carriage.seat_type, carriage.total_seats);
            
            console.log(`  添加车厢 ${carriage.carriage_number} (${carriage.seat_type}) 的 ${seatNumbers.length} 个座位...`);
            
            for (const seatNumber of seatNumbers) {
                await connection.execute(
                    'INSERT INTO seats (carriage_id, seat_number, seat_type) VALUES (?, ?, ?)',
                    [carriage.id, seatNumber, carriage.seat_type]
                );
                totalSeatsAdded++;
            }
            
            console.log(`    ✓ 完成车厢 ${carriage.carriage_number}`);
        }
        
        console.log(`\n✓ 总共添加了 ${totalSeatsAdded} 个座位`);
        
        // 5. 为D311添加价格数据
        console.log('\n添加D311价格数据...');
        const pricesData = [
            // D311 价格 (北京 -> 上海)
            [trainId, '北京', '天津', '二等座', 54.50],
            [trainId, '北京', '天津', '一等座', 87.00],
            [trainId, '北京', '天津', '商务座', 163.50],
            [trainId, '北京', '济南', '二等座', 184.50],
            [trainId, '北京', '济南', '一等座', 295.00],
            [trainId, '北京', '济南', '商务座', 553.50],
            [trainId, '北京', '南京', '二等座', 443.50],
            [trainId, '北京', '南京', '一等座', 709.50],
            [trainId, '北京', '南京', '商务座', 1331.50],
            [trainId, '北京', '上海', '二等座', 553.00],
            [trainId, '北京', '上海', '一等座', 884.50],
            [trainId, '北京', '上海', '商务座', 1657.50],
            [trainId, '天津', '济南', '二等座', 130.00],
            [trainId, '天津', '济南', '一等座', 208.00],
            [trainId, '天津', '济南', '商务座', 390.00],
            [trainId, '天津', '南京', '二等座', 389.00],
            [trainId, '天津', '南京', '一等座', 622.50],
            [trainId, '天津', '南京', '商务座', 1168.00],
            [trainId, '天津', '上海', '二等座', 498.50],
            [trainId, '天津', '上海', '一等座', 797.50],
            [trainId, '天津', '上海', '商务座', 1494.00],
            [trainId, '济南', '南京', '二等座', 259.00],
            [trainId, '济南', '南京', '一等座', 414.50],
            [trainId, '济南', '南京', '商务座', 778.00],
            [trainId, '济南', '上海', '二等座', 368.50],
            [trainId, '济南', '上海', '一等座', 589.50],
            [trainId, '济南', '上海', '商务座', 1104.00],
            [trainId, '南京', '上海', '二等座', 109.50],
            [trainId, '南京', '上海', '一等座', 175.00],
            [trainId, '南京', '上海', '商务座', 326.00]
        ];
        
        // 删除现有价格数据（如果有的话）
        await connection.execute(`
            DELETE FROM prices WHERE train_id = ?
        `, [trainId]);
        
        for (const [tId, fromStation, toStation, seatType, price] of pricesData) {
            await connection.execute(
                'INSERT INTO prices (train_id, from_station, to_station, seat_type, price) VALUES (?, ?, ?, ?, ?)',
                [tId, fromStation, toStation, seatType, price]
            );
        }
        
        console.log(`✓ 添加了 ${pricesData.length} 条价格记录`);
        
        // 6. 验证结果
        console.log('\n=== 验证结果 ===');
        
        const [carriageCount] = await connection.execute(`
            SELECT COUNT(*) as count FROM carriages WHERE train_id = ?
        `, [trainId]);
        
        const [seatCount] = await connection.execute(`
            SELECT COUNT(*) as count FROM seats s 
            JOIN carriages c ON s.carriage_id = c.id 
            WHERE c.train_id = ?
        `, [trainId]);
        
        const [priceCount] = await connection.execute(`
            SELECT COUNT(*) as count FROM prices WHERE train_id = ?
        `, [trainId]);
        
        console.log(`✓ D311车厢数量: ${carriageCount[0].count}`);
        console.log(`✓ D311座位数量: ${seatCount[0].count}`);
        console.log(`✓ D311价格记录: ${priceCount[0].count}`);
        
        // 测试搜索功能
        console.log('\n测试D311搜索功能...');
        const [searchResult] = await connection.execute(`
            SELECT DISTINCT seat_type
            FROM carriages
            WHERE train_id = ?
        `, [trainId]);
        
        console.log('✓ D311可用座位类型:', searchResult.map(r => r.seat_type).join(', '));
        
        console.log('\n🎉 D311车次修复完成！现在可以正常预订了。');
        
    } catch (error) {
        console.error('❌ 修复过程中发生错误:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// 运行修复
fixD311Carriages().catch(console.error); 