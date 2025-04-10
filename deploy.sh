#!/bin/bash

# 资产管理系统部署脚本
# 此脚本会从 GitHub 拉取项目，自动检查依赖和组件，安装缺失的组件，并处理版本兼容性问题

# 设置错误处理
set -e

# GitHub 仓库信息
GITHUB_REPO="https://github.com/senma231/ams.git"
PROJECT_NAME="ams"

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

    # 检查 Node.js 是否已安装
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v | cut -d 'v' -f 2)
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

# 安装 Caddy
install_caddy() {
    log_info "检查 Caddy..."

    if command -v caddy &> /dev/null; then
        CADDY_VER=$(caddy version | head -n1)
        log_info "检测到 Caddy 版本: $CADDY_VER"

        # 检查是否需要更新
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动更新 Caddy"

            # 根据不同的操作系统使用不同的更新方法
            if [ "$PKG_MANAGER" = "apt" ]; then
                # Debian/Ubuntu
                apt update
                apt install -y caddy
            elif [ "$PKG_MANAGER" = "yum" ]; then
                # CentOS/RHEL
                yum update -y caddy
            else
                # 通用方法
                log_warning "无法自动更新 Caddy，请手动更新"
            fi

            CADDY_VER=$(caddy version | head -n1)
            log_success "Caddy 更新到版本 $CADDY_VER"
        else
            read -p "是否更新 Caddy 到最新版本? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "更新 Caddy..."

                # 根据不同的操作系统使用不同的更新方法
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # Debian/Ubuntu
                    apt update
                    apt install -y caddy
                elif [ "$PKG_MANAGER" = "yum" ]; then
                    # CentOS/RHEL
                    yum update -y caddy
                else
                    # 通用方法
                    log_warning "无法自动更新 Caddy，请手动更新"
                fi

                CADDY_VER=$(caddy version | head -n1)
                log_success "Caddy 更新到版本 $CADDY_VER"
            else
                log_info "继续使用当前 Caddy 版本"
            fi
        fi
    else
        log_info "Caddy 未安装，需要安装"
        if [ "$QUICK_DEPLOY" = true ]; then
            log_info "快速部署模式: 自动安装 Caddy"

            # 根据不同的操作系统使用不同的安装方法
            if [ "$PKG_MANAGER" = "apt" ]; then
                # Debian/Ubuntu
                log_info "使用 apt 安装 Caddy..."
                apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
                curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
                curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
                apt update
                apt install -y caddy
            elif [ "$PKG_MANAGER" = "yum" ]; then
                # CentOS/RHEL
                log_info "使用 yum 安装 Caddy..."
                yum install -y yum-plugin-copr
                yum copr enable -y @caddy/caddy
                yum install -y caddy
            else
                # 通用方法
                log_info "使用通用方法安装 Caddy..."
                curl -fsSL https://getcaddy.com | bash -s personal
            fi

            if [ $? -ne 0 ]; then
                log_error "安装 Caddy 失败"
                exit 1
            fi
            log_success "Caddy 安装完成"
        else
            read -p "是否安装 Caddy? (y/n): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                log_info "安装 Caddy..."

                # 根据不同的操作系统使用不同的安装方法
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # Debian/Ubuntu
                    log_info "使用 apt 安装 Caddy..."
                    apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
                    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
                    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
                    apt update
                    apt install -y caddy
                elif [ "$PKG_MANAGER" = "yum" ]; then
                    # CentOS/RHEL
                    log_info "使用 yum 安装 Caddy..."
                    yum install -y yum-plugin-copr
                    yum copr enable -y @caddy/caddy
                    yum install -y caddy
                else
                    # 通用方法
                    log_info "使用通用方法安装 Caddy..."
                    curl -fsSL https://getcaddy.com | bash -s personal
                fi

                if [ $? -ne 0 ]; then
                    log_error "安装 Caddy 失败"
                    exit 1
                fi
                log_success "Caddy 安装完成"
            else
                log_error "Caddy 是必需的组件，无法继续部署"
                exit 1
            fi
        fi
    fi
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

    # 检查是否已经有运行的实例
    if pm2 list | grep -q "asset-management-backend"; then
        log_info "停止现有的后端实例..."
        pm2 stop asset-management-backend
        pm2 delete asset-management-backend
    fi

    # 使用 PM2 启动应用
    log_info "启动后端应用..."
    pm2 start src/app.js --name "asset-management-backend"
    if [ $? -ne 0 ]; then
        log_error "启动后端应用失败"
        exit 1
    fi

    # 设置开机自启
    pm2 save
    pm2 startup

    log_success "后端部署完成"

    # 返回上级目录
    cd ..
}

