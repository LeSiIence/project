#include "MainWindow.h"
#include <QApplication>
#include <QDir>
#include <QStandardPaths>
#include <QDebug>

// 静态常量定义
const QString MainWindow::API_BASE = "http://localhost:3000";
const QStringList MainWindow::STATION_LIST = {
    "北京", "天津", "济南", "南京", "上海", 
    "广州", "深圳", "西安", "成都"
};

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_centralWidget(nullptr)
    , m_mainLayout(nullptr)
    , m_mainSplitter(nullptr)
    , m_selectedTrainRow(-1)
    , m_networkManager(new QNetworkAccessManager(this))
{
    setWindowTitle("🚄 火车票预订系统 - Qt客户端");
    setWindowIcon(QIcon(":/icons/train.png")); // 如果有图标资源
    resize(1200, 800);
    
    setupUI();
    populateStationComboBoxes();
    
    // 设置默认日期
    m_travelDateEdit->setDate(QDate(2025, 7, 17));
    m_travelDateEdit->setMinimumDate(QDate(2025, 7, 17));
    m_travelDateEdit->setMaximumDate(QDate(2025, 7, 30));
}

MainWindow::~MainWindow()
{
}

void MainWindow::setupUI()
{
    m_centralWidget = new QWidget(this);
    setCentralWidget(m_centralWidget);
    
    m_mainLayout = new QVBoxLayout(m_centralWidget);
    m_mainSplitter = new QSplitter(Qt::Vertical, this);
    m_mainLayout->addWidget(m_mainSplitter);
    
    setupSearchSection();
    setupTrainListSection();
    setupOrderSection();
    setupStatusBar();
}

void MainWindow::setupSearchSection()
{
    m_searchGroup = new QGroupBox("🔍 车次搜索", this);
    m_searchGroup->setMaximumHeight(200);
    
    QGridLayout *searchLayout = new QGridLayout(m_searchGroup);
    
    // 乘客信息
    searchLayout->addWidget(new QLabel("乘客姓名:"), 0, 0);
    m_passengerNameEdit = new QLineEdit(this);
    m_passengerNameEdit->setPlaceholderText("请输入乘客姓名");
    searchLayout->addWidget(m_passengerNameEdit, 0, 1);
    
    searchLayout->addWidget(new QLabel("身份证号:"), 0, 2);
    m_passengerIdEdit = new QLineEdit(this);
    m_passengerIdEdit->setPlaceholderText("请输入身份证号");
    searchLayout->addWidget(m_passengerIdEdit, 0, 3);
    
    // 行程信息
    searchLayout->addWidget(new QLabel("出发站:"), 1, 0);
    m_fromStationCombo = new QComboBox(this);
    searchLayout->addWidget(m_fromStationCombo, 1, 1);
    
    searchLayout->addWidget(new QLabel("到达站:"), 1, 2);
    m_toStationCombo = new QComboBox(this);
    searchLayout->addWidget(m_toStationCombo, 1, 3);
    
    searchLayout->addWidget(new QLabel("出发日期:"), 2, 0);
    m_travelDateEdit = new QDateEdit(this);
    m_travelDateEdit->setCalendarPopup(true);
    searchLayout->addWidget(m_travelDateEdit, 2, 1);
    
    m_searchButton = new QPushButton("🔍 搜索车次", this);
    m_searchButton->setMinimumHeight(40);
    searchLayout->addWidget(m_searchButton, 2, 2, 1, 2);
    
    connect(m_searchButton, &QPushButton::clicked, this, &MainWindow::searchTrains);
    
    m_mainSplitter->addWidget(m_searchGroup);
}

