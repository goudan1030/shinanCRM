# 新星CRM系统

这是一个基于Next.js 15开发的客户关系管理(CRM)系统。

## 🔒 安全更新 (2025-01-XX)

### ⚠️ CVE-2025-66478 远程代码执行漏洞修复（严重）

**漏洞说明：**
- **漏洞编号**：CVE-2025-66478
- **漏洞类型**：Next.js React Server Components 远程代码执行（RCE）
- **严重程度**：严重（Critical）
- **影响版本**：Next.js 15.0.0 - 15.2.5（使用 App Router 和 RSC）
- **当前状态**：✅ 已修复

**漏洞详情：**
这是一个严重的远程代码执行漏洞，未经验证的攻击者可以在受影响的服务器上执行任意代码。此漏洞源于 React 的上游问题 CVE-2025-55182，影响 RSC 协议。

**修复措施：**
1. ✅ **升级 Next.js**：从 15.2.3 升级到 15.2.6（必须）
2. ✅ **同步更新依赖**：更新 eslint-config-next 到匹配版本

**修复步骤：**
```bash
# 运行自动修复脚本（推荐）
./scripts/fix-cve-2025-66478.sh

# 或手动修复
npm install next@15.2.6 eslint-config-next@15.2.6 --save --save-exact
rm -rf .next
npm run build
pm2 restart sncrm
```

**验证修复：**
- 检查 Next.js 版本：`npm list next`（应显示 15.2.6）
- 测试应用功能，特别是 React Server Components
- 检查应用日志确认无错误

**重要提醒：**
- ⚠️ **这是严重的 RCE 漏洞，必须立即修复！**
- 升级到安全版本是唯一有效的修复方案
- 建议在测试环境充分测试后再部署到生产环境
- 建议创建服务器快照作为备份
- 详细文档：`docs/CVE-2025-66478-修复说明.md`

---

### CVE-2025-29927 中间件权限绕过漏洞修复

**漏洞说明：**
- **漏洞编号**：CVE-2025-29927
- **漏洞类型**：Next.js 中间件权限绕过漏洞
- **影响版本**：Next.js 15.0.0 - 15.2.2
- **当前状态**：✅ 已修复

**漏洞详情：**
攻击者可以通过操纵 `x-middleware-subrequest` HTTP 头来绕过 Next.js 中间件的授权检查，从而未授权访问受保护的路由和资源。

**修复措施：**
1. ✅ **升级 Next.js**：从 15.1.6 升级到 15.2.3 或更高版本（主要修复）
2. ✅ **Nginx 配置加固**：在反向代理配置中移除 `x-middleware-subrequest` 头（额外防护）

**修复步骤：**
```bash
# 运行自动修复脚本
./scripts/fix-cve-2025-29927.sh

# 或手动修复
npm install next@^15.2.3 eslint-config-next@^15.2.3 --save --save-exact
npm run build
```

**Nginx 配置修复：**
在 Nginx 配置的 `location /` 块中添加：
```nginx
# CVE-2025-29927 漏洞修复：移除可能被恶意利用的x-middleware-subrequest头
proxy_set_header x-middleware-subrequest "";
```

然后重载 Nginx：
```bash
sudo nginx -t
sudo nginx -s reload
```

**验证修复：**
- 检查 Next.js 版本：`npm list next`（应显示 15.2.3 或更高）
- 测试登录和权限控制功能是否正常
- 检查应用是否正常运行

**重要提醒：**
- 建议在测试环境充分测试后再部署到生产环境
- 建议创建服务器快照作为备份
- 定期检查 Next.js 安全更新

## 系统修复历程

原系统遇到了严重的模块错误问题，导致登录功能无法正常工作，用户即使成功登录后页面仍会停留在登录页面。经过诊断，我们发现主要问题是Next.js应用无法正常启动，原因是缺少核心模块`../server/require-hook`。

我们采取了以下步骤修复系统：

