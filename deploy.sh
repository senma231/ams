#!/bin/bash

# 资产管理系统部署脚本
# 此脚本会从 GitHub 拉取项目，自动检查依赖和组件，安装缺失的组件，并处理版本兼容性问题

# 设置错误处理
set -e

# GitHub 仓库信息
GITHUB_REPO="https://github.com/senma231/ams.git"
PROJECT_NAME="ams"

# 项目安装路径
# 不在 root 目录下安装，避免权限问题
INSTALL_DIR="/var/www"

# 部署模式
# 如果设置为 true，将跳过所有确认提示，自动安装或更新所有组件
QUICK_DEPLOY=false

# 创建日志文件
LOG_FILE="deploy_$(date +"%Y%m%d_%H%M%S").log"
touch "$LOG_FILE"

# 同时输出到控制台和日志文件
exec > >(tee -a "$LOG_FILE") 2>&1

echo "部署开始时间: $(date)"
echo "日志文件: $LOG_FILE"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以 root 权限运行
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请以 root 权限运行此脚本"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    log_info "检测操作系统..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        log_info "检测到操作系统: $OS $VER"
    else
        log_error "无法检测操作系统"
        exit 1
    fi

    # 检查是否为支持的操作系统
    case "$OS" in
        "Ubuntu"|"Debian GNU/Linux")
            PKG_MANAGER="apt"
            INSTALL_CMD="apt install -y"
            UPDATE_CMD="apt update"
            ;;
        "CentOS Linux"|"Red Hat Enterprise Linux"|"Fedora")
            PKG_MANAGER="yum"
            INSTALL_CMD="yum install -y"
            UPDATE_CMD="yum update -y"
            ;;
        *)
            log_warning "不完全支持的操作系统: $OS。尝试继续，但可能会遇到问题。"
            if command -v apt &> /dev/null; then
                PKG_MANAGER="apt"
                INSTALL_CMD="apt install -y"
                UPDATE_CMD="apt update"
            elif command -v yum &> /dev/null; then
                PKG_MANAGER="yum"
                INSTALL_CMD="yum install -y"
                UPDATE_CMD="yum update -y"
            else
                log_error "无法确定包管理器。请手动安装依赖。"
                exit 1
            fi
            ;;
    esac
}

# 更新系统包
update_system() {
    log_info "更新系统包..."
    $UPDATE_CMD
    if [ $? -ne 0 ]; then
        log_error "更新系统包失败"
        exit 1
    fi
    log_success "系统包更新完成"
}

# 安装基本依赖
install_basic_deps() {
    log_info "安装基本依赖..."

    DEPS="curl wget git build-essential lsof"

    for dep in $DEPS; do
        if ! command -v $dep &> /dev/null; then
            log_info "安装 $dep..."
            $INSTALL_CMD $dep
            if [ $? -ne 0 ]; then
                log_error "安装 $dep 失败"
                exit 1
            fi
        else
            log_info "$dep 已安装"
        fi
    done

    log_success "基本依赖安装完成"
}

# 检查并安装 Node.js
install_nodejs() {
    log_info "检查 Node.js..."

    # 尝试多种方式检测 Node.js
    NODE_PATHS=(
        "node"
        "/usr/bin/node"
        "/usr/local/bin/node"
        "$HOME/.nvm/versions/node/*/bin/node"
        "/opt/node/bin/node"
    )

    NODE_FOUND=false
    NODE_PATH=""
    NODE_VER=""

    for path in "${NODE_PATHS[@]}"; do
        # 处理通配符路径
        if [[ $path == *"*"* ]]; then
            for expanded_path in $path; do
                if [ -x "$expanded_path" ]; then
                    NODE_PATH="$expanded_path"
                    NODE_VER=$("$NODE_PATH" -v 2>/dev/null | cut -d 'v' -f 2)
                    if [ $? -eq 0 ]; then
                        NODE_FOUND=true
                        break 2
                    fi
                fi
            done
        else
            # 直接检查路径
            if command -v $path &> /dev/null; then
                NODE_PATH="$path"
                NODE_VER=$(command -v $path &> /dev/null && $path -v 2>/dev/null | cut -d 'v' -f 2)
                if [ $? -eq 0 ]; then
                    NODE_FOUND=true
                    break
                fi
            fi
        fi
    done

    # 检查 NVM
    if [ "$NODE_FOUND" = false ] && [ -f "$HOME/.nvm/nvm.sh" ]; then
        log_info "检测到 NVM，尝试加载..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        if command -v node &> /dev/null; then
            NODE_PATH=$(command -v node)
            NODE_VER=$(node -v 2>/dev/null | cut -d 'v' -f 2)
            if [ $? -eq 0 ]; then
                NODE_FOUND=true
            fi
        fi
    fi

    # 处理检测结果
    if [ "$NODE_FOUND" = true ]; then
        log_info "检测到 Node.js 版本: $NODE_VER"

        # 检查版本是否满足要求
        if [ "$(printf '%s\n' "18.0.0" "$NODE_VER" | sort -V | head -n1)" = "18.0.0" ]; then
            log_success "Node.js 版本满足要求"
        else
            log_warning "Node.js 版本过低，需要 v18.0.0 或更高版本"
            if [ "$QUICK_DEPLOY" = true ]; then
                log_info "快速部署模式: 自动升级 Node.js"
                install_nodejs_nvm
            else
                read -p "是否升级 Node.js 到 v18? (y/n): " confirm
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    install_nodejs_nvm
                else
                    log_error "Node.js 版本不满足要求，部署可能会失败"
                    read -p "是否继续部署? (y/n): " continue
                    if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
                        log_error "部署已取消"
                        exit 1
                    fi
                fi
            fi
        fi
    else
        log_info "未检测到 Node.js，需要安装"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动安装 Node.js"
            install_nodejs_nvm
        else
            read -p "是否安装 Node.js v18? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                install_nodejs_nvm
            else
                log_error "Node.js 是必需的组件，无法继续部署"
                exit 1
            fi
        fi
    fi
}

