#!/bin/bash

# 数据库连接配置统一修复脚本
# 将所有使用 mysql.ts 和 database.ts 的API文件统一改为使用 database-netlify.ts

echo "🔧 开始修复数据库连接配置..."

# 定义需要修复的文件列表
API_FILES=(
    "src/app/api/finance/expense/delete/route.ts"
    "src/app/api/finance/expense/update/route.ts"
    "src/app/api/finance/settlement/route.ts"
    "src/app/api/finance/settlement/create/route.ts"
    "src/app/api/finance/settlement/delete/route.ts"
    "src/app/api/finance/settlement/list/route.ts"
    "src/app/api/finance/settlement/update/route.ts"
    "src/app/api/members/export/route.ts"
    "src/app/api/members/[id]/route.ts"
    "src/app/api/members/[id]/status/route.ts"
    "src/app/api/members/[id]/revoke/route.ts"
    "src/app/api/members/[id]/upgrade/route.ts"
    "src/app/api/members/[id]/activate/route.ts"
    "src/app/api/members/one-time/route.ts"
    "src/app/api/members/normal/route.ts"
    "src/app/api/members/annual/route.ts"
    "src/app/api/members/match/route.ts"
    "src/app/api/dashboard/trends/route.ts"
    "src/app/api/dashboard/members/count/route.ts"
    "src/app/api/dashboard/income/wechat-zhang/route.ts"
    "src/app/api/dashboard/income/monthly/route.ts"
    "src/app/api/dashboard/settlement/monthly/route.ts"
    "src/app/api/dashboard/expense/monthly/route.ts"
    "src/app/api/platform/chatgroups/route.ts"
    "src/app/api/platform/chatgroups/[id]/route.ts"
    "src/app/api/platform/chatgroups/[id]/order/route.ts"
    "src/app/api/platform/article/collect/route.ts"
    "src/app/api/platform/article/[id]/route.ts"
    "src/app/api/platform/article/[id]/status/route.ts"
    "src/app/api/platform/article/[id]/top/route.ts"
    "src/app/api/wecom/debug/route.ts"
    "src/app/api/wecom/message-test/route.ts"
    "src/app/api/wecom/config/route.ts"
    "src/app/api/wecom/quick-config/route.ts"
    "src/app/api/wecom/update-config/route.ts"
    "src/app/api/miniapp/config/route.ts"
    "src/app/api/auth/password/route.ts"
    "src/app/api/auth/profile/route.ts"
)

# 修复函数
fix_database_import() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        echo "⚠️  文件不存在: $file"
        return
    fi
    
    echo "🔧 修复文件: $file"
    
    # 备份原文件
    cp "$file" "$file.backup"
    
    # 替换导入语句
    sed -i '' 's/import pool from '\''@\/lib\/mysql'\'';/import { executeQuery } from '\''@\/lib\/database-netlify'\'';/g' "$file"
    sed -i '' 's/import { pool } from '\''@\/lib\/mysql'\'';/import { executeQuery } from '\''@\/lib\/database-netlify'\'';/g' "$file"
    sed -i '' 's/import { createClient } from '\''@\/lib\/mysql'\'';/import { executeQuery } from '\''@\/lib\/database-netlify'\'';/g' "$file"
    
    # 替换 pool.execute 为 executeQuery
    sed -i '' 's/pool\.execute(/executeQuery(/g' "$file"
    
    # 替换 pool.query 为 executeQuery
    sed -i '' 's/pool\.query(/executeQuery(/g' "$file"
    
    echo "✅ 修复完成: $file"
}

# 修复特殊文件
fix_special_files() {
    echo "🔧 修复特殊文件..."
    
    # 修复 auth/password/route.ts
    if [ -f "src/app/api/auth/password/route.ts" ]; then
        echo "🔧 修复 auth/password/route.ts"
        sed -i '' 's/import { updateUserPassword, authenticateUser } from '\''@\/lib\/mysql'\'';/import { updateUserPassword, authenticateUser } from '\''@\/lib\/database-netlify'\'';/g' "src/app/api/auth/password/route.ts"
    fi
    
    # 修复 auth/profile/route.ts
    if [ -f "src/app/api/auth/profile/route.ts" ]; then
        echo "🔧 修复 auth/profile/route.ts"
        sed -i '' 's/import { updateUserProfile } from '\''@\/lib\/mysql'\'';/import { updateUserProfile } from '\''@\/lib\/database-netlify'\'';/g' "src/app/api/auth/profile/route.ts"
    fi
    
    # 修复其他库文件
    if [ -f "src/lib/auth.ts" ]; then
        echo "🔧 修复 src/lib/auth.ts"
        sed -i '' 's/import pool from '\''@\/lib\/mysql'\'';/import { executeQuery } from '\''@\/lib\/database-netlify'\'';/g' "src/lib/auth.ts"
        sed -i '' 's/pool\.execute(/executeQuery(/g' "src/lib/auth.ts"
    fi
    
    if [ -f "src/lib/wecom-api.ts" ]; then
        echo "🔧 修复 src/lib/wecom-api.ts"
        sed -i '' 's/import pool from '\''.\/mysql'\'';/import { executeQuery } from '\''.\/database-netlify'\'';/g' "src/lib/wecom-api.ts"
        sed -i '' 's/pool\.execute(/executeQuery(/g' "src/lib/wecom-api.ts"
    fi
}

# 主执行流程
main() {
    echo "🚀 开始批量修复数据库连接配置..."
    echo "📋 总共需要修复 ${#API_FILES[@]} 个文件"
    
    # 修复API文件
    for file in "${API_FILES[@]}"; do
        fix_database_import "$file"
    done
    
    # 修复特殊文件
    fix_special_files
    
    echo ""
    echo "✅ 数据库连接配置修复完成！"
    echo ""
    echo "📝 修复内容："
    echo "  - 将所有 pool 导入改为 executeQuery 导入"
    echo "  - 将所有 pool.execute() 调用改为 executeQuery() 调用"
    echo "  - 将所有 pool.query() 调用改为 executeQuery() 调用"
    echo ""
    echo "⚠️  注意事项："
    echo "  - 所有原文件已备份为 .backup 文件"
    echo "  - 请检查修复后的文件是否正确"
    echo "  - 如有问题可以恢复备份文件"
    echo ""
    echo "🔍 建议执行以下命令验证修复结果："
    echo "  npm run build"
    echo "  npm run dev"
}

# 执行主函数
main 