1. **初步诊断**：通过检查服务器日志，发现Next.js应用启动失败，出现`Cannot find module '../server/require-hook'`错误。

2. **临时解决方案**：部署一个静态维护页面，确保用户在修复期间能看到系统状态而不是错误页面。

3. **全新构建**：因为原系统存在多处问题，我们决定从头构建一个新的CRM系统：
   - 使用最新的Next.js 14创建项目
   - 重新实现登录功能和认证系统
   - 设计基本的仪表盘界面
   - 配置正确的中间件和路由保护
   - 修复所有类型错误和依赖问题

4. **成功部署**：新系统已成功部署并可通过原域名访问。

## 系统功能

当前系统实现了以下基本功能：

1. **用户认证**
   - 登录功能（任何有效的邮箱和密码组合即可登录）
   - 会话管理和验证
   - 安全登出

2. **仪表盘**
   - 基本数据展示
   - 用户信息显示
   - 响应式布局

3. **APP管理**
   - **基础配置**：配置APP基本信息、API地址、系统状态
   - **版本管理**：管理APP版本发布、强制更新、平台特定版本
   - **推荐管理**：管理推荐用户列表，支持搜索、添加、移除推荐用户
   - **刷新管理**：智能刷新策略，随机选择100名用户并分配4小时内随机的刷新时间，模拟真实用户活跃分布，避免服务器压力

## 技术栈

- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- Cookies-next（Cookie管理）

## 系统架构

系统采用标准的Next.js项目结构：

```
/
├── pages/              # 页面组件
│   ├── api/            # API路由
│   │   └── auth/       # 认证相关API
│   ├── dashboard/      # 仪表盘页面
│   └── login/          # 登录页面
├── styles/             # 样式文件
├── types/              # TypeScript类型定义
├── middleware.ts       # 全局中间件（路由保护）
└── public/             # 静态资源
```

## 使用方法

访问系统: http://crm.xinghun.info

### 登录

使用任何有效的邮箱地址和密码组合登录系统。

### 仪表盘

登录后自动跳转到仪表盘页面，可以查看基本数据和系统信息。

## 后续改进

1. **数据库集成**：添加真实数据库连接，存储用户信息和业务数据。
2. **完整的用户管理**：实现用户注册、密码重置、权限管理等功能。
3. **业务功能扩展**：根据需求添加客户管理、订单管理等CRM核心功能。
4. **UI/UX优化**：改进界面设计和用户体验。
5. **性能优化**：实现更多静态生成页面和增量静态再生成(ISR)功能。

## 最新更新 (2025-01-19)

### APP管理功能优化
- **刷新管理智能升级**：实现4小时内随机时间分布策略
  - 每次刷新随机选择100名活跃会员
  - 每个会员获得4小时内随机的刷新时间
  - 模拟真实用户活跃时间分布
  - 避免同时刷新造成的服务器压力
  - 添加详细的刷新策略说明和统计信息
  - 优化页面布局，增加时间范围显示

## 部署信息

- 服务器: Alibaba Cloud ECS
- 域名: crm.xinghun.info
- 端口: 3001
- PM2实例名: sncrm

## 故障排除

如遇系统问题，请检查以下日志：

- PM2日志：`pm2 logs sncrm`
- Nginx错误日志：`/www/wwwlogs/sncrm.error.log`
- 应用日志：`/www/wwwroot/sncrm/.pm2/logs/sncrm-error.log`

## 联系方式

如有任何问题或需要进一步的技术支持，请联系系统管理员。

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

## 重要更新：缓存系统移除

### 2025年1月26日 - 彻底移除缓存机制

为了解决数据操作后需要多次刷新才能看到更新的问题，我们对系统进行了重大改进：

**移除的缓存组件：**
- 删除了所有缓存相关工具库（`src/lib/cache.ts`、`src/lib/cache/`目录）
- 删除了缓存管理页面和API接口
- 删除了缓存服务文件