# 使用 NVM 安装 Node.js
install_nodejs_nvm() {
    log_info "使用 NVM 安装 Node.js..."

    # 检查 NVM 是否已安装
    if [ ! -d "$HOME/.nvm" ]; then
        log_info "安装 NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        log_info "NVM 已安装"
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # 安装 Node.js 18 版本
    log_info "安装 Node.js 18 版本..."
    nvm install 18

    # 设置默认 Node.js 版本
    nvm alias default 18
    nvm use 18

    # 验证安装
    NODE_VER=$(node -v)
    log_success "Node.js $NODE_VER 安装完成"
}

# 检查并安装 npm
install_npm() {
    log_info "检查 npm..."

    if command -v npm &> /dev/null; then
        NPM_VER=$(npm -v)
        log_info "检测到 npm 版本: $NPM_VER"

        # 检查版本是否满足要求
        if [ "$(printf '%s\n' "8.0.0" "$NPM_VER" | sort -V | head -n1)" = "8.0.0" ]; then
            log_success "npm 版本满足要求"
        else
            log_warning "npm 版本过低，需要 v8.0.0 或更高版本"
            if [ "$QUICK_DEPLOY" = true ]; then
                log_info "快速部署模式: 自动更新 npm"
                npm install -g npm@latest
                NPM_VER=$(npm -v)
                log_success "npm 更新到版本 $NPM_VER"
            else
                read -p "是否更新 npm? (y/n): " confirm
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    log_info "更新 npm..."
                    npm install -g npm@latest
                    NPM_VER=$(npm -v)
                    log_success "npm 更新到版本 $NPM_VER"
                else
                    log_warning "继续使用当前 npm 版本，可能会影响部署"
                fi
            fi
        fi
    else
        log_error "npm 未安装，这不应该发生，因为它应该随 Node.js 一起安装"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动安装 npm"
            $INSTALL_CMD npm
            if [ $? -ne 0 ]; then
                log_error "安装 npm 失败"
                exit 1
            fi
            log_success "npm 安装完成"
        else
            read -p "是否尝试安装 npm? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "安装 npm..."
                $INSTALL_CMD npm
                if [ $? -ne 0 ]; then
                    log_error "安装 npm 失败"
                    exit 1
                fi
                log_success "npm 安装完成"
            else
                log_error "npm 是必需的组件，无法继续部署"
                exit 1
            fi
        fi
    fi
}

# 检查并安装 PM2
install_pm2() {
    log_info "检查 PM2..."

    if command -v pm2 &> /dev/null; then
        PM2_VER=$(pm2 -v)
        log_info "检测到 PM2 版本: $PM2_VER"

        # 检查是否需要更新
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动更新 PM2"
            npm update -g pm2
            PM2_VER=$(pm2 -v)
            log_success "PM2 更新到版本 $PM2_VER"
        else
            read -p "是否更新 PM2 到最新版本? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "更新 PM2..."
                npm update -g pm2
                PM2_VER=$(pm2 -v)
                log_success "PM2 更新到版本 $PM2_VER"
            else
                log_info "继续使用当前 PM2 版本"
            fi
        fi
    else
        log_info "PM2 未安装，需要安装"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动安装 PM2"
            npm install -g pm2
            if [ $? -ne 0 ]; then
                log_error "安装 PM2 失败"
                exit 1
            fi
            log_success "PM2 安装完成"
        else
            read -p "是否安装 PM2? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "安装 PM2..."
                npm install -g pm2
                if [ $? -ne 0 ]; then
                    log_error "安装 PM2 失败"
                    exit 1
                fi
                log_success "PM2 安装完成"
            else
                log_error "PM2 是必需的组件，无法继续部署"
                exit 1
            fi
        fi
    fi
}

# 检查并安装 SQLite
install_sqlite() {
    log_info "检查 SQLite..."

    if command -v sqlite3 &> /dev/null; then
        SQLITE_VER=$(sqlite3 --version | awk '{print $1}')
        log_info "检测到 SQLite 版本: $SQLITE_VER"

        # 检查版本是否满足要求
        if [ "$(printf '%s\n' "3.0.0" "$SQLITE_VER" | sort -V | head -n1)" = "3.0.0" ]; then
            log_success "SQLite 版本满足要求"
        else
            log_warning "SQLite 版本过低，需要 v3.0.0 或更高版本"
            if [ "$QUICK_DEPLOY" = true ]; then
                log_info "快速部署模式: 自动更新 SQLite"
                $INSTALL_CMD sqlite3
                SQLITE_VER=$(sqlite3 --version | awk '{print $1}')
                log_success "SQLite 更新到版本 $SQLITE_VER"
            else
                read -p "是否尝试更新 SQLite? (y/n): " confirm
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    log_info "更新 SQLite..."
                    $INSTALL_CMD sqlite3
                    SQLITE_VER=$(sqlite3 --version | awk '{print $1}')
                    log_success "SQLite 更新到版本 $SQLITE_VER"
                else
                    log_warning "继续使用当前 SQLite 版本，可能会影响部署"
                fi
            fi
        fi
    else
        log_info "SQLite 未安装，需要安装"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动安装 SQLite"
            $INSTALL_CMD sqlite3
            if [ $? -ne 0 ]; then
                log_error "安装 SQLite 失败"
                exit 1
            fi
            log_success "SQLite 安装完成"
        else
            read -p "是否安装 SQLite? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "安装 SQLite..."
                $INSTALL_CMD sqlite3
                if [ $? -ne 0 ]; then
                    log_error "安装 SQLite 失败"
                    exit 1
                fi
                log_success "SQLite 安装完成"
            else
                log_error "SQLite 是必需的组件，无法继续部署"
                exit 1
            fi
        fi
    fi
}

