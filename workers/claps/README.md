# bins-claps · 极简点赞微服务 (Cloudflare Workers + KV)

为 `bins.blog` 提供文章「盖印/点赞」计数的轻量无服务器后端。

## 部署说明 (3 步搞定)

### 1. 登录 Cloudflare
```bash
cd workers/claps
npx wrangler login
```

### 2. 创建 KV 数据库命名空间
```bash
npx wrangler kv namespace create CLAPS_KV
```
执行后终端会输出类似于：
```json
{ "binding": "CLAPS_KV", "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```
将该 `id` 替换填入 `wrangler.jsonc` 中的 `"id": "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"`。

### 3. 一键部署上线
```bash
npx wrangler deploy
```

部署完成后会生成 Worker 域名（如 `https://bins-claps.<your-name>.workers.dev`）。
你可以在 Cloudflare Dashboard 中为该 Worker 绑定自定义域名（如 `claps.bins.blog`），或者直接在前端配置该域名。
