# 个人博客

一个零依赖的纯静态博客：没有框架、没有打包器、没有数据库，`npm install` 都不用跑。
双击 `index.html` 就能看效果，也可以起本地服务器预览，部署时把整个目录传上去即可。

## 快速开始

```bash
npm start                                  # 本地预览：http://127.0.0.1:4321
npm run new -- "文章标题" my-post-slug      # 新建一篇文章
npm run build                              # 生成 RSS、站点地图、无 JS 兜底列表
```

用 Node 18 或更高版本即可，不需要安装任何依赖。

## 目录结构

```
.
├── index.html            首页：自我介绍 + 文章列表（搜索 / 标签筛选）
├── about.html            关于页
├── 404.html              未找到页面
├── feed.xml              RSS（由 build.mjs 生成）
├── sitemap.xml           站点地图（由 build.mjs 生成）
├── posts/                每篇文章一个 HTML 文件
├── assets/
│   ├── style.css         全部样式，浅色 / 深色两套配色变量
│   ├── site.js           页头页脚、主题切换、搜索筛选、目录、代码复制
│   └── posts-data.js     文章索引：全站唯一的数据源
├── server.mjs            零依赖本地服务器
├── build.mjs             生成 RSS / 站点地图 / 兜底列表
└── new-post.mjs          新建文章的命令行工具
```

## 日常写作流程

1. `npm run new -- "标题" slug` 生成新文章；
2. 打开 `posts/<slug>.html`，在 `<article class="prose">` 里写正文；
3. 编辑 `assets/posts-data.js` 里那一条的 `tags` 和 `summary`；
4. 需要的话再跑一次 `npm run build`（第 1 步已经跑过一次）。

正文里可用的排版元素，直接参考 `posts/build-a-static-blog.html` 或新建出来的模板文件：
标题、列表、引用、表格、代码块、图片，以及 `.note` 提示框。

## 定制

- **站名 / 作者 / 简介 / 社交链接**：改 `assets/site.js` 顶部的 `SITE` 对象，页头和页脚会自动更新。
- **头像**：首页的圆形头像目前是文字首字母（`assets/site.js` 里的 `initials`）。想换成图片，把 `index.html` 里的 `<div class="avatar">` 换成 `<img class="avatar" src="assets/avatar.jpg" alt="">` 即可。
- **配色**：`assets/style.css` 顶部有两组 CSS 变量，浅色在 `:root`，深色在 `:root[data-theme="dark"]`，改 `--accent` 就能换主色。
- **关于页**：直接编辑 `about.html`。
- **首页自我介绍**：编辑 `index.html` 里的 `<section class="hero">`。

## 部署

整个目录就是成品，不需要构建步骤（`build.mjs` 只是更新 RSS 和兜底列表，不影响网站运行）。

- **GitHub Pages**：推到仓库后，在 Settings → Pages 选择分支根目录。
- **Cloudflare Pages / Vercel / Netlify**：框架选 “None”，构建命令留空，输出目录填 `.`。
- **任意静态托管 / 对象存储**：直接上传整个目录。

部署前建议把 `assets/site.js` 里的 `url` 改成真实域名，否则 RSS 和站点地图里会是指向 `example.com` 的绝对地址。

## 已实现的功能

- 响应式布局，移动端和桌面端都可读
- 浅色 / 深色模式，跟随系统并记住选择
- 首页按标题、摘要、标签实时搜索，标签一键筛选
- 文章页自动生成目录、阅读时长、上一篇 / 下一篇、相关文章
- 代码块一键复制、阅读进度条
- 无 JavaScript 时的兜底链接列表（由 `npm run build` 同步）
- RSS 订阅与站点地图
- 每篇文章都有独立 URL，方便分享和收录

## 已知边界

没有评论、点赞、全文检索和后台编辑器 —— 这些都需要服务端。文章多了之后建议给 `posts-data.js`
保持严格的字段顺序，并用 `npm run build` 检查是否有遗漏的 `file` 路径。