void MainWindow::setupTrainListSection()
{
    m_trainListGroup = new QGroupBox("🚄 可预订车次", this);
    
    QVBoxLayout *trainLayout = new QVBoxLayout(m_trainListGroup);
    
    m_trainTable = new QTableWidget(this);
    m_trainTable->setColumnCount(9);
    QStringList headers = {"车次", "出发站", "到达站", "日期", "座位类型", "价格", "余票", "总票数", "时刻表"};
    m_trainTable->setHorizontalHeaderLabels(headers);
    
    // 设置表格属性
    m_trainTable->setAlternatingRowColors(true);
    m_trainTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_trainTable->setSelectionMode(QAbstractItemView::SingleSelection);
    m_trainTable->horizontalHeader()->setStretchLastSection(true);
    m_trainTable->verticalHeader()->setVisible(false);
    
    // 优化时刻表列显示
    m_trainTable->setWordWrap(true); // 启用自动换行
    m_trainTable->setTextElideMode(Qt::ElideNone); // 禁用省略号
    
    // 设置最小行高以支持多行内容
    m_trainTable->verticalHeader()->setMinimumSectionSize(80);
    m_trainTable->verticalHeader()->setDefaultSectionSize(80);
    
    // 设置列宽
    m_trainTable->setColumnWidth(0, 80);   // 车次
    m_trainTable->setColumnWidth(1, 100);  // 出发站
    m_trainTable->setColumnWidth(2, 100);  // 到达站
    m_trainTable->setColumnWidth(3, 120);  // 日期
    m_trainTable->setColumnWidth(4, 100);  // 座位类型
    m_trainTable->setColumnWidth(5, 80);   // 价格
    m_trainTable->setColumnWidth(6, 60);   // 余票
    m_trainTable->setColumnWidth(7, 60);   // 总票数
    m_trainTable->setColumnWidth(8, 250);  // 时刻表列设置更大宽度
    
    trainLayout->addWidget(m_trainTable);
    
    m_bookButton = new QPushButton("🎫 预订选中车票", this);
    m_bookButton->setEnabled(false);
    m_bookButton->setMinimumHeight(40);
    trainLayout->addWidget(m_bookButton);
    
    connect(m_trainTable, &QTableWidget::itemSelectionChanged, 
            this, &MainWindow::onTrainSelectionChanged);
    connect(m_bookButton, &QPushButton::clicked, this, &MainWindow::bookTicket);
    
    m_mainSplitter->addWidget(m_trainListGroup);
}

void MainWindow::setupOrderSection()
{
    m_orderGroup = new QGroupBox("📋 订单查询", this);
    
    QVBoxLayout *orderLayout = new QVBoxLayout(m_orderGroup);
    
    // 查询条件
    QWidget *queryWidget = new QWidget(this);
    QHBoxLayout *queryLayout = new QHBoxLayout(queryWidget);
    
    queryLayout->addWidget(new QLabel("乘客姓名:"));
    m_queryPassengerNameEdit = new QLineEdit(this);
    m_queryPassengerNameEdit->setPlaceholderText("请输入乘客姓名");
    queryLayout->addWidget(m_queryPassengerNameEdit);
    
    queryLayout->addWidget(new QLabel("身份证号:"));
    m_queryPassengerIdEdit = new QLineEdit(this);
    m_queryPassengerIdEdit->setPlaceholderText("请输入身份证号");
    queryLayout->addWidget(m_queryPassengerIdEdit);
    
    m_queryOrdersButton = new QPushButton("📋 查询我的订单", this);
    queryLayout->addWidget(m_queryOrdersButton);
    
    m_queryAllOrdersButton = new QPushButton("📋 查询所有订单", this);
    queryLayout->addWidget(m_queryAllOrdersButton);
    
    orderLayout->addWidget(queryWidget);
    
    // 订单表格
    m_orderTable = new QTableWidget(this);
    m_orderTable->setColumnCount(9);
    QStringList orderHeaders = {"订单号", "车次", "日期", "行程", "座位", "乘客", "价格", "状态", "创建时间"};
    m_orderTable->setHorizontalHeaderLabels(orderHeaders);
    
    m_orderTable->setAlternatingRowColors(true);
    m_orderTable->horizontalHeader()->setStretchLastSection(true);
    m_orderTable->verticalHeader()->setVisible(false);
    
    // 优化订单表格显示
    m_orderTable->setWordWrap(true); // 启用自动换行
    m_orderTable->setTextElideMode(Qt::ElideNone); // 禁用省略号
    
    // 设置最小行高以支持多行内容
    m_orderTable->verticalHeader()->setMinimumSectionSize(60);
    m_orderTable->verticalHeader()->setDefaultSectionSize(60);
    
    // 设置订单表格的列宽
    m_orderTable->setColumnWidth(0, 80);   // 订单号
    m_orderTable->setColumnWidth(1, 80);   // 车次
    m_orderTable->setColumnWidth(2, 120);  // 日期
    m_orderTable->setColumnWidth(3, 120);  // 行程
    m_orderTable->setColumnWidth(4, 150);  // 座位
    m_orderTable->setColumnWidth(5, 180);  // 乘客
    m_orderTable->setColumnWidth(6, 80);   // 价格
    m_orderTable->setColumnWidth(7, 80);   // 状态
    m_orderTable->setColumnWidth(8, 160);  // 创建时间
    
    orderLayout->addWidget(m_orderTable);
    
    connect(m_queryOrdersButton, &QPushButton::clicked, this, &MainWindow::queryOrders);
    connect(m_queryAllOrdersButton, &QPushButton::clicked, this, &MainWindow::queryAllOrders);
    
    m_mainSplitter->addWidget(m_orderGroup);
    
    // 设置分割器比例 - 优化布局，增加订单查询区域高度
    m_mainSplitter->setStretchFactor(0, 0); // 搜索区域固定
    m_mainSplitter->setStretchFactor(1, 3); // 车次列表
    m_mainSplitter->setStretchFactor(2, 2); // 订单查询区域增加高度
}

