-- 创建用户表
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    branch TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建部门表
DROP TABLE IF EXISTS departments;
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建资产表
DROP TABLE IF EXISTS assets;
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,                         -- 资产编码
    name TEXT NOT NULL,                       -- 资产名称
    type TEXT NOT NULL,                       -- 资产类型 (accessory:配件, computer:电脑, host:主机, monitor:显示器)
    status TEXT NOT NULL DEFAULT 'in_stock',  -- 状态：in_stock(在库)、in_use(使用中)、returned(已回收)
    department TEXT,                          -- 所属部门
    branch TEXT,                              -- 所属分公司
    current_department TEXT,                  -- 当前使用部门
    recipient TEXT,                           -- 使用人
    description TEXT,                         -- 描述
    batch_no TEXT NOT NULL,                   -- 入库批次号
    purchase_date DATE NOT NULL,              -- 采购日期
    unit_price DECIMAL(10,2) NOT NULL,        -- 单价
    supplier TEXT NOT NULL,                   -- 供应商
    warranty_period INTEGER,                  -- 保修期(月)
    out_date DATE,                           -- 领用时间
    last_stock_out_id INTEGER,               -- 最后一次出库记录ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (last_stock_out_id) REFERENCES stock_out_records(id)
);

-- 创建操作记录表
DROP TABLE IF EXISTS operations;
CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    user_id INTEGER,
    operation_type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 插入默认管理员用户（密码：admin123）
DELETE FROM users WHERE username = 'admin';
INSERT INTO users (username, password, name, role) 
VALUES ('admin', '$2b$10$hxwsZZ3Ynbzv4Sfm67enD.vDwDS0Q94qGPx7pXuLYW9O3VQiBTuci', '管理员', 'admin');

-- 插入一些示例部门
DELETE FROM departments;
INSERT INTO departments (name, description) VALUES 
('技术部', '负责公司技术研发'),
('人事部', '负责人力资源管理'),
('财务部', '负责公司财务管理'),
('行政部', '负责日常行政事务');

-- 创建入库记录表
CREATE TABLE IF NOT EXISTS stock_in_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT NOT NULL,
    type TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    supplier TEXT,
    operator_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users (id)
);

-- 创建入库明细表
CREATE TABLE IF NOT EXISTS stock_in_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_in_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_in_id) REFERENCES stock_in_records (id),
    FOREIGN KEY (asset_id) REFERENCES assets (id)
);

-- 创建借用记录表
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATETIME,
    return_date DATETIME,
    FOREIGN KEY (asset_id) REFERENCES assets (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 创建资产出库记录表
CREATE TABLE IF NOT EXISTS stock_out_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT NOT NULL,                    -- 批次号
    recipient TEXT NOT NULL,                   -- 领用人
    department TEXT NOT NULL,                  -- 所属部门
    out_date DATE NOT NULL,                    -- 领用日期
    operator_id INTEGER NOT NULL,              -- 操作人ID
    notes TEXT,                                -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 创建资产出库明细表
CREATE TABLE IF NOT EXISTS stock_out_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_out_id INTEGER NOT NULL,             -- 出库记录ID
    asset_id INTEGER NOT NULL,                 -- 资产ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_out_id) REFERENCES stock_out_records(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
); 