# 检查并安装 Nginx
check_nginx() {
    log_info "检查 Nginx..."

    if command -v nginx &> /dev/null; then
        NGINX_VER=$(nginx -v 2>&1 | grep -o "nginx/[0-9.]*" | cut -d '/' -f 2)
        log_info "检测到 Nginx 版本: $NGINX_VER"

        # 检查是否需要更新
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动更新 Nginx"

            # 根据不同的操作系统使用不同的更新方法
            if [ "$PKG_MANAGER" = "apt" ]; then
                # Debian/Ubuntu
                apt update
                apt install -y nginx
            elif [ "$PKG_MANAGER" = "yum" ]; then
                # CentOS/RHEL
                yum update -y nginx
            else
                # 通用方法
                log_warning "无法自动更新 Nginx，请手动更新"
            fi

            NGINX_VER=$(nginx -v 2>&1 | grep -o "nginx/[0-9.]*" | cut -d '/' -f 2)
            log_success "Nginx 更新到版本 $NGINX_VER"
        else
            read -p "是否更新 Nginx 到最新版本? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "更新 Nginx..."

                # 根据不同的操作系统使用不同的更新方法
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # Debian/Ubuntu
                    apt update
                    apt install -y nginx
                elif [ "$PKG_MANAGER" = "yum" ]; then
                    # CentOS/RHEL
                    yum update -y nginx
                else
                    # 通用方法
                    log_warning "无法自动更新 Nginx，请手动更新"
                fi

                NGINX_VER=$(nginx -v 2>&1 | grep -o "nginx/[0-9.]*" | cut -d '/' -f 2)
                log_success "Nginx 更新到版本 $NGINX_VER"
            else
                log_info "继续使用当前 Nginx 版本"
            fi
        fi
    else
        log_info "Nginx 未安装，需要安装"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动安装 Nginx"

            # 根据不同的操作系统使用不同的安装方法
            if [ "$PKG_MANAGER" = "apt" ]; then
                # Debian/Ubuntu
                log_info "使用 apt 安装 Nginx..."
                apt update
                apt install -y nginx
            elif [ "$PKG_MANAGER" = "yum" ]; then
                # CentOS/RHEL
                log_info "使用 yum 安装 Nginx..."
                yum install -y epel-release
                yum install -y nginx
            else
                # 通用方法
                log_info "使用通用方法安装 Nginx..."
                log_error "无法自动安装 Nginx，请手动安装"
                exit 1
            fi

            if [ $? -ne 0 ]; then
                log_error "安装 Nginx 失败"
                exit 1
            fi
            log_success "Nginx 安装完成"
        else
            read -p "是否安装 Nginx? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "安装 Nginx..."

                # 根据不同的操作系统使用不同的安装方法
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # Debian/Ubuntu
                    log_info "使用 apt 安装 Nginx..."
                    apt update
                    apt install -y nginx
                elif [ "$PKG_MANAGER" = "yum" ]; then
                    # CentOS/RHEL
                    log_info "使用 yum 安装 Nginx..."
                    yum install -y epel-release
                    yum install -y nginx
                else
                    # 通用方法
                    log_info "使用通用方法安装 Nginx..."
                    log_error "无法自动安装 Nginx，请手动安装"
                    exit 1
                fi

                if [ $? -ne 0 ]; then
                    log_error "安装 Nginx 失败"
                    exit 1
                fi
                log_success "Nginx 安装完成"
            else
                log_error "Nginx 是必需的组件，无法继续部署"
                exit 1
            fi
        fi
    fi
}

# 检查端口是否被占用的函数
check_port() {
    local port=$1
    log_info "检查端口 $port 是否可用..."

    # 尝试使用 lsof 检查端口
    if command -v lsof &> /dev/null; then
        if lsof -i:$port -P -n | grep LISTEN &> /dev/null; then
            log_warning "端口 $port 已被占用"
            return 1
        fi
    # 如果没有 lsof，尝试使用 netstat
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep ":$port " &> /dev/null; then
            log_warning "端口 $port 已被占用"
            return 1
        fi
    # 如果没有 netstat，尝试使用 ss
    elif command -v ss &> /dev/null; then
        if ss -tuln | grep ":$port " &> /dev/null; then
            log_warning "端口 $port 已被占用"
            return 1
        fi
    # 如果以上工具都没有，尝试直接使用 TCP 连接测试
    else
        # 创建一个临时脚本来测试端口
        cat > /tmp/port_check.js << EOF
const net = require('net');
const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.exit(1);
  }
});
server.once('listening', () => {
  server.close();
  process.exit(0);
});
server.listen($port);
EOF

        # 执行脚本
        if ! node /tmp/port_check.js; then
            log_warning "端口 $port 已被占用"
            rm /tmp/port_check.js
            return 1
        fi
        rm /tmp/port_check.js
    fi

    log_success "端口 $port 可用"
    return 0
}

# 查找可用端口
find_available_port() {
    local start_port=$1
    local current_port=$start_port
    local max_attempts=10

    log_info "查找可用端口，从 $start_port 开始..."

    while [ $max_attempts -gt 0 ]; do
        if check_port $current_port; then
            log_success "找到可用端口: $current_port"
            echo $current_port
            return 0
        fi
        current_port=$((current_port + 1))
        max_attempts=$((max_attempts - 1))
    done

    log_error "无法找到可用端口"
    return 1
}

