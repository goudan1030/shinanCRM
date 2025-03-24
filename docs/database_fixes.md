# 数据库修复：为会员表添加自增ID

## 问题背景

当前系统中的`members`表使用UUID作为主键，但系统中的其他表（如`member_operation_logs`）期望会员ID是数字类型。这导致在执行会员撤销等操作时出现"Data truncated for column 'member_id'"错误。

## 解决方案

我们将为`members`表添加一个自增的`id`列作为新的主键，同时保留原有的UUID值，并更新所有引用会员ID的表。

## 执行步骤

1. **备份数据库**
   
   在执行任何更改前，务必先备份数据库：
   ```sql
   mysqldump -u [用户名] -p [数据库名] > backup_[日期].sql
   ```

2. **执行SQL脚本**

   我们已经准备了一个SQL脚本来执行所有必要的更改。可以使用以下命令执行：
   ```bash
   mysql -u [用户名] -p [数据库名] < src/scripts/add_autoincrement_id_to_members.sql
   ```

   或者在MySQL客户端中执行：
   ```sql
   source src/scripts/add_autoincrement_id_to_members.sql;
   ```

## 脚本说明

脚本将执行以下操作：

1. 将原有的UUID格式的`id`值备份到新增的`uuid`列
2. 删除原有的主键约束
3. 重命名原有的`id`列为`old_id`
4. 添加新的自增`id`主键列
5. 更新`member_operation_logs`表中的外键引用
6. 为`uuid`列创建索引以便于查询

## 代码调整

所有涉及会员ID的API都需要调整：
1. 在路由中我们接收UUID格式的ID
2. 使用UUID查询会员表获取数字格式的ID
3. 使用数字ID进行后续操作

已更新的文件：
- `src/app/api/members/[id]/revoke/route.ts`

其他需要检查的API：
- 所有`src/app/api/members/[id]/*`下的文件

## 注意事项

1. 执行脚本可能需要较长时间，取决于数据量大小
2. 某些外键约束可能需要根据实际情况调整
3. 执行过程中可能会有短暂的服务不可用
4. 在测试环境中先进行验证后再应用到生产环境

## 验证测试

执行完数据库修改后，请测试以下功能：
1. 会员撤销功能
2. 会员状态变更
3. 会员信息查询
4. 其他涉及会员ID的功能

如有问题，可以使用之前的备份恢复数据。 