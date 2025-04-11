#!/bin/bash

# 设置颜色
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

# 项目路径
PROJECT_PATH="/var/www/ams"

log_info "开始清理现有部署..."

# 1. 停止现有服务
log_info "停止现有服务..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "asset-management-backend"; then
        pm2 stop asset-management-backend
        pm2 delete asset-management-backend
        log_success "已停止后端服务"
    else
        log_info "未发现运行中的后端服务"
    fi
else
    log_warning "未安装PM2，跳过停止后端服务"
fi

# 2. 备份重要数据
log_info "备份重要数据..."
if [ -d "$PROJECT_PATH" ]; then
    BACKUP_DIR="/root/ams_backup_$(date +%Y%m%d%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据库
    if [ -d "$PROJECT_PATH/backend/data" ]; then
        mkdir -p "$BACKUP_DIR/data"
        cp -r "$PROJECT_PATH/backend/data"/*.db "$BACKUP_DIR/data/" 2>/dev/null || true
        log_success "已备份数据库文件"
    fi
    
    # 备份上传文件
    if [ -d "$PROJECT_PATH/backend/uploads" ]; then
        mkdir -p "$BACKUP_DIR/uploads"
        cp -r "$PROJECT_PATH/backend/uploads"/* "$BACKUP_DIR/uploads/" 2>/dev/null || true
        log_success "已备份上传文件"
    fi
    
    # 备份环境配置
    if [ -f "$PROJECT_PATH/backend/.env" ]; then
        cp "$PROJECT_PATH/backend/.env" "$BACKUP_DIR/" 2>/dev/null || true
        log_success "已备份环境配置"
    fi
    
    log_success "所有重要数据已备份到 $BACKUP_DIR"
else
    log_warning "项目目录不存在，跳过备份"
fi

# 3. 清理Nginx配置
log_info "清理Nginx配置..."
if command -v nginx &> /dev/null; then
    # 备份Nginx配置
    if [ -d "/etc/nginx/sites-enabled" ]; then
        mkdir -p "$BACKUP_DIR/nginx" 2>/dev/null || true
        cp -r /etc/nginx/sites-enabled/* "$BACKUP_DIR/nginx/" 2>/dev/null || true
        rm -f /etc/nginx/sites-enabled/* 2>/dev/null || true
        log_success "已清理Nginx sites-enabled目录"
    fi
    
    if [ -d "/etc/nginx/conf.d" ]; then
        mkdir -p "$BACKUP_DIR/nginx/conf.d" 2>/dev/null || true
        cp -r /etc/nginx/conf.d/* "$BACKUP_DIR/nginx/conf.d/" 2>/dev/null || true
        rm -f /etc/nginx/conf.d/*.conf 2>/dev/null || true
        log_success "已清理Nginx conf.d目录"
    fi
    
    # 重启Nginx
    systemctl restart nginx 2>/dev/null || true
    log_success "已重启Nginx"
else
    log_warning "未安装Nginx，跳过清理Nginx配置"
fi

# 4. 清理项目目录（可选，谨慎使用）
if [ "$1" = "--full-clean" ]; then
    log_warning "执行完全清理，将删除项目目录..."
    if [ -d "$PROJECT_PATH" ]; then
        rm -rf "$PROJECT_PATH"
        log_success "已删除项目目录"
    fi
else
    log_info "跳过删除项目目录，使用 --full-clean 参数可执行完全清理"
fi

log_info "清理完成！现在可以使用新的部署脚本重新部署项目"
log_info "重要数据已备份到 $BACKUP_DIR"