# 升级人生

一个现代化、单人、本地优先的 LvlUpLife 开源替代品：完成现实中的事情，诚实记录，并获得看得见的 RPG 成长反馈。

## 当前功能

- 完整导入备份中的 538 项挑战，覆盖 18 个分类
- 中英文界面与挑战标题切换，同时保留英文原文用于溯源
- 等级解锁、未知成就迷雾与下一批解锁提示
- 任务搜索、分类筛选、接取与稍后收藏
- 点击任务卡进入独立详情页，查看奖励、循环周期和完成历史
- 每日、每周、每月、每年与终身成就冷却
- 完成记录可撤销，并同步返还经验、属性、冷却和行动力
- 完成任务时可上传图片或附件，私密文件保存在 Vercel Blob
- 私人冒险日志与荣誉规则
- 经验、等级、六项现实属性、连续天数与行动力
- 私人访问密钥保护，云端进度保存在 Neon PostgreSQL
- 思源黑体、站酷快乐体、中文像素街机体与系统字体切换
- 桌面端和移动端响应式界面

## 本地运行

```bash
npm install
npm run dev
```

## 数据与考古资料

- 挑战英文原始备份：`data/original-challenges.txt`
- 逐条中文翻译：`data/challenges-zh.json`
- 应用数据：`src/data/challenges.json`
- 重新生成应用数据：`npm run data:generate`
- 原站产品架构：`docs/original-architecture.md`
- 原站截图：`docs/research/screenshots/`
- 新版验收截图：`docs/research/current/`

本地开发默认使用 `data/lvluplife.sqlite`；Vercel 部署使用 Neon PostgreSQL。首次云端启动会自动迁移旧版浏览器本地存储中的 `lvluplife-save-v1` 进度。

使用 Neon 环境运行完整的 Vercel Functions：

```bash
npm run dev:cloud
```

需要配置 `DATABASE_URL`、`PERSONAL_ACCESS_KEY` 与 Vercel Blob 环境变量。

生产模式先运行 `npm run build`，再运行 `npm start`。