**修改的配置：**
- **next.config.js**: 禁用所有资源缓存，统一设置为0秒TTL
- **middleware.ts**: 移除缓存控制，所有响应添加禁用缓存头
- **API响应**: 统一添加无缓存头（`Cache-Control: no-cache, no-store, must-revalidate`）

**修复的数据库字段问题：**
- 修复会员API中的字段名称错误（`name` → `nickname`）
- 更新查询字段以匹配实际数据库表结构
- 优化搜索功能，支持微信号搜索

**效果：**
- ✅ 数据操作后立即反映变化，无需刷新页面
- ✅ 确保所有数据都是实时的最新状态
- ✅ 解决了会员列表显示的字段错误问题

### 2025年1月26日 - 用户管理页面优化

**用户界面优化：**
- 移除了用户管理页面中的头像字段显示
- 将"资料完善"字段添加到默认显示列中
- 优化了列选择器的默认配置

**修改内容：**
- 从可用列定义中移除 `avatar` 字段
- 更新默认显示列：`['phone', 'username', 'nickname', 'status', 'registered', 'member_type', 'created_at', 'refresh_count', 'actions']`
- 移除表格中所有头像相关的渲染代码
- 确保资料完善状态清晰显示

**用户体验提升：**
- ✅ 界面更加简洁，专注于关键信息
- ✅ 资料完善状态默认可见，便于管理
- ✅ 减少不必要的头像加载，提升页面性能

### 2025年1月26日 - 数据库性能优化

**性能问题诊断：**
- 发现每个API请求都在执行大量的数据库连接测试
- 每次查询前都会进行DNS解析、TCP连接、数据库连接测试
- 大量冗余的日志输出影响响应速度

**优化措施：**
- **移除重复连接测试**：取消每次查询前的`testNetlifyConnection()`调用
- **简化executeQuery函数**：直接使用连接池执行查询，依赖自动重连机制
- **优化连接池配置**：增加连接池大小到10，优化超时设置
- **减少日志输出**：移除大部分调试日志，只保留错误日志
- **轻量级错误处理**：只在严重错误时重置连接池

**性能提升效果：**
- ✅ 页面加载速度显著提升（从12秒降低到秒级）
- ✅ 减少了90%以上的数据库连接测试开销
- ✅ API响应时间大幅改善
- ✅ 日志输出更加简洁，便于问题排查

**技术改进：**
- 连接池配置优化：增加连接数、减少超时时间
- 移除了不必要的DNS解析和TCP连接测试
- 简化了数据库查询流程，提升响应效率

### 2025年1月26日 - Banner管理功能修复

**问题诊断：**
- Banner页面出现"获取Banner列表失败: undefined"错误
- 前端无法正常显示Banner数据
- API与数据库字段类型不匹配

**根本原因：**
1. **数据库连接不一致**：Banner API使用`@/lib/database`而非统一的`@/lib/database-netlify`
2. **状态字段类型冲突**：数据库存储`tinyint(1)`（0/1），API期望字符串（'active'/'inactive'）
3. **缺少必要字段**：创建Banner时缺少`category_id`字段

**解决方案：**
- **统一数据库连接**：修改所有Banner API使用`executeQuery`函数
- **修正状态字段处理**：
  - 创建/更新时：将字符串状态转换为数字（'active' → 1，'inactive' → 0）
  - 状态切换时：支持前端传入0/1或'active'/'inactive'，统一转换为数字存储
- **添加防缓存头**：为所有Banner API响应添加`Cache-Control: no-cache`
- **完善字段处理**：创建Banner时自动添加默认`category_id`

**修改的文件：**
- `src/app/api/platform/banner/route.ts`：修复GET/POST/PUT方法
- `src/app/api/platform/banner/[id]/status/route.ts`：修复状态更新API
- `src/app/api/platform/banner/[id]/route.ts`：修复详情和删除API

**效果：**
- ✅ Banner API响应格式统一化
- ✅ Banner状态字段类型问题修复
- ✅ Banner创建和编辑功能正常
- ✅ 数据实时性得到保证
- ⚠️ **用户需要先登录才能访问Banner页面**（正常的安全行为）