# 部署后端
deploy_backend() {
    log_info "部署后端..."

    # 进入后端目录
    cd backend || { log_error "后端目录不存在"; exit 1; }

    # 安装依赖
    log_info "安装后端依赖..."
    npm install --production
    if [ $? -ne 0 ]; then
        log_error "安装后端依赖失败"
        exit 1
    fi

    # 创建必要的目录
    mkdir -p data logs

    # 检查认证路由是否完整
    log_info "检查认证路由..."
    AUTH_ROUTE="src/routes/auth.js"
    if [ -f "$AUTH_ROUTE" ]; then
        # 检查是否存在 status 路由
        if ! grep -q "router.get.*status" "$AUTH_ROUTE"; then
            log_warning "认证路由中缺少 status 路由，正在添加..."

            # 备份原始文件
            cp "$AUTH_ROUTE" "${AUTH_ROUTE}.bak"

            # 在 module.exports 行之前添加 status 路由
            STATUS_ROUTE='
// 获取认证状态
router.get("/status", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "未提供认证令牌",
      authenticated: false
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 查找用户
    db.get(
      "SELECT id, username, name, role, branch FROM users WHERE id = ?",
      [decoded.id],
      (err, user) => {
        if (err || !user) {
          return res.status(401).json({
            success: false,
            message: "无效的认证令牌",
            authenticated: false
          });
        }

        res.json({
          success: true,
          message: "认证有效",
          authenticated: true,
          data: {
            user
          }
        });
      }
    );
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "无效的认证令牌",
      authenticated: false
    });
  }
});'

            # 在 module.exports 行之前添加 status 路由
            MODULE_EXPORTS_LINE=$(grep -n "module.exports" "$AUTH_ROUTE" | head -1 | cut -d: -f1)

            if [ ! -z "$MODULE_EXPORTS_LINE" ]; then
                # 使用 awk 添加 status 路由
                awk -v line="$MODULE_EXPORTS_LINE" -v route="$STATUS_ROUTE" 'NR==line{print route}1' "$AUTH_ROUTE" > "${AUTH_ROUTE}.tmp"
                mv "${AUTH_ROUTE}.tmp" "$AUTH_ROUTE"
                log_success "status 路由添加成功"
            else
                log_warning "无法找到 module.exports 行，尝试在文件末尾添加"
                # 在文件末尾添加 status 路由
                echo "$STATUS_ROUTE" >> "$AUTH_ROUTE"
                log_success "status 路由添加成功"
            fi
        else
            log_success "认证路由已包含 status 路由"
        fi
    else
        log_error "找不到认证路由文件: $AUTH_ROUTE"
    fi

    # 检查默认端口是否可用
    DEFAULT_PORT=3000
    BACKEND_PORT=$DEFAULT_PORT

    if ! check_port $DEFAULT_PORT; then
        log_warning "默认端口 $DEFAULT_PORT 已被占用，尝试查找可用端口..."
        BACKEND_PORT=$(find_available_port $((DEFAULT_PORT + 1)))

        if [ $? -ne 0 ]; then
            log_error "无法找到可用端口，后端部署失败"
            exit 1
        fi

        # 创建或更新 .env 文件以使用新端口
        log_info "更新环境配置以使用端口 $BACKEND_PORT..."
        if [ -f ".env" ]; then
            # 如果 .env 文件存在，更新 PORT
            if grep -q "^PORT=" ".env"; then
                sed -i "s/^PORT=.*/PORT=$BACKEND_PORT/" ".env"
            else
                echo "PORT=$BACKEND_PORT" >> ".env"
            fi
        else
            # 如果 .env 文件不存在，创建一个新的
            echo "PORT=$BACKEND_PORT" > ".env"
        fi

        # 记录实际使用的端口，以便 Nginx 配置使用
        echo $BACKEND_PORT > ".actual_port"
        log_success "后端将使用端口 $BACKEND_PORT"
    else
        # 记录使用的是默认端口
        echo $BACKEND_PORT > ".actual_port"
        log_success "后端将使用默认端口 $BACKEND_PORT"
    fi

    # 检查是否已经有运行的实例
    if pm2 list | grep -q "asset-management-backend"; then
        log_info "停止现有的后端实例..."
        pm2 stop asset-management-backend
        pm2 delete asset-management-backend
    fi

    # 使用 PM2 启动应用
    log_info "启动后端应用..."
    # 使用环境变量指定端口
    PORT=$BACKEND_PORT pm2 start src/app.js --name "asset-management-backend"
    if [ $? -ne 0 ]; then
        log_error "启动后端应用失败"
        exit 1
    fi

    # 设置开机自启
    pm2 save
    pm2 startup

    log_success "后端部署完成，使用端口: $BACKEND_PORT"

    # 返回上级目录
    cd ..
}

