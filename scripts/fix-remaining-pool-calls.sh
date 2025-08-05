#!/bin/bash

# 修复剩余的pool.execute调用

echo "🔧 修复剩余的pool.execute调用..."

# 需要修复的文件列表
FILES_TO_FIX=(
    "src/app/api/dashboard/expense/monthly/route.ts"
    "src/app/api/members/export/route.ts"
    "src/app/api/platform/chatgroups/route.ts"
    "src/app/api/platform/chatgroups/[id]/route.ts"
    "src/app/api/platform/chatgroups/[id]/order/route.ts"
)

fix_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        echo "⚠️  文件不存在: $file"
        return
    fi
    
    echo "🔧 修复文件: $file"
    
    # 备份原文件
    cp "$file" "$file.backup2"
    
    # 替换导入语句
    sed -i '' 's/import pool from '\''@\/lib\/mysql'\'';/import { executeQuery } from '\''@\/lib\/database-netlify'\'';/g' "$file"
    sed -i '' 's/import pool from '\''\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/mysql'\'';/import { executeQuery } from '\''\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/database-netlify'\'';/g' "$file"
    
    # 替换 pool.execute 为 executeQuery
    sed -i '' 's/pool\.execute(/executeQuery(/g' "$file"
    
    echo "✅ 修复完成: $file"
}

# 修复所有文件
for file in "${FILES_TO_FIX[@]}"; do
    fix_file "$file"
done

echo ""
echo "✅ 剩余pool.execute调用修复完成！"
echo ""
echo "🔍 验证修复结果："
echo "grep -r 'pool\.execute' src/app/api/" 