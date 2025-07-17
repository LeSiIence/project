@echo off
echo 正在重置MySQL root密码...
echo.
echo 请以管理员身份运行此脚本
echo.

echo 1. 停止MySQL服务...
net stop MySQL80

echo 2. 创建密码重置文件...
echo ALTER USER 'root'@'localhost' IDENTIFIED BY ''; > reset.sql
echo FLUSH PRIVILEGES; >> reset.sql

echo 3. 启动MySQL（跳过权限检查）...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld" --init-file=reset.sql --console

echo 4. 重新启动MySQL服务...
net start MySQL80

echo 5. 清理临时文件...
del reset.sql

echo.
echo MySQL root密码已重置为空
echo 现在可以重新启动Node.js服务器了
pause 