const http = require('http');

// 测试预订API
function testBookingAPI() {
    const postData = JSON.stringify({
        trainId: 1,
        seatType: "二等座",
        passengerName: "API测试用户",
        passengerId: "110101199001010001",
        fromStation: "北京",
        toStation: "上海",
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

    console.log('发送预订请求...');
    console.log('请求数据:', postData);

    const req = http.request(options, (res) => {
        console.log(`状态码: ${res.statusCode}`);
        console.log(`响应头: ${JSON.stringify(res.headers)}`);

        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            console.log('响应数据:');
            try {
                const jsonResponse = JSON.parse(responseData);
                console.log(JSON.stringify(jsonResponse, null, 2));
                
                if (jsonResponse.success) {
                    console.log('\n✅ 预订成功！');
                    console.log(`订单ID: ${jsonResponse.data.orderId}`);
                    console.log(`座位: ${jsonResponse.data.carriageNumber}车厢 ${jsonResponse.data.seatNumber}号`);
                    console.log(`价格: ${jsonResponse.data.price}元`);
                } else {
                    console.log('\n❌ 预订失败！');
                    console.log(`错误信息: ${jsonResponse.message}`);
                }
            } catch (error) {
                console.log('解析响应JSON失败:', error.message);
                console.log('原始响应:', responseData);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`请求失败: ${e.message}`);
        console.log('请确保后端服务器已启动 (node back-end.js)');
    });

    req.write(postData);
    req.end();
}

// 运行测试
testBookingAPI(); 