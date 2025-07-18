#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <chrono>
#include <iomanip>
#include <thread>
#include <mutex>
#include <regex>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#endif

using namespace std;

// 全局变量
vector<map<string, string>> trains;
vector<map<string, string>> orders;
int nextOrderId = 1;
mutex dataMutex;

// 工具函数：获取当前时间
string getCurrentTime() {
    auto now = chrono::system_clock::now();
    auto time_t = chrono::system_clock::to_time_t(now);
    auto ms = chrono::duration_cast<chrono::milliseconds>(now.time_since_epoch()) % 1000;
    
    stringstream ss;
    ss << put_time(gmtime(&time_t), "%Y-%m-%dT%H:%M:%S");
    ss << '.' << setfill('0') << setw(3) << ms.count() << "Z";
    return ss.str();
}

// 工具函数：创建JSON响应
string createJsonResponse(bool success, const string& data, const string& message) {
    stringstream ss;
    ss << "{\n";
    ss << "  \"success\": " << (success ? "true" : "false") << ",\n";
    ss << "  \"data\": " << data << ",\n";
    ss << "  \"message\": \"" << message << "\"\n";
    ss << "}";
    return ss.str();
}

// 工具函数：解析JSON（简化版）
map<string, string> parseJson(const string& json) {
    map<string, string> result;
    regex pattern("\"([^\"]+)\"\\s*:\\s*\"([^\"]*)\"");
    sregex_iterator iter(json.begin(), json.end(), pattern);
    sregex_iterator end;
    
    for (; iter != end; ++iter) {
        result[(*iter)[1]] = (*iter)[2];
    }
    
    return result;
}

// 初始化模拟数据
void initializeMockData() {
    // 火车1
    map<string, string> train1;
    train1["id"] = "1";
    train1["name"] = "G1";
    train1["from"] = "北京";
    train1["to"] = "上海";
    train1["date"] = "2025-07-17";
    train1["schedule"] = "[{\"station\":\"北京\",\"order\":1,\"departure\":\"08:00\"},{\"station\":\"上海\",\"order\":2,\"arrival\":\"13:00\"}]";
    train1["seatTypes"] = "[{\"type\":\"一等座\",\"price\":553.5,\"availableSeats\":50},{\"type\":\"二等座\",\"price\":553.5,\"availableSeats\":100}]";
    trains.push_back(train1);
    
    // 火车2
    map<string, string> train2;
    train2["id"] = "2";
    train2["name"] = "G2";
    train2["from"] = "上海";
    train2["to"] = "北京";
    train2["date"] = "2025-07-17";
    train2["schedule"] = "[{\"station\":\"上海\",\"order\":1,\"departure\":\"14:00\"},{\"station\":\"北京\",\"order\":2,\"arrival\":\"19:00\"}]";
    train2["seatTypes"] = "[{\"type\":\"一等座\",\"price\":553.5,\"availableSeats\":45},{\"type\":\"二等座\",\"price\":553.5,\"availableSeats\":90}]";
    trains.push_back(train2);
}

// HTTP响应类
class HttpResponse {
public:
    int statusCode;
    map<string, string> headers;
    string body;
    
    HttpResponse() : statusCode(200) {
        headers["Content-Type"] = "application/json; charset=utf-8";
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type";
    }
    
    string toString() const {
        stringstream ss;
        ss << "HTTP/1.1 " << statusCode << " " << getStatusText() << "\r\n";
        
        for (const auto& header : headers) {
            ss << header.first << ": " << header.second << "\r\n";
        }
        
        ss << "Content-Length: " << body.length() << "\r\n";
        ss << "\r\n";
        ss << body;
        
        return ss.str();
    }
    
private:
    string getStatusText() const {
        switch (statusCode) {
            case 200: return "OK";
            case 400: return "Bad Request";
            case 404: return "Not Found";
            case 500: return "Internal Server Error";
            default: return "Unknown";
        }
    }
};