void MainWindow::setupStatusBar()
{
    m_progressBar = new QProgressBar(this);
    m_progressBar->setVisible(false);
    m_progressBar->setRange(0, 0); // 无限进度条
    
    m_statusLabel = new QLabel("就绪", this);
    
    statusBar()->addWidget(m_statusLabel, 1);
    statusBar()->addPermanentWidget(m_progressBar);
}

void MainWindow::populateStationComboBoxes()
{
    m_fromStationCombo->addItem("请选择出发站", "");
    m_toStationCombo->addItem("请选择到达站", "");
    
    for (const QString &station : STATION_LIST) {
        m_fromStationCombo->addItem(station, station);
        m_toStationCombo->addItem(station, station);
    }
}

void MainWindow::searchTrains()
{
    if (!validateSearchInput()) {
        return;
    }
    
    setLoading(true);
    m_statusLabel->setText("正在搜索车次...");
    
    QJsonObject requestData;
    requestData["fromStation"] = m_fromStationCombo->currentData().toString();
    requestData["toStation"] = m_toStationCombo->currentData().toString();
    requestData["date"] = m_travelDateEdit->date().toString("yyyy-MM-dd");
    
    QNetworkRequest request(QUrl(API_BASE + "/search-bookable-trains"));
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    
    QJsonDocument doc(requestData);
    QNetworkReply *reply = m_networkManager->post(request, doc.toJson());
    
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        onSearchFinished(reply);
        reply->deleteLater();
    });
}

void MainWindow::bookTicket()
{
    if (!validateBookingInput()) {
        return;
    }
    
    int currentRow = m_trainTable->currentRow();
    if (currentRow < 0) {
        showMessage("请选择要预订的车次", false);
        return;
    }
    
    // 获取选中行的数据
    QString trainName = m_trainTable->item(currentRow, 0)->text();
    QString seatType = m_trainTable->item(currentRow, 4)->text();
    QString priceStr = m_trainTable->item(currentRow, 5)->text();
    double price = priceStr.replace("¥", "").toDouble();
    
    // 调试输出
    qDebug() << "预订请求 - 车次:" << trainName 
             << "座位类型:" << seatType 
             << "价格字符串:" << priceStr 
             << "解析的价格:" << price;
    
    // 确认对话框
    QString confirmText = QString("确认预订以下车票？\n\n"
                                 "车次: %1\n"
                                 "座位类型: %2\n"
                                 "价格: ¥%.2f\n"
                                 "乘客: %3\n"
                                 "行程: %4 → %5\n"
                                 "日期: %6")
                         .arg(trainName)
                         .arg(seatType)
                         .arg(price)
                         .arg(m_passengerNameEdit->text())
                         .arg(m_fromStationCombo->currentText())
                         .arg(m_toStationCombo->currentText())
                         .arg(m_travelDateEdit->date().toString("yyyy-MM-dd"));
    
    int ret = QMessageBox::question(this, "确认预订", confirmText,
                                   QMessageBox::Yes | QMessageBox::No);
    
    if (ret != QMessageBox::Yes) {
        return;
    }
    
    setLoading(true);
    m_statusLabel->setText("正在预订车票...");
    
    // 从当前车次数据中获取trainId
    QJsonObject trainData = m_currentTrains[currentRow].toObject();
    
    QJsonObject requestData;
    requestData["trainId"] = trainData["id"].toInt();
    requestData["seatType"] = seatType;
    requestData["passengerName"] = m_passengerNameEdit->text();
    requestData["passengerId"] = m_passengerIdEdit->text();
    requestData["fromStation"] = m_fromStationCombo->currentData().toString();
    requestData["toStation"] = m_toStationCombo->currentData().toString();
    requestData["date"] = m_travelDateEdit->date().toString("yyyy-MM-dd");
    
    QNetworkRequest request(QUrl(API_BASE + "/book"));
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    
    QJsonDocument doc(requestData);
    QNetworkReply *reply = m_networkManager->post(request, doc.toJson());
    
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        onBookingFinished(reply);
        reply->deleteLater();
    });
}

