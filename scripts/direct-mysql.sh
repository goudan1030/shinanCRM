#!/bin/bash

# 服务器信息
SERVER="8.149.244.105"
SSH_USER="root"
DB_NAME="h5_cloud_db"
DB_USER="h5_cloud_user"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 打印分隔线
function print_separator() {
  echo -e "${YELLOW}----------------------------------------${NC}"
}

# 显示用法
function show_usage() {
  echo -e "${YELLOW}用法:${NC} $0 <SSH密码> [MySQL密码]"
  echo "如果不提供MySQL密码，将使用h5_cloud_user的默认密码"
}

# 检查参数
if [ -z "$1" ]; then
  echo -e "${RED}错误:${NC} 请提供SSH密码"
  show_usage
  exit 1
fi

SSH_PASSWORD="$1"
MYSQL_PASSWORD="${2:-mc72TNcMmy6HCybH}" # 如果未提供，使用默认密码

echo -e "${GREEN}直接连接MySQL数据库检查工具${NC}"
print_separator

echo -e "${YELLOW}正在尝试通过SSH连接到服务器...${NC}"

# 使用SSH连接到远程服务器并执行MySQL命令
# 注意：这里我们使用-tt强制分配tty，这样可以捕获交互式响应
SSH_COMMAND="sshpass -p \"${SSH_PASSWORD}\" ssh -tt ${SSH_USER}@${SERVER} << EOT
echo '正在连接到MySQL...'
mysql -u${DB_USER} -p'${MYSQL_PASSWORD}' -e 'SHOW DATABASES;'
echo '正在使用数据库 ${DB_NAME}...'
mysql -u${DB_USER} -p'${MYSQL_PASSWORD}' -e 'USE ${DB_NAME}; SHOW TABLES;'
echo '正在统计表数量...'
mysql -u${DB_USER} -p'${MYSQL_PASSWORD}' -e 'SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = \"${DB_NAME}\";'
echo '检查完成！'
exit
EOT"

# 检查是否安装了sshpass
if ! command -v sshpass &> /dev/null; then
  echo -e "${RED}错误:${NC} 需要安装sshpass工具来自动输入SSH密码"
  echo "在macOS上，您可以使用: brew install sshpass"
  echo -e "${YELLOW}尝试使用手动方式...${NC}"
  
  echo -e "${GREEN}请复制以下命令并手动执行:${NC}"
  echo -e "ssh ${SSH_USER}@${SERVER}"
  echo "然后输入以下命令:"
  echo "mysql -u${DB_USER} -p'${MYSQL_PASSWORD}' -e 'SHOW DATABASES;'"
  echo "mysql -u${DB_USER} -p'${MYSQL_PASSWORD}' -e 'USE ${DB_NAME}; SHOW TABLES;'"
  echo "mysql -u${DB_USER} -p'${MYSQL_PASSWORD}' -e 'SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = \"${DB_NAME}\";'"
  
  exit 1
fi

# 执行SSH命令
eval $SSH_COMMAND

# 检查SSH命令执行状态
if [ $? -ne 0 ]; then
  echo -e "${RED}错误:${NC} SSH连接或MySQL命令执行失败"
  echo "请检查SSH密码或MySQL密码是否正确"
  exit 1
fi

print_separator
echo -e "${GREEN}操作完成!${NC}"
echo "如果发现表数量不一致，可能是以下原因:"
echo "1. 权限问题: ${DB_USER}用户可能没有访问所有表的权限"
echo "2. 数据库实例不同: PhpMyAdmin可能连接到不同的数据库实例"
echo "3. 表名大小写敏感性: MySQL在某些配置下区分表名大小写"

exit 0 