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

# 测试创建通用文档
echo -e "\n${YELLOW}步骤3: 测试创建通用文档...${NC}"
DOC_NAME="测试文档-$(date +%Y%m%d-%H%M%S)"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/wecom/document/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"doc_name\": \"${DOC_NAME}\",
    \"doc_type\": \"doc\",
    \"content\": \"# 测试文档\\n\\n创建时间：$(date)\\n\\n这是一个测试文档，用于验证企业微信文档对接功能。\\n\\n## 功能列表\\n\\n- 文档创建\\n- 内容格式化\\n- 文档分享\",
    \"operator_id\": 1
  }")

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✓ 通用文档创建成功${NC}"
  DOC_URL=$(echo "$RESPONSE" | jq -r '.data.share_url' 2>/dev/null)
  if [ -n "$DOC_URL" ] && [ "$DOC_URL" != "null" ]; then
    echo -e "${GREEN}文档链接: ${DOC_URL}${NC}"
  fi
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message' 2>/dev/null)
  echo -e "${RED}❌ 创建失败: ${ERROR}${NC}"
fi

# 测试创建会员汇总文档
echo -e "\n${YELLOW}步骤4: 测试创建会员汇总文档...${NC}"
DATE=$(date +%Y-%m-%d)
RESPONSE2=$(curl -s -X POST "${BASE_URL}/api/wecom/document/member-summary" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"${DATE}\",
    \"operator_id\": 1
  }")

echo "$RESPONSE2" | jq . 2>/dev/null || echo "$RESPONSE2"

SUCCESS2=$(echo "$RESPONSE2" | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS2" = "true" ]; then
  echo -e "${GREEN}✓ 会员汇总文档创建成功${NC}"
  DOC_URL2=$(echo "$RESPONSE2" | jq -r '.data.share_url' 2>/dev/null)
  if [ -n "$DOC_URL2" ] && [ "$DOC_URL2" != "null" ]; then
    echo -e "${GREEN}文档链接: ${DOC_URL2}${NC}"
  fi
else
  ERROR2=$(echo "$RESPONSE2" | jq -r '.error // .message' 2>/dev/null)
  echo -e "${RED}❌ 创建失败: ${ERROR2}${NC}"
fi

# 检查数据库记录
echo -e "\n${YELLOW}步骤5: 检查数据库记录...${NC}"
mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SELECT doc_name, doc_type, crm_type, created_at FROM wecom_documents ORDER BY created_at DESC LIMIT 3;" 2>/dev/null

echo -e "\n${GREEN}=========================================="
echo "测试完成"
echo "==========================================${NC}"