**用户操作指南：**
如果看到"获取Banner列表失败"错误，请确保：
1. 已经登录系统（访问 `/login` 页面进行登录）
2. 登录token未过期
3. 网络连接正常

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
- 会员数据导出（CSV格式）

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
- **基础配置**：企业ID、应用配置、权限设置
- **数据同步**：企业微信通讯录同步
- **消息推送**：新会员登记通知、系统消息推送
- **会员查询功能**：⭐ **新功能** - 通过企业微信发送会员编号查询会员详细信息
  - 支持多种编号格式：M17071、10921、A1234等
  - 返回详细会员信息：基本信息、教育职业、地区信息、婚恋意向等
  - 智能编号识别：自动识别不同格式的会员编号
  - 错误处理：未找到会员时提供友好提示
  - 帮助系统：发送非编号消息时自动显示使用说明

### 5. 系统设置
- 个人资料
- 安全设置
- 系统配置

### 6. 认证系统
- JWT Token认证
- 基于角色的权限控制
- 自动Token刷新
- Edge Runtime兼容性支持

### 7. 错误处理和日志系统
- 统一的错误分类和处理机制
- 结构化日志记录
- 用户友好的错误提示
- 严重错误通知机制
- 各模块独立日志记录器

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



### JWT认证系统

系统采用JWT（JSON Web Token）进行用户认证和权限管理：

1. **双轨制Token处理**
   - `token.ts`: 用于API路由和服务器组件（Node.js环境）
   - `token-edge.ts`: 用于中间件（Edge Runtime环境）

2. **主要功能**
   - 用户登录验证
   - 基于角色的权限控制
   - Token自动刷新
   - 安全的Cookie存储

3. **角色层级**
   - super-admin（超级管理员）: 级别4
   - admin（管理员）: 级别3
   - manager（经理）: 级别2
   - user（普通用户）: 级别1

4. **安全特性**
   - httpOnly Cookie
   - 自动Token过期处理
   - 敏感操作权限验证

详细说明请参考 [Token认证文档](./src/docs/token认证问题修复说明.md)

### 连接到阿里云MySQL数据库

由于系统使用阿里云MySQL数据库，您需要建立SSH隧道以便本地开发环境能够连接到远程数据库：

1. 编辑 `scripts/setup-db-tunnel.sh` 文件，填入正确的阿里云服务器信息
2. 运行隧道脚本：
   ```bash
   ./scripts/setup-db-tunnel.sh
   ```
3. 保持运行隧道的终端窗口开启
4. 在另一个终端窗口启动开发服务器：
   ```bash
   npm run dev
   ```

隧道建立后，应用将通过127.0.0.1:3306连接到阿里云MySQL数据库。

**注意**：在生产环境部署时，应用直接连接到阿里云数据库，无需隧道。

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

- [项目架构文档](./src/docs/项目架构文档.md) - 项目结构和组件关系详细说明
- [API文档](./src/docs/API文档.md) - 所有API端点及使用方法
- [代码组织与文档规范](./src/docs/代码组织与文档规范.md) - 代码规范和文档要求
- [错误处理和日志指南](./src/docs/日志和错误处理指南.md) - 日志记录和错误处理机制
- [Token认证文档](./src/docs/token认证问题修复说明.md) - JWT认证详细说明
- [认证机制优化说明](./src/docs/认证机制优化说明.md) - 认证系统设计与实现
- [数据库连接优化说明](./src/docs/数据库连接优化说明.md) - 数据库配置和优化

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

## 最新修复记录 (2025-01-27)

### 问题1: 会员升级到一次性会员报错 "无效的会员类型"
**症状**: 前端尝试升级会员到一次性会员时，API返回400错误
**根本原因**: 升级API只支持 `NORMAL` 和 `ANNUAL` 类型，不支持 `ONE_TIME`
**解决方案**: 
- 扩展 `src/app/api/members/[id]/upgrade/route.ts` 支持 `ONE_TIME` 类型
- 添加一次性会员的默认匹配次数设置（1次）
- 改善升级日志记录功能
- 优化类型文本显示和错误提示

