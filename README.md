# 🏫 中山中学 OA 办公系统（前端 Demo）

<div align="center">

![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat&logo=vite)
![Element Plus](https://img.shields.io/badge/Element%20Plus-2.x-409EFF?style=flat&logo=element)
![License](https://img.shields.io/badge/License-MIT-green)

**一套完整的学校OA办公系统前端演示项目，包含8大核心模块 + AI智能助手**

[在线预览](#) · [功能介绍](#功能特性) · [快速开始](#快速开始) · [账号信息](#测试账号)

</div>

---

## ✨ 项目简介

本项目是 **中山中学 OA 办公系统** 的前端 Demo 实现，基于 Vue 3 + Vite + Element Plus 构建。涵盖学校日常办公的核心业务场景，包括流程审批、通知公告、会议管理、课程管理、成绩管理等模块，并集成了 AI 智能问答助手。

适用于：
- 学校信息化建设参考
- Vue 3 + Element Plus + Pinia 学习实践
- 前端面试作品展示
- 二次开发基础模板

---

## 🎯 功能特性

### 核心模块

| 模块 | 功能描述 |
|------|----------|
| 🔐 **用户登录与权限管理** | 多角色登录（管理员/领导/行政/教师/学生），不同角色显示不同菜单和权限数据 |
| 👤 **个人信息管理** | 查看/编辑个人基本信息、修改密码 |
| 📢 **通知公告** | 发布/搜索/查看公告，按角色范围过滤（全校/年级/部门/角色），已读/未读状态 |
| 📋 **流程审批** | 待办审批 / 我的申请 / 发起申请 / 审批详情 / 流程进度追踪 / **具体审批人显示** |
| 📅 **会议管理** | 会议列表 / 会议室管理 / 新建会议 / 会议详情 |
| 📚 **课程管理** | 课表查询 / 学期CRUD（**含状态编辑**） / 课表录入发布（教务处按班级设置） |
| 📊 **成绩管理** | 成绩查询 / 录入 / 统计 / **按学科权限控制** / 按班统计均分 |
| ⚙️ **系统管理** | 系统参数编辑 / 数据字典 CRUD / 操作日志 |

### V2.0 统一状态管理重构

- 💾 **Pinia + localStorage 持久化**：所有业务数据唯一数据源 `useOaStore`，跨组件实时同步
- 🔒 **细粒度权限体系**：待办/通知/成绩均按角色+部门过滤，教师只能操作自己学科负责班级
- 📖 **帮助中心**：内置知识库，包含规章制度 + 24个FAQ
- 📢 **通知已读持久化**：红点/绿点标记，一键全部已读，点击自动标记，跨登录保持
- ✨ **丰富动效**：磨玻璃登录页、页面过渡动画、卡片悬浮、数字递增等
- 🎨 **校园风格UI**：品牌主色 `#4a6cf7`，温馨大气

### V3.0 AI 智能问答助手

- 🤖 **浮窗聊天组件**：右下角悬浮球，点击展开对话面板
- 💬 **流式 SSE 回复**：接入智谱 BigModel GLM-4-Flash，实时流式输出
- 📝 **Markdown 渲染**：回答支持标题、列表、代码块、表格等格式
- 🔍 **引用溯源**：回答引用帮助中心知识库来源
- ⚡ **快捷指令**：`/待办` `/会议` `/课表` `/请假` `/报销` `/帮助` 等
- 👁️ **角色感知**：根据当前登录角色自动注入上下文，回答个性化
- 📊 **实时数据查询**：连接 useOaStore，可查询待办审批、会议安排、成绩、课表等实时业务数据

---

## 🚀 快速开始

### 环境要求

- Node.js >= 16.x
- npm >= 7.x 或 pnpm

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/sherryPen/School-OA-system-for-demo.git
cd School-OA-system-for-demo/oa-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

启动后访问 `http://localhost:5173`

### AI 助手配置（可选）

AI 助手使用智谱 BigModel API，需要配置 API Key：

1. 在 [智谱开放平台](https://open.bigmodel.cn/) 注册并获取 API Key
2. 在项目根目录创建 `.env.local` 文件：
   ```
   VITE_ZHIPU_API_KEY=your_api_key_here
   ```
3. 开发环境通过 Vite 代理 `/api/llm` 自动转发请求，无需担心 CORS

> 未配置 API Key 时，AI 助手浮窗仍可展示，但无法发送消息。

---

## 👤 测试账号

| 角色 | 账号 | 密码 | 可见菜单示例 |
|------|------|------|-------------|
| 系统管理员 | admin | 123456 | 全部菜单 |
| 学校领导 | principal | 123456 | 首页/通知/审批/会议/课程/成绩/用户管理 |
| 教务处行政 | admin_jwc | 123456 | 首页/通知/审批/会议/课程(含录入)/成绩 |
| 教师 | teacher_liu | 123456 | 仅自己学科成绩、相关审批 |
| 学生 | student_001 | 123456 | 仅课表、已发布成绩、通知 |

---

## 📁 项目结构

```
oa-frontend/
├── src/
│   ├── assets/          # 静态资源（图片、样式）
│   │   ├── campus-bg.jpg # 登录页背景图
│   │   └── styles.css    # 全局样式+动效系统
│   ├── components/      # 公共组件
│   │   ├── AiAssistant/ # 🆕 AI智能助手浮窗组件
│   │   │   └── index.vue
│   │   └── NotificationDrawer.vue  # 右侧浮窗通知
│   ├── data/
│   │   └── knowledge-base/          # 知识库（帮助中心）
│   ├── mock/
│   │   └── data.js       # 虚拟数据（全部Mock数据）
│   ├── router/
│   │   └── index.js      # 路由配置（含权限守卫）
│   ├── services/         # 🆕 AI服务层
│   │   ├── llm.js        # LLM API调用（流式SSE + Vite代理）
│   │   └── promptBuilder.js  # System Prompt构建（知识库+上下文+快捷指令）
│   ├── store/
│   │   ├── user.js       # Pinia 用户状态
│   │   └── oa.js         # 🆕 Pinia OA业务状态（localStorage持久化）
│   ├── utils/            # 🆕 工具函数
│   │   └── markdown.js   # Markdown→HTML渲染器
│   ├── views/            # 页面组件
│   │   ├── login/        # 登录页（磨玻璃+粒子动效）
│   │   ├── layout/       # 主布局（侧边栏+顶栏+通知+AI助手）
│   │   ├── dashboard/    # 动态仪表盘（按角色，实时数据）
│   │   ├── announcement/ # 通知公告（已读/未读）
│   │   ├── workflow/     # 流程审批（进度+具体审批人+置顶排序）
│   │   ├── meeting/      # 会议管理
│   │   ├── course/       # 课程管理（学期CRUD+课表录入）
│   │   ├── grade/        # 成绩管理（学科权限+按班统计）
│   │   ├── help/         # 帮助中心
│   │   ├── user/         # 用户管理
│   │   └── system/       # 系统管理
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
├── vite.config.js         # 含 /api/llm 代理配置
└── .gitignore
```

---

## 🛠 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Vue 3](https://vuejs.org/) | ^3.4 | 前端框架（Composition API） |
| [Vite](https://vitejs.dev/) | ^5.x | 构建工具 |
| [Element Plus](https://element-plus.org/) | ^2.x | UI 组件库 |
| [Pinia](https://pinia.vuejs.org/) | ^2.x | 状态管理（user + oa 双 Store） |
| [Vue Router](https://router.vuejs.org/) | ^4.x | 路由管理 |
| [@element-plus/icons-vue](https://element-plus.org/) | latest | 图标库 |
| [智谱 BigModel](https://open.bigmodel.cn/) | GLM-4-Flash | AI 智能助手 LLM 接口 |
| [marked](https://marked.js.org/) | latest | Markdown 渲染 |

---

## 📋 版本更新日志

### V3.0 — AI 智能问答助手
- 新增浮窗聊天组件，接入智谱 GLM-4-Flash
- 流式 SSE 实时回复 + Markdown 渲染
- 快捷指令、角色感知、实时 OA 数据查询
- Vite 代理配置 `/api/llm`

### V2.0 — 统一状态管理重构
- 新增 `useOaStore`（Pinia + localStorage），所有业务数据唯一数据源
- 13 个文件重构接入 useOaStore
- 修复 27 个问题：权限过滤、数据同步、已读持久化、统计准确性等
- 审批流程显示具体审批人、审批中置顶排序
- 学期管理支持编辑名称/时间/状态
- 首页统计全部从 store 动态计算

### V1.0 — 基础版本
- 8 大核心模块：登录权限、个人信息、通知公告、流程审批、会议管理、课程管理、成绩管理、系统管理
- 多角色权限体系
- 帮助中心 + 知识库

---

## 🤝 贡献指南

欢迎 Fork 和 PR！改进方向建议：

- 🔧 补充后端 API 对接
- 🌐 移动端适配优化
- ♿ 无障碍访问增强
- 🌍 国际化 (i18n)
- 🧪 单元测试补充
- 📱 PWA 离线支持
- 🤖 接入更多 LLM 模型

### 提交 PR 流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 📄 License

[MIT](LICENSE) © Cuiyi Peng

---

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - 基于 Vue 3 的 UI 组件库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [智谱 BigModel](https://open.bigmodel.cn/) - AI 大语言模型服务

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star 支持一下！**

Made with ❤️ by [sherryPen](https://github.com/sherryPen)

</div>
