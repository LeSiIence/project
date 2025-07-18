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

async function fixDatabaseStructure() {
    const connection = await pool.getConnection();
    
    try {
        console.log('=== 修复数据库表结构 ===\n');
        
        // 检查当前orders表结构
        console.log('检查当前orders表结构...');
        const [currentStructure] = await connection.execute('DESCRIBE orders');
        const fieldNames = currentStructure.map(field => field.Field);
        console.log('当前字段:', fieldNames.join(', '));
        
        // 检查是否需要添加schedule_id字段
        if (!fieldNames.includes('schedule_id')) {
            console.log('\n添加schedule_id字段...');
            await connection.execute(`
                ALTER TABLE orders 
                ADD COLUMN schedule_id INT AFTER id
            `);
            console.log('✓ schedule_id字段添加成功');
            
            // 添加外键约束
            try {
                await connection.execute(`
                    ALTER TABLE orders 
                    ADD FOREIGN KEY (schedule_id) REFERENCES train_schedules(id) ON DELETE CASCADE
                `);
                console.log('✓ schedule_id外键约束添加成功');
            } catch (error) {
                console.log('⚠ 外键约束添加失败:', error.message);
            }
        } else {
            console.log('✓ schedule_id字段已存在');
        }
        
        // 检查是否需要添加status字段
        if (!fieldNames.includes('status')) {
            console.log('\n添加status字段...');
            await connection.execute(`
                ALTER TABLE orders 
                ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed' AFTER price
            `);
            console.log('✓ status字段添加成功');
        } else {
            console.log('✓ status字段已存在');
        }
        
        // 更新现有订单的schedule_id
        console.log('\n检查并更新现有订单的schedule_id...');
        const [nullScheduleOrders] = await connection.execute(`
            SELECT COUNT(*) as count FROM orders WHERE schedule_id IS NULL
        `);
        
        if (nullScheduleOrders[0].count > 0) {
            console.log(`发现 ${nullScheduleOrders[0].count} 个订单的schedule_id为空`);
            
            // 获取第一个时刻表ID作为默认值
            const [schedules] = await connection.execute('SELECT id, train_id FROM train_schedules LIMIT 1');
            
            if (schedules.length > 0) {
                const defaultScheduleId = schedules[0].id;
                await connection.execute(`
                    UPDATE orders SET schedule_id = ? WHERE schedule_id IS NULL
                `, [defaultScheduleId]);
                console.log(`✓ 更新了订单的schedule_id为: ${defaultScheduleId}`);
            } else {
                console.log('⚠ 未找到可用的时刻表ID');
            }
        } else {
            console.log('✓ 所有订单都有有效的schedule_id');
        }
        
        // 验证修复结果
        console.log('\n=== 验证修复结果 ===');
        const [newStructure] = await connection.execute('DESCRIBE orders');
        console.log('修复后的orders表结构:');
        newStructure.forEach(field => {
            console.log(`  ${field.Field} - ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : ''} ${field.Key ? '(' + field.Key + ')' : ''}`);
        });
        
        console.log('\n✅ 数据库表结构修复完成！');
        
    } catch (error) {
        console.error('❌ 修复过程中发生错误:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

// 运行修复
fixDatabaseStructure().catch(console.error); 