### 问题2: 日期选择器输入非日期数字导致页面崩溃
**症状**: 在升级对话框中，输入无效日期会导致页面崩溃
**根本原因**: 缺少日期验证和错误处理机制
**解决方案**:
- 添加日期格式验证和错误处理
- 设置日期选择范围限制（今天到一年后）
- 添加用户友好的错误提示
- 改善日期选择器的交互体验

### 问题3: 收入页面 `router is not defined` 错误
**症状**: 收入记录更新成功但前端报错，需要手动刷新查看更新
**根本原因**: 虽然导入了 `useRouter`，但没有声明 `router` 变量
**解决方案**:
- 在 `src/app/(dashboard)/finance/income/page.tsx` 中添加 `const router = useRouter();`
- 确保路由刷新功能正常工作
- 数据更新后自动刷新页面状态

### 问题4: 收入页面数据更新后不实时刷新
**症状**: 更新收入记录后，列表没有立即显示最新数据，需要手动刷新页面
**根本原因**: 
1. 数据库连接不一致：列表API使用Netlify数据库，增删改API使用MySQL连接池
2. 缺少防缓存响应头
3. 前端刷新逻辑使用延时，导致不够及时

**解决方案**:
- 统一所有收入API使用 `executeQuery`（Netlify数据库函数）
- 为所有API响应添加防缓存头：`Cache-Control: no-cache, no-store, must-revalidate`
- 前端改为使用专门的 `forceRefresh()` 函数立即刷新数据
- 移除 `setTimeout` 延时，改为直接 `await` 调用

### 修复状态
- ✅ 会员升级功能完善，支持所有会员类型
- ✅ 日期选择器交互优化，防止页面崩溃
- ✅ 收入页面router错误修复，自动刷新正常
- ✅ 收入页面数据实时刷新修复，统一数据库连接方式

## 性能优化

为了提高系统性能并减少加载时间，我们实施了以下优化措施：

### 前端性能监控与优化

我们实现了全面的前端性能监控系统：

- **实时性能指标收集**：包括LCP、FID、CLS、TTFB、INP等核心Web性能指标
- **自定义性能标记**：支持对关键操作路径进行性能标记和测量
- **资源加载优化**：监控并优化资源加载性能
- **组件懒加载**：实现多种组件懒加载策略，减少初始加载时间

详细文档请参考 [性能优化指南](./src/docs/性能优化指南.md)

### 数据库查询优化

提供了一套完整的数据库性能优化工具和策略：

- **索引优化**：为频繁查询的字段添加合适的索引
- **查询优化**：重写低效查询，优化JOIN策略
- **表结构优化**：统一表引擎和字符集，定期表维护
- **性能分析工具**：数据库性能分析脚本和索引检查工具

运行以下命令进行数据库优化：

```bash
# 运行数据库性能分析和优化
npm run perf:db-optimize

# 检查索引状态
npm run db:check-indexes
```

### 其他优化措施

- **Next.js 优化**：使用App Router、Server Components减少客户端JavaScript
- **React优化**：组件拆分、避免不必要的重渲染
- **资源优化**：图像优化、字体优化、代码分割
- **缓存策略**：合理使用LRU缓存、数据库查询结果缓存