// 路由处理器
class Router {
public:
    // 查询火车信息
    HttpResponse handleGetTrains() {
        cout << "收到查询火车信息请求" << endl;
        
        stringstream data;
        data << "[";
        for (size_t i = 0; i < trains.size(); ++i) {
            if (i > 0) data << ",";
            data << "{";
            for (const auto& field : trains[i]) {
                if (field.first != "schedule" && field.first != "seatTypes") {
                    data << "\"" << field.first << "\":\"" << field.second << "\",";
                }
            }
            data << "\"schedule\":" << trains[i]["schedule"] << ",";
            data << "\"seatTypes\":" << trains[i]["seatTypes"];
            data << "}";
        }
        data << "]";
        
        HttpResponse response;
        response.body = createJsonResponse(true, data.str(), "查询火车信息成功");
        return response;
    }
    
    // 查询经停站信息
    HttpResponse handleGetStops(const string& trainId) {
        cout << "收到查询经停站信息请求，车次ID: " << trainId << endl;
        
        for (const auto& train : trains) {
            if (train.at("id") == trainId) {
                HttpResponse response;
                response.body = createJsonResponse(true, train.at("schedule"), "查询经停站信息成功");
                return response;
            }
        }
        
        HttpResponse response;
        response.statusCode = 404;
        response.body = createJsonResponse(false, "null", "未找到指定的火车");
        return response;
    }
    
    // 查询可预订车次
    HttpResponse handleSearchBookableTrains(const string& requestBody) {
        cout << "收到查询可预订车次请求" << endl;
        
        auto params = parseJson(requestBody);
        string fromStation = params["fromStation"];
        string toStation = params["toStation"];
        
        if (fromStation.empty() || toStation.empty()) {
            HttpResponse response;
            response.statusCode = 400;
            response.body = createJsonResponse(false, "null", "请填写出发站和到达站");
            return response;
        }
        
        stringstream data;
        data << "[";
        bool first = true;
        for (const auto& train : trains) {
            if (train.at("from") == fromStation && train.at("to") == toStation) {
                if (!first) data << ",";
                data << "{";
                for (const auto& field : train) {
                    if (field.first != "schedule" && field.first != "seatTypes") {
                        data << "\"" << field.first << "\":\"" << field.second << "\",";
                    }
                }
                data << "\"scheduleId\":" << train.at("id") << ",";
                data << "\"schedule\":" << train.at("schedule") << ",";
                data << "\"seatTypes\":" << train.at("seatTypes");
                data << "}";
                first = false;
            }
        }
        data << "]";
        
        HttpResponse response;
        response.body = createJsonResponse(true, data.str(), "查询成功");
        return response;
    }
    
    // 预订车票
    HttpResponse handleBook(const string& requestBody) {
        cout << "收到预订车票请求" << endl;
        
        auto params = parseJson(requestBody);
        
        if (params["trainId"].empty() || params["seatType"].empty() || 
            params["passengerName"].empty() || params["passengerId"].empty() ||
            params["fromStation"].empty() || params["toStation"].empty()) {
            HttpResponse response;
            response.statusCode = 400;
            response.body = createJsonResponse(false, "null", "请填写完整的预订信息");
            return response;
        }
        
        lock_guard<mutex> lock(dataMutex);
        
        map<string, string> order;
        order["orderId"] = to_string(nextOrderId++);
        order["trainId"] = params["trainId"];
        order["seatType"] = params["seatType"];
        order["seatNumber"] = "01A";
        order["carriageNumber"] = "1";
        order["passengerName"] = params["passengerName"];
        order["passengerId"] = params["passengerId"];
        order["fromStation"] = params["fromStation"];
        order["toStation"] = params["toStation"];
        order["date"] = params["date"].empty() ? "2025-07-17" : params["date"];
        order["price"] = "553.5";
        order["is_deleted"] = "false";
        
        orders.push_back(order);
        
        stringstream data;
        data << "{";
        for (const auto& field : order) {
            if (field.first != "is_deleted") {
                data << "\"" << field.first << "\":\"" << field.second << "\",";
            }
        }
        data.seekp(-1, ios::end);
        data << "}";
        
        HttpResponse response;
        response.body = createJsonResponse(true, data.str(), "预订成功");
        return response;
    }
    
