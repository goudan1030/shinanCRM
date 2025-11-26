#!/bin/bash

# 企业微信文档创建功能测试脚本

# 配置
BASE_URL="${1:-http://localhost:3000}"
DB_USER="${DB_USER:-h5_cloud_user}"
DB_NAME="${DB_NAME:-h5_cloud_db}"

echo "=========================================="
echo "企业微信文档对接功能测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查数据库表是否存在
echo -e "${YELLOW}步骤1: 检查数据库表...${NC}"
TABLE_EXISTS=$(mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -sN -e "SHOW TABLES LIKE 'wecom_documents';" 2>/dev/null)
if [ -z "$TABLE_EXISTS" ]; then
  echo -e "${RED}❌ 表 wecom_documents 不存在，请先执行创建表的SQL${NC}"
  echo "执行: mysql -u ${DB_USER} -p ${DB_NAME} < scripts/create-wecom-documents-table.sql"
  exit 1
else
  echo -e "${GREEN}✓ 表 wecom_documents 存在${NC}"
fi

# 检查企业微信配置
echo -e "\n${YELLOW}步骤2: 检查企业微信配置...${NC}"
CONFIG=$(mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -sN -e "SELECT COUNT(*) FROM wecom_config WHERE corp_id IS NOT NULL AND agent_id IS NOT NULL AND secret IS NOT NULL;" 2>/dev/null)
if [ "$CONFIG" = "0" ]; then
  echo -e "${RED}❌ 企业微信配置不完整${NC}"
  echo "请访问: ${BASE_URL}/wecom/config 配置企业微信"
  exit 1
else
  echo -e "${GREEN}✓ 企业微信配置存在${NC}"
fi

# 提示用户输入文档ID
echo -e "\n${YELLOW}步骤3: 测试更新企业微信文档...${NC}"
echo -e "${YELLOW}提示: 需要先在企业微信中创建文档，然后获取文档ID${NC}"
read -p "请输入企业微信文档ID（按Enter跳过）: " DOC_ID

if [ -z "$DOC_ID" ]; then
  echo -e "${YELLOW}⚠ 跳过文档更新测试（需要文档ID）${NC}"
  echo -e "${YELLOW}提示: 在企业微信中创建文档后，从文档URL中获取文档ID${NC}"
else
  # 测试更新文档内容
  echo -e "\n${YELLOW}测试更新文档内容...${NC}"
  RESPONSE=$(curl -s -X POST "${BASE_URL}/api/wecom/document/update" \
    -H "Content-Type: application/json" \
    -d "{
      \"doc_id\": \"${DOC_ID}\",
      \"content\": \"# 测试更新\\n\\n更新时间：$(date)\\n\\n这是一个测试更新，用于验证企业微信文档对接功能。\\n\\n## 功能列表\\n\\n- 文档内容更新\\n- 会员信息同步\\n- 内容格式化\",
      \"append\": false
    }")

  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

  SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
  if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ 文档更新成功${NC}"
    echo -e "${GREEN}请在企业微信中查看文档内容是否已更新${NC}"
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // .message' 2>/dev/null)
    echo -e "${RED}❌ 更新失败: ${ERROR}${NC}"
  fi

  # 测试同步会员信息
  echo -e "\n${YELLOW}测试同步会员信息到文档...${NC}"
  RESPONSE2=$(curl -s -X POST "${BASE_URL}/api/wecom/document/sync-member" \
    -H "Content-Type: application/json" \
    -d "{
      \"doc_id\": \"${DOC_ID}\",
      \"append\": true
    }")

  echo "$RESPONSE2" | jq . 2>/dev/null || echo "$RESPONSE2"

  SUCCESS2=$(echo "$RESPONSE2" | jq -r '.success' 2>/dev/null)
  if [ "$SUCCESS2" = "true" ]; then
    MEMBER_COUNT=$(echo "$RESPONSE2" | jq -r '.data.member_count' 2>/dev/null)
    echo -e "${GREEN}✓ 会员信息同步成功（共 ${MEMBER_COUNT} 位会员）${NC}"
    echo -e "${GREEN}请在企业微信中查看文档内容是否已更新${NC}"
  else
    ERROR2=$(echo "$RESPONSE2" | jq -r '.error // .message' 2>/dev/null)
    echo -e "${RED}❌ 同步失败: ${ERROR2}${NC}"
  fi
fi

# 检查数据库记录
echo -e "\n${YELLOW}步骤5: 检查数据库记录...${NC}"
mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SELECT doc_name, doc_type, crm_type, created_at FROM wecom_documents ORDER BY created_at DESC LIMIT 3;" 2>/dev/null

echo -e "\n${GREEN}=========================================="
echo "测试完成"
echo "==========================================${NC}"

