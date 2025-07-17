// MySQL数据库快速测试脚本
const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'gnx051103',
    database: 'train_ticket_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 测试函数
async function testMySQL() {
    console.log('=== MySQL 数据库测试 ===\n');
    
    try {
        // 1. 测试数据库连接
        console.log('1. 测试数据库连接...');
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        console.log('✅ 数据库连接成功');
        
        // 2. 创建数据库
        console.log('2. 创建数据库...');
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log('✅ 数据库创建成功');
        
        await connection.end();
        
        // 3. 创建连接池
        console.log('3. 创建连接池...');
        const pool = mysql.createPool(dbConfig);
        console.log('✅ 连接池创建成功');
        
        // 4. 创建表结构
        console.log('4. 创建表结构...');
        await createTables(pool);
        console.log('✅ 表结构创建成功');
        
        // 5. 插入测试数据
        console.log('5. 插入测试数据...');
        await insertTestData(pool);
        console.log('✅ 测试数据插入成功');
        
        // 6. 查询测试
        console.log('6. 执行查询测试...');
        await queryTests(pool);
        console.log('✅ 查询测试完成');
        
        // 7. 插入和删除测试
        console.log('7. 执行插入和删除测试...');
        await insertDeleteTests(pool);
        console.log('✅ 插入和删除测试完成');
        
        // 8. 事务测试
        console.log('8. 执行事务测试...');
        await transactionTests(pool);
        console.log('✅ 事务测试完成');
        
        await pool.end();
        
        console.log('\n🎉 所有测试通过！MySQL数据库配置正确。');
        console.log('现在可以启动服务器了：');
        console.log('命令：node back-end.js');
        console.log('或者：start-mysql-server.bat');
        console.log('或者：start-mysql-server.ps1');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('\n故障排除建议:');
        console.error('1. 确保MySQL服务已启动: net start mysql');
        console.error('2. 检查MySQL用户名和密码配置');
        console.error('3. 确认端口3306是否开放');
        console.error('4. 安装mysql2依赖: npm install mysql2');
        process.exit(1);
    }
}

// 创建表结构
async function createTables(pool) {
    const connection = await pool.getConnection();
    try {
        // 创建火车表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS trains (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(10) NOT NULL,
                from_station VARCHAR(50) NOT NULL,
                to_station VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        
    } finally {
        connection.release();
    }
}

// 插入测试数据
async function insertTestData(pool) {
    const connection = await pool.getConnection();
    try {
        // 检查是否已有数据
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM trains');
        if (rows[0].count > 0) {
            console.log('  测试数据已存在，跳过插入');
            return;
        }
        
        // 插入火车数据
        await connection.execute(`
            INSERT INTO trains (name, from_station, to_station) VALUES
            ('G101', '北京', '上海'),
            ('G102', '上海', '北京'),
            ('D201', '广州', '深圳')
        `);
        
        // 插入席位类型数据
        const seatTypesData = [
            [1, '二等座', 500, 80, 80],
            [1, '一等座', 800, 20, 20],
            [1, '商务座', 1500, 10, 10],
            [2, '二等座', 500, 80, 80],
            [2, '一等座', 800, 20, 20],
            [3, '二等座', 50, 100, 100]
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
            [1, '济南', '二等座', 200],
            [1, '南京', '二等座', 350]
        ];
        
        for (const stop of stopsData) {
            await connection.execute(
                'INSERT INTO stops (train_id, station, seat_type, price) VALUES (?, ?, ?, ?)',
                stop
            );
        }
        
    } finally {
        connection.release();
    }
}

// 查询测试
async function queryTests(pool) {
    const connection = await pool.getConnection();
    try {
        // 查询火车信息
        const [trains] = await connection.execute(`
            SELECT t.id, t.name, t.from_station, t.to_station,
                   st.type, st.price, st.available_seats
            FROM trains t
            JOIN seat_types st ON t.id = st.train_id
            ORDER BY t.id, st.type
        `);
        
        console.log(`  查询到 ${trains.length} 条火车座位信息`);
        
        // 查询经停站信息
        const [stops] = await connection.execute(`
            SELECT s.train_id, s.station, s.seat_type, s.price
            FROM stops s
            ORDER BY s.train_id, s.station
        `);
        
        console.log(`  查询到 ${stops.length} 条经停站信息`);
        
    } finally {
        connection.release();
    }
}

// 插入和删除测试
async function insertDeleteTests(pool) {
    const connection = await pool.getConnection();
    try {
        // 插入测试订单
        const [result] = await connection.execute(`
            INSERT INTO orders (train_id, from_station, to_station, seat_type, passenger_name, passenger_id, price)
            VALUES (1, '北京', '上海', '二等座', '测试乘客', '123456789012345678', 500.00)
        `);
        
        console.log(`  插入测试订单成功，订单ID: ${result.insertId}`);
        
        // 查询订单
        const [orders] = await connection.execute(`
            SELECT * FROM orders WHERE id = ?
        `, [result.insertId]);
        
        console.log(`  查询到订单: ${orders[0].passenger_name}`);
        
        // 删除测试订单
        await connection.execute(`
            DELETE FROM orders WHERE id = ?
        `, [result.insertId]);
        
        console.log(`  删除测试订单成功`);
        
    } finally {
        connection.release();
    }
}

// 事务测试
async function transactionTests(pool) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // 插入订单
        const [orderResult] = await connection.execute(`
            INSERT INTO orders (train_id, from_station, to_station, seat_type, passenger_name, passenger_id, price)
            VALUES (1, '北京', '上海', '二等座', '事务测试', '987654321098765432', 500.00)
        `);
        
        // 更新余票
        await connection.execute(`
            UPDATE seat_types SET available_seats = available_seats - 1
            WHERE train_id = 1 AND type = '二等座'
        `);
        
        // 提交事务
        await connection.commit();
        
        console.log(`  事务提交成功，订单ID: ${orderResult.insertId}`);
        
        // 清理测试数据
        await connection.execute(`
            DELETE FROM orders WHERE id = ?
        `, [orderResult.insertId]);
        
        await connection.execute(`
            UPDATE seat_types SET available_seats = available_seats + 1
            WHERE train_id = 1 AND type = '二等座'
        `);
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 运行测试
if (require.main === module) {
    testMySQL();
}

module.exports = { testMySQL }; 