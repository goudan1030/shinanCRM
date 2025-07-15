-- 检查当前用户的数据库权限

-- 显示当前用户
SELECT USER() as current_user, DATABASE() as current_database;

-- 检查当前用户的权限
SHOW GRANTS FOR CURRENT_USER();

-- 检查是否可以创建表
SELECT 
    GRANTEE,
    PRIVILEGE_TYPE,
    IS_GRANTABLE
FROM information_schema.USER_PRIVILEGES 
WHERE GRANTEE LIKE CONCAT("'", SUBSTRING_INDEX(USER(), '@', 1), "'@'%'")
    AND PRIVILEGE_TYPE IN ('CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'TRIGGER');

-- 检查数据库级别权限
SELECT 
    GRANTEE,
    TABLE_SCHEMA,
    PRIVILEGE_TYPE
FROM information_schema.SCHEMA_PRIVILEGES 
WHERE GRANTEE LIKE CONCAT("'", SUBSTRING_INDEX(USER(), '@', 1), "'@'%'")
    AND TABLE_SCHEMA = DATABASE(); 