# 部署前端
deploy_frontend() {
    log_info "部署前端..."

    # 运行前端依赖修复脚本
    if [ -f "fix_frontend.sh" ]; then
        log_info "运行前端综合修复脚本..."
        chmod +x fix_frontend.sh
        ./fix_frontend.sh
        if [ $? -ne 0 ]; then
            log_warning "前端综合修复脚本运行失败，继续部署"
        fi
    elif [ -f "fix_frontend_deps.sh" ]; then
        log_info "运行前端依赖修复脚本..."
        chmod +x fix_frontend_deps.sh
        ./fix_frontend_deps.sh
        if [ $? -ne 0 ]; then
            log_warning "前端依赖修复脚本运行失败，继续部署"
        fi
    elif [ -f "fix_vue_version.sh" ]; then
        log_info "运行 Vue 版本修复脚本..."
        chmod +x fix_vue_version.sh
        ./fix_vue_version.sh
        if [ $? -ne 0 ]; then
            log_warning "Vue 版本修复脚本运行失败，继续部署"
        fi
    else
        log_warning "未找到前端修复脚本，创建临时修复脚本"

        # 创建临时修复脚本
        cat > temp_fix.sh << 'EOF'
#!/bin/bash
cd frontend
echo "legacy-peer-deps=true" > .npmrc
if [ -f "package.json" ]; then
    sed -i 's/"vue": "\^3\.4\.15"/"vue": "\^3\.2\.47"/' package.json
    sed -i 's/"vue-echarts": "\^6\.6\.8"/"vue-echarts": "\^6\.5\.5"/' package.json
fi
cd ..
EOF
        chmod +x temp_fix.sh
        ./temp_fix.sh
        rm temp_fix.sh
    fi

    # 进入前端目录
    cd frontend || { log_error "前端目录不存在"; exit 1; }

    # 安装依赖
    log_info "安装前端依赖..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        log_warning "使用 --legacy-peer-deps 安装失败，尝试使用 --force"
        npm install --force
        if [ $? -ne 0 ]; then
            log_error "安装前端依赖失败"
            exit 1
        fi
    fi

    # 构建生产版本
    log_info "构建前端应用..."
    npm run build
    if [ $? -ne 0 ]; then
        log_error "构建前端应用失败"
        exit 1
    fi

    # 检查是否已经有其他项目使用 Nginx
    EXISTING_NGINX_CONFIG=false
    if [ -f "/etc/nginx/sites-enabled/default" ] || [ -d "/etc/nginx/conf.d" ] && [ "$(ls -A /etc/nginx/conf.d 2>/dev/null)" ]; then
        log_info "检测到现有 Nginx 配置"
        EXISTING_NGINX_CONFIG=true
    fi

    # 配置 Nginx
    log_info "配置 Nginx..."

    # 获取当前目录的绝对路径
    FRONTEND_DIST=$(pwd)/dist

    # 创建 Nginx 配置目录
    if [ ! -d "/etc/nginx/conf.d" ]; then
        log_info "创建 Nginx 配置目录..."
        mkdir -p /etc/nginx/conf.d
    fi

    # 检查是否使用 sites-available/sites-enabled 结构
    NGINX_USES_SITES_ENABLED=false
    if [ -d "/etc/nginx/sites-available" ] || [ -d "/etc/nginx/sites-enabled" ]; then
        NGINX_USES_SITES_ENABLED=true
        # 确保目录存在
        mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    fi

    # 如果已经添加到现有配置，则跳过创建新配置
    if [ "$EXISTING_NGINX_CONFIG" = true ]; then
        log_info "使用现有 Nginx 配置并添加资产管理系统"

        # 即使在快速部署模式下，也要询问用户
        echo ""
        log_warning "检测到现有 Nginx 配置，可能有其他项目正在使用 Nginx"
        echo "----------------------------------------"
        echo "选项 1: 覆盖现有配置 (可能影响其他项目)"
        echo "选项 2: 将资产管理系统添加为新站点"
        echo "----------------------------------------"
        read -p "请选择 (1/2): " nginx_option

        if [ "$nginx_option" = "2" ]; then
            # 询问是否使用子域名或路径
            echo ""
            log_info "添加方式选择"
            echo "----------------------------------------"
            echo "选项 1: 使用子域名 (例如: ams.example.com)"
            echo "选项 2: 使用路径前缀 (例如: example.com/ams)"
            echo "----------------------------------------"
            read -p "请选择 (1/2): " add_option

            if [ "$add_option" = "1" ]; then
                read -p "请输入子域名: " SUBDOMAIN
                DOMAIN_NAME=$SUBDOMAIN

                # 创建新的站点配置文件
                cat > /etc/nginx/conf.d/ams.conf << EOF
# 资产管理系统 - 子域名: $SUBDOMAIN
server {
    listen 80;
    server_name $SUBDOMAIN;

    root $(pwd)/dist;
    index index.html;

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 允许跨域请求
    add_header Access-Control-Allow-Origin *;
}
EOF
                log_success "已添加子域名配置: $SUBDOMAIN"

            elif [ "$add_option" = "2" ]; then
                read -p "请输入域名: " DOMAIN
                read -p "请输入路径前缀 (例如: ams): " PATH_PREFIX
                DOMAIN_NAME="$DOMAIN/$PATH_PREFIX"

                # 创建新的站点配置文件
                cat > /etc/nginx/conf.d/ams.conf << EOF
# 资产管理系统 - 路径前缀: $DOMAIN/$PATH_PREFIX
server {
    listen 80;
    server_name $DOMAIN;

    # 静态文件
    location /$PATH_PREFIX/ {
        alias $(pwd)/dist/;
        try_files \$uri \$uri/ /$PATH_PREFIX/index.html;
    }

    # API 反向代理
    location /$PATH_PREFIX/api/ {
        rewrite ^/$PATH_PREFIX/api/(.*) /\$1 break;
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 允许跨域请求
    add_header Access-Control-Allow-Origin *;
}
EOF
                log_success "已添加路径配置: $PATH_PREFIX"

            else
                log_error "无效选项，将覆盖现有配置"
                EXISTING_NGINX_CONFIG=false
            fi
        else
            log_warning "将覆盖现有 Nginx 配置"
            EXISTING_NGINX_CONFIG=false
        fi
    else
        # 检查端口 80 是否被占用
        log_info "检查端口 80 是否被占用..."
        PORT_80_PID=$(lsof -t -i:80 2>/dev/null)

        if [ ! -z "$PORT_80_PID" ]; then
            log_warning "端口 80 已被进程 ID $PORT_80_PID 占用"

            # 检查是否是其他 Web 服务器
            if systemctl is-active --quiet caddy; then
                log_warning "Caddy 正在运行并占用端口 80"

                if [ "$QUICK_DEPLOY" = true ]; then
                    log_info "快速部署模式: 自动停止 Caddy"
                    systemctl stop caddy
                    log_success "Caddy 已停止"
                else
                    read -p "是否停止 Caddy 以释放端口 80? (y/n): " confirm
                    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                        systemctl stop caddy
                        log_success "Caddy 已停止"
                    else
                        log_warning "继续部署，但 Nginx 可能无法启动"
                    fi
                fi
            else
                # 其他进程占用端口 80
                PROCESS_NAME=$(ps -p $PORT_80_PID -o comm= 2>/dev/null || echo "unknown")
                log_warning "进程 '$PROCESS_NAME' (进程 ID: $PORT_80_PID) 正在占用端口 80"

                if [ "$QUICK_DEPLOY" = true ]; then
                    log_info "快速部署模式: 尝试终止占用端口 80 的进程"
                    kill $PORT_80_PID
                    sleep 2
                    log_info "已尝试终止进程"
                else
                    read -p "是否终止该进程以释放端口 80? (y/n): " confirm
                    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                        kill $PORT_80_PID
                        sleep 2
                        log_info "已尝试终止进程"
                    else
                        log_warning "继续部署，但 Nginx 可能无法启动"
                    fi
                fi
            fi
        else
            log_success "端口 80 可用"
        fi

        # 询问是否配置域名
        DOMAIN_NAME=""
        # 即使在快速部署模式下，也要询问域名配置
        echo ""
        log_info "域名配置"
        echo "----------------------------------------"
        log_warning "重要提醒：域名配置是必要的步骤，不能跳过此步骤"
        log_warning "即使在快速部署模式下，也必须配置域名"
        echo "您可以为资产管理系统配置域名"
        echo "如果不配置域名，将使用服务器 IP 地址访问系统"
        echo "----------------------------------------"

        # 即使在快速部署模式下，也要询问域名配置
        # 这里特意不检查 QUICK_DEPLOY 变量
        read -p "是否配置域名? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            read -p "请输入域名 (例如: example.com): " DOMAIN_NAME
            log_info "已设置域名: $DOMAIN_NAME"
        else
            log_info "不使用域名，将使用 IP 地址访问"
        fi
        echo ""

        # 创建 Nginx 配置文件
        log_info "创建 Nginx 配置文件..."

        # 准备配置内容
        # 使用安装目录中的项目路径
        PROJECT_PATH="$INSTALL_DIR/$PROJECT_NAME"
        FRONTEND_DIST="$PROJECT_PATH/frontend/dist"

        # 检查后端实际使用的端口
        BACKEND_PORT=3000
        ACTUAL_PORT_FILE="$PROJECT_PATH/backend/.actual_port"

        if [ -f "$ACTUAL_PORT_FILE" ]; then
            BACKEND_PORT=$(cat "$ACTUAL_PORT_FILE")
            log_info "检测到后端实际使用的端口: $BACKEND_PORT"
        else
            log_warning "找不到后端端口配置文件，使用默认端口: $BACKEND_PORT"
        fi

        if [ -z "$DOMAIN_NAME" ]; then
            # 使用 IP 配置
            CONFIG_CONTENT="# 资产管理系统
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root $FRONTEND_DIST;
    index index.html;

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 允许跨域请求
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS, PUT, DELETE';
    add_header Access-Control-Allow-Headers 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
}"
        else
            # 使用域名配置
            CONFIG_CONTENT="# 资产管理系统
server {
    listen 80;
    listen [::]:80;

    server_name $DOMAIN_NAME;

    root $FRONTEND_DIST;
    index index.html;

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 允许跨域请求
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS, PUT, DELETE';
    add_header Access-Control-Allow-Headers 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
}"
        fi

        # 根据 Nginx 配置结构选择正确的路径
        if [ "$NGINX_USES_SITES_ENABLED" = true ]; then
            # 使用 sites-available/sites-enabled 结构
            echo "$CONFIG_CONTENT" > /etc/nginx/sites-available/default

            # 确保符号链接存在
            if [ ! -f "/etc/nginx/sites-enabled/default" ]; then
                ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
            fi

            # 修改 Nginx 主配置文件，包含 sites-enabled 目录
            if ! grep -q "include /etc/nginx/sites-enabled/\*" /etc/nginx/nginx.conf; then
                # 备份原始配置
                cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak.$(date +"%Y%m%d%H%M%S")

                # 在 http 块的结尾前添加 include 指令
                sed -i '/http {/,/}/{s/}/    include \/etc\/nginx\/sites-enabled\/\*;\n}/}' /etc/nginx/nginx.conf
            fi

            log_info "Nginx 配置已写入 /etc/nginx/sites-available/default"
        else
            # 使用 conf.d 结构
            echo "$CONFIG_CONTENT" > /etc/nginx/conf.d/default.conf
            log_info "Nginx 配置已写入 /etc/nginx/conf.d/default.conf"
        fi

        # 检查 Nginx 配置是否有语法错误
        log_info "检查 Nginx 配置语法..."
        nginx -t
        if [ $? -ne 0 ]; then
            log_error "Nginx 配置有语法错误，请检查配置文件"
            exit 1
        fi

        # 设置文件权限
        log_info "设置文件权限..."
        chmod -R 755 "$FRONTEND_DIST"
        if getent group www-data &>/dev/null; then
            chown -R www-data:www-data "$FRONTEND_DIST"
            log_success "已将所有者修改为 www-data:www-data"
        elif getent group nginx &>/dev/null; then
            chown -R nginx:nginx "$FRONTEND_DIST"
            log_success "已将所有者修改为 nginx:nginx"
        else
            log_warning "找不到 www-data 或 nginx 用户组，尝试使用 nobody 用户..."
            chown -R nobody:nobody "$FRONTEND_DIST" 2>/dev/null || true
        fi

        # 重启 Nginx 服务
        log_info "重启 Nginx 服务..."
        systemctl restart nginx
        if [ $? -ne 0 ]; then
            log_error "启动 Nginx 失败"
            log_warning "可能是端口 80 仍然被占用。尝试使用其他端口..."

            # 尝试使用其他端口
            log_info "尝试使用端口 8080..."

            if [ "$EXISTING_NGINX_CONFIG" = true ]; then
                # 如果使用现有配置，则不修改配置文件
                log_warning "使用现有配置，无法自动切换端口。请手动修改 Nginx 配置。"
            else
                # 准备端口 8080 的配置内容
                if [ -z "$DOMAIN_NAME" ]; then
                    # 使用 IP 配置
                    CONFIG_CONTENT="# 资产管理系统
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;

    root $FRONTEND_DIST;
    index index.html;

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 允许跨域请求
    add_header Access-Control-Allow-Origin *;
}"
                else
                    # 使用域名配置，但在端口 8080 上
                    CONFIG_CONTENT="# 资产管理系统
