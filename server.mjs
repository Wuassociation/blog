/**
 * 零依赖本地预览服务器。
 *
 *   node server.mjs          # 默认 http://127.0.0.1:4321
 *   PORT=8080 node server.mjs
 *
 * 它只做静态文件服务，顺便处理了几件开发时的小事：
 *   - 目录自动映射到 index.html
 *   - /about 这类不带后缀的地址会自动补 .html（方便本地模拟线上路由）
 *   - 找不到的地址返回 404.html，并带上正确的 404 状态码
 *   - 开发期禁用缓存，改完刷新就能看到效果
 */

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function isFile(target) {
  return stat(target).then((info) => info.isFile(), () => false);
}

/** 把请求路径解析成磁盘上的真实文件，全部限制在站点目录内。 */
async function resolvePath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return { status: 400, file: null };
  }

  const target = path.resolve(ROOT, "." + pathname);
  // 防目录穿越：解析后的路径必须仍在站点目录里
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return { status: 403, file: null };
  }

  let info = await stat(target).catch(() => null);

  if (info && info.isDirectory()) {
    const indexFile = path.join(target, "index.html");
    if (await isFile(indexFile)) return { status: 200, file: indexFile };
    return { status: 404, file: null };
  }

  if (info && info.isFile()) return { status: 200, file: target };

  if (!path.extname(target) && (await isFile(target + ".html"))) {
    return { status: 200, file: target + ".html" };
  }

  return { status: 404, file: null };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const startedAt = Date.now();
  const resolved = await resolvePath(req.url || "/");

  let file = resolved.file;
  let status = resolved.status;

  if (status === 404) {
    const notFound = path.join(ROOT, "404.html");
    if (await isFile(notFound)) file = notFound;
  }

  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    console.log(`${res.statusCode}  ${req.method} ${req.url}  (${ms}ms)`);
  });

  if (!file) {
    send(res, status, status === 403 ? "403 Forbidden" : "400 Bad Request");
    return;
  }

  const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";

  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(file)
    .on("error", () => send(res, 500, "500 Internal Server Error"))
    .pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  博客预览已启动：http://${HOST}:${PORT}\n  按 Ctrl+C 停止\n`);
});

process.on("SIGINT", () => {
  console.log("\n已停止本地服务器。");
  server.close(() => process.exit(0));
});
