/**
 * 生成 RSS、站点地图，并同步首页里给「禁用 JavaScript」访客准备的链接列表。
 *
 *   node build.mjs
 *
 * 之所以能直接读 assets/site.js 和 assets/posts-data.js，
 * 是因为它们只往 window 上挂数据。这里用一个最小的假 window 把它们跑一遍，
 * 就不需要额外维护一份数据副本。
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = path.join(ROOT, "assets", "posts-data.js");
const SITE_FILE = path.join(ROOT, "assets", "site.js");
const INDEX_FILE = path.join(ROOT, "index.html");

const BEGIN_MARK = "<!-- BEGIN:POST_LINKS -->";
const END_MARK = "<!-- END:POST_LINKS -->";

/** 在一个只有数据的沙箱里执行配置文件，取回 window 上的数据。 */
async function readConfig() {
  const sandbox = {
    console,
    document: {
      readyState: "loading",
      addEventListener() {},
      querySelector() {
        return null;
      },
      body: { getAttribute: () => null },
    },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(await fs.readFile(SITE_FILE, "utf8"), sandbox, { filename: "assets/site.js" });
  vm.runInContext(await fs.readFile(DATA_FILE, "utf8"), sandbox, { filename: "assets/posts-data.js" });

  const site = sandbox.SITE || {};
  const posts = Array.isArray(sandbox.POSTS) ? sandbox.POSTS : [];
  return { site, posts };
}

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[ch]);
}

function toAbsolute(base, relative) {
  return base.replace(/\/+$/, "") + "/" + String(relative).replace(/^\/+/, "");
}

function rfc822(dateString) {
  const date = new Date(`${dateString}T09:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function buildFeed(site, posts) {
  const updated = posts.length ? rfc822(posts[0].date) : new Date().toUTCString();
  const items = posts
    .map((post) => {
      const link = toAbsolute(site.url || "", post.file);
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${rfc822(post.date)}</pubDate>`,
        `      <description>${escapeXml(post.summary || "")}</description>`,
        ...(post.tags || []).map((tag) => `      <category>${escapeXml(tag)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title || "博客")}</title>
    <link>${escapeXml(site.url || "")}</link>
    <description>${escapeXml(site.description || "")}</description>
    <language>zh-CN</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <atom:link href="${escapeXml(toAbsolute(site.url || "", "feed.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function buildSitemap(site, posts) {
  const entries = [
    { loc: toAbsolute(site.url || "", "index.html"), lastmod: posts[0]?.date },
    { loc: toAbsolute(site.url || "", "about.html"), lastmod: posts[0]?.date },
    ...posts.map((post) => ({ loc: toAbsolute(site.url || "", post.file), lastmod: post.date })),
  ];

  const urls = entries
    .map((entry) =>
      [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        ...(entry.lastmod ? [`    <lastmod>${entry.lastmod}</lastmod>`] : []),
        "  </url>",
      ].join("\n")
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** 同步 index.html 里 <noscript> 中的兜底链接。 */
async function syncNoscript(posts) {
  const html = await fs.readFile(INDEX_FILE, "utf8");
  const begin = html.indexOf(BEGIN_MARK);
  const end = html.indexOf(END_MARK);

  if (begin === -1 || end === -1 || end < begin) {
    console.warn("  ! index.html 里没有找到 POST_LINKS 标记，跳过兜底列表同步");
    return false;
  }

  const links = posts
    .map(
      (post) => `                <li class="post-card">
                  <h3 class="post-card__title"><a href="${escapeXml(post.file)}">${escapeXml(post.title)}</a></h3>
                </li>`
    )
    .join("\n");

  const next =
    html.slice(0, begin + BEGIN_MARK.length) + "\n" + links + "\n                " + html.slice(end);

  await fs.writeFile(INDEX_FILE, next, "utf8");
  return true;
}

async function main() {
  const { site, posts } = await readConfig();
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  if (!posts.length) {
    console.warn("  ! assets/posts-data.js 里还没有任何文章");
  }

  await fs.writeFile(path.join(ROOT, "feed.xml"), buildFeed(site, posts), "utf8");
  await fs.writeFile(path.join(ROOT, "sitemap.xml"), buildSitemap(site, posts), "utf8");
  const synced = await syncNoscript(posts);

  console.log(`  已生成 feed.xml（${posts.length} 篇）`);
  console.log("  已生成 sitemap.xml");
  if (synced) console.log("  已同步 index.html 的无 JS 兜底列表");

  if (!site.url || /example\.com/.test(site.url)) {
    console.log("\n  提示：assets/site.js 里的 url 还是占位域名，部署前记得改成真实网址。");
  }
}

main().catch((error) => {
  console.error("构建失败：", error);
  process.exitCode = 1;
});