server {
    listen 8080;
    listen [::]:8080;

    server_name $DOMAIN_NAME;

    root $FRONTEND_DIST;
    index index.html;

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 允许跨域请求
    add_header Access-Control-Allow-Origin *;
}"
                fi

                # 根据 Nginx 配置结构选择正确的路径
                if [ "$NGINX_USES_SITES_ENABLED" = true ]; then
                    # 使用 sites-available/sites-enabled 结构
                    echo "$CONFIG_CONTENT" > /etc/nginx/sites-available/default
                    log_info "Nginx 配置已写入 /etc/nginx/sites-available/default"
                else
                    # 使用 conf.d 结构
                    echo "$CONFIG_CONTENT" > /etc/nginx/conf.d/default.conf
                    log_info "Nginx 配置已写入 /etc/nginx/conf.d/default.conf"
                fi

                # 检查配置是否有语法错误
                nginx -t
                if [ $? -ne 0 ]; then
                    log_error "Nginx 配置有语法错误，请检查配置文件"
                    log_warning "继续部署过程，但前端可能无法访问"
                else
                    systemctl restart nginx
                    if [ $? -ne 0 ]; then
                        log_error "即使使用端口 8080 也无法启动 Nginx"
                        log_warning "继续部署过程，但前端可能无法访问"
                    else
                        log_success "Nginx 已在端口 8080 上启动"
                        log_info "请使用 http://YOUR_SERVER_IP:8080 访问前端"
                    fi
                fi
            fi
        fi

        # 设置正确的文件权限
        log_info "设置文件权限..."
        if getent group www-data &>/dev/null; then
            chown -R www-data:www-data $FRONTEND_DIST
        else
            chown -R nginx:nginx $FRONTEND_DIST 2>/dev/null || true
        fi
        chmod -R 755 $FRONTEND_DIST

        # 检查 Nginx 是否运行
        if ! systemctl is-active --quiet nginx; then
            log_error "Nginx 服务未运行"
            log_info "尝试手动启动 Nginx..."
            nginx
        fi
    fi

    log_success "前端部署完成"

    # 返回上级目录
    cd ..
}