# 部署前端
deploy_frontend() {
    log_info "部署前端..."

    # 进入前端目录
    cd frontend || { log_error "前端目录不存在"; exit 1; }

    # 安装依赖
    log_info "安装前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        log_error "安装前端依赖失败"
        exit 1
    fi

    # 构建生产版本
    log_info "构建前端应用..."
    npm run build
    if [ $? -ne 0 ]; then
        log_error "构建前端应用失败"
        exit 1
    fi

    # 检查是否已经有其他项目使用 Caddy
    EXISTING_CADDY_CONFIG=false
    if [ -f "/etc/caddy/Caddyfile" ] && [ -s "/etc/caddy/Caddyfile" ]; then
        log_info "检测到现有 Caddy 配置"
        EXISTING_CADDY_CONFIG=true

        if [ "$QUICK_DEPLOY" != true ]; then
            echo ""
            log_warning "检测到现有 Caddy 配置，可能有其他项目正在使用 Caddy"
            echo "----------------------------------------"
            echo "选项 1: 覆盖现有配置 (可能影响其他项目)"
            echo "选项 2: 将资产管理系统添加到现有配置中"
            echo "----------------------------------------"
            read -p "请选择 (1/2): " caddy_option

            if [ "$caddy_option" = "2" ]; then
                # 备份现有配置
                cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +"%Y%m%d%H%M%S")
                log_info "已备份现有 Caddy 配置"

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

                    # 添加子域名配置
                    cat >> /etc/caddy/Caddyfile << EOF

# 资产管理系统 - 子域名: $SUBDOMAIN
$SUBDOMAIN {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * $FRONTEND_DIST
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}
EOF
                    log_success "已添加子域名配置: $SUBDOMAIN"

                elif [ "$add_option" = "2" ]; then
                    read -p "请输入路径前缀 (例如: /ams): " PATH_PREFIX

                    # 添加路径配置
                    cat >> /etc/caddy/Caddyfile << EOF

