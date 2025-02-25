# SNCRM - 客户关系管理系统

## 项目概述

SNCRM是一个现代化的客户关系管理系统，使用Next.js 14构建，采用App Router架构。系统主要用于管理客户关系、收支管理、小程序管理和企业微信管理等功能。

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI组件**: Shadcn UI
- **样式方案**: Tailwind CSS
- **字体**: Geist (优化加载)
- **状态管理**: React Context
- **表单处理**: React Hook Form + Zod
- **数据库**: MySQL (通过连接池管理)
- **认证**: Supabase Auth

## 快速开始

### 开发环境配置

```bash
# 安装依赖
npm install
# or
yarn install
# or
pnpm install

# 启动开发服务器
npm run dev
# or
yarn dev
# or
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 核心功能模块

### 1. 会员管理
- 会员信息录入与编辑
- 会员资料查询
- 会员状态管理
- 匹配次数管理

### 2. 收支管理
- 收入管理
- 支出管理
- 结算管理
- 财务报表

### 3. 小程序管理
- 基础配置
- 审核发布
- 版本管理

### 4. 企业微信管理
- 基础配置
- 数据同步
- 消息推送

### 5. 系统设置
- 个人资料
- 安全设置
- 系统配置

## 项目结构

```
src/
├── app/                    # App Router 路由
│   ├── (dashboard)/       # 仪表盘相关页面
│   ├── api/               # API 路由
│   └── layout.tsx         # 根布局
├── components/            # 共享组件
│   ├── layout/           # 布局组件
│   └── ui/               # UI组件
├── contexts/             # React Context
├── hooks/                # 自定义Hooks
├── lib/                  # 工具函数
└── types/                # TypeScript类型定义
```

## 环境变量配置

创建 `.env.local` 文件并配置以下环境变量：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sncrm

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT配置
JWT_SECRET=your-jwt-secret
```

## 部署

推荐使用 [Vercel Platform](https://vercel.com) 进行部署：

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 点击部署

## 开发规范

### Git提交规范

```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式化
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### 代码风格

- 使用TypeScript编写代码
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循React Hooks规范

## 文档

- [详细设计文档](./docs/design.md)
- [API文档](./docs/api.md)
- [组件文档](./docs/components.md)
- [数据库设计](./docs/database.md)

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

[MIT](LICENSE)

## 联系我们

- 项目负责人: [name](mailto:email)
- 技术支持: [support email](mailto:support-email)

# Banner 管理系统

## 功能说明

### Banner 管理
Banner管理模块提供以下功能：

1. Banner列表展示
   - 显示Banner缩略图、标题、所属分类、排序、状态等信息
   - 支持按分类和状态筛选
   - 分页显示（待实现）

2. Banner新增/编辑
   - 支持上传Banner图片（自动压缩）
   - 设置标题、所属分类、排序号
   - 可配置跳转链接
   - 可设置展示时间范围
   - 可添加备注说明

3. Banner状态管理
   - 支持显示/隐藏状态切换
   - 实时更新状态显示
   - 状态：1-显示，0-隐藏

4. Banner删除
   - 支持单个Banner删除
   - 删除前需确认

### 数据结构

```sql
CREATE TABLE banners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL COMMENT '分类ID: 1-最新 2-热门 3-弹窗',
  title VARCHAR(100) NOT NULL COMMENT '标题',
  image_url TEXT NOT NULL COMMENT '图片地址',
  link_url TEXT COMMENT '跳转链接',
  sort_order INT DEFAULT 0 COMMENT '排序号',
  status TINYINT DEFAULT 1 COMMENT '状态: 1-显示 0-隐藏',
  start_time DATETIME COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### API 接口

1. 获取Banner列表
```
GET /api/platform/banner
```

2. 新增/更新Banner
```
POST /api/platform/banner
参数：
{
  id?: number;            // 更新时需要
  category_id: number;    // 分类ID
  title: string;         // 标题
  image_url: string;     // 图片地址
  link_url?: string;     // 跳转链接
  sort_order: number;    // 排序号
  status: 0 | 1;        // 状态
  start_time?: string;   // 开始时间
  end_time?: string;     // 结束时间
  remark?: string;      // 备注
}
```

3. 更新Banner状态
```
PUT /api/platform/banner/{id}/status
参数：
{
  status: 0 | 1  // 0-隐藏 1-显示
}
```

4. 删除Banner
```
DELETE /api/platform/banner/{id}
```

## 待优化项
1. 添加分页功能
2. 添加图片上传到云存储功能
3. 添加批量删除功能
4. 添加拖拽排序功能
5. 添加数据导出功能

# 资讯管理功能

## 新增功能
- 文章管理（CRUD）
- 文章置顶/隐藏功能
- 公众号文章一键采集功能
- 支持外部链接跳转

## 数据库表结构
```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '标题',
  cover_url TEXT COMMENT '封面图片',
  content TEXT COMMENT '内容',
  summary TEXT COMMENT '摘要',
  link_url TEXT COMMENT '外部链接',
  is_hidden TINYINT DEFAULT 0 COMMENT '是否隐藏',
  is_top TINYINT DEFAULT 0 COMMENT '是否置顶',
  sort_order INT DEFAULT 0 COMMENT '排序',
  views INT DEFAULT 0 COMMENT '浏览次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