void MainWindow::queryOrders()
{
    QString passengerName = m_queryPassengerNameEdit->text().trimmed();
    QString passengerId = m_queryPassengerIdEdit->text().trimmed();
    
    if (passengerName.isEmpty() || passengerId.isEmpty()) {
        showMessage("请填写乘客姓名和身份证号", false);
        return;
    }
    
    setLoading(true);
    m_statusLabel->setText("正在查询订单...");
    
    QString url = QString("%1/orders?passengerName=%2&passengerId=%3")
                  .arg(API_BASE)
                  .arg(QUrl::toPercentEncoding(passengerName))
                  .arg(QUrl::toPercentEncoding(passengerId));
    
    QNetworkRequest request{QUrl(url)};
    QNetworkReply *reply = m_networkManager->get(request);
    
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        onOrderQueryFinished(reply);
        reply->deleteLater();
    });
}

void MainWindow::queryAllOrders()
{
    setLoading(true);
    m_statusLabel->setText("正在查询所有订单...");
    
    QNetworkRequest request(QUrl(API_BASE + "/orders"));
    QNetworkReply *reply = m_networkManager->get(request);
    
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        onOrderQueryFinished(reply);
        reply->deleteLater();
    });
}

void MainWindow::onTrainSelectionChanged()
{
    bool hasSelection = m_trainTable->currentRow() >= 0;
    m_bookButton->setEnabled(hasSelection);
}

void MainWindow::onSearchFinished(QNetworkReply *reply)
{
    setLoading(false);
    
    if (reply->error() != QNetworkReply::NoError) {
        m_statusLabel->setText("搜索失败");
        showMessage(QString("网络错误: %1").arg(reply->errorString()), false);
        return;
    }
    
    QByteArray responseData = reply->readAll();
    qDebug() << "API响应数据:" << responseData;
    
    QJsonDocument doc = QJsonDocument::fromJson(responseData);
    QJsonObject response = doc.object();
    
    qDebug() << "解析的JSON响应:" << doc.toJson(QJsonDocument::Compact);
    
    if (response["success"].toBool()) {
        QJsonArray trains = response["data"].toArray();
        qDebug() << "找到车次数量:" << trains.size();
        m_currentTrains = trains;
        displayTrains(trains);
        
        m_statusLabel->setText(QString("找到 %1 个可预订车次").arg(trains.size()));
        if (trains.isEmpty()) {
            showMessage("未找到符合条件的车次，请检查搜索条件", false);
        } else {
            showMessage(QString("搜索成功，找到 %1 个车次").arg(trains.size()));
        }
    } else {
        m_statusLabel->setText("搜索失败");
        showMessage(QString("搜索失败: %1").arg(response["message"].toString()), false);
    }
}