    // 查询订单
    HttpResponse handleGetOrders(const string& passengerName, const string& passengerId) {
        cout << "收到查询订单请求" << endl;
        
        stringstream data;
        data << "[";
        bool first = true;
        
        lock_guard<mutex> lock(dataMutex);
        for (const auto& order : orders) {
            if (order.at("is_deleted") == "true") continue;
            
            if (!passengerName.empty() && order.at("passengerName") != passengerName) continue;
            if (!passengerId.empty() && order.at("passengerId") != passengerId) continue;
            
            if (!first) data << ",";
            data << "{";
            data << "\"id\":" << order.at("orderId") << ",";
            data << "\"trainName\":\"G" << order.at("trainId") << "\",";
            data << "\"date\":\"" << order.at("date") << "\",";
            data << "\"fromStation\":\"" << order.at("fromStation") << "\",";
            data << "\"toStation\":\"" << order.at("toStation") << "\",";
            data << "\"seatType\":\"" << order.at("seatType") << "\",";
            data << "\"seatNumber\":\"" << order.at("seatNumber") << "\",";
            data << "\"carriageNumber\":" << order.at("carriageNumber") << ",";
            data << "\"passengerName\":\"" << order.at("passengerName") << "\",";
            data << "\"passengerId\":\"" << order.at("passengerId") << "\",";
            data << "\"price\":" << order.at("price") << ",";
            data << "\"status\":\"confirmed\",";
            data << "\"createdAt\":\"" << getCurrentTime() << "\"";
            data << "}";
            first = false;
        }
        data << "]";
        
        HttpResponse response;
        response.body = createJsonResponse(true, data.str(), "查询订单成功");
        return response;
    }
    
    // 取消订单
    HttpResponse handleDeleteOrder(const string& orderId) {
        cout << "收到取消订单请求，订单ID: " << orderId << endl;
        
        lock_guard<mutex> lock(dataMutex);
        for (auto& order : orders) {
            if (order["orderId"] == orderId && order["is_deleted"] == "false") {
                order["is_deleted"] = "true";
                order["deleted_at"] = getCurrentTime();
                
                stringstream data;
                data << "{\"orderId\":" << orderId << "}";
                
                HttpResponse response;
                response.body = createJsonResponse(true, data.str(), "订单取消成功");
                return response;
            }
        }
        
        HttpResponse response;
        response.statusCode = 404;
        response.body = createJsonResponse(false, "null", "订单不存在或已被删除");
        return response;
    }
    
    // 恢复订单
    HttpResponse handleRestoreOrder(const string& orderId) {
        cout << "收到恢复订单请求，订单ID: " << orderId << endl;
        
        lock_guard<mutex> lock(dataMutex);
        for (auto& order : orders) {
            if (order["orderId"] == orderId && order["is_deleted"] == "true") {
                order["is_deleted"] = "false";
                order.erase("deleted_at");
                
                stringstream data;
                data << "{\"orderId\":" << orderId << "}";
                
                HttpResponse response;
                response.body = createJsonResponse(true, data.str(), "订单恢复成功");
                return response;
            }
        }
        
        HttpResponse response;
        response.statusCode = 404;
        response.body = createJsonResponse(false, "null", "订单不存在或未被删除");
        return response;
    }
    