# 创建备份脚本
create_backup_script() {
    log_info "创建数据库备份脚本..."

    # 获取当前目录的绝对路径
    CURRENT_DIR=$(pwd)
    BACKUP_DIR="$CURRENT_DIR/backend/backups"
    DB_FILE="$CURRENT_DIR/backend/data/database.db"

    # 创建备份目录
    mkdir -p $BACKUP_DIR

    # 创建备份脚本
    cat > backup.sh << EOF
#!/bin/bash

# 资产管理系统数据库备份脚本
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$BACKUP_DIR"
DB_FILE="$DB_FILE"

# 创建备份目录
mkdir -p \$BACKUP_DIR

# 备份数据库
cp \$DB_FILE "\$BACKUP_DIR/database_\$TIMESTAMP.db"

# 保留最近 30 个备份
ls -t \$BACKUP_DIR/database_*.db | tail -n +31 | xargs rm -f

echo "数据库备份完成: \$BACKUP_DIR/database_\$TIMESTAMP.db"
EOF

    # 添加执行权限
    chmod +x backup.sh

    # 设置定时任务
    (crontab -l 2>/dev/null; echo "0 2 * * * $CURRENT_DIR/backup.sh") | crontab -

    log_success "备份脚本创建完成，已设置每天凌晨 2 点自动备份"
}