void MainWindow::onBookingFinished(QNetworkReply *reply)
{
    setLoading(false);
    
    if (reply->error() != QNetworkReply::NoError) {
        m_statusLabel->setText("预订失败");
        showMessage(QString("网络错误: %1").arg(reply->errorString()), false);
        return;
    }
    
    QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
    QJsonObject response = doc.object();
    
    if (response["success"].toBool()) {
        QJsonObject bookingData = response["data"].toObject();
        
        // 获取当前选中的车次信息来显示开车时间
        QString departureTimeInfo = "";
        if (m_selectedTrainRow >= 0 && m_selectedTrainRow < m_currentTrains.size()) {
            QJsonObject selectedTrain = m_currentTrains[m_selectedTrainRow].toObject();
            QJsonArray schedule = selectedTrain["schedule"].toArray();
            
            // 查找出发站的发车时间
            QString fromStation = bookingData["fromStation"].toString();
            for (const QJsonValue &stationValue : schedule) {
                QJsonObject station = stationValue.toObject();
                if (station["station"].toString() == fromStation) {
                    QString departureTime = station["departure"].toString();
                    if (!departureTime.isEmpty()) {
                        departureTimeInfo = QString("\n开车时间: %1").arg(departureTime);
                    }
                    break;
                }
            }
        }
        
        QString successMessage = QString("🎉 预订成功！\n\n"
                                       "订单号: %1\n"
                                       "车次: G%2\n"
                                       "座位: %3车厢 %4号\n"
                                       "乘客: %5\n"
                                       "行程: %6 → %7\n"
                                       "日期: %8%9\n"
                                       "价格: ¥%10\n"
                                       "状态: 已确认")
                                .arg(bookingData["orderId"].toInt())
                                .arg(bookingData["trainId"].toInt())
                                .arg(bookingData["carriageNumber"].toString())
                                .arg(bookingData["seatNumber"].toString())
                                .arg(bookingData["passengerName"].toString())
                                .arg(bookingData["fromStation"].toString())
                                .arg(bookingData["toStation"].toString())
                                .arg(bookingData["date"].toString())
                                .arg(departureTimeInfo)
                                .arg(bookingData["price"].toDouble());
        
        QMessageBox::information(this, "预订成功", successMessage);
        m_statusLabel->setText("预订成功");
        
        // 重新搜索以更新余票信息
        searchTrains();
        
    } else {
        m_statusLabel->setText("预订失败");
        showMessage(QString("预订失败: %1").arg(response["message"].toString()), false);
    }
}

void MainWindow::onOrderQueryFinished(QNetworkReply *reply)
{
    setLoading(false);
    
    if (reply->error() != QNetworkReply::NoError) {
        m_statusLabel->setText("查询失败");
        showMessage(QString("网络错误: %1").arg(reply->errorString()), false);
        return;
    }
    
    QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
    QJsonObject response = doc.object();
    
    if (response["success"].toBool()) {
        QJsonArray orders = response["data"].toArray();
        displayOrders(orders);
        
        m_statusLabel->setText(QString("查询到 %1 个订单").arg(orders.size()));
        if (orders.isEmpty()) {
            showMessage("未找到相关订单", false);
        } else {
            showMessage(QString("查询成功，找到 %1 个订单").arg(orders.size()));
        }
    } else {
        m_statusLabel->setText("查询失败");
        showMessage(QString("查询失败: %1").arg(response["message"].toString()), false);
    }
}