    // 查询已删除订单
    HttpResponse handleGetDeletedOrders(const string& passengerName, const string& passengerId) {
        cout << "收到查询已删除订单请求" << endl;
        
        stringstream data;
        data << "[";
        bool first = true;
        
        lock_guard<mutex> lock(dataMutex);
        for (const auto& order : orders) {
            if (order.at("is_deleted") != "true") continue;
            
            if (!passengerName.empty() && order.at("passengerName") != passengerName) continue;
            if (!passengerId.empty() && order.at("passengerId") != passengerId) continue;
            
            if (!first) data << ",";
            data << "{";
            data << "\"id\":" << order.at("orderId") << ",";
            data << "\"trainName\":\"G" << order.at("trainId") << "\",";
            data << "\"date\":\"" << order.at("date") << "\",";
            data << "\"fromStation\":\"" << order.at("fromStation") << "\",";
            data << "\"toStation\":\"" << order.at("toStation") << "\",";
            data << "\"seatType\":\"" << order.at("seatType") << "\",";
            data << "\"passengerName\":\"" << order.at("passengerName") << "\",";
            data << "\"passengerId\":\"" << order.at("passengerId") << "\",";
            data << "\"price\":" << order.at("price") << ",";
            data << "\"status\":\"cancelled\",";
            data << "\"createdAt\":\"" << getCurrentTime() << "\",";
            data << "\"deletedAt\":\"" << order.at("deleted_at") << "\"";
            data << "}";
            first = false;
        }
        data << "]";
        
        HttpResponse response;
        response.body = createJsonResponse(true, data.str(), "查询已删除订单成功");
        return response;
    }
    
    // 数据库连接测试
    HttpResponse handleTestDb() {
        cout << "收到数据库连接测试请求" << endl;
        
        stringstream data;
        data << "{";
        data << "\"connected\":true,";
        data << "\"trainCount\":" << trains.size() << ",";
        data << "\"database\":\"Fake MySQL\",";
        data << "\"timestamp\":\"" << getCurrentTime() << "\"";
        data << "}";
        
        HttpResponse response;
        response.body = createJsonResponse(true, data.str(), "数据库连接测试成功");
        return response;
    }
};

// 解析HTTP请求
struct HttpRequest {
    string method;
    string path;
    map<string, string> headers;
    string body;
    map<string, string> queryParams;
};

HttpRequest parseHttpRequest(const string& request) {
    HttpRequest req;
    stringstream ss(request);
    string line;
    
    // 解析请求行
    if (getline(ss, line)) {
        stringstream lineStream(line);
        lineStream >> req.method >> req.path;
    }
    
    // 解析头部
    while (getline(ss, line) && line != "\r" && !line.empty()) {
        size_t colonPos = line.find(':');
        if (colonPos != string::npos) {
            string key = line.substr(0, colonPos);
            string value = line.substr(colonPos + 1);
            // 去除前后空格
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t\r") + 1);
            req.headers[key] = value;
        }
    }
    
    // 解析请求体
    string body;
    while (getline(ss, line)) {
        body += line + "\n";
    }
    req.body = body;
    
    // 解析查询参数
    size_t queryPos = req.path.find('?');
    if (queryPos != string::npos) {
        string query = req.path.substr(queryPos + 1);
        req.path = req.path.substr(0, queryPos);
        
        stringstream queryStream(query);
        string param;
        while (getline(queryStream, param, '&')) {
            size_t equalPos = param.find('=');
            if (equalPos != string::npos) {
                string key = param.substr(0, equalPos);
                string value = param.substr(equalPos + 1);
                req.queryParams[key] = value;
            }
        }
    }
    
    return req;
}

