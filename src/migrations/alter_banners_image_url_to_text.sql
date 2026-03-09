-- 修复 Banner 添加报错：Data too long for column 'image_url'
-- 原因：image_url / link_url 为 VARCHAR(255) 或 TEXT(64KB) 时，大图 base64 会超出限制
-- MEDIUMTEXT 最大约 16MB，可存较大 base64 图片
--
-- 重要：必须在【应用实际连接的数据库】上执行（见 .env.local 里 DB_HOST）。

ALTER TABLE banners
  MODIFY COLUMN image_url MEDIUMTEXT NOT NULL COMMENT '图片URL',
  MODIFY COLUMN link_url MEDIUMTEXT COMMENT '跳转链接';