void MainWindow::displayTrains(const QJsonArray &trains)
{
    m_trainTable->setRowCount(0);
    
    for (int i = 0; i < trains.size(); ++i) {
        QJsonObject train = trains[i].toObject();
        QJsonArray seatTypes = train["seatTypes"].toArray();
        
        for (int j = 0; j < seatTypes.size(); ++j) {
            QJsonObject seatType = seatTypes[j].toObject();
            
            int row = m_trainTable->rowCount();
            m_trainTable->insertRow(row);
            
            m_trainTable->setItem(row, 0, new QTableWidgetItem(train["name"].toString()));
            m_trainTable->setItem(row, 1, new QTableWidgetItem(train["from"].toString()));
            m_trainTable->setItem(row, 2, new QTableWidgetItem(train["to"].toString()));
            m_trainTable->setItem(row, 3, new QTableWidgetItem(train["date"].toString()));
            m_trainTable->setItem(row, 4, new QTableWidgetItem(seatType["type"].toString()));
            // 安全地获取价格，处理字符串和数字两种情况
            double price = 0.0;
            QJsonValue priceValue = seatType["price"];
            if (priceValue.isString()) {
                price = priceValue.toString().toDouble();
            } else if (priceValue.isDouble()) {
                price = priceValue.toDouble();
            }
            
            m_trainTable->setItem(row, 5, new QTableWidgetItem(QString("¥%1").arg(price, 0, 'f', 2)));
            m_trainTable->setItem(row, 6, new QTableWidgetItem(QString::number(seatType["availableSeats"].toInt())));
            m_trainTable->setItem(row, 7, new QTableWidgetItem(QString::number(seatType["totalSeats"].toInt())));
            
            // 显示时刻表信息
            QString scheduleInfo = "";
            QJsonArray schedule = train["schedule"].toArray();
            if (schedule.size() > 0) {
                QStringList scheduleItems;
                for (int k = 0; k < schedule.size(); ++k) {
                    QJsonObject station = schedule[k].toObject();
                    QString stationName = station["station"].toString();
                    QString arrival = station["arrival"].toString();
                    QString departure = station["departure"].toString();
                    
                    if (k == 0) {
                        // 起始站，只显示发车时间
                        scheduleItems << QString("%1 %2").arg(stationName).arg(departure);
                    } else if (k == schedule.size() - 1) {
                        // 终点站，只显示到达时间
                        scheduleItems << QString("%1 %2").arg(stationName).arg(arrival);
                    } else {
                        // 中间站，显示到达/发车时间
                        scheduleItems << QString("%1 %2/%3").arg(stationName).arg(arrival).arg(departure);
                    }
                }
                scheduleInfo = scheduleItems.join("\n");
            }
            
            QTableWidgetItem *scheduleItem = new QTableWidgetItem(scheduleInfo);
            scheduleItem->setToolTip(scheduleInfo); // 设置工具提示以显示完整信息
            scheduleItem->setTextAlignment(Qt::AlignTop | Qt::AlignLeft); // 顶部左对齐
            m_trainTable->setItem(row, 8, scheduleItem);
            
            // 调试输出
            qDebug() << "显示车次:" << train["name"].toString() 
                     << "座位类型:" << seatType["type"].toString()
                     << "价格:" << price
                     << "余票:" << seatType["availableSeats"].toInt();
            
            // 如果没有余票，将整行设置为灰色
            if (seatType["availableSeats"].toInt() == 0) {
                for (int col = 0; col < m_trainTable->columnCount(); ++col) {
                    m_trainTable->item(row, col)->setBackground(QColor(220, 220, 220));
                    m_trainTable->item(row, col)->setForeground(QColor(128, 128, 128));
                }
            }
        }
    }
    
    // 调整列宽和行高
    m_trainTable->resizeColumnsToContents();
    m_trainTable->resizeRowsToContents(); // 自动调整行高以适应内容
}