// 处理客户端连接
void handleClient(int clientSocket) {
    char buffer[4096];
    int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
    
    if (bytesReceived > 0) {
        buffer[bytesReceived] = '\0';
        string request(buffer);
        
        HttpRequest httpReq = parseHttpRequest(request);
        Router router;
        HttpResponse response;
        
        cout << "收到请求: " << httpReq.method << " " << httpReq.path << endl;
        
        // 路由处理
        if (httpReq.method == "GET") {
            if (httpReq.path == "/trains") {
                response = router.handleGetTrains();
            } else if (regex_match(httpReq.path, regex("/stops/(\\d+)"))) {
                smatch match;
                regex_search(httpReq.path, match, regex("/stops/(\\d+)"));
                response = router.handleGetStops(match[1]);
            } else if (httpReq.path == "/orders") {
                string passengerName = httpReq.queryParams["passengerName"];
                string passengerId = httpReq.queryParams["passengerId"];
                response = router.handleGetOrders(passengerName, passengerId);
            } else if (httpReq.path == "/orders/deleted") {
                string passengerName = httpReq.queryParams["passengerName"];
                string passengerId = httpReq.queryParams["passengerId"];
                response = router.handleGetDeletedOrders(passengerName, passengerId);
            } else if (httpReq.path == "/test-db") {
                response = router.handleTestDb();
            } else if (httpReq.path == "/") {
                response.statusCode = 302;
                response.headers["Location"] = "/test-db";
            } else {
                response.statusCode = 404;
                response.body = createJsonResponse(false, "null", "接口不存在");
            }
        } else if (httpReq.method == "POST") {
            if (httpReq.path == "/search-bookable-trains") {
                response = router.handleSearchBookableTrains(httpReq.body);
            } else if (httpReq.path == "/book") {
                response = router.handleBook(httpReq.body);
            } else {
                response.statusCode = 404;
                response.body = createJsonResponse(false, "null", "接口不存在");
            }
        } else if (httpReq.method == "DELETE") {
            if (regex_match(httpReq.path, regex("/orders/(\\d+)"))) {
                smatch match;
                regex_search(httpReq.path, match, regex("/orders/(\\d+)"));
                response = router.handleDeleteOrder(match[1]);
            } else {
                response.statusCode = 404;
                response.body = createJsonResponse(false, "null", "接口不存在");
            }
        } else if (httpReq.method == "PUT") {
            if (regex_match(httpReq.path, regex("/orders/(\\d+)/restore"))) {
                smatch match;
                regex_search(httpReq.path, match, regex("/orders/(\\d+)/restore"));
                response = router.handleRestoreOrder(match[1]);
            } else {
                response.statusCode = 404;
                response.body = createJsonResponse(false, "null", "接口不存在");
            }
        } else if (httpReq.method == "OPTIONS") {
            response.statusCode = 200;
            response.body = "";
        } else {
            response.statusCode = 405;
            response.body = createJsonResponse(false, "null", "方法不允许");
        }
        
        string responseStr = response.toString();
        send(clientSocket, responseStr.c_str(), responseStr.length(), 0);
    }
    
#ifdef _WIN32
    closesocket(clientSocket);
#else
    close(clientSocket);
#endif
}

int main() {
    cout << "启动火车票售票系统 Fake Server..." << endl;
    
    // 初始化模拟数据
    initializeMockData();
    
#ifdef _WIN32
    // 初始化Winsock
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        cerr << "WSAStartup失败" << endl;
        return 1;
    }
#endif
    
    // 创建socket
    int serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket == -1) {
        cerr << "创建socket失败" << endl;
        return 1;
    }
    
    // 设置socket选项
    int opt = 1;
    setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
    
    // 绑定地址
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(3000);
    
    if (bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        cerr << "绑定端口失败" << endl;
        return 1;
    }
    
    // 监听连接
    if (listen(serverSocket, 5) < 0) {
        cerr << "监听失败" << endl;
        return 1;
    }
    
    cout << "Fake Server 已启动，监听端口 3000" << endl;
    cout << "API 文档: http://localhost:3000/test-db" << endl;
    
    // 接受客户端连接
    while (true) {
        sockaddr_in clientAddr;
        socklen_t clientAddrLen = sizeof(clientAddr);
        int clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, &clientAddrLen);
        
        if (clientSocket < 0) {
            cerr << "接受连接失败" << endl;
            continue;
        }
        
        // 在新线程中处理客户端请求
        thread(handleClient, clientSocket).detach();
    }
    
#ifdef _WIN32
    closesocket(serverSocket);
    WSACleanup();
#else
    close(serverSocket);
#endif
    
    return 0;
} 