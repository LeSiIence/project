// 简单的API测试脚本，不依赖外部库
const http = require('http');

function makePostRequest(path, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function testAPI() {
    console.log('=== 测试后端API ===\n');
    
    try {
        // 测试搜索可预订车次
        console.log('1. 测试搜索可预订车次...');
        const searchData = {
            fromStation: '北京',
            toStation: '上海',
            date: '2025-07-17'
        };
        
        const searchResult = await makePostRequest('/search-bookable-trains', searchData);
        
        if (searchResult.success) {
            console.log(`✓ 找到 ${searchResult.data.length} 个可预订车次`);
            
            if (searchResult.data.length > 0) {
                const train = searchResult.data[0];
                console.log(`车次示例: ${train.name}`);
                console.log(`座位类型数量: ${train.seatTypes.length}`);
                
                if (train.seatTypes.length > 0) {
                    const seatType = train.seatTypes[0];
                    console.log(`第一个座位类型: ${seatType.type}, 价格: ¥${seatType.price}, 余票: ${seatType.availableSeats}张\n`);
                    
                    // 测试预订
                    console.log('2. 测试预订...');
                    const bookingData = {
                        trainId: train.id,
                        seatType: seatType.type,
                        passengerName: '测试用户',
                        passengerId: '123456789012345678',
                        fromStation: '北京',
                        toStation: '上海',
                        date: '2025-07-17'
                    };
                    
                    const bookingResult = await makePostRequest('/book', bookingData);
                    
                    if (bookingResult.success) {
                        console.log('✓ 预订成功!');
                        console.log(`订单ID: ${bookingResult.data.orderId}`);
                        console.log(`座位: ${bookingResult.data.carriageNumber}车厢 ${bookingResult.data.seatNumber}号`);
                        console.log(`价格: ¥${bookingResult.data.price}`);
                        console.log('\n✅ 前端与后端集成测试通过！');
                    } else {
                        console.log('✗ 预订失败:', bookingResult.message);
                    }
                }
            } else {
                console.log('⚠ 没有找到可预订车次');
            }
        } else {
            console.log('✗ 搜索失败:', searchResult.message);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testAPI(); 