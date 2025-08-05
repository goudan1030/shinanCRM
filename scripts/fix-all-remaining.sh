#!/bin/bash

# 修复所有剩余的pool.execute调用

echo "🔧 修复所有剩余的pool.execute调用..."

# 查找所有包含pool.execute的文件
FILES_WITH_POOL_EXECUTE=$(grep -l "pool\.execute" src/app/api/**/*.ts 2>/dev/null || true)

if [ -z "$FILES_WITH_POOL_EXECUTE" ]; then
    echo "✅ 没有找到包含pool.execute的文件"
    exit 0
fi

echo "找到以下文件包含pool.execute:"
echo "$FILES_WITH_POOL_EXECUTE"
echo ""

fix_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        echo "⚠️  文件不存在: $file"
        return
    fi
    
    echo "🔧 修复文件: $file"
    
    # 备份原文件
    cp "$file" "$file.backup3"
    
    # 替换 pool.execute 为 executeQuery
    sed -i '' 's/pool\.execute(/executeQuery(/g' "$file"
    
    echo "✅ 修复完成: $file"
}

# 修复所有文件
for file in $FILES_WITH_POOL_EXECUTE; do
    fix_file "$file"
done

echo ""
echo "✅ 所有pool.execute调用修复完成！"
echo ""
echo "🔍 最终验证："
grep -r "pool\.execute" src/app/api/ || echo "✅ 没有找到剩余的pool.execute调用" 