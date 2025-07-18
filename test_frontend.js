// 前端测试脚本
// 用于验证 HTML 前端与后端的交互

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testFrontendWorkflow() {
    console.log('=== 前端工作流程测试 ===\n');
    
    try {
        // 1. 测试可预订车次查询
        console.log('1. 测试可预订车次查询...');
        const searchResponse = await axios.post(`${API_BASE}/search-bookable-trains`, {
            fromStation: '北京',
            toStation: '上海', 
            date: '2025-07-17'
        });
        
        if (searchResponse.data.success) {
            console.log(`✓ 找到 ${searchResponse.data.data.length} 个可预订车次`);
            
            if (searchResponse.data.data.length > 0) {
                const firstTrain = searchResponse.data.data[0];
                console.log(`车次: ${firstTrain.name}, 可用座位类型: ${firstTrain.seatTypes.length} 个`);
                
                if (firstTrain.seatTypes.length > 0) {
                    const firstSeatType = firstTrain.seatTypes[0];
                    console.log(`第一个座位类型: ${firstSeatType.type}, 价格: ¥${firstSeatType.price}, 余票: ${firstSeatType.availableSeats}张\n`);
                    
                    // 2. 测试预订
                    console.log('2. 测试预订...');
                    const bookingResponse = await axios.post(`${API_BASE}/book`, {
                        trainId: firstTrain.id,
                        seatType: firstSeatType.type,
                        passengerName: '前端测试用户',
                        passengerId: '123456789012345678',
                        fromStation: '北京',
                        toStation: '上海',
                        date: '2025-07-17'
                    });
                    
                    if (bookingResponse.data.success) {
                        const booking = bookingResponse.data.data;
                        console.log('✓ 预订成功!');
                        console.log(`订单ID: ${booking.orderId}`);
                        console.log(`座位: ${booking.carriageNumber}车厢 ${booking.seatNumber}号`);
                        console.log(`价格: ¥${booking.price}`);
                        console.log(`状态: ${booking.status}\n`);
                        
                        // 3. 测试订单查询
                        console.log('3. 测试订单查询...');
                        const ordersResponse = await axios.get(`${API_BASE}/orders?passengerName=前端测试用户`);
                        
                        if (ordersResponse.data.success) {
                            console.log(`✓ 查询到 ${ordersResponse.data.data.length} 个订单`);
                            console.log('前端测试完成，所有功能正常！');
                        } else {
                            console.log('✗ 订单查询失败:', ordersResponse.data.message);
                        }
                    } else {
                        console.log('✗ 预订失败:', bookingResponse.data.message);
                    }
                } else {
                    console.log('⚠ 没有可用的座位类型');
                }
            } else {
                console.log('⚠ 没有找到可预订的车次');
            }
        } else {
            console.log('✗ 查询可预订车次失败:', searchResponse.data.message);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        if (error.response) {
            console.error('响应数据:', error.response.data);
        }
    }
}

// 运行测试
testFrontendWorkflow().catch(console.error); 