# 资产管理系统 - 路径: $PATH_PREFIX
handle $PATH_PREFIX/* {
    uri strip_prefix $PATH_PREFIX
    root * $FRONTEND_DIST
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}
EOF
                    log_success "已添加路径配置: $PATH_PREFIX"

                else
                    log_error "无效选项，将覆盖现有配置"
                    EXISTING_CADDY_CONFIG=false
                fi
            else
                log_warning "将覆盖现有 Caddy 配置"
                EXISTING_CADDY_CONFIG=false
            fi
            echo ""
        else
            # 快速部署模式下默认覆盖
            log_warning "快速部署模式: 将覆盖现有 Caddy 配置"
            EXISTING_CADDY_CONFIG=false
        fi
    fi

    # 配置 Caddy
    log_info "配置 Caddy..."

    # 获取当前目录的绝对路径
    FRONTEND_DIST=$(pwd)/dist

    # 创建 Caddy 配置目录
    if [ ! -d "/etc/caddy" ]; then
        log_info "创建 Caddy 配置目录..."
        mkdir -p /etc/caddy
    fi

    # 如果已经添加到现有配置，则跳过创建新配置
    if [ "$EXISTING_CADDY_CONFIG" = true ]; then
        log_info "使用现有 Caddy 配置并添加资产管理系统"
    else

    # 检查端口 80 是否被占用
    log_info "检查端口 80 是否被占用..."
    PORT_80_PID=$(lsof -t -i:80 2>/dev/null)

    if [ ! -z "$PORT_80_PID" ]; then
        log_warning "端口 80 已被进程 ID $PORT_80_PID 占用"

        # 检查是否是 Nginx
        if systemctl is-active --quiet nginx; then
            log_warning "Nginx 正在运行并占用端口 80"

            if [ "$QUICK_DEPLOY" = true ]; then
                log_info "快速部署模式: 自动停止 Nginx"
                systemctl stop nginx
                log_success "Nginx 已停止"
            else
                read -p "是否停止 Nginx 以释放端口 80? (y/n): " confirm
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    systemctl stop nginx
                    log_success "Nginx 已停止"
                else
                    log_warning "继续部署，但 Caddy 可能无法启动"
                fi
            fi
        else
            # 其他进程占用端口 80
            PROCESS_NAME=$(ps -p $PORT_80_PID -o comm=)
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
                    log_warning "继续部署，但 Caddy 可能无法启动"
                fi
            fi
        fi
    else
        log_success "端口 80 可用"
    fi

    # 询问是否配置域名
    DOMAIN_NAME=""
    if [ "$QUICK_DEPLOY" != true ]; then
        echo ""
        log_info "域名配置"
        echo "----------------------------------------"
        echo "您可以为资产管理系统配置域名，这将启用 HTTPS"
        echo "如果不配置域名，将使用服务器 IP 地址访问系统"
        echo "----------------------------------------"
        read -p "是否配置域名? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            read -p "请输入域名 (例如: example.com): " DOMAIN_NAME
            log_info "已设置域名: $DOMAIN_NAME"
        else
            log_info "不使用域名，将使用 IP 地址访问"
        fi
        echo ""
    fi

    # 创建 Caddy 配置文件
    log_info "创建 Caddy 配置文件..."
    if [ -z "$DOMAIN_NAME" ]; then
        # 使用 IP 配置
        cat > /etc/caddy/Caddyfile << EOF
:80 {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * $FRONTEND_DIST
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}
EOF
    else
        # 使用域名配置 (自动 HTTPS)
        cat > /etc/caddy/Caddyfile << EOF
$DOMAIN_NAME {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * $FRONTEND_DIST
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}
EOF
    fi

    # 重启 Caddy
    log_info "重启 Caddy..."
    if systemctl is-active --quiet caddy; then
        systemctl reload caddy
        if [ $? -ne 0 ]; then
            log_info "重新加载失败，尝试重启 Caddy..."
            systemctl restart caddy
        fi
    else
        systemctl start caddy
    fi

    if [ $? -ne 0 ]; then
        log_error "启动 Caddy 失败"
        log_warning "可能是端口 80 仍然被占用。尝试使用其他端口..."

        # 尝试使用其他端口
        log_info "尝试使用端口 8080..."

        if [ "$EXISTING_CADDY_CONFIG" = true ]; then
            # 如果使用现有配置，则不修改配置文件
            log_warning "使用现有配置，无法自动切换端口。请手动修改 Caddy 配置。"
        else
            # 修改配置文件使用端口 8080
            if [ -z "$DOMAIN_NAME" ]; then
                # 使用 IP 配置
                cat > /etc/caddy/Caddyfile << EOF
:8080 {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * $FRONTEND_DIST
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}
EOF
            else
                # 使用域名配置，但在端口 8080 上
                cat > /etc/caddy/Caddyfile << EOF
$DOMAIN_NAME:8080 {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * $FRONTEND_DIST
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}
EOF
            fi

            systemctl restart caddy
            if [ $? -ne 0 ]; then
                log_error "即使使用端口 8080 也无法启动 Caddy"
                log_warning "继续部署过程，但前端可能无法访问"
            else
                log_success "Caddy 已在端口 8080 上启动"
                log_info "请使用 http://YOUR_SERVER_IP:8080 访问前端"
            fi
        fi
    fi

    # 设置正确的文件权限
    log_info "设置文件权限..."
    chown -R caddy:caddy $FRONTEND_DIST
    chmod -R 755 $FRONTEND_DIST

    # 检查 Caddy 是否运行
    if ! systemctl is-active --quiet caddy; then
        log_error "Caddy 服务未运行"
        log_info "尝试手动启动 Caddy..."
        caddy run --config /etc/caddy/Caddyfile &
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

    # 检查 Caddy 使用的端口
    CADDY_PORT=80
    if grep -q ":8080" /etc/caddy/Caddyfile; then
        CADDY_PORT=8080
    fi

    # 检查是否配置了域名
    if [ -f "/etc/caddy/Caddyfile" ]; then
        # 使用更精确的方式检测域名配置
        DOMAIN_CONFIG=$(grep -v "^[:space:]*#" /etc/caddy/Caddyfile | grep -v "^:" | grep "{" | head -n 1 | awk '{print $1}')

        if [ ! -z "$DOMAIN_CONFIG" ] && [ "$DOMAIN_CONFIG" != "{" ]; then
            log_info "检测到域名配置: $DOMAIN_CONFIG"
            ACCESS_URL="https://$DOMAIN_CONFIG"
            API_URL="https://$DOMAIN_CONFIG/api"
        else
            ACCESS_URL="http://$SERVER_IP:$CADDY_PORT"
            API_URL="http://$SERVER_IP:$CADDY_PORT/api"
        fi
    else
        ACCESS_URL="http://$SERVER_IP:$CADDY_PORT"
        API_URL="http://$SERVER_IP:$CADDY_PORT/api"
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

    # 检查目标目录是否存在
    if [ -d "$PROJECT_NAME" ]; then
        log_warning "目录 $PROJECT_NAME 已存在"
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
    log_info "克隆仓库 $GITHUB_REPO..."
    git clone "$GITHUB_REPO" "$PROJECT_NAME"

    if [ $? -ne 0 ]; then
        log_error "克隆仓库失败"
        exit 1
    fi

    log_success "仓库克隆成功"
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
    cd "$PROJECT_NAME"

    # 安装 Node.js
    install_nodejs

    # 安装 npm
    install_npm

    # 安装 PM2
    install_pm2

    # 安装 SQLite
    install_sqlite

    # 安装 Caddy
    install_caddy

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
