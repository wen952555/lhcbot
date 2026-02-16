# 六合大数据预测系统 V5.0

## 🚀 部署指南 (如果在线同步失败)

如果你在在线编辑器中点击 "Sync to GitHub" 失败，请下载项目 ZIP 包，解压后在本地终端执行以下命令：

### 1. 初始化 Git
```bash
git init
git branch -M main
```

### 2. 添加文件
**注意**：确保项目根目录下有 `.gitignore` 文件（已包含在代码中），否则会上传巨大的 `node_modules` 文件夹导致失败。

```bash
git add .
git commit -m "Upgrade: Algorithm V5.0 Multi-Lag Engine"
```

### 3. 推送到 GitHub
请先在 GitHub 上创建一个**空仓库**（不要勾选 Add README, .gitignore 或 License）。

```bash
# 替换下面的 URL 为你的仓库地址
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送代码
git push -u origin main
```

如果提示 `remote origin already exists`，请先执行 `git remote remove origin`，然后重试。

如果提示 `refusing to merge unrelated histories`（因为你创建仓库时生成了 README），请执行：
```bash
git push -f origin main
```
*(注意：这会覆盖远程仓库的内容)*

---

## 🛠 Cloudflare Pages 设置

1. 登录 Cloudflare Dashboard -> Pages -> Create a project -> Connect to Git.
2. 选择刚才推送的仓库。
3. **Build Settings**:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Environment Variables (环境变量)**:
   - `TG_BOT_TOKEN`: 你的 Telegram Bot Token
   - `TG_ADMIN_ID`: 管理员 TG ID
   - `TG_CHANNEL_ID`: (可选) 推送频道的 ID
   - `API_URL_NEW_MACAU`: 新澳门 API 地址
   - `API_URL_HK_JC`: 香港 API 地址
   - `API_URL_OLD_MACAU`: 老澳门 API 地址
5. **D1 Database**:
   - 在 Pages 项目设置 -> Functions -> D1 Database Bindings 中绑定你的数据库，变量名必须为 `DB`。

## 🤖 Telegram Bot 配置

部署完成后，访问 `https://你的域名.pages.dev/api/admin/set_webhook` 即可自动设置 Webhook。