# 显示部署信息
show_deployment_info() {
    # 尝试获取公网 IP
    log_info "获取服务器公网 IP..."
    PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s http://ifconfig.me || curl -s icanhazip.com)

    # 如果无法获取公网 IP，则使用本地 IP
    if [ -z "$PUBLIC_IP" ]; then
        SERVER_IP=$(hostname -I | awk '{print $1}')
        if [ -z "$SERVER_IP" ]; then
            SERVER_IP="localhost"
        fi
        log_warning "无法获取公网 IP，使用本地 IP: $SERVER_IP"
    else
        SERVER_IP=$PUBLIC_IP
        log_info "检测到公网 IP: $SERVER_IP"
    fi

    # 检查 Nginx 使用的端口
    NGINX_PORT=80
    if grep -q "listen 8080" /etc/nginx/sites-enabled/default 2>/dev/null || grep -q "listen 8080" /etc/nginx/conf.d/ams.conf 2>/dev/null; then
        NGINX_PORT=8080
    fi

    # 检查是否配置了域名
    DOMAIN_CONFIG=""
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        # 使用更精确的方式检测域名配置
        DOMAIN_CONFIG=$(grep -v "^[:space:]*#" /etc/nginx/sites-enabled/default | grep "server_name" | head -n 1 | awk '{print $2}' | tr -d ';')
    elif [ -f "/etc/nginx/conf.d/ams.conf" ]; then
        DOMAIN_CONFIG=$(grep -v "^[:space:]*#" /etc/nginx/conf.d/ams.conf | grep "server_name" | head -n 1 | awk '{print $2}' | tr -d ';')
    fi

    if [ ! -z "$DOMAIN_CONFIG" ] && [ "$DOMAIN_CONFIG" != "_" ] && [ "$DOMAIN_CONFIG" != "localhost" ]; then
        log_info "检测到域名配置: $DOMAIN_CONFIG"
        ACCESS_URL="http://$DOMAIN_CONFIG"
        API_URL="http://$DOMAIN_CONFIG/api"
    else
        ACCESS_URL="http://$SERVER_IP:$NGINX_PORT"
        API_URL="http://$SERVER_IP:$NGINX_PORT/api"
    fi

    log_info "部署信息:"
    echo "========================================"
    echo "前端 URL: $ACCESS_URL"
    echo "后端 API: $API_URL"
    echo "后端进程: pm2 status"
    echo "日志位置: $PROJECT_NAME/backend/logs/"
    echo "数据库位置: $PROJECT_NAME/backend/data/database.db"
    echo "备份脚本: $PROJECT_NAME/backup.sh"
    echo "========================================"
    log_success "资产管理系统部署完成！"

    # 显示登录信息
    echo "\n默认登录信息:"
    echo "----------------------------------------"
    echo "用户名: admin"
    echo "密码: admin123"
    echo "----------------------------------------"
}

# 错误处理函数
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "脚本在第 $line_number 行发生错误，退出代码: $exit_code"
    log_error "请检查日志文件 $LOG_FILE 获取详细信息"
    exit $exit_code
}

# 设置错误处理陷阱
trap 'handle_error $LINENO' ERR

# 清理函数
cleanup() {
    log_info "正在清理..."
    # 如果有临时文件需要删除，可以在这里添加
    log_info "部署结束时间: $(date)"
    log_info "日志文件保存在: $LOG_FILE"
}

# 设置退出时清理
trap cleanup EXIT

# 从 GitHub 拉取项目
clone_repository() {
    log_info "从 GitHub 拉取项目..."

    # 创建安装目录
    if [ ! -d "$INSTALL_DIR" ]; then
        log_info "创建安装目录 $INSTALL_DIR..."
        mkdir -p "$INSTALL_DIR"
        if [ $? -ne 0 ]; then
            log_error "创建安装目录失败"
            exit 1
        fi
    fi

    # 设置正确的权限
    log_info "设置安装目录权限..."
    chmod 755 "$INSTALL_DIR"

    # 进入安装目录
    cd "$INSTALL_DIR"

    # 完整的项目路径
    PROJECT_PATH="$INSTALL_DIR/$PROJECT_NAME"

    # 检查目标目录是否存在
    if [ -d "$PROJECT_NAME" ]; then
        log_warning "目录 $PROJECT_PATH 已存在"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动更新现有目录"
            cd "$PROJECT_NAME"
            log_info "更新仓库..."
            git pull
            cd ..
            return
        else
            read -p "是否删除现有目录并重新拉取？(y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "删除现有目录..."
                rm -rf "$PROJECT_NAME"
            else
                log_info "使用现有目录..."
                cd "$PROJECT_NAME"
                log_info "更新仓库..."
                git pull
                cd ..
                return
            fi
        fi
    fi

    # 克隆仓库
    log_info "克隆仓库 $GITHUB_REPO 到 $PROJECT_PATH..."
    git clone "$GITHUB_REPO" "$PROJECT_NAME"

    if [ $? -ne 0 ]; then
        log_error "克隆仓库失败"
        exit 1
    fi

    # 设置项目目录权限
    log_info "设置项目目录权限..."
    chmod -R 755 "$PROJECT_NAME"

    # 如果有 www-data 用户，则设置为所有者
    if getent group www-data &>/dev/null; then
        log_info "设置项目所有者为 www-data..."
        chown -R www-data:www-data "$PROJECT_NAME"
    fi

    log_success "仓库克隆成功"

    # 返回原始目录
    cd -
}

# 主函数
main() {
    echo "========================================"
    echo "资产管理系统部署脚本"
    echo "========================================"

    # 检查是否以 root 权限运行
    check_root

    # 检测操作系统
    detect_os

    # 检查是否使用快速部署模式
    if [ "$1" = "--quick" ] || [ "$1" = "-q" ]; then
        QUICK_DEPLOY=true
        log_info "快速部署模式已启用，将跳过所有确认提示"
    else
        read -p "是否启用快速部署模式？跳过所有确认提示 (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            QUICK_DEPLOY=true
            log_info "快速部署模式已启用"
        fi
    fi

    # 更新系统包
    update_system

    # 安装基本依赖
    install_basic_deps

    # 从 GitHub 拉取项目
    clone_repository

    # 进入项目目录
    cd "$INSTALL_DIR/$PROJECT_NAME"

    # 安装 Node.js
    install_nodejs

    # 安装 npm
    install_npm

    # 安装 PM2
    install_pm2

    # 安装 SQLite
    install_sqlite

    # 安装 Nginx
    check_nginx

    # 部署后端
    deploy_backend

    # 部署前端
    deploy_frontend

    # 创建备份脚本
    create_backup_script

    # 显示部署信息
    show_deployment_info

    log_success "部署完成！系统已准备就绪。"
}

# 执行主函数
main