void MainWindow::displayOrders(const QJsonArray &orders)
{
    m_orderTable->setRowCount(orders.size());
    
    for (int i = 0; i < orders.size(); ++i) {
        QJsonObject order = orders[i].toObject();
        
        QString seatInfo = QString("%1车厢 %2号")
                          .arg(order["carriageNumber"].toString())
                          .arg(order["seatNumber"].toString());
        if (order["carriageNumber"].toString().isEmpty()) {
            seatInfo = "未分配";
        }
        seatInfo += QString(" (%1)").arg(order["seatType"].toString());
        
        QString passengerInfo = QString("%1\n%2")
                               .arg(order["passengerName"].toString())
                               .arg(order["passengerId"].toString());
        
        QString routeInfo = QString("%1 → %2")
                           .arg(order["fromStation"].toString())
                           .arg(order["toStation"].toString());
        
        // 格式化日期和时间信息
        QString dateTimeInfo = order["date"].toString();
        if (!order["departureTime"].toString().isEmpty()) {
            dateTimeInfo += QString("\n开车时间: %1").arg(order["departureTime"].toString());
        }
        
        m_orderTable->setItem(i, 0, new QTableWidgetItem(QString::number(order["id"].toInt())));
        m_orderTable->setItem(i, 1, new QTableWidgetItem(order["trainName"].toString()));
        m_orderTable->setItem(i, 2, new QTableWidgetItem(dateTimeInfo));
        m_orderTable->setItem(i, 3, new QTableWidgetItem(routeInfo));
        m_orderTable->setItem(i, 4, new QTableWidgetItem(seatInfo));
        m_orderTable->setItem(i, 5, new QTableWidgetItem(passengerInfo));
        // 安全地获取价格，处理字符串和数字两种情况
        double price = 0.0;
        QJsonValue priceValue = order["price"];
        if (priceValue.isString()) {
            price = priceValue.toString().toDouble();
            qDebug() << "订单价格(字符串):" << priceValue.toString() << "解析为:" << price;
        } else if (priceValue.isDouble()) {
            price = priceValue.toDouble();
            qDebug() << "订单价格(数字):" << price;
        } else {
            qDebug() << "订单价格类型未知:" << priceValue.type();
        }
        
        m_orderTable->setItem(i, 6, new QTableWidgetItem(QString("¥%1").arg(price, 0, 'f', 2)));
        
        QTableWidgetItem *statusItem = new QTableWidgetItem(order["status"].toString());
        if (order["status"].toString() == "confirmed") {
            statusItem->setForeground(QColor(40, 167, 69)); // 绿色
        } else {
            statusItem->setForeground(QColor(220, 53, 69)); // 红色
        }
        m_orderTable->setItem(i, 7, statusItem);
        
        m_orderTable->setItem(i, 8, new QTableWidgetItem(formatDateTime(order["createdAt"].toString())));
    }
    
    // 调整列宽和行高
    m_orderTable->resizeColumnsToContents();
    m_orderTable->resizeRowsToContents(); // 自动调整行高以适应内容
}

void MainWindow::showMessage(const QString &message, bool isSuccess)
{
    QMessageBox::Icon icon = isSuccess ? QMessageBox::Information : QMessageBox::Warning;
    QString title = isSuccess ? "操作成功" : "操作失败";
    
    QMessageBox msgBox(this);
    msgBox.setIcon(icon);
    msgBox.setWindowTitle(title);
    msgBox.setText(message);
    msgBox.setStandardButtons(QMessageBox::Ok);
    msgBox.exec();
}

void MainWindow::setLoading(bool loading)
{
    m_progressBar->setVisible(loading);
    m_searchButton->setEnabled(!loading);
    m_bookButton->setEnabled(!loading && m_trainTable->currentRow() >= 0);
    m_queryOrdersButton->setEnabled(!loading);
    m_queryAllOrdersButton->setEnabled(!loading);
}

QString MainWindow::formatDateTime(const QString &dateTimeStr)
{
    QDateTime dateTime = QDateTime::fromString(dateTimeStr, Qt::ISODate);
    return dateTime.toString("yyyy-MM-dd hh:mm:ss");
}

bool MainWindow::validateSearchInput()
{
    if (m_passengerNameEdit->text().trimmed().isEmpty()) {
        showMessage("请输入乘客姓名", false);
        m_passengerNameEdit->setFocus();
        return false;
    }
    
    if (m_passengerIdEdit->text().trimmed().isEmpty()) {
        showMessage("请输入身份证号", false);
        m_passengerIdEdit->setFocus();
        return false;
    }
    
    if (m_fromStationCombo->currentData().toString().isEmpty()) {
        showMessage("请选择出发站", false);
        m_fromStationCombo->setFocus();
        return false;
    }
    
    if (m_toStationCombo->currentData().toString().isEmpty()) {
        showMessage("请选择到达站", false);
        m_toStationCombo->setFocus();
        return false;
    }
    
    if (m_fromStationCombo->currentData().toString() == m_toStationCombo->currentData().toString()) {
        showMessage("出发站和到达站不能相同", false);
        m_fromStationCombo->setFocus();
        return false;
    }
    
    return true;
}

bool MainWindow::validateBookingInput()
{
    return validateSearchInput(); // 预订验证与搜索验证相同
} 