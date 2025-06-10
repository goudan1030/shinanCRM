#!/bin/bash
# 数据库访问权限修复脚本

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   数据库连接权限修复工具   ${NC}"
echo -e "${BLUE}=========================================${NC}"

# 从环境变量或默认值获取数据库连接信息
DB_HOST=${DB_HOST:-"8.149.244.105"}
DB_PORT=${DB_PORT:-"3306"}
DB_USER=${DB_USER:-"h5_cloud_user"}
DB_PASSWORD=${DB_PASSWORD:-"mc72TNcMmy6HCybH"}
DB_NAME=${DB_NAME:-"h5_cloud_db"}

# 显示连接信息
echo -e "${YELLOW}连接信息:${NC}"
echo -e "主机: ${DB_HOST}"
echo -e "端口: ${DB_PORT}"
echo -e "用户: ${DB_USER}"
echo -e "数据库: ${DB_NAME}"
echo

# 步骤1: 测试数据库连接
echo -e "${YELLOW}步骤1: 测试数据库连接${NC}"
if mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "SELECT 1" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ 成功连接到数据库!${NC}"
else
  echo -e "${RED}✗ 数据库连接失败!${NC}"
  # 捕获具体错误
  ERROR=$(mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "SELECT 1" 2>&1)
  echo -e "${RED}错误信息: ${ERROR}${NC}"
  
  # 检查是否为访问权限错误
  if echo "$ERROR" | grep -q "Access denied"; then
    echo -e "${YELLOW}检测到访问权限错误，尝试诊断...${NC}"
    
    # 获取本机IP
    LOCAL_IP=$(curl -s ifconfig.me)
    echo -e "本机公网IP: ${LOCAL_IP}"
    
    # 建议解决方案
    echo -e "${BLUE}建议解决方案:${NC}"
    echo -e "1. 确保MySQL服务器允许从您的IP地址(${LOCAL_IP})访问"
    echo -e "2. 检查MySQL用户(${DB_USER})是否有从远程主机访问的权限"
    echo -e "3. 确认防火墙是否允许端口${DB_PORT}的访问"
    
    # 生成授权用户访问的SQL命令
    echo -e "\n${YELLOW}您可以在MySQL服务器上运行以下命令来允许远程访问:${NC}"
    echo -e "CREATE USER '${DB_USER}'@'${LOCAL_IP}' IDENTIFIED BY 'your_password';"
    echo -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'${LOCAL_IP}';"
    echo -e "FLUSH PRIVILEGES;"
    
    echo -e "\n${YELLOW}或者允许从任何主机访问(不推荐用于生产环境):${NC}"
    echo -e "CREATE USER '${DB_USER}'@'%' IDENTIFIED BY 'your_password';"
    echo -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%';"
    echo -e "FLUSH PRIVILEGES;"
  fi
  
  exit 1
fi

# 步骤2: 测试基本查询
echo -e "\n${YELLOW}步骤2: 测试基本查询${NC}"
if mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SHOW TABLES;" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ 成功执行基本查询!${NC}"
  
  # 显示数据库中的表格
  echo -e "${BLUE}数据库中的表格:${NC}"
  mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SHOW TABLES;" 2>/dev/null
else
  echo -e "${RED}✗ 基本查询失败!${NC}"
  ERROR=$(mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SHOW TABLES;" 2>&1)
  echo -e "${RED}错误信息: ${ERROR}${NC}"
  exit 1
fi

# 步骤3: 检查特定表的访问权限
echo -e "\n${YELLOW}步骤3: 检查重要表的访问权限${NC}"
TABLES=("admin_users" "members" "finances" "banners")

for TABLE in "${TABLES[@]}"; do
  if mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM ${TABLE};" >/dev/null 2>&1; then
    COUNT=$(mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tail -n 1)
    echo -e "${GREEN}✓ 表 ${TABLE} 访问正常 (${COUNT} 条记录)${NC}"
  else
    echo -e "${RED}✗ 无法访问表 ${TABLE}${NC}"
    ERROR=$(mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SELECT COUNT(*) FROM ${TABLE};" 2>&1)
    
    # 检查表是否不存在
    if echo "$ERROR" | grep -q "doesn't exist"; then
      echo -e "${YELLOW}表 ${TABLE} 不存在，可能不是问题${NC}"
    else
      echo -e "${RED}错误信息: ${ERROR}${NC}"
    fi
  fi
done

# 步骤4: 测试网络连接
echo -e "\n${YELLOW}步骤4: 测试网络连接${NC}"
echo -e "${BLUE}测试到MySQL服务器的网络连接...${NC}"
if nc -z -w5 ${DB_HOST} ${DB_PORT} 2>/dev/null; then
  echo -e "${GREEN}✓ 网络连接正常!${NC}"
  
  # 获取连接延迟
  PING_TIME=$(ping -c 1 ${DB_HOST} 2>/dev/null | grep 'time=' | awk -F 'time=' '{print $2}' | awk '{print $1}')
  if [ -n "$PING_TIME" ]; then
    echo -e "连接延迟: ${PING_TIME}"
  fi
else
  echo -e "${RED}✗ 无法连接到服务器端口!${NC}"
  echo -e "${YELLOW}这可能是防火墙问题或服务器未监听该端口${NC}"
  
  # 尝试ping服务器
  if ping -c 1 ${DB_HOST} >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 可以ping通服务器${NC}"
    echo -e "${YELLOW}问题可能是MySQL端口被屏蔽或未开放${NC}"
  else
    echo -e "${RED}✗ 无法ping通服务器${NC}"
    echo -e "${YELLOW}检查您的网络连接或服务器是否在线${NC}"
  fi
  
  exit 1
fi

# 总结
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ 数据库连接测试完成${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "如果您在应用中仍然遇到数据库连接问题，请考虑以下几点:"
echo -e "1. 确认应用程序使用了正确的数据库连接信息"
echo -e "2. 检查您的应用程序是否正确处理SSL/TLS连接"
echo -e "3. 确认所有网络服务是否正常运行(VPN, 代理等)"
echo -e "4. 检查服务器和客户端时区是否一致"
echo -e "\n${YELLOW}您可以使用以下测试代码验证Next.js应用中的连接:${NC}"
echo -e "访问: /api/debug/db-test"

echo -e "\n${BLUE}感谢使用数据库连接修复工具!${NC}" 