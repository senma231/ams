资产管理系统开发文档 (SQLite3 + Vue3)
=============================

1. 项目需求

-------

### 功能需求

1. **资产管理**：
   * 资产入库管理（批量入库、自动生成编码）
   * 资产出库管理（领用、回收、报废）
   * 支持多种资产类型（配件、电脑、主机、显示器）
   * 资产状态跟踪（在库、使用中、报废）

2. **数据统计**：
   * 资产总览（总数、在库数、使用中数、报废数）
   * 资产分布统计（按类型、按部门）
   * 最近操作记录（入库、出库）

3. **用户管理**：
   * 用户认证（登录/登出）
   * 用户权限控制（管理员/普通用户）

### 非功能需求

1. **数据库**：
   * 使用 SQLite3 作为本地数据库
   * 支持数据备份和恢复
   * 定期数据清理和优化

2. **性能要求**：
   * 页面加载时间 < 2秒
   * 数据库查询响应 < 1秒
   * 支持大批量数据导入

3. **安全要求**：
   * JWT 身份认证
   * 密码加密存储
   * 操作日志记录
   * 防SQL注入和XSS攻击

* * *

2. 项目结构

-------

### 后端结构

txt
    backend/
    ├── src/
    │   ├── controllers/        # 控制器
    │   │   ├── assetController.js
    │   │   ├── userController.js
    │   │   └── reportController.js
    │   ├── models/             # 数据模型
    │   │   ├── Asset.js        # SQLite3 模型
    │   │   ├── User.js
    │   │   └── Transaction.js
    │   ├── routes/             # 路由
    │   │   ├── assetRoutes.js
    │   │   ├── userRoutes.js
    │   │   └── reportRoutes.js
    │   ├── services/           # 业务逻辑
    │   │   ├── assetService.js
    │   │   └── reportService.js
    │   ├── database/           # 数据库配置
    │   │   └── db.js           # SQLite3 连接
    │   └── app.js             # 应用入口
    ├── config/                # 配置文件
    │   └── server.js          # 服务器配置
    └── package.json

### 前端结构

txt
    frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/        # 组件
    │   │   ├── AssetList.vue
    │   │   ├── UserList.vue
    │   │   └── ReportExport.vue
    │   ├── views/             # 页面
    │   │   ├── Dashboard.vue
    │   │   ├── Assets.vue
    │   │   └── Reports.vue
    │   ├── store/             # 状态管理
    │   │   └── index.js
    │   ├── router/            # 路由
    │   │   └── index.js
    │   ├── App.vue
    │   └── main.js
    └── package.json

* * *

3. 关键核心代码示例

-----------

### 后端代码

#### SQLite3 数据库连接 (`database/db.js`)

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join('/var/lib', 'assets.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

module.exports = db;
```

#### 资产模型 (`models/Asset.js`)

```javascript
const db = require('../database/db');

class Asset {
  static createTable() {
    db.run(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assetId TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('配件', '电脑', '主机', '显示器')),
        status TEXT NOT NULL DEFAULT '在库' CHECK (status IN ('在库', '领用', '回收')),
        branch TEXT NOT NULL,
        assignedTo INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  static async create(assetData) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO assets (assetId, type, branch, assignedTo) VALUES (?, ?, ?, ?)',
        [assetData.assetId, assetData.type, assetData.branch, assetData.assignedTo],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static async findByBranch(branch) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM assets WHERE branch = ?', [branch], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Asset;
```



#### 资产控制器 (`controllers/assetController.js`)

```javascript
const Asset = require('../models/Asset');

exports.createAsset = async (req, res) => {
  try {
    const assetId = await Asset.create(req.body);
    res.status(201).json({ id: assetId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAssetsByBranch = async (req, res) => {
  try {
    const assets = await Asset.findByBranch(req.params.branch);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

#### ### 前端代码

#### 资产列表组件 (`AssetList.vue`)

```vue
<template>
  <div>
    <h2>资产列表</h2>
    <table>
      <thead>
        <tr>
          <th>资产编号</th>
          <th>类型</th>
          <th>状态</th>
          <th>分公司</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="asset in assets" :key="asset.id">
          <td>{{ asset.assetId }}</td>
          <td>{{ asset.type }}</td>
          <td>{{ asset.status }}</td>
          <td>{{ asset.branch }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      assets: [],
    };
  },
  async created() {
    const response = await fetch('/api/assets/branch/总公司');
    this.assets = await response.json();
  },
};
</script>
```

* * *

4. 部署说明

-------

### 服务器环境准备

1. **安装依赖**：
   
   ```bash
   sudo apt update 
   sudo apt install -y nodejs npm nginx sqlite3
   ```

2. **配置数据库**：
   
   * 创建数据库目录并设置权限：
     
     ```bash
     sudo mkdir -p /var/lib
     sudo touch /var/lib/assets.db
     sudo chown -R $USER:www-data /var/lib/assets.db
     sudo chmod 640 /var/lib/assets.db
     ```

3. **部署后端**：
   
   * 克隆项目并安装依赖：
     
     ```bash
     git clone <your-repo> /opt/assets-management
     cd /opt/assets-management/backend
     npm install
     ```
   
   * 初始化数据库表：
     
     ```bash
     node src/models/Asset.js
     ```
   
   * 使用 PM2 启动服务：
     
     

     ```bash
     npm install -g pm2
     pm2 start src/app.js --name "assets-backend"
     pm2 save
     pm2 startup
     ```

4. **配置 Nginx**：
   1、创建配置文件 `/etc/nginx/sites-available/assets`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

   2、启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/assets /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

5. **部署前端**：
   
   1、**构建前端代码：**
   
   ```bash
   cd /opt/assets-management/frontend
   npm install
   npm run build
   ```
   
   2、将生成的 `dist` 目录内容复制到 Nginx 的静态文件目录：
   
   ```bash
   sudo cp -r dist/* /var/www/html/
   ```

* * *

5. 下一步计划

--------

1. **开发阶段**：
   * 完成用户权限管理模块。
   * 实现报表导出功能。
2. **测试阶段**：
   * 测试 SQLite3 数据库性能。
   * 验证 Nginx 反向代理配置。
3. **部署阶段**：
   * 监控服务器资源使用情况。
   * 定期备份数据库文件。

* * *

6. 附录

-----

* **技术栈**：
  
  * 后端：Node.js + Express + SQLite3。
  * 前端：Vue.js + Vuex + Axios。
  * 部署：Debian + Nginx + PM2。

* **数据库备份**：
  
  * 使用 `cron` 定时任务备份 `/var/lib/assets.db`：
    bash
    
        0 3 * * * cp /var/lib/assets.db /backup/assets-$(date +\%Y\%m\%d).db
