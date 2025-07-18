#include <httplib.h>
#include <json/json.h>
#include <iostream>
#include <vector>
#include <map>
#include <string>
#include <chrono>
#include <iomanip>
#include <sstream>

using namespace httplib;
using namespace std;

// 全局变量存储模拟数据
vector<Json::Value> trains;
vector<Json::Value> orders;
int nextOrderId = 1;

// 工具函数：创建成功响应
string createSuccessResponse(const Json::Value& data, const string& message = "操作成功") {
    Json::Value response;
    response["success"] = true;
    response["data"] = data;
    response["message"] = message;
    
    Json::FastWriter writer;
    return writer.write(response);
}

// 工具函数：创建错误响应
string createErrorResponse(const string& message, int status = 500) {
    Json::Value response;
    response["success"] = false;
    response["message"] = message;
    
    Json::FastWriter writer;
    return response.toStyledString();
}

// 工具函数：获取当前时间字符串
string getCurrentTime() {
    auto now = chrono::system_clock::now();
    auto time_t = chrono::system_clock::to_time_t(now);
    auto ms = chrono::duration_cast<chrono::milliseconds>(now.time_since_epoch()) % 1000;
    
    stringstream ss;
    ss << put_time(gmtime(&time_t), "%Y-%m-%dT%H:%M:%S");
    ss << '.' << setfill('0') << setw(3) << ms.count() << "Z";
    return ss.str();
}

// 初始化模拟数据
void initializeMockData() {
    // 初始化火车数据
    Json::Value train1;
    train1["id"] = 1;
    train1["name"] = "G1";
    train1["from"] = "北京";
    train1["to"] = "上海";
    train1["date"] = "2025-07-17";
    
    Json::Value schedule1;
    schedule1["station"] = "北京";
    schedule1["order"] = 1;
    schedule1["arrival"] = Json::Value::null;
    schedule1["departure"] = "08:00";
    schedule1["distance"] = 0;
    
    Json::Value schedule2;
    schedule2["station"] = "上海";
    schedule2["order"] = 2;
    schedule2["arrival"] = "13:00";
    schedule2["departure"] = Json::Value::null;
    schedule2["distance"] = 1318;
    
    Json::Value seatType1;
    seatType1["type"] = "一等座";
    seatType1["price"] = 553.5;
    seatType1["availableSeats"] = 50;
    seatType1["totalSeats"] = 50;
    
    Json::Value seatType2;
    seatType2["type"] = "二等座";
    seatType2["price"] = 553.5;
    seatType2["availableSeats"] = 100;
    seatType2["totalSeats"] = 100;
    
    train1["schedule"].append(schedule1);
    train1["schedule"].append(schedule2);
    train1["seatTypes"].append(seatType1);
    train1["seatTypes"].append(seatType2);
    
    trains.push_back(train1);
    
    // 添加更多火车数据
    Json::Value train2;
    train2["id"] = 2;
    train2["name"] = "G2";
    train2["from"] = "上海";
    train2["to"] = "北京";
    train2["date"] = "2025-07-17";
    
    Json::Value schedule3;
    schedule3["station"] = "上海";
    schedule3["order"] = 1;
    schedule3["arrival"] = Json::Value::null;
    schedule3["departure"] = "14:00";
    schedule3["distance"] = 0;
    
    Json::Value schedule4;
    schedule4["station"] = "北京";
    schedule4["order"] = 2;
    schedule4["arrival"] = "19:00";
    schedule4["departure"] = Json::Value::null;
    schedule4["distance"] = 1318;
    
    Json::Value seatType3;
    seatType3["type"] = "一等座";
    seatType3["price"] = 553.5;
    seatType3["availableSeats"] = 45;
    seatType3["totalSeats"] = 50;
    
    Json::Value seatType4;
    seatType4["type"] = "二等座";
    seatType4["price"] = 553.5;
    seatType4["availableSeats"] = 90;
    seatType4["totalSeats"] = 100;
    
    train2["schedule"].append(schedule3);
    train2["schedule"].append(schedule4);
    train2["seatTypes"].append(seatType3);
    train2["seatTypes"].append(seatType4);
    
    trains.push_back(train2);
}

