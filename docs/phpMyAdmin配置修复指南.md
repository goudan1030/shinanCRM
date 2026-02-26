# phpMyAdmin配置修复指南

## 问题描述

### 问题1: 临时目录权限错误
**错误信息**: 
```
变量 $cfg['TempDir'] (/www/server/phpmyadmin/phpmyadmin_820fec596217f404/tmp/) 无法访问。
phpMyAdmin无法缓存模板文件，所以会运行缓慢。
```

### 问题2: pmadb配置错误
**错误信息**: 
```
配置pmadb... 错误
基本功能 已禁用
创建一个名为'phpmyadmin'的数据库,并在那里设置phpMyAdmin配置存储。
```

## 解决方案

### 自动修复（推荐）

#### 1. 完整修复（推荐）
```bash
# 使用npm命令
npm run fix:phpmyadmin:complete

# 或直接运行脚本
node scripts/fix-phpmyadmin-complete.js
```

#### 2. 分步修复
```bash
# 修复临时目录权限
npm run fix:phpmyadmin

# 设置pmadb配置存储
npm run setup:phpmyadmin
```

### 手动修复

#### 修复临时目录权限

1. **连接到服务器**
```bash
ssh root@121.41.65.220
```

2. **修复权限**
```bash
# 更改所有者
chown -R www:www /www/server/phpmyadmin/phpmyadmin_820fec596217f404/tmp/

# 设置权限
chmod -R 755 /www/server/phpmyadmin/phpmyadmin_820fec596217f404/tmp/
```

3. **重启PHP-FPM**
```bash
# 方法1: 使用systemctl（如果可用）
systemctl restart php-fpm

# 方法2: 使用kill信号
ps aux | grep 'php-fpm: master' | grep -v grep
kill -USR2 <PID>
```

#### 设置pmadb配置存储

1. **创建phpmyadmin数据库**
```bash
mysql -u root -p
CREATE DATABASE phpmyadmin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **导入配置表结构**
```bash
mysql -u root -p phpmyadmin < /www/server/phpmyadmin/phpmyadmin_820fec596217f404/sql/create_tables.sql
```

3. **启用pmadb配置**
```bash
# 备份原配置
cp /www/server/phpmyadmin/phpmyadmin_820fec596217f404/config.inc.php /www/server/phpmyadmin/phpmyadmin_820fec596217f404/config.inc.php.backup

# 启用配置（取消注释）
sed -i 's|// $cfg['\''Servers'\''][$i]['\''pmadb'\''] = '\''phpmyadmin'\'';|$cfg['\''Servers'\''][$i]['\''pmadb'\''] = '\''phpmyadmin'\'';|g' /www/server/phpmyadmin/phpmyadmin_820fec596217f404/config.inc.php
```

## 修复内容

### 临时目录权限修复
- **所有者**: 从 `root:root` 改为 `www:www`
- **权限**: 设置为 `755` (rwxr-xr-x)
- **影响范围**: 整个临时目录及其子目录

### pmadb配置修复
- **数据库**: 创建了 `phpmyadmin` 数据库
- **表结构**: 导入了20个配置表
- **配置文件**: 启用了所有pmadb相关配置
- **功能**: 启用了高级功能（书签、历史记录、用户偏好等）

### 配置表列表
```
pma__bookmark          - 书签功能
pma__central_columns   - 中央列管理
pma__column_info       - 列信息
pma__designer_settings - 设计器设置
pma__export_templates  - 导出模板
pma__favorite          - 收藏夹
pma__history           - SQL历史
pma__navigationhiding  - 导航隐藏
pma__pdf_pages         - PDF页面设置
pma__recent            - 最近访问
pma__relation          - 关系表
pma__savedsearches     - 保存的搜索
pma__table_coords      - 表坐标
pma__table_info        - 表信息
pma__table_uiprefs     - 表UI偏好
pma__tracking          - 变更跟踪
pma__userconfig        - 用户配置
pma__usergroups        - 用户组
pma__users             - 用户管理
```

### 启用的配置项
```php
$cfg['Servers'][$i]['pmadb'] = 'phpmyadmin';
$cfg['Servers'][$i]['bookmarktable'] = 'pma__bookmark';
$cfg['Servers'][$i]['relation'] = 'pma__relation';
$cfg['Servers'][$i]['table_info'] = 'pma__table_info';
$cfg['Servers'][$i]['table_coords'] = 'pma__table_coords';
$cfg['Servers'][$i]['pdf_pages'] = 'pma__pdf_pages';
$cfg['Servers'][$i]['column_info'] = 'pma__column_info';
$cfg['Servers'][$i]['history'] = 'pma__history';
$cfg['Servers'][$i]['table_uiprefs'] = 'pma__table_uiprefs';
$cfg['Servers'][$i]['tracking'] = 'pma__tracking';
$cfg['Servers'][$i]['userconfig'] = 'pma__userconfig';
$cfg['Servers'][$i]['recent'] = 'pma__recent';
$cfg['Servers'][$i]['favorite'] = 'pma__favorite';
$cfg['Servers'][$i]['users'] = 'pma__users';
$cfg['Servers'][$i]['usergroups'] = 'pma__usergroups';
```

## 验证修复

### 1. 刷新phpMyAdmin页面
访问 `http://121.41.65.220:8888/phpmyadmin/` 并刷新页面

