# 鹅羊叠叠疯发布说明

这是一个纯静态手机网页小游戏，不需要服务器接口、数据库、账号系统或广告 SDK。

## 文件

- `index.html`
- `styles.css`
- `game.js`

## 推荐发布方式

把这三个文件上传到任意 HTTPS 静态网站托管即可分享链接，例如：

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel 静态站点
- 阿里云 OSS / 腾讯云 COS / 七牛云静态网站

## 避免风险提示的要点

- 使用 HTTPS 域名。
- 不打包成 APK，不要求安装。
- 不添加下载、跳转、诱导登录、广告 SDK、统计 SDK。
- 不混入陌生第三方脚本。
- 背景音乐由浏览器本地 Web Audio 合成，不加载外部音乐文件。

## 本地预览

```bash
python -m http.server 4173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173/
```
