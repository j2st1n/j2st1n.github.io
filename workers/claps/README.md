# bins.blog 互动服务

这个 Cloudflare Worker 同时承担两项很轻的站点互动：

- 文章「摸鱼」计数继续使用 Workers KV。
- 页脚入口指向的全站留言簿使用 D1，所有纸条先审后发。

博客页面仍部署在 EdgeOne Pages，浏览器通过
`https://claps.bins.blog` 访问 Worker。允许的前端来源在
`src/index.ts` 的 `ALLOWED_ORIGINS` 中显式列出。

## 留言与审核规则

- 正文 1～120 字，署名最多 24 字，未署名时显示「路过的人」。
- 访客可选择是否公开；未勾选的纸条只在审核工具中可见，即使通过审核也不会进入公开列表。
- 新纸条统一保存为 `pending`，只有选择公开且状态为 `approved` 的纸条会被公开接口返回。
- 不存储原始 IP。服务端将 IP、日期和独立密钥一起摘要，只保留当天有效的
  64 位十六进制哈希，用于 10 分钟 3 条、每天 10 条的限流。
- 相同访客当天的重复正文不重复写库；蜜罐命中、超过两个链接或超长重复字符
  会返回普通的已接收响应，但不写入 D1。
- `rejected` 和 `hidden` 保留 30 天，未处理的 `pending` 保留 90 天。
  每天的计划任务最多清理 500 行，避免一次清理消耗过多免费写入。

审核页面位于 `/notes/review/`。它已设置 `noindex`，也从站点地图中排除。
审核令牌只存在页面内存中，刷新后清空。接口仍以服务端令牌校验为真实安全边界，
页面路径本身不是安全措施。审核请求使用 Worker 的 `workers.dev` 地址，避免
`claps.bins.blog` 现有 Web 防护对管理路径触发跨域挑战；公开接口继续使用自定义域名。

## D1 免费额度与本设计的用量

以下数字核对于 2026-08-30 的 Cloudflare 官方文档：

| Workers Free 项目  |        上限 |
| ------------------ | ----------: |
| D1 行读取          | 500 万行/天 |
| D1 行写入          |  10 万行/天 |
| 账户 D1 总存储     |        5 GB |
| 单个 D1 数据库     |      500 MB |
| 免费账户数据库数量 |       10 个 |

`notes` 使用 `WITHOUT ROWID` 主键表，只有 2 个业务索引。一次新留言通常写入
1 行表数据并更新 2 个索引，大约计为 3 行写入；一次审核会更新表及状态索引。
即使每天有 100 条新留言，留言写入也大约是 300 行/天，远低于 10 万行/天。

公开列表每次最多返回 20 行，审核队列最多 50 行；所有常用筛选都命中索引，
不做公开 `COUNT(*)` 和全表扫描。按每天 1000 次、每次读取 20 行估算，
约为 2 万行读取/天。实际消耗以 D1 Dashboard 的 `Metrics > Row Metrics` 为准，
因为 D1 按扫描和索引更新计量，不只按返回记录计量。

容量保护主要来自短字段、有限索引、重复拦截和 30/90 天垃圾保留策略。若未来接近
500 MB 单库限制，优先归档历史公开纸条，再考虑升级；不要等写入因达到免费上限而失败。

官方依据：

- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/reference/faq/

## 本地开发

依赖由仓库根目录管理：

```bash
corepack pnpm install
cd workers/claps
cp .dev.vars.example .dev.vars
```

把 `.dev.vars` 中两个值换成彼此独立的长随机字符串，然后初始化本地 D1：

```bash
../../node_modules/.bin/wrangler d1 migrations apply bins-notes --local
../../node_modules/.bin/wrangler dev
```

Wrangler 默认使用本地 KV 和本地 D1，不会改动线上点赞或留言数据。前端本地开发时可在
浏览器控制台临时设置 `window.__NOTES_API_URL__` 和
`window.__NOTES_ADMIN_API_URL__` 指向本地 Worker。

绑定变更后重新生成类型：

```bash
../../node_modules/.bin/wrangler types worker-configuration.d.ts \
  --include-runtime=false --env-file=.dev.vars.example
```

## 首次上线清单

下面的操作会创建或修改生产资源，执行前应确认当前 Cloudflare 账户和 Worker：

1. 创建远程数据库：`wrangler d1 create bins-notes`。
2. 将输出的 `database_id` 写入 `wrangler.jsonc` 的 `NOTES_DB` 绑定。
3. 应用远程迁移：`wrangler d1 migrations apply bins-notes --remote`。
4. 分别设置 `ADMIN_TOKEN` 和 `RATE_LIMIT_SECRET`：
   `wrangler secret put <NAME>`。
5. 运行仓库测试与构建，再执行 `wrangler deploy`。
6. 在 D1 Dashboard 核对表结构、行读写指标，并从实际 `bins.blog` 域名提交一张测试纸条。
7. 打开 `/notes/review/`，完成公开、拒绝和隐藏各一次端到端验证。

生产部署和远程迁移不属于普通本地验证，本仓库不会在测试命令中自动执行它们。
