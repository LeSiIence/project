// 测试book API的脚本
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
                console.log(`HTTP状态码: ${res.statusCode}`);
                console.log(`响应头:`, res.headers);
                console.log(`响应内容:`, data);
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        console.log(`请求路径: ${path}`);
        console.log(`请求数据:`, postData);
        req.write(postData);
        req.end();
    });
}

async function testBookAPI() {
    console.log('=== 测试book API ===\n');
    
    try {
        // 先搜索可预订车次
        console.log('1. 搜索可预订车次...');
        const searchResult = await makePostRequest('/search-bookable-trains', {
            fromStation: '北京',
            toStation: '上海',
            date: '2025-07-17'
        });
        
        if (searchResult.status === 200 && searchResult.data.success) {
            console.log(`✓ 找到 ${searchResult.data.data.length} 个可预订车次\n`);
            
            if (searchResult.data.data.length > 0) {
                const train = searchResult.data.data[0];
                const seatType = train.seatTypes[0];
                
                console.log('2. 测试预订车票...');
                const bookingData = {
                    trainId: train.id,
                    seatType: seatType.type,
                    passengerName: '测试用户',
                    passengerId: '123456789012345678',
                    fromStation: '北京',
                    toStation: '上海',
                    date: '2025-07-17'
                };
                
                const bookResult = await makePostRequest('/book', bookingData);
                
                if (bookResult.status === 200) {
                    console.log('✓ 预订API调用成功');
                    if (bookResult.data.success) {
                        console.log('✓ 预订成功:', bookResult.data.data);
                    } else {
                        console.log('✗ 预订失败:', bookResult.data.message);
                    }
                } else {
                    console.log(`✗ 预订API返回错误状态码: ${bookResult.status}`);
                }
            }
        } else {
            console.log('搜索车次失败');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testBookAPI(); 