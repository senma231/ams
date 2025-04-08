-- 标准化数据库架构
PRAGMA foreign_keys = ON;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    branch TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建资产类型表
CREATE TABLE IF NOT EXISTS asset_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                      -- 类型名称
    code TEXT UNIQUE NOT NULL,               -- 类型编码
    description TEXT,                        -- 描述
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建资产表
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,                         -- 资产编码（出库时生成）
    name TEXT NOT NULL,                       -- 资产名称
    type TEXT NOT NULL,                       -- 资产类型
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'in_use', 'scrapped')), -- 状态：in_stock(在库)、in_use(使用中)、scrapped(报废)
    department TEXT NOT NULL,                 -- 所属部门
    description TEXT,                         -- 描述
    last_stock_out_id INTEGER,                -- 最后一次出库记录ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (last_stock_out_id) REFERENCES stock_out_records(id)
);

-- 创建入库记录表
CREATE TABLE IF NOT EXISTS stock_in_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT UNIQUE NOT NULL,            -- 批次号
    type TEXT DEFAULT 'purchase',             -- 入库类型：purchase(采购)、donation(捐赠)、other(其他)
    supplier TEXT,                            -- 供应商
    in_date DATE NOT NULL,                    -- 入库日期
    operator_id INTEGER NOT NULL,             -- 操作人ID
    notes TEXT,                               -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 创建入库明细表
CREATE TABLE IF NOT EXISTS stock_in_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_in_id INTEGER NOT NULL,             -- 入库记录ID
    asset_id INTEGER,                         -- 资产ID（可以为空，因为创建明细时资产可能还不存在）
    quantity INTEGER NOT NULL DEFAULT 1,      -- 数量
    unit_price DECIMAL(10,2) NOT NULL,        -- 单价
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_in_id) REFERENCES stock_in_records(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- 创建出库记录表
CREATE TABLE IF NOT EXISTS stock_out_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT UNIQUE NOT NULL,            -- 批次号
    recipient TEXT NOT NULL,                  -- 领用人
    department TEXT,                          -- 部门
    out_date DATE NOT NULL,                   -- 出库日期
    operator_id INTEGER NOT NULL,             -- 操作人ID
    notes TEXT,                               -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 创建出库明细表
CREATE TABLE IF NOT EXISTS stock_out_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_out_id INTEGER NOT NULL,            -- 出库记录ID
    asset_id INTEGER NOT NULL,                -- 资产ID
    quantity INTEGER DEFAULT 1,               -- 数量
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_out_id) REFERENCES stock_out_records(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- 创建资产操作记录表
CREATE TABLE IF NOT EXISTS asset_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,                -- 资产ID
    operation_type TEXT NOT NULL,            -- 操作类型：scrap(报废)、return(回收)
    operator_id INTEGER NOT NULL,             -- 操作人ID
    notes TEXT,                               -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 插入默认资产类型
INSERT OR IGNORE INTO asset_types (name, code, description)
VALUES
('电脑', 'computer', '包括台式电脑和笔记本电脑'),
('配件', 'accessory', '各种电脑配件'),
('显示器', 'monitor', '显示设备'),
('主机', 'host', '服务器主机');

-- 插入默认管理员用户（密码：admin123）
INSERT OR IGNORE INTO users (username, password, name, role)
VALUES ('admin', '$2b$10$hxwsZZ3Ynbzv4Sfm67enD.vDwDS0Q94qGPx7pXuLYW9O3VQiBTuci', '管理员', 'admin');
