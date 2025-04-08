const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const saltRounds = 10;
  
  try {
    // 生成新的哈希
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Generated hash:', hash);
    
    // 验证新生成的哈希
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verification test with new hash:', isValid);
    
    // 验证现有的哈希
    const existingHash = '$2b$10$YH/MgHyPNYqXxHPAzGAyVOxkxXbfWz9RMO6.PQCFyGwxRDtGgXXtO';
    const isValidExisting = await bcrypt.compare(password, existingHash);
    console.log('Verification test with existing hash:', isValidExisting);
    
    // 如果验证失败，生成新的SQL语句
    if (!isValidExisting) {
      console.log('\n如果现有哈希不正确，请使用以下SQL更新密码：');
      console.log(`UPDATE users SET password = '${hash}' WHERE username = 'admin';`);
      
      console.log('\n或者使用以下完整的初始化SQL：');
      console.log(`INSERT INTO users (username, password, name, role) VALUES ('admin', '${hash}', '管理员', 'admin');`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

generateHash(); 