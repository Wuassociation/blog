/**
 * 新建一篇文章。
 *
 *   node new-post.mjs "文章标题"
 *   node new-post.mjs "文章标题" my-post-slug
 *
 * 它会：
 *   1. 按模板生成 posts/<slug>.html
 *   2. 把元信息写进 assets/posts-data.js（首页列表、RSS 的唯一数据源）
 *   3. 顺手跑一次 build.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = path.join(ROOT, "assets", "posts-data.js");
const POSTS_DIR = path.join(ROOT, "posts");

function slugify(text, dateString) {
  const ascii = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii) return ascii.slice(0, 60);

  const now = new Date();
  const stamp =
    dateString.replace(/-/g, "") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");
  return "post-" + stamp;
}

function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const template = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>__TITLE__ · 我的博客</title>
    <meta name="description" content="__SUMMARY__" />
    <link rel="stylesheet" href="../assets/style.css" />
    <script>
      try {
        var saved = localStorage.getItem("blog-theme");
        if (saved === "dark" || saved === "light") {
          document.documentElement.setAttribute("data-theme", saved);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } catch (e) {}
    </script>
  </head>

  <body data-page="post" data-root="..">
    <a class="skip-link" href="#main">跳到正文</a>
    <div class="progress" data-progress aria-hidden="true"></div>
    <header data-header></header>

    <main id="main">
      <div class="container">
        <div class="post-header">
          <a class="back-link" href="../index.html">← 返回文章列表</a>
          <h1>__TITLE__</h1>
          <div class="post-header__meta" data-post-meta></div>
        </div>

        <nav class="toc" data-toc aria-label="目录"></nav>

        <article class="prose">
          <p>在这里写第一段。开头一两句说清楚这篇文章要解决什么问题，读者就知道要不要往下看了。</p>

          <h2>第一个小节</h2>
          <p>正文。行内代码用 <code>&lt;code&gt;</code>，代码块用 <code>&lt;pre&gt;&lt;code&gt;</code>。</p>

          <pre><code>npm start</code></pre>

          <blockquote>
            <p>引用用 &lt;blockquote&gt;。</p>
          </blockquote>

          <ul>
            <li>无序列表</li>
            <li>有序列表用 &lt;ol&gt;</li>
          </ul>

          <div class="note">
            <strong>提示框：</strong>需要强调的补充说明可以放在 <code>.note</code> 里。
          </div>
        </article>

        <nav class="post-nav" data-post-nav aria-label="文章导航"></nav>
        <section data-related></section>
      </div>
    </main>

    <footer data-footer></footer>

    <script src="../assets/posts-data.js"></script>
    <script src="../assets/site.js"></script>
  </body>
</html>
`;

async function main() {
  const args = process.argv.slice(2);
  const title = (args[0] || "").trim();
  const date = today();

  if (!title) {
    console.error('用法：npm run new -- "文章标题" [可选的-slug]');
    process.exitCode = 1;
    return;
  }

  const slug = (args[1] || slugify(title, date)).trim();
  const file = `posts/${slug}.html`;
  const target = path.join(ROOT, file);

  const data = await fs.readFile(DATA_FILE, "utf8");
  if (data.includes(`slug: "${slug}"`)) {
    console.error(`已存在 slug 为 "${slug}" 的文章，换一个 slug 或改一下标题。`);
    process.exitCode = 1;
    return;
  }

  if (await fs.stat(target).then(() => true, () => false)) {
    console.error(`文件已存在：${file}`);
    process.exitCode = 1;
    return;
  }

  const summary = "一句话摘要，会显示在首页列表和 RSS 里。";
  const html = template
    .split("__TITLE__")
    .join(title)
    .split("__SUMMARY__")
    .join(summary);

  await fs.writeFile(target, html, "utf8");

  const entry = `  {
    slug: "${slug}",
    title: "${title.replace(/"/g, '\\"')}",
    date: "${date}",
    tags: ["未分类"],
    summary: "${summary}",
    file: "${file}",
  },
`;

  const anchor = "window.POSTS = [\n";
  if (!data.includes(anchor)) {
    console.error("assets/posts-data.js 结构被改动了，没找到 window.POSTS 数组，请手动添加元信息。");
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(DATA_FILE, data.replace(anchor, anchor + entry), "utf8");

  console.log(`  已创建 ${file}`);
  console.log("  已写入 assets/posts-data.js");

  const build = spawnSync(process.execPath, [path.join(ROOT, "build.mjs")], {
    stdio: "inherit",
    cwd: ROOT,
  });

  console.log(`\n  下一步：编辑 ${file}，把 tags 和 summary 改成你需要的内容。`);
  if (build.status !== 0) process.exitCode = build.status || 1;
}

main().catch((error) => {
  console.error("创建失败：", error);
  process.exitCode = 1;
});
