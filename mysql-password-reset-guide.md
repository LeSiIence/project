# MySQL密码重置完整指南

## 方法1：使用MySQL安全模式重置密码

### 步骤1：以管理员身份打开命令提示符
- 按Win+R，输入`cmd`
- 右键点击"命令提示符"，选择"以管理员身份运行"

### 步骤2：停止MySQL服务
```cmd
net stop MySQL80
```

### 步骤3：创建密码重置文件
```cmd
echo ALTER USER 'root'@'localhost' IDENTIFIED BY ''; > C:\temp\mysql-init.txt
echo FLUSH PRIVILEGES; >> C:\temp\mysql-init.txt
```

### 步骤4：启动MySQL安全模式
```cmd
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
mysqld --init-file=C:\temp\mysql-init.txt --console
```

### 步骤5：重新启动MySQL服务
- 按Ctrl+C停止mysqld
- 重新启动服务：`net start MySQL80`

### 步骤6：清理文件
```cmd
del C:\temp\mysql-init.txt
```

## 方法2：使用MySQL Workbench（如果已安装）

1. 打开MySQL Workbench
2. 点击"MySQL Connections"旁边的"+"
3. 尝试连接，如果失败，点击"Reset to Default"
4. 在连接设置中修改密码

## 方法3：重新安装MySQL（最后手段）

如果以上方法都不行，可以考虑重新安装MySQL：

1. 控制面板 → 程序和功能 → 卸载MySQL
2. 重新下载并安装MySQL
3. 在安装过程中设置新的root密码

## 方法4：创建新用户（临时解决方案）

如果您能通过其他方式连接到MySQL，可以创建一个新用户：

```sql
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'apppass';
GRANT ALL PRIVILEGES ON *.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

然后修改back-end.js中的数据库配置：
```javascript
const dbConfig = {
    host: 'localhost',
    user: 'appuser',
    password: 'apppass',
    database: 'train_ticket_system'
};
```

## 建议的下一步行动

1. **首先尝试方法1**（安全模式重置）
2. **如果有MySQL Workbench，尝试方法2**
3. **如果以上都不行，联系系统管理员或考虑重新安装**

请选择一个方法并告诉我结果，我会继续帮助您。 