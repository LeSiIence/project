// 测试D311预订功能
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
                    resolve({ status: res.statusCode, data: jsonData });
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

async function testD311Booking() {
    console.log('=== 测试D311预订功能 ===\n');
    
    try {
        // 1. 测试2025-07-18搜索D311
        console.log('1. 搜索2025-07-18的D311车次...');
        const searchResult = await makePostRequest('/search-bookable-trains', {
            fromStation: '北京',
            toStation: '上海',
            date: '2025-07-18'
        });
        
        if (searchResult.status === 200 && searchResult.data.success) {
            console.log(`✓ 找到 ${searchResult.data.data.length} 个可预订车次`);
            
            // 寻找D311
            const d311 = searchResult.data.data.find(train => train.name === 'D311');
            
            if (d311) {
                console.log(`✓ 找到D311车次!`);
                console.log(`  车次ID: ${d311.id}`);
                console.log(`  时刻表ID: ${d311.scheduleId}`);
                console.log(`  座位类型: ${d311.seatTypes.map(st => st.type).join(', ')}`);
                
                // 选择第一个座位类型进行预订
                const seatType = d311.seatTypes[0];
                console.log(`\n2. 预订D311 ${seatType.type} (价格: ¥${seatType.price}, 余票: ${seatType.availableSeats}张)...`);
                
                const bookingResult = await makePostRequest('/book', {
                    trainId: d311.id,
                    seatType: seatType.type,
                    passengerName: 'D311测试用户',
                    passengerId: '123456789012345678',
                    fromStation: '北京',
                    toStation: '上海',
                    date: '2025-07-18'
                });
                
                if (bookingResult.status === 200 && bookingResult.data.success) {
                    console.log('✓ D311预订成功!');
                    console.log(`  订单ID: ${bookingResult.data.data.orderId}`);
                    console.log(`  座位: ${bookingResult.data.data.carriageNumber}车厢 ${bookingResult.data.data.seatNumber}号`);
                    console.log(`  价格: ¥${bookingResult.data.data.price}`);
                    console.log(`  状态: ${bookingResult.data.data.status}`);
                    
                    // 3. 测试不同日期
                    console.log('\n3. 测试D311在其他日期的可预订性...');
                    const testDates = ['2025-07-17', '2025-07-19', '2025-07-20', '2025-07-25'];
                    
                    for (const testDate of testDates) {
                        const testSearchResult = await makePostRequest('/search-bookable-trains', {
                            fromStation: '北京',
                            toStation: '上海',
                            date: testDate
                        });
                        
                        if (testSearchResult.status === 200 && testSearchResult.data.success) {
                            const hasD311 = testSearchResult.data.data.some(train => train.name === 'D311');
                            console.log(`  ${testDate}: ${hasD311 ? '✓ 有D311' : '✗ 无D311'}`);
                        }
                    }
                    
                    console.log('\n🎉 D311测试完成，功能正常！');
                    
                } else {
                    console.log('✗ D311预订失败:', bookingResult.data.message);
                }
                
            } else {
                console.log('✗ 在搜索结果中未找到D311车次');
                console.log('可用车次:', searchResult.data.data.map(t => t.name).join(', '));
            }
        } else {
            console.log('✗ 搜索失败:', searchResult.data.message);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testD311Booking(); 