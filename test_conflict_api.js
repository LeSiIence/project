const http = require('http');

// 测试预订API
function testBookingAPI(passengerName, passengerId, fromStation, toStation) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            trainId: 1,
            seatType: "二等座",
            passengerName: passengerName,
            passengerId: passengerId,
            fromStation: fromStation,
            toStation: toStation,
            date: "2025-07-17"
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/book',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`\n发送预订请求: ${passengerName} (${fromStation} -> ${toStation})`);

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    
                    if (jsonResponse.success) {
                        console.log(`✅ ${passengerName} 预订成功！`);
                        console.log(`  订单ID: ${jsonResponse.data.orderId}`);
                        console.log(`  座位: ${jsonResponse.data.carriageNumber}车厢 ${jsonResponse.data.seatNumber}号`);
                        console.log(`  价格: ${jsonResponse.data.price}元`);
                        resolve(jsonResponse.data);
                    } else {
                        console.log(`❌ ${passengerName} 预订失败！`);
                        console.log(`  错误信息: ${jsonResponse.message}`);
                        resolve(null);
                    }
                } catch (error) {
                    console.log(`解析响应失败: ${error.message}`);
                    reject(error);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`请求失败: ${e.message}`);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

// 查询订单
function getOrders() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/orders',
            method: 'GET'
        };

        console.log('\n查询所有订单...');

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    
                    if (jsonResponse.success) {
                        console.log('\n📋 当前所有订单:');
                        jsonResponse.data.forEach(order => {
                            console.log(`  订单${order.id}: ${order.passengerName} | ${order.fromStation}->${order.toStation} | ${order.carriageNumber}车厢${order.seatNumber}号 | ${order.price}元`);
                        });
                        resolve(jsonResponse.data);
                    } else {
                        console.log(`查询订单失败: ${jsonResponse.message}`);
                        resolve([]);
                    }
                } catch (error) {
                    console.log(`解析响应失败: ${error.message}`);
                    reject(error);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`请求失败: ${e.message}`);
            reject(e);
        });

        req.end();
    });
}

// 运行区间冲突测试
async function runConflictTests() {
    console.log('=== 开始区间冲突测试 ===');
    
    try {
        // 测试1: 相同区间预订 - 应该分配不同座位
        console.log('\n🧪 测试1: 相同区间预订');
        await testBookingAPI('用户A', '110101199001010002', '北京', '上海');
        await testBookingAPI('用户B', '110101199001010003', '北京', '上海');
        
        // 测试2: 部分重叠区间 - 应该分配不同座位
        console.log('\n🧪 测试2: 部分重叠区间');
        await testBookingAPI('用户C', '110101199001010004', '北京', '南京');
        await testBookingAPI('用户D', '110101199001010005', '苏州', '上海');
        
        // 测试3: 不重叠区间 - 可以使用相同座位
        console.log('\n🧪 测试3: 不重叠区间（可能共用座位）');
        await testBookingAPI('用户E', '110101199001010006', '北京', '南京');
        await testBookingAPI('用户F', '110101199001010007', '苏州', '上海');
        
        // 查询所有订单
        await getOrders();
        
        console.log('\n✅ 区间冲突测试完成！');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 运行测试
runConflictTests(); 