int main() {
    cout << "启动火车票售票系统 Fake Server..." << endl;
    
    // 初始化模拟数据
    initializeMockData();
    
    Server svr;
    
    // 设置CORS头
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization"}
    });
    
    // 处理OPTIONS请求
    svr.Options(".*", [](const Request&, Response& res) {
        res.status = 200;
    });
    
    // 1. 查询火车信息
    svr.Get("/trains", [](const Request& req, Response& res) {
        cout << "收到查询火车信息请求" << endl;
        
        Json::Value responseData;
        for (const auto& train : trains) {
            responseData.append(train);
        }
        
        res.set_content(createSuccessResponse(responseData, "查询火车信息成功"), "application/json");
    });
    
    // 2. 查询经停站信息
    svr.Get(R"(/stops/(\d+))", [](const Request& req, Response& res) {
        int trainId = stoi(req.matches[1].str());
        cout << "收到查询经停站信息请求，车次ID: " << trainId << endl;
        
        Json::Value responseData;
        for (const auto& train : trains) {
            if (train["id"].asInt() == trainId) {
                responseData = train["schedule"];
                break;
            }
        }
        
        if (responseData.empty()) {
            res.status = 404;
            res.set_content(createErrorResponse("未找到指定的火车", 404), "application/json");
        } else {
            res.set_content(createSuccessResponse(responseData, "查询经停站信息成功"), "application/json");
        }
    });
    
    // 3. 查询可预订车次
    svr.Post("/search-bookable-trains", [](const Request& req, Response& res) {
        cout << "收到查询可预订车次请求" << endl;
        
        Json::Reader reader;
        Json::Value requestBody;
        
        if (!reader.parse(req.body, requestBody)) {
            res.status = 400;
            res.set_content(createErrorResponse("请求体格式错误", 400), "application/json");
            return;
        }
        
        string fromStation = requestBody["fromStation"].asString();
        string toStation = requestBody["toStation"].asString();
        
        if (fromStation.empty() || toStation.empty()) {
            res.status = 400;
            res.set_content(createErrorResponse("请填写出发站和到达站", 400), "application/json");
            return;
        }
        
        Json::Value responseData;
        for (const auto& train : trains) {
            if (train["from"].asString() == fromStation && train["to"].asString() == toStation) {
                Json::Value trainInfo = train;
                trainInfo["scheduleId"] = train["id"];
                responseData.append(trainInfo);
            }
        }
        
        res.set_content(createSuccessResponse(responseData, "查询成功"), "application/json");
    });
    
    // 4. 预订车票
    svr.Post("/book", [](const Request& req, Response& res) {
        cout << "收到预订车票请求" << endl;
        
        Json::Reader reader;
        Json::Value requestBody;
        
        if (!reader.parse(req.body, requestBody)) {
            res.status = 400;
            res.set_content(createErrorResponse("请求体格式错误", 400), "application/json");
            return;
        }
        
        int trainId = requestBody["trainId"].asInt();
        string seatType = requestBody["seatType"].asString();
        string passengerName = requestBody["passengerName"].asString();
        string passengerId = requestBody["passengerId"].asString();
        string fromStation = requestBody["fromStation"].asString();
        string toStation = requestBody["toStation"].asString();
        string date = requestBody["date"].asString();
        
        if (trainId <= 0 || seatType.empty() || passengerName.empty() || 
            passengerId.empty() || fromStation.empty() || toStation.empty()) {
            res.status = 400;
            res.set_content(createErrorResponse("请填写完整的预订信息", 400), "application/json");
            return;
        }
        
        // 模拟座位分配
        Json::Value orderData;
        orderData["orderId"] = nextOrderId++;
        orderData["trainId"] = trainId;
        orderData["seatType"] = seatType;
        orderData["seatNumber"] = "01A";
        orderData["carriageNumber"] = 1;
        orderData["passengerName"] = passengerName;
        orderData["passengerId"] = passengerId;
        orderData["fromStation"] = fromStation;
        orderData["toStation"] = toStation;
        orderData["date"] = date.empty() ? "2025-07-17" : date;
        orderData["price"] = 553.5;
        
        // 保存订单
        orders.push_back(orderData);
        
        res.set_content(createSuccessResponse(orderData, "预订成功"), "application/json");
    });
    
    // 5. 查询订单
    svr.Get("/orders", [](const Request& req, Response& res) {
        cout << "收到查询订单请求" << endl;
        
        string passengerName = req.get_param_value("passengerName");
        string passengerId = req.get_param_value("passengerId");
        
        Json::Value responseData;
        for (const auto& order : orders) {
            if (order["is_deleted"].asBool()) continue;
            
            if (!passengerName.empty() && order["passengerName"].asString() != passengerName) continue;
            if (!passengerId.empty() && order["passengerId"].asString() != passengerId) continue;
            
            Json::Value orderInfo = order;
            orderInfo["id"] = order["orderId"];
            orderInfo["trainName"] = "G" + to_string(order["trainId"].asInt());
            orderInfo["status"] = "confirmed";
            orderInfo["createdAt"] = getCurrentTime();
            responseData.append(orderInfo);
        }
        
        res.set_content(createSuccessResponse(responseData, "查询订单成功"), "application/json");
    });
    
    // 6. 取消订单
    svr.Delete(R"(/orders/(\d+))", [](const Request& req, Response& res) {
        int orderId = stoi(req.matches[1].str());
        cout << "收到取消订单请求，订单ID: " << orderId << endl;
        
        bool found = false;
        for (auto& order : orders) {
            if (order["orderId"].asInt() == orderId && !order["is_deleted"].asBool()) {
                order["is_deleted"] = true;
                order["deleted_at"] = getCurrentTime();
                found = true;
                break;
            }
        }
        
        if (!found) {
            res.status = 404;
            res.set_content(createErrorResponse("订单不存在或已被删除", 404), "application/json");
            return;
        }
        
        Json::Value responseData;
        responseData["orderId"] = orderId;
        res.set_content(createSuccessResponse(responseData, "订单取消成功"), "application/json");
    });
    
    // 7. 恢复订单
    svr.Put(R"(/orders/(\d+)/restore)", [](const Request& req, Response& res) {
        int orderId = stoi(req.matches[1].str());
        cout << "收到恢复订单请求，订单ID: " << orderId << endl;
        
        bool found = false;
        for (auto& order : orders) {
            if (order["orderId"].asInt() == orderId && order["is_deleted"].asBool()) {
                order["is_deleted"] = false;
                order.removeMember("deleted_at");
                found = true;
                break;
            }
        }
        
        if (!found) {
            res.status = 404;
            res.set_content(createErrorResponse("订单不存在或未被删除", 404), "application/json");
            return;
        }
        
        Json::Value responseData;
        responseData["orderId"] = orderId;
        res.set_content(createSuccessResponse(responseData, "订单恢复成功"), "application/json");
    });
    
    // 8. 查询已删除订单
    svr.Get("/orders/deleted", [](const Request& req, Response& res) {
        cout << "收到查询已删除订单请求" << endl;
        
        string passengerName = req.get_param_value("passengerName");
        string passengerId = req.get_param_value("passengerId");
        
        Json::Value responseData;
        for (const auto& order : orders) {
            if (!order["is_deleted"].asBool()) continue;
            
            if (!passengerName.empty() && order["passengerName"].asString() != passengerName) continue;
            if (!passengerId.empty() && order["passengerId"].asString() != passengerId) continue;
            
            Json::Value orderInfo = order;
            orderInfo["id"] = order["orderId"];
            orderInfo["trainName"] = "G" + to_string(order["trainId"].asInt());
            orderInfo["status"] = "cancelled";
            orderInfo["createdAt"] = getCurrentTime();
            orderInfo["deletedAt"] = order["deleted_at"];
            responseData.append(orderInfo);
        }
        
        res.set_content(createSuccessResponse(responseData, "查询已删除订单成功"), "application/json");
    });
    
    // 9. 数据库连接测试
    svr.Get("/test-db", [](const Request& req, Response& res) {
        cout << "收到数据库连接测试请求" << endl;
        
        Json::Value responseData;
        responseData["connected"] = true;
        responseData["trainCount"] = (int)trains.size();
        responseData["database"] = "Fake MySQL";
        responseData["timestamp"] = getCurrentTime();
        
        res.set_content(createSuccessResponse(responseData, "数据库连接测试成功"), "application/json");
    });
    
    // 根路径重定向
    svr.Get("/", [](const Request& req, Response& res) {
        res.set_redirect("/test-db");
    });
    
    cout << "Fake Server 已启动，监听端口 3000" << endl;
    cout << "API 文档: http://localhost:3000/test-db" << endl;
    
    svr.listen("localhost", 3000);
    
    return 0;
} 