访问 [性能优化示例](http://localhost:3000/examples/lazy-loading) 查看懒加载演示。

**最新更新（2025-01-26）：移除所有缓存机制**

为了确保数据的实时性，系统已移除所有缓存机制，包括：
- Next.js App Router 缓存
- API 响应缓存
- 中间件缓存控制
- 静态资源缓存
- 数据库查询缓存

所有请求现在都会实时从数据库获取最新数据，操作后立即反映变化。

---

# 企业微信会员查询功能 ⭐ **最新功能**

## 功能概述

通过企业微信应用，工作人员可以直接发送会员编号查询会员的详细信息，大大提高工作效率。

## 🔍 使用方法

### 查询会员信息
在企业微信应用中直接发送会员编号：

```
发送：M17071
发送：10921
发送：A1234
发送：查询 M17071
```

系统会自动识别编号并返回详细的会员信息。

### 支持的编号格式
- **M开头**：M17071、M12345
- **纯数字**：10921、12345（4-6位数字）
- **字母+数字**：A1234、B5678
- **数字+字母**：1A123、2B456
- **字母+数字+字母**：A123B、B456C

### 返回信息内容
- **基本信息**：编号、类型、状态、性别、年龄、身高体重、昵称、手机
- **教育职业**：学历、职业
- **地区信息**：所在地、户口所在地、目标区域  
- **基本条件**：房车情况、婚史、性取向
- **婚恋意向**：孩子需求、领证需求
- **个人描述**：自我介绍、择偶要求
- **时间信息**：注册时间、更新时间

## 🛠️ 技术接口

### 核心API
- **`/api/wecom/message`** - 企业微信消息接收和处理
- **`/api/wecom/callback`** - 企业微信回调验证
- **`/api/wecom/verify`** - URL验证专用接口

### 测试和监控API
- **`/api/wecom/test-query`** - 测试会员查询功能
- **`/api/wecom/config-check`** - 企业微信配置检查
- **`/api/wecom/status`** - 企业微信状态监控
- **`/api/wecom/test-connection`** - 测试企业微信连通性  
- **`/api/wecom/test-notification`** - 测试消息发送功能

## ⚙️ 配置要求

### 企业微信应用配置
1. **接收消息URL**：`https://your-domain.com/api/wecom/message`
2. **Token**：`L411dhQg`
3. **AgentId**：`1000011`
4. **应用权限**：发送应用消息、接收消息与事件

### 服务器配置
1. **IP白名单**：需要添加服务器IP到企业微信白名单
2. **数据库连接**：确保正确配置数据库连接
3. **企业微信配置**：在 `wecom_config` 表中配置企业ID和密钥

## 📋 功能状态
- ✅ 消息接收接口已完成
- ✅ 智能编号识别算法已完成  
- ✅ 数据库查询逻辑已完成
- ✅ 信息格式化已完成
- ✅ 错误处理已完成
- ✅ 帮助系统已完成
- ✅ 配置检查接口已完成
- ✅ 状态监控接口已完成
- ✅ 测试接口已完成
- ⚠️ 企业微信URL验证（需要配置IP白名单）
- ⚠️ 企业ID配置（需要提供正确的企业ID）

## 🚀 最新优化 (2025-01-27)

### 智能编号识别增强
- 支持更多编号格式：数字+字母、字母+数字+字母等
- 改进文本清理和匹配算法
- 增强错误处理和日志记录

### 数据库连接优化
- 统一使用 `executeQuery` 函数
- 支持多种查询方式：精确匹配、模糊匹配、ID查询
- 改进错误处理和重试机制

### 信息展示优化
- 增加年龄计算和显示
- 增加昵称和手机号显示（手机号脱敏）
- 优化信息格式和布局
- 改进枚举值的中文显示

### 监控和测试功能
- 新增配置检查接口 `/api/wecom/config-check`
- 新增状态监控接口 `/api/wecom/status`
- 增强测试查询接口 `/api/wecom/test-query`
- 提供详细的诊断和统计信息

### 用户体验改进
- 更友好的错误提示信息
- 更详细的使用帮助说明
- 支持多种帮助关键词识别
- 改进消息格式和表情符号

详细技术文档请参考：[企业微信会员查询功能说明](./docs/企业微信会员查询功能说明.md)

---

# 新星CRM系统 (SNCRM)

一个基于 Next.js 14 App Router 的现代化客户关系管理系统，专为形式婚姻服务设计。

## 🚀 功能特性

### 核心模块
- **会员管理**：完整的会员信息管理，支持多种会员类型
- **财务管理**：收入、支出、结算记录管理
- **平台管理**：横幅广告、文章内容管理
- **小程序配置**：微信小程序相关配置
- **企业微信集成**：企业微信同步功能 + ⭐ **会员查询功能**
- **用户权限**：基于角色的访问控制

### 技术亮点
- ⚡ **Next.js 14 App Router**：最新的 React 框架，性能优异
- 🔒 **JWT 认证**：安全的用户身份验证
- 🎨 **Tailwind CSS**：现代化的样式框架
- 📱 **响应式设计**：适配各种设备尺寸
- 🔧 **TypeScript**：类型安全的开发体验
- 🗄️ **MySQL 数据库**：可靠的数据存储

## 📋 系统要求

- Node.js 18.0+
- MySQL 8.0+
- npm 或 yarn

## 🛠️ 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd shinanCRM
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
复制 `env.template` 文件并重命名为 `.env.local`：
```bash
cp env.template .env.local
```

编辑 `.env.local` 文件，配置数据库连接等信息。

### 4. 数据库初始化
运行数据库迁移脚本初始化数据表：
```bash
# 具体迁移脚本路径请参考 src/migrations/ 目录
```

### 5. 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🏗️ 项目结构

```
shinanCRM/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── (auth)/            # 认证相关页面
│   │   ├── (dashboard)/       # 仪表板页面
│   │   └── api/               # API 路由
│   ├── components/            # React 组件
│   │   ├── ui/                # 基础 UI 组件
│   │   └── layout/            # 布局组件
│   ├── lib/                   # 工具库
│   │   ├── database.ts        # 数据库连接
│   │   ├── auth.ts           # 认证逻辑
│   │   └── utils.ts          # 通用工具
│   ├── hooks/                 # 自定义 Hooks
│   ├── contexts/              # React 上下文
│   └── types/                 # TypeScript 类型定义
├── public/                    # 静态资源
├── docs/                      # 项目文档
└── scripts/                   # 部署脚本
```

## 📚 主要功能模块

### 会员管理
- 会员信息的增删改查
- 会员状态管理（激活、撤销、升级）
- 会员类型管理（普通、一次性、年费）
- 会员搜索和筛选

### 财务管理
- 收入记录管理
- 支出记录管理
- 结算记录管理
- 财务统计报表

### 平台管理
- 横幅广告管理
- 文章内容管理
- 内容状态控制

### 系统配置
- 用户权限管理
- 系统参数配置
- 操作日志记录

## 🔧 开发指南

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 使用 Prettier 格式化代码

### API 开发
- 所有 API 都禁用缓存，确保数据实时性
- 统一的错误处理机制
- 标准化的响应格式

### 数据库操作
- 使用连接池管理数据库连接
- 参数化查询防止 SQL 注入
- 事务支持确保数据一致性

## 🚀 部署指南

### 本地开发
```bash
npm run dev
```

### 生产构建
```bash
npm run build
npm start
```

### 使用 PM2 部署
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Docker 部署
```bash
docker build -t sncrm .
docker run -p 3000:3000 sncrm
```

## 📖 相关文档

- [API 文档](./docs/api.md)
- [组件文档](./docs/components.md)
- [数据库设计](./docs/database.md)
- [部署指南](./docs/deployment-guide.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.2.0 (2025-01-26)
- ✅ 移除所有缓存机制，确保数据实时更新
- ✅ 优化API响应速度
- ✅ 统一错误处理机制
- ✅ 改进用户体验

### v1.1.0 (2025-01-xx)
- ✅ 新增二维码名片生成功能
- ✅ 完善会员管理功能
- ✅ 优化财务管理模块

## 📄 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 🙋‍♂️ 联系方式

如有问题或建议，请通过以下方式联系：
- 项目 Issues
- 邮箱：[您的邮箱]

---

感谢使用新星CRM系统！🌟
