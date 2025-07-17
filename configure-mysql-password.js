const readline = require('readline');
const mysql = require('mysql2/promise');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function testConnection(password) {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: password
        });
        
        await connection.execute('SELECT 1');
        await connection.end();
        return true;
    } catch (error) {
        return false;
    }
}

async function updateBackendConfig(password) {
    try {
        let backendContent = fs.readFileSync('back-end.js', 'utf8');
        
        // 查找并替换password配置
        const passwordRegex = /password:\s*['"][^'"]*['"]/;
        const newPasswordLine = `password: '${password}'`;
        
        if (passwordRegex.test(backendContent)) {
            backendContent = backendContent.replace(passwordRegex, newPasswordLine);
        } else {
            console.log('Warning: Cannot find password configuration line');
            return false;
        }
        
        fs.writeFileSync('back-end.js', backendContent);
        return true;
    } catch (error) {
        console.error('Error updating configuration file:', error.message);
        return false;
    }
}

async function main() {
    console.log('=== MySQL Password Configuration Tool ===\n');
    console.log('This tool will help you configure MySQL connection password\n');
    
    rl.question('Please enter your MySQL root password (press Enter for empty password): ', async (password) => {
        console.log('\nTesting connection...');
        
        const isConnected = await testConnection(password);
        
        if (isConnected) {
            console.log('✓ Connection successful!');
            
            const updated = await updateBackendConfig(password);
            if (updated) {
                console.log('✓ Configuration file updated');
                console.log('\nYou can now start the server:');
                console.log('node back-end.js');
            } else {
                console.log('✗ Configuration file update failed');
                console.log(`Please manually set password in back-end.js to: '${password}'`);
            }
        } else {
            console.log('✗ Connection failed!');
            console.log('Please check:');
            console.log('1. MySQL service is running');
            console.log('2. Username is root');
            console.log('3. Password is correct');
            console.log('\nYou can:');
            console.log('1. Run this script again with correct password');
            console.log('2. Refer to mysql-password-reset-guide.md to reset password');
        }
        
        rl.close();
    });
}

main().catch(console.error); 