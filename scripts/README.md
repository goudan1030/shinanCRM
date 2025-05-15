# 数据库问题诊断工具集

这个工具集用于诊断和解决MySQL数据库连接和表访问问题，特别是针对通过SSH隧道连接时出现的表格数量不一致问题。

## 问题描述

用户通过SSH隧道连接到MySQL数据库时只能看到少量表格（例如admin_users、articles、banners、income_records），而通过phpMyAdmin直接连接可以看到更多表格（例如25个表）。

可能的原因包括：
1. 用户权限问题 - 数据库用户缺少对某些表的访问权限
2. SSH隧道配置问题 - 隧道连接限制或转发设置不正确
3. 多实例问题 - 存在多个MySQL实例，SSH隧道和phpMyAdmin连接到不同的实例

## 工具介绍

本工具集包含以下诊断脚本：

### 1. 主诊断工具 - diagnose-db-issues.js

提供用户友好的交互式界面，可以选择运行各种诊断工具。

**使用方法：**
```bash
node scripts/diagnose-db-issues.js
```

### 2. 数据库连接检查工具 - check-db-connection.js

检查数据库连接配置和权限，列出可访问的表。

**使用方法：**
```bash
node scripts/check-db-connection.js
```

### 3. 连接方式比较工具 - compare-connections.js

比较SSH隧道连接和直接连接的差异，找出表格访问的差异。

**使用方法：**
```bash
node scripts/compare-connections.js
```

### 4. MySQL实例检查工具 - check-mysql-instances.js

检查系统中是否有多个MySQL实例运行，以及SSH隧道信息。

**使用方法：**
```bash
node scripts/check-mysql-instances.js
```

### 5. 用户权限修复工具 - fix-user-permissions.js

使用root用户修复数据库用户权限，确保用户可以访问所有表。

**使用方法：**
```bash
node scripts/fix-user-permissions.js
```

## 环境变量配置

工具使用以下环境变量，您可以通过.env文件或操作系统环境变量配置：

- `DB_HOST` - 数据库主机名（通过SSH隧道时通常为localhost）
- `DB_PORT` - 数据库端口（默认3306）
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名称
- `DB_ROOT_PASSWORD` - MySQL root用户密码（用于修复权限）
- `REMOTE_DB_HOST` - 远程数据库主机名（用于直接连接）

## 完整诊断流程

1. 运行主诊断工具：
```bash
node scripts/diagnose-db-issues.js
```

2. 选择"6. 更新环境变量"设置必要的环境变量

3. 选择"5. 执行完整诊断流程"进行全面检查

4. 根据诊断结果，如有必要，选择"4. 修复数据库用户权限"

## 常见问题解决方案

### 1. 用户权限问题

如果发现是用户权限问题，可以使用fix-user-permissions.js脚本修复：
```bash
node scripts/fix-user-permissions.js
```

### 2. SSH隧道问题

如果SSH隧道出现问题，尝试重新建立隧道：
```bash
ssh -L 3306:127.0.0.1:3306 user@your-server
```

### 3. 多实例问题

如果存在多个MySQL实例，需要确保应用程序和phpMyAdmin连接到同一个实例：
1. 检查MySQL配置文件中的数据目录和端口设置
2. 确认phpMyAdmin的配置指向正确的实例

### 4. 防火墙或网络问题

如果存在防火墙或网络限制，考虑：
1. 检查MySQL配置中的bind-address设置
2. 检查服务器防火墙是否允许MySQL连接
3. 确认SSH隧道正确转发端口

## 注意事项

- 修复用户权限需要MySQL root用户权限
- 某些诊断命令可能需要管理员权限执行
- 在生产环境中操作前，请先备份数据库 