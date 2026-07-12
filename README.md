# 升级人生（LvlUpLife Reborn）

一个现代化、中文优先、单人使用的 [LvlUpLife](https://web.archive.org/web/20170604105300/http://lvluplife.com/) 开源替代品。

把现实生活中的行动变成 RPG 任务：接取一件真正想做的事，完成后留下文字、照片或附件，并获得经验、属性成长、等级解锁与连续记录。

> 当前状态：单人可用版，持续开发中。生产环境采用 Vercel + Neon PostgreSQL + Vercel Blob；本地开发采用 SQLite。

[在线使用](https://lvluplife.vercel.app/) · [原站架构考古](docs/original-architecture.md) · [验收截图](docs/research/current/README.md)

![升级人生首页](docs/research/current/home.png)

## 为什么重做 LvlUpLife

原版 LvlUpLife 最有价值的地方不是积分本身，而是给真实行动提供即时、可见的成就反馈：

1. 发现或接取一项现实任务。
2. 真正完成它，并遵守荣誉规则。
3. 写下过程，也可以上传图片或附件。
4. 获得经验和六项现实属性成长。
5. 升级并逐步发现更难、更稀有的成就。

本项目保留这一核心循环，并针对个人长期使用重新设计界面、中文内容、数据存储和隐私模型。目前不包含社区、好友、公共排行榜或多人账号系统。

## 已实现功能

### 挑战与任务

- 完整导入公开备份中的 538 项挑战，覆盖 18 个分类。
- 中文逐条翻译，并保留英文原文用于切换与溯源。
- 等级解锁、未知成就迷雾、下一批解锁等级和隐藏数量。
- 任务搜索、完整分类筛选、接取、退回、收藏和详情页。
- 可逆的“封印任务”：不想再看到的任务会退出推荐、列表、进行中和收藏，并可在封印库恢复。
- 真实浏览器路由，支持地址栏、后退、前进、直接打开和刷新任务详情。

### 成长机制

- 经验、等级进度条和升级反馈。
- 力量、文化、环境、魅力、才能、智慧六项现实属性。
- 每日、每周、每月、每年、终身一次五种重复周期与冷却。
- 行动力上限、每小时恢复和近期完成消耗。
- 连续完成天数、完成总数和最近战绩。
- 每个属性、等级经验和行动力规则均可在界面中查看说明。

### 完成记录

- 完成任务时记录最多 280 字的现实细节。
- 最多上传 3 个附件，单个文件不超过 10 MB。
- 支持 JPEG、PNG、WebP、GIF、PDF、Office、文本、Markdown 和 ZIP。
- 图片附件直接显示为大图预览，原文件可下载。
- 完成记录进入私人冒险日志和任务历史。
- 支持撤销完成记录，并同步回退经验、属性、冷却、等级和行动力。
- 撤销包含附件的记录时，会同时删除对应的私密 Blob 文件。

### 个性化与隐私

- 简体中文 / English 界面切换。
- 思源黑体、站酷快乐体、中文像素街机体和系统字体。
- 桌面端、平板和移动端响应式界面。
- 单人访问密钥保护所有云端 API。
- Neon 保存进度和设置，Vercel Blob 私密存储附件。
- 封印、收藏、接取、完成记录和偏好设置均跨设备同步。

## 游戏规则

### 荣誉规则

应用不会替你判断现实中的行为是否真正发生。只有实际完成任务后，才应领取经验与属性奖励。

### 等级经验

- 等级 1 升到等级 2 需要 500 经验。
- 此后每一级所需经验增加 180。
- 升级会揭示更多挑战；等级不足的任务不会泄露名称和奖励。

### 重复周期

| 周期 | 再次获得奖励的等待时间 |
| --- | --- |
| 每日 | 1 天 |
| 每周 | 7 天 |
| 每月 | 30 天 |
| 每年 | 365 天 |
| 终身一次 | 只能获得一次奖励 |

### 六项属性

| 代码 | 属性 | 代表内容 |
| --- | --- | --- |
| STR | 力量 | 健康、体能、运动与身体行动 |
| CUL | 文化 | 艺术、历史、传统与开阔眼界 |
| ENV | 环境 | 家庭、户外、城市与周围世界 |
| CHA | 魅力 | 社交、表达、沟通与人际关系 |
| TAL | 才能 | 技能、创造力、专业能力与手作 |
| INT | 智慧 | 学习、思考、研究与解决问题 |

## 页面与路由

| 地址 | 页面 |
| --- | --- |
| `/` | 营地首页、今日委托、等级与角色属性 |
| `/quests` | 任务公会、搜索、分类、迷雾与封印库 |
| `/quests/:id` | 任务详情、循环规则、操作与完成历史 |
| `/my-quests` | 已接取任务和收藏任务 |
| `/chronicle` | 私人冒险日志与撤销完成记录 |
| `/settings` | 语言、字体与数据存储状态 |

## 技术架构

```mermaid
flowchart LR
    UI[React + Vite 前端]
    API[Vercel Functions]
    DB[(Neon PostgreSQL)]
    Blob[(Private Vercel Blob)]
    Local[Node 本地服务]
    SQLite[(SQLite)]

    UI -->|生产环境| API
    API --> DB
    API --> Blob
    UI -->|本地开发| Local
    Local --> SQLite
```

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite、Lucide Icons |
| 生产 API | Vercel Functions |
| 生产数据库 | Neon PostgreSQL，单行 JSONB 私人存档 |
| 附件 | Private Vercel Blob，授权后代理读取与删除 |
| 本地服务 | Node.js HTTP Server |
| 本地数据库 | Node SQLite |
| 代码检查 | TypeScript、Oxlint、Vite production build |

主要数据流：

- `GET /api/bootstrap`：加载挑战、进度和界面设置。
- `PUT /api/save`：保存接取、收藏、封印与完成记录。
- `PUT /api/settings`：保存语言和字体。
- `POST /api/blob-upload`：授权客户端上传私密附件。
- `GET /api/attachment`：鉴权后读取附件。
- `POST /api/attachments-delete`：撤销记录时删除附件。

## 本地开发

### 环境要求

- Node.js 22 或更高版本。
- npm 10 或更高版本。

### 启动

```bash
git clone https://github.com/wind2sing/lvluplife.git
cd lvluplife
npm install
npm run dev
```

默认地址：

- 前端：<http://localhost:5173>
- SQLite API：<http://localhost:8787>
- SQLite 文件：`data/lvluplife.sqlite`

本地模式不会校验云端访问密钥，但前端仍会显示私人存档入口；输入任意非空本地密钥即可进入。

### 常用命令

```bash
npm run dev                 # Vite + SQLite 本地服务
npm run dev:cloud           # 使用 Vercel Functions 和云端环境变量
npm run build               # TypeScript + 生产构建
npm run lint                # Oxlint
npm start                   # 使用已构建的 dist 启动本地生产服务
npm run data:generate       # 重新生成应用挑战数据
npm run data:translate      # 挑战翻译辅助脚本
npm run data:migrate:neon   # 将本地 SQLite 进度迁移到 Neon
```

## 部署到 Vercel

### 1. 创建资源

1. 创建 Neon PostgreSQL 数据库。
2. 在 Vercel 创建 Private Blob Store。
3. 将 GitHub 仓库导入 Vercel。

### 2. 配置环境变量

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL 连接地址 |
| `PERSONAL_ACCESS_KEY` | 个人访问密钥，请使用足够长的随机字符串 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 读写令牌，连接 Blob Store 后通常自动注入 |
| `VERCEL_OIDC_TOKEN` | Vercel 集成在需要时自动提供 |

不要提交 `.env.local`、数据库文件或任何访问令牌；这些内容已在 `.gitignore` 中排除。

### 3. 构建与首次启动

- Build Command：`npm run build`
- Output Directory：`dist`
- Vercel Functions：`api/`
- SPA 路由重写：`vercel.json`

数据库表会在首次访问 API 时自动创建。首次云端初始化时，应用可以迁移旧浏览器中的 `lvluplife-save-v1` 本地进度。

## 项目数据与考古资料

| 路径 | 内容 |
| --- | --- |
| `data/original-challenges.txt` | 英文挑战完整备份 |
| `data/challenges-zh.json` | 逐条中文翻译 |
| `src/data/challenges.json` | 前端与 API 使用的挑战数据 |
| `docs/original-architecture.md` | 原版产品架构、解锁、冷却和信息架构考古 |
| `docs/research/screenshots/` | Wayback 原站截图 |
| `docs/research/current/` | 当前重制版验收截图 |

核心资料来源：

- [挑战列表完整备份](https://docs.google.com/document/d/1ji2-rvl26vksrx874wFnt8Ixs-zXcBKL/edit)
- [2017 年原站首页](https://web.archive.org/web/20170604105300/http://lvluplife.com/)
- [2016 年原站帮助页](https://web.archive.org/web/20160126233355/http://lvluplife.com/help)
- [Wayback 路由索引](https://web.archive.org/cdx/search/cdx?url=lvluplife.com/*)

LvlUpLife 名称、原始挑战和原站资料归各自权利人所有。本项目是非官方重制与个人学习项目。

## 下一步实现计划

路线图优先保证个人长期使用的数据可靠性，再扩展玩法。

### P0：可靠性与正式开源准备

- [ ] 增加明确的云存档状态：保存中、已同步、失败重试和最后同步时间。
- [ ] 为经验、升级、冷却、行动力、撤销、封印和路由增加自动化测试。
- [ ] 增加完整存档导出 / 导入，支持 JSON 备份与灾难恢复。
- [ ] 为存档结构增加版本号和自动迁移机制。
- [ ] 增加错误边界、API 错误提示和附件上传失败恢复。
- [ ] 选择并添加正式开源许可证；目前仓库尚未包含许可证。

### P1：核心玩法增强

- [ ] 自定义任务：标题、分类、等级、属性奖励、重复周期和备注模板。
- [ ] 编辑完成记录：修改文字、补充或移除附件，而不必先撤销任务。
- [ ] 更智能的首页推荐：结合收藏、最近分类、冷却与封印偏好。
- [ ] 每日 / 每周任务组合与完成奖励，形成更清晰的短期目标。
- [ ] 角色成就徽章与里程碑，例如首次完成、连续 7 天、六维均衡等。
- [ ] 按分类、属性和时间范围统计个人成长趋势。

### P2：使用体验

- [ ] PWA 与离线只读模式，可安装到手机桌面。
- [ ] 图片灯箱、上传前压缩、EXIF 方向修正和更好的附件管理。
- [ ] 任务列表排序：推荐、等级、奖励、周期、最近接触。
- [ ] 键盘快捷键、焦点管理、屏幕阅读器和对比度优化。
- [ ] 深色主题细化，以及更多可切换的 RPG 视觉主题。
- [ ] 更新并自动生成桌面端、移动端验收截图。

### 暂不优先

- 好友、社区动态、公开排行榜。
- 强制打卡提醒或惩罚机制。
- 多租户账号系统。

这些功能会显著扩大隐私、审核和运维范围；在单人体验和数据可靠性稳定前，不作为近期目标。

## 贡献

欢迎提交 Issue 或 Pull Request，尤其是：

- 原站玩法与页面的 Wayback 考古证据。
- 挑战翻译、分类、等级或重复周期修正。
- 移动端、可访问性和数据可靠性改进。
- 不破坏单人隐私模型的新玩法建议。

提交前请运行：

```bash
npm run build
npm run lint
```

## 许可证

项目暂未添加正式开源许可证。在许可证确定前，代码可公开查看，但不代表已授予复制、修改或再分发权限。正式发布前应优先完成许可证选择。
