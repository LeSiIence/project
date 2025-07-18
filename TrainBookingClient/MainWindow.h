#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QGroupBox>
#include <QLabel>
#include <QLineEdit>
#include <QComboBox>
#include <QDateEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QTableWidgetItem>
#include <QProgressBar>
#include <QStatusBar>
#include <QMessageBox>
#include <QHeaderView>
#include <QSplitter>
#include <QTextEdit>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QTimer>
#include <QDate>

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void searchTrains();
    void bookTicket();
    void queryOrders();
    void queryAllOrders();
    void onTrainSelectionChanged();
    void onSearchFinished(QNetworkReply *reply);
    void onBookingFinished(QNetworkReply *reply);
    void onOrderQueryFinished(QNetworkReply *reply);

private:
    void setupUI();
    void setupSearchSection();
    void setupTrainListSection();
    void setupOrderSection();
    void setupStatusBar();
    
    void populateStationComboBoxes();
    void displayTrains(const QJsonArray &trains);
    void displayOrders(const QJsonArray &orders);
    void showMessage(const QString &message, bool isSuccess = true);
    void setLoading(bool loading);
    
    QString formatDateTime(const QString &dateTimeStr);
    bool validateSearchInput();
    bool validateBookingInput();

    // UI组件
    QWidget *m_centralWidget;
    QVBoxLayout *m_mainLayout;
    QSplitter *m_mainSplitter;
    
    // 搜索区域
    QGroupBox *m_searchGroup;
    QLineEdit *m_passengerNameEdit;
    QLineEdit *m_passengerIdEdit;
    QComboBox *m_fromStationCombo;
    QComboBox *m_toStationCombo;
    QDateEdit *m_travelDateEdit;
    QPushButton *m_searchButton;
    
    // 车次列表区域
    QGroupBox *m_trainListGroup;
    QTableWidget *m_trainTable;
    QPushButton *m_bookButton;
    
    // 订单查询区域
    QGroupBox *m_orderGroup;
    QLineEdit *m_queryPassengerNameEdit;
    QLineEdit *m_queryPassengerIdEdit;
    QPushButton *m_queryOrdersButton;
    QPushButton *m_queryAllOrdersButton;
    QTableWidget *m_orderTable;
    
    // 状态栏
    QProgressBar *m_progressBar;
    QLabel *m_statusLabel;
    
    // 网络管理
    QNetworkAccessManager *m_networkManager;
    
    // 数据
    QJsonArray m_currentTrains;
    int m_selectedTrainRow;
    
    // 常量
    static const QString API_BASE;
    static const QStringList STATION_LIST;
};

#endif // MAINWINDOW_H 