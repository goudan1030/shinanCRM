#!/bin/bash

# 企业微信通知系统部署脚本
# 功能：部署基于数据库触发器的企业微信通知系统

set -e  # 遇到错误时退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 获取项目根目录
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_ROOT"

log_info "企业微信通知系统部署开始..."
log_info "项目目录: $PROJECT_ROOT"

# 检查必要文件
check_files() {
    log_info "检查必要文件..."
    
    local required_files=(
        "src/migrations/create_member_notification_trigger.sql"
        "src/app/api/wecom/process-queue/route.ts"
        "scripts/monitor-notification-queue.js"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "必要文件不存在: $file"
            exit 1
        fi
        log_success "✓ $file"
    done
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 尝试使用Node.js脚本检查数据库连接
    if command -v node >/dev/null 2>&1; then
        if [[ -f "scripts/check-db-connection.js" ]]; then
            node scripts/check-db-connection.js
            if [[ $? -eq 0 ]]; then
                log_success "数据库连接正常"
            else
                log_error "数据库连接失败"
                exit 1
            fi
        else
            log_warning "数据库连接检查脚本不存在，跳过检查"
        fi
    else
        log_warning "Node.js不可用，跳过数据库连接检查"
    fi
}

# 应用数据库迁移
apply_database_migration() {
    log_info "应用数据库迁移..."
    
    local migration_file="src/migrations/create_member_notification_trigger.sql"
    
    log_info "准备执行数据库迁移脚本: $migration_file"
    
    # 检查环境变量
    if [[ -z "$DB_HOST" ]] || [[ -z "$DB_USER" ]] || [[ -z "$DB_PASSWORD" ]] || [[ -z "$DB_NAME" ]]; then
        log_error "数据库环境变量未设置，请检查 .env 文件"
        log_info "需要的环境变量: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
        exit 1
    fi
    
    # 检查是否有mysql客户端
    if command -v mysql >/dev/null 2>&1; then
        log_info "使用MySQL客户端执行迁移..."
        mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$migration_file"
        
        if [[ $? -eq 0 ]]; then
            log_success "数据库迁移执行成功"
        else
            log_error "数据库迁移执行失败"
            exit 1
        fi
    else
        log_warning "MySQL客户端不可用"
        log_info "请手动执行以下SQL文件: $migration_file"
        log_info "或使用以下命令:"
        log_info "mysql -h\$DB_HOST -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME < $migration_file"
    fi
}

# 设置监控脚本权限
setup_monitor_script() {
    log_info "设置监控脚本权限..."
    
    local monitor_script="scripts/monitor-notification-queue.js"
    
    if [[ -f "$monitor_script" ]]; then
        chmod +x "$monitor_script"
        log_success "监控脚本权限设置完成"
        
        # 测试脚本
        log_info "测试监控脚本..."
        node "$monitor_script" --help >/dev/null 2>&1
        if [[ $? -eq 0 ]]; then
            log_success "监控脚本测试通过"
        else
            log_warning "监控脚本测试失败，但不影响部署"
        fi
    else
        log_error "监控脚本不存在: $monitor_script"
        exit 1
    fi
}

# 更新package.json脚本
update_package_scripts() {
    log_info "检查package.json脚本..."
    
    local package_file="package.json"
    
    if [[ -f "$package_file" ]]; then
        # 检查是否已有相关脚本
        if grep -q "monitor:queue" "$package_file"; then
            log_success "package.json脚本已存在"
        else
            log_info "建议在package.json中添加以下脚本:"
            echo '  "monitor:queue": "node scripts/monitor-notification-queue.js",'
            echo '  "monitor:queue:daemon": "node scripts/monitor-notification-queue.js --daemon",'
            echo '  "monitor:queue:debug": "node scripts/monitor-notification-queue.js --debug"'
        fi
    fi
}

# 创建systemd服务文件
create_systemd_service() {
    log_info "创建systemd服务文件模板..."
    
    local service_file="notification-queue-monitor.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=企业微信通知队列监控服务
After=network.target
Requires=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_ROOT
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_SITE_URL=https://your-domain.com
ExecStart=/usr/bin/node $PROJECT_ROOT/scripts/monitor-notification-queue.js --daemon
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=notification-queue-monitor

[Install]
WantedBy=multi-user.target
EOF

    log_success "systemd服务文件已创建: $service_file"
    log_info "要安装服务，请运行:"
    log_info "sudo cp $service_file /etc/systemd/system/"
    log_info "sudo systemctl daemon-reload"
    log_info "sudo systemctl enable notification-queue-monitor"
    log_info "sudo systemctl start notification-queue-monitor"
}

# 创建cron配置
create_cron_config() {
    log_info "创建cron配置文件..."
    
    local cron_file="notification-queue-cron"
    
    cat > "$cron_file" << EOF
# 企业微信通知队列监控 - 每5分钟检查一次
*/5 * * * * cd $PROJECT_ROOT && /usr/bin/node scripts/monitor-notification-queue.js >> /var/log/notification-queue.log 2>&1

# 每天凌晨2点清理过期日志
0 2 * * * find /var/log -name "notification-queue.log*" -mtime +7 -delete
EOF

    log_success "cron配置文件已创建: $cron_file"
    log_info "要安装cron任务，请运行:"
    log_info "sudo crontab -u www-data $cron_file"
    log_info "或者手动编辑: sudo crontab -u www-data -e"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查API端点
    if command -v curl >/dev/null 2>&1; then
        log_info "测试API端点..."
        
        local api_url="http://localhost:3000/api/wecom/process-queue"
        if [[ -n "$NEXT_PUBLIC_SITE_URL" ]]; then
            api_url="$NEXT_PUBLIC_SITE_URL/api/wecom/process-queue"
        fi
        
        curl -s "$api_url" >/dev/null 2>&1
        if [[ $? -eq 0 ]]; then
            log_success "API端点响应正常"
        else
            log_warning "API端点无响应，请确保应用正在运行"
        fi
    fi
    
    # 检查数据库表
    log_info "建议手动验证以下数据库对象是否创建成功:"
    echo "  - 表: member_notification_queue"
    echo "  - 触发器: tr_member_insert_notification"
    echo "  - 存储过程: ProcessMemberNotificationQueue"
    echo "  - 存储过程: CleanupNotificationQueue"
}

# 显示部署后指南
show_post_deployment_guide() {
    log_info "部署完成！后续配置指南:"
    echo ""
    echo "1. 选择监控方式（二选一）："
    echo "   a) 使用systemd服务（推荐）："
    echo "      sudo cp notification-queue-monitor.service /etc/systemd/system/"
    echo "      sudo systemctl daemon-reload"
    echo "      sudo systemctl enable notification-queue-monitor"
    echo "      sudo systemctl start notification-queue-monitor"
    echo ""
    echo "   b) 使用cron任务："
    echo "      sudo crontab -u www-data notification-queue-cron"
    echo ""
    echo "2. 监控脚本使用："
    echo "   - 一次性检查: node scripts/monitor-notification-queue.js"
    echo "   - 持续监控: node scripts/monitor-notification-queue.js --daemon"
    echo "   - 调试模式: node scripts/monitor-notification-queue.js --debug"
    echo ""
    echo "3. 验证功能："
    echo "   - 创建一个测试会员，观察是否收到企业微信通知"
    echo "   - 检查 member_notification_queue 表中的记录"
    echo "   - 查看监控脚本的日志输出"
    echo ""
    echo "4. 环境变量："
    echo "   - NEXT_PUBLIC_SITE_URL: 应用访问地址"
    echo "   - QUEUE_MONITOR_INTERVAL: 监控间隔（分钟，默认5）"
    echo ""
}

# 主函数
main() {
    log_info "开始部署企业微信通知系统..."
    
    # 加载环境变量
    if [[ -f ".env.local" ]]; then
        source .env.local
        log_success "已加载 .env.local"
    elif [[ -f ".env" ]]; then
        source .env
        log_success "已加载 .env"
    else
        log_warning "未找到环境变量文件"
    fi
    
    # 执行部署步骤
    check_files
    check_database
    apply_database_migration
    setup_monitor_script
    update_package_scripts
    create_systemd_service
    create_cron_config
    verify_deployment
    
    log_success "部署完成！"
    show_post_deployment_guide
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# 执行主函数
main "$@" 