# 摸鱼服务器产物部署

线上运行目录为 `/www/wwwroot/nefelibata/fish`。每次发布在同级临时目录浅克隆 GitHub `main`，构建成功后只把 `.output` 放进运行目录；PM2 切换成功即删除临时源码、`.git`、`node_modules` 和旧版本。

常驻文件只有：

```text
fish/
├── .env
├── REVISION
├── current -> releases/<commit>
├── releases/<commit>/.output/
├── ecosystem.config.cjs
└── deploy/deploy.sh
```

当前 `.output` 约 12 MB。构建期间仍需为源码和 `node_modules` 预留临时空间，结束后自动释放。

## 一次性准备

服务器需要 Git、Node.js 22 LTS、npm、PM2 和 Linux `flock`。部署与 PM2 始终使用同一个 Linux 用户，不要混用 `root` 和 `www`。

```bash
npm install --global pm2@latest
ssh-keygen -t ed25519 -C "fish-catcher-deploy"
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 GitHub 仓库 `Settings → Deploy keys`，保持只读，然后运行 `ssh -T git@github.com` 验证。

截图里的宝塔占位目录先备份，再用一次性浅克隆取得部署脚本和环境模板：

```bash
mv /www/wwwroot/nefelibata/fish /www/wwwroot/nefelibata/fish-static-backup
mkdir -p /www/wwwroot/nefelibata/fish/deploy
git clone --depth 1 --branch main --single-branch \
  git@github.com:evvolution/fish-catcher.git /tmp/moyu-bootstrap
install -m 755 /tmp/moyu-bootstrap/deploy/deploy.sh \
  /www/wwwroot/nefelibata/fish/deploy/deploy.sh
install -m 600 /tmp/moyu-bootstrap/.env.example \
  /www/wwwroot/nefelibata/fish/.env
rm -rf /tmp/moyu-bootstrap
```

编辑 `/www/wwwroot/nefelibata/fish/.env`，确认数据库连接、最终域名、`NITRO_HOST=127.0.0.1` 与 `NITRO_PORT=3000`，然后首次发布：

```bash
/www/wwwroot/nefelibata/fish/deploy/deploy.sh
pm2 startup
```

复制执行 `pm2 startup` 输出的 `sudo ...` 命令。部署脚本会执行 `pm2 save`。

## 每次发布

本地编辑完成后必须先提交并推送：

```bash
git add -A
git commit -m "描述这次修改"
git push origin main
```

服务器只运行：

```bash
/www/wwwroot/nefelibata/fish/deploy/deploy.sh
```

脚本会加部署锁、浅克隆最新 `main`、执行 `npm ci`、类型检查、Nuxt 构建与 Prisma 生产迁移，随后原子切换 `current` 链接并 reload PM2。PM2 失败会尝试恢复旧链接；成功后仅保留当前 `.output`。

静态资源变化时仍需从配置好 ossutil 的机器同步 OSS，它们不会进入 Nuxt 运行产物：

```bash
ossutil cp -r oss-upload/fish/assets/ oss://apexres/fish/assets/ --update
```

## 宝塔反向代理

`fish.nefelibata.ink` 反向代理目标设置为 `http://127.0.0.1:3000`，启用 HTTPS。不要向公网开放 3000 端口。等价配置见 `deploy/nginx-location.conf`。

```bash
pm2 status moyu
pm2 logs moyu --lines 100
curl -I http://127.0.0.1:3000
curl -I https://fish.nefelibata.ink
```
