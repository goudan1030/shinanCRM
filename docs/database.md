# 数据库设计文档

## 数据库概述

本系统使用MySQL数据库,主要包含以下数据表:
- 会员管理相关表
- 收支管理相关表
- 配置管理相关表
- 系统管理相关表
- Banner相关表
- 文章管理相关表

## 表结构设计

### 1. 会员表 (members)

```sql
CREATE TABLE members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_no VARCHAR(50) NOT NULL COMMENT '会员编号',
  nickname VARCHAR(100) COMMENT '昵称',
  wechat VARCHAR(50) COMMENT '微信号',
  phone VARCHAR(20) COMMENT '手机号',
  type ENUM('NORMAL','ONE_TIME','ANNUAL') COMMENT '会员类型',
  status ENUM('ACTIVE','INACTIVE','REVOKED','SUCCESS') COMMENT '状态',
  gender ENUM('male','female') COMMENT '性别',
  birth_year INT COMMENT '出生年份',
  height INT COMMENT '身高',
  weight INT COMMENT '体重',
  education VARCHAR(50) COMMENT '学历',
  occupation VARCHAR(100) COMMENT '职业',
  province VARCHAR(50) COMMENT '省份',
  city VARCHAR(50) COMMENT '城市',
  district VARCHAR(50) COMMENT '区县',
  target_area VARCHAR(200) COMMENT '目标区域',
  house_car VARCHAR(200) COMMENT '房车情况',
  hukou_province VARCHAR(50) COMMENT '户口所在省',
  hukou_city VARCHAR(50) COMMENT '户口所在市',
  children_plan VARCHAR(50) COMMENT '孩子需求',
  marriage_cert ENUM('WANT','DONT_WANT','NEGOTIABLE') COMMENT '领证需求',
  marriage_history VARCHAR(50) COMMENT '婚史',
  sexual_orientation VARCHAR(50) COMMENT '性取向',
  remaining_matches INT DEFAULT 0 COMMENT '剩余匹配次数',
  self_description TEXT COMMENT '自我介绍',
  partner_requirement TEXT COMMENT '择偶要求',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_member_no` (`member_no`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_wechat` (`wechat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员表';
```

### 2. 收入表 (income)

```sql
CREATE TABLE income (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_no VARCHAR(50) COMMENT '会员编号',
  payment_date DATE COMMENT '支付日期',
  payment_method ENUM(
    'ALIPAY',
    'WECHAT_WANG',
    'WECHAT_ZHANG',
    'ICBC_QR',
    'CORPORATE'
  ) COMMENT '支付方式',
  amount DECIMAL(10,2) COMMENT '金额',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_member_no` (`member_no`),
  KEY `idx_payment_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收入表';
```

### 3. 支出表 (expense)

```sql
CREATE TABLE expense (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_date DATE COMMENT '支出日期',
  expense_type VARCHAR(50) COMMENT '支出类型',
  amount DECIMAL(10,2) COMMENT '金额',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_expense_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支出表';
```

### 4. 结算表 (settlement)

```sql
CREATE TABLE settlement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  settlement_date DATE COMMENT '结算日期',
  amount DECIMAL(10,2) COMMENT '金额',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_settlement_date` (`settlement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算表';
```

### 5. 小程序配置表 (miniapp_config)

```sql
CREATE TABLE miniapp_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  appid VARCHAR(100) NOT NULL COMMENT '小程序AppID',
  appsecret VARCHAR(100) NOT NULL COMMENT '小程序AppSecret',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序配置表';
```

### 6. 企业微信配置表 (wecom_config)

```sql
CREATE TABLE wecom_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  corp_id VARCHAR(100) NOT NULL COMMENT '企业ID',
  agent_id VARCHAR(100) NOT NULL COMMENT '应用ID',
  secret VARCHAR(100) NOT NULL COMMENT '应用Secret',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企业微信配置表';
```

### 7. 操作日志表 (operation_logs)

```sql
CREATE TABLE operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT COMMENT '操作用户ID',
  operation_type VARCHAR(50) COMMENT '操作类型',
  target_type VARCHAR(50) COMMENT '目标类型',
  target_id BIGINT COMMENT '目标ID',
  detail TEXT COMMENT '操作详情',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  KEY `idx_user_id` (`user_id`),
  KEY `idx_target` (`target_type`, `target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```

### 8. Banner分类表 (banner_categories)

```sql
CREATE TABLE banner_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  code VARCHAR(50) NOT NULL COMMENT '分类编码',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态: 1-启用 0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Banner分类表';
```

### 9. Banner表 (banners)

```sql
CREATE TABLE banners (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT NOT NULL COMMENT '分类ID',
  title VARCHAR(100) NOT NULL COMMENT '标题',
  image_url VARCHAR(255) NOT NULL COMMENT '图片URL',
  link_url VARCHAR(255) COMMENT '跳转链接',
  sort_order INT DEFAULT 0 COMMENT '排序(数字越大越靠前)',
  status TINYINT DEFAULT 1 COMMENT '状态: 1-显示 0-隐藏',
  start_time DATETIME COMMENT '展示开始时间',
  end_time DATETIME COMMENT '展示结束时间',
  remark TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_category` (`category_id`),
  KEY `idx_status_sort` (`status`, `sort_order`),
  CONSTRAINT `fk_banner_category` FOREIGN KEY (`category_id`) REFERENCES `banner_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Banner表';
```

### 10. 文章表 (articles)

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL COMMENT '标题',
  cover_url TEXT NOT NULL COMMENT '封面图片地址',
  content TEXT NOT NULL COMMENT '文章内容',
  summary TEXT COMMENT '文章摘要',
  views INT DEFAULT 0 COMMENT '浏览次数',
  is_hidden TINYINT DEFAULT 0 COMMENT '是否隐藏: 0-显示 1-隐藏',
  is_top TINYINT DEFAULT 0 COMMENT '是否置顶: 0-普通 1-置顶',
  sort_order INT DEFAULT 0 COMMENT '排序号(置顶文章的排序)',
  created_by VARCHAR(100) COMMENT '创建人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

## 索引设计

### members表索引
- `uk_member_no`: 会员编号唯一索引
- `uk_phone`: 手机号唯一索引
- `uk_wechat`: 微信号唯一索引

### income表索引
- `idx_member_no`: 会员编号索引
- `idx_payment_date`: 支付日期索引

### expense表索引
- `idx_expense_date`: 支出日期索引

### settlement表索引
- `idx_settlement_date`: 结算日期索引

### operation_logs表索引
- `idx_user_id`: 用户ID索引
- `idx_target`: 目标类型和ID联合索引

## 数据库维护建议

1. 定期备份
   - 每日全量备份
   - 实时binlog备份

2. 性能优化
   - 定期更新统计信息
   - 定期清理冗余数据
   - 监控慢查询

3. 安全建议
   - 最小权限原则
   - 定期更新密码
   - 限制远程访问

4. 数据清理
   - 定期归档历史数据
   - 设置数据保留策略 