### 2. 检查错误信息
- ✅ 红色错误横幅应该消失
- ✅ 黄色警告横幅应该消失
- ✅ 页面加载速度应该提升
- ✅ 高级功能应该可用

### 3. 检查功能
- ✅ 书签功能可用
- ✅ SQL历史记录可用
- ✅ 用户偏好设置可用
- ✅ 导出模板可用

### 4. 验证配置
```bash
# 检查pmadb配置
grep -A 15 'Storage database and tables' /www/server/phpmyadmin/phpmyadmin_820fec596217f404/config.inc.php

# 检查数据库表
mysql -u root -p -e "USE phpmyadmin; SHOW TABLES;"
```

## 预防措施

### 1. 定期检查权限
```bash
# 检查临时目录权限
ls -la /www/server/phpmyadmin/phpmyadmin_*/tmp/
```

### 2. 监控数据库
```bash
# 检查phpmyadmin数据库
mysql -u root -p -e "USE phpmyadmin; SHOW TABLES;"
```

### 3. 备份配置
```bash
# 备份phpMyAdmin配置
cp /www/server/phpmyadmin/phpmyadmin_*/config.inc.php /backup/
```

## 常见问题

### Q: 修复后仍然出现错误？
A: 尝试以下步骤：
1. 清除浏览器缓存
2. 重启Web服务器 (nginx/apache)
3. 检查SELinux状态（如果启用）
4. 运行完整的修复脚本：`npm run fix:phpmyadmin:complete`

### Q: 权限修复后又被重置？
A: 可能是系统更新或安全策略导致，建议：
1. 检查cron任务
2. 检查安全软件设置
3. 设置定期修复脚本

### Q: pmadb配置不生效？
A: 检查以下几点：
1. 确认phpmyadmin数据库存在
2. 确认配置表已创建
3. 确认config.inc.php文件中的配置已启用（不是注释状态）
4. 重启PHP-FPM服务

### Q: 配置文件被重置？
A: 如果配置文件被重置，重新运行：
```bash
npm run fix:phpmyadmin:complete
```

## 相关文件

- 临时目录修复脚本: `scripts/fix-phpmyadmin-tempdir.js`
- pmadb设置脚本: `scripts/setup-phpmyadmin-pmadb.js`
- 完整修复脚本: `scripts/fix-phpmyadmin-complete.js`
- 便捷命令: 
  - `npm run fix:phpmyadmin` - 修复临时目录权限
  - `npm run setup:phpmyadmin` - 设置pmadb配置
  - `npm run fix:phpmyadmin:complete` - 完整修复（推荐）
- 服务器地址: `121.41.65.220:8888`
- phpMyAdmin路径: `/www/server/phpmyadmin/phpmyadmin_820fec596217f404/`
- MySQL root密码: `Zwd9510301115@`

## 技术支持

如果问题仍然存在，请检查：
1. SSH连接是否正常
2. MySQL root密码是否正确
3. 服务器磁盘空间是否充足
4. PHP-FPM配置是否正确
5. Web服务器配置是否有问题
6. 配置文件是否被正确修改（不是注释状态） 