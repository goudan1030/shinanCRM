#!/bin/bash

# 服务器信息
SERVER="121.41.65.220"
SSH_USER="root"
DB_NAME="h5_cloud_db"
DB_USER="h5_cloud_user" 
DB_PASSWORD="mc72TNcMmy6HCybH"

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
  echo -e "${YELLOW}用法:${NC} $0 <SSH密码>"
}

# 检查参数
if [ -z "$1" ]; then
  echo -e "${RED}错误:${NC} 请提供SSH密码"
  show_usage
  exit 1
fi

SSH_PASSWORD="$1"

echo -e "${GREEN}MySQL数据库权限修复工具${NC}"
print_separator

echo -e "${YELLOW}正在尝试通过SSH连接到服务器...${NC}"

# 准备修复权限的SQL命令
SQL_CMDS="
-- 更新用户密码
SET @pw=CONCAT('\"',IF(LENGTH('${DB_PASSWORD}')>0,'${DB_PASSWORD}','mc72TNcMmy6HCybH'),'\"');
SET @sql=CONCAT('ALTER USER \`${DB_USER}\`@\`%\` IDENTIFIED BY ',@pw);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 授予所有权限
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO \`${DB_USER}\`@\`%\`;
FLUSH PRIVILEGES;

-- 显示用户权限
SHOW GRANTS FOR \`${DB_USER}\`@\`%\`;
"

# 使用SSH连接到远程服务器并执行MySQL命令
SSH_COMMAND="sshpass -p \"${SSH_PASSWORD}\" ssh -tt ${SSH_USER}@${SERVER} << EOT
echo '正在连接到MySQL以修复权限...'
echo '${SQL_CMDS}' > /tmp/fix_permissions.sql
mysql -e 'source /tmp/fix_permissions.sql;'
echo '检查表数量...'
mysql -e 'SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = \"${DB_NAME}\";'
echo '权限修复完成！'
rm /tmp/fix_permissions.sql
exit
EOT"

# 检查是否安装了sshpass
if ! command -v sshpass &> /dev/null; then
  echo -e "${RED}错误:${NC} 需要安装sshpass工具来自动输入SSH密码"
  echo "在macOS上，您可以使用: brew install sshpass"
  echo -e "${YELLOW}尝试使用手动方式...${NC}"
  
  echo -e "${GREEN}请复制以下内容保存为fix_permissions.sql:${NC}"
  echo "${SQL_CMDS}"
  
  echo -e "${GREEN}然后SSH连接到服务器并执行:${NC}"
  echo "ssh ${SSH_USER}@${SERVER}"
  echo "然后将上面的内容保存为/tmp/fix_permissions.sql"
  echo "执行: mysql -e 'source /tmp/fix_permissions.sql;'"
  
  exit 1
fi

# 执行SSH命令
eval $SSH_COMMAND

# 检查SSH命令执行状态
if [ $? -ne 0 ]; then
  echo -e "${RED}错误:${NC} SSH连接或MySQL命令执行失败"
  echo "请检查SSH密码是否正确"
  exit 1
fi

print_separator
echo -e "${GREEN}权限修复完成!${NC}"
echo "现在，您应该能够看到数据库中的所有表了。请执行以下步骤验证："
echo "1. 设置SSH隧道: bash scripts/setup-db-tunnel.sh"
echo "2. 检查表数量: node scripts/check-all-tables.js"
echo "3. 如果仍有问题，尝试创建缺失的表: node scripts/create-missing-tables.js"

exit 0 