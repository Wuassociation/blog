/* ==========================================================================
   站点配置：改这里就能改全站的标题、作者和社交链接。
   （页头、页脚、RSS 都由这个对象生成，build.mjs 也会读取它）
   ========================================================================== */

window.SITE = {
  title: "我的博客",
  author: "你的名字",
  initials: "我",
  description: "记录技术、阅读和一些还没想清楚的想法。",
  bio: "你好，我是这个博客的作者。我在这里写点技术笔记、读书摘录，以及那些如果不写下来就会忘掉的念头。更新频率随缘，但每篇都会认真写。",
  // 部署地址：RSS 与站点地图里的绝对链接据此生成
  url: "https://wuassociation.github.io/blog",
  email: "you@example.com",
  socials: [
    { label: "GitHub", url: "https://github.com/" },
    { label: "邮箱", url: "mailto:you@example.com" },
    { label: "RSS", url: "feed.xml" },
  ],
};

/* ==========================================================================
   站点脚本：所有页面共用。
   页面通过 <body data-page="home|post|page|404" data-root="."> 声明自己是谁，
   因此这个文件既能配合本地服务器工作，也能在 file:// 下双击打开。
   ========================================================================== */

(function () {
  "use strict";

  var SITE = window.SITE || {};
  var POSTS = (window.POSTS || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });
  var body = document.body;
  var page = body.getAttribute("data-page") || "page";
  var root = body.getAttribute("data-root") || ".";
  var THEME_KEY = "blog-theme";

  /* ---------- 小工具 ---------- */

  function url(path) {
    return root + "/" + path;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function formatDate(iso) {
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[0] + " 年 " + Number(parts[1]) + " 月 " + Number(parts[2]) + " 日";
  }

  function readingTime(node) {
    var text = node ? node.textContent || "" : "";
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = (text.replace(/[\u4e00-\u9fa5]/g, " ").match(/[A-Za-z0-9_]+/g) || []).length;
    var minutes = Math.max(1, Math.round(cjk / 380 + words / 220));
    return minutes + " 分钟阅读";
  }

  function bySlug(slug) {
    for (var i = 0; i < POSTS.length; i++) {
      if (POSTS[i].slug === slug) return POSTS[i];
    }
    return null;
  }

  function tagList(post) {
    return post.tags || [];
  }

  function firstTag(post) {
    var tags = tagList(post);
    return tags.length ? tags[0] : "";
  }

  /* ---------- 主题 ---------- */

  function currentTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (err) {
      saved = null;
    }
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (err) {
        /* 隐私模式下忽略 */
      }
    }
    var button = document.querySelector("[data-theme-toggle]");
    if (button) {
      var next = theme === "dark" ? "切换到浅色模式" : "切换到深色模式";
      button.setAttribute("aria-label", next);
      button.setAttribute("title", next);
    }
  }

  function initTheme() {
    applyTheme(currentTheme(), false);
    var button = document.querySelector("[data-theme-toggle]");
    if (!button) return;
    button.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  /* ---------- 页头 / 页脚 ---------- */

  var NAV = [
    { key: "home", label: "首页", href: "index.html" },
    { key: "post", label: "文章", href: "index.html#latest" },
    { key: "about", label: "关于", href: "about.html" },
  ];

  function renderHeader() {
    var host = document.querySelector("[data-header]");
    if (!host) return;

    var links = NAV.map(function (item) {
      var active = item.key === page ? ' aria-current="page"' : "";
      return '<a href="' + url(item.href) + '"' + active + ">" + item.label + "</a>";
    }).join("");

    host.className = "site-header";
    host.innerHTML =
      '<div class="container container--wide site-header__inner">' +
      '<a class="brand" href="' + url("index.html") + '">' +
      '<span class="brand__mark" aria-hidden="true">' +
      escapeHtml(SITE.initials || "·") +
      "</span>" +
      '<span class="brand__name">' +
      escapeHtml(SITE.title || "博客") +
      "</span>" +
      "</a>" +
      '<nav class="site-nav" aria-label="主导航">' +
      links +
      "</nav>" +
      '<button class="icon-button" type="button" data-theme-toggle aria-label="切换配色">' +
      '<svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>' +
      '<svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>' +
      "</button>" +
      "</div>";
  }

  function renderFooter() {
    var host = document.querySelector("[data-footer]");
    if (!host) return;

    var socials = (SITE.socials || [])
      .map(function (item) {
        var href = /^(https?:|mailto:)/.test(item.url) ? item.url : url(item.url);
        return '<a href="' + href + '">' + escapeHtml(item.label) + "</a>";
      })
      .join("");

    host.className = "site-footer";
    host.innerHTML =
      '<div class="container container--wide site-footer__inner">' +
      "<span>© <span data-year></span> " +
      escapeHtml(SITE.author || "") +
      " · " +
      escapeHtml(SITE.title || "") +
      "</span>" +
      '<span class="socials" style="margin:0">' +
      socials +
      "</span>" +
      "</div>";

    var year = host.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- 首页 ---------- */

  function postCard(post) {
    var tags = tagList(post)
      .map(function (tag) {
        return '<a class="tag" href="?tag=' + encodeURIComponent(tag) + '#latest">' +
          escapeHtml(tag) +
          "</a>";
      })
      .join("");

    return (
      '<li class="post-card">' +
      '<h3 class="post-card__title"><a href="' +
      url(post.file) +
      '">' +
      escapeHtml(post.title) +
      "</a></h3>" +
      '<div class="post-card__meta"><time datetime="' +
      escapeHtml(post.date) +
      '">' +
      escapeHtml(formatDate(post.date)) +
      "</time>" +
      '<span class="dot" aria-hidden="true"></span>' +
      "<span>" +
      escapeHtml(firstTag(post)) +
      "</span></div>" +
      (post.summary ? '<p class="post-card__summary">' + escapeHtml(post.summary) + "</p>" : "") +
      (tags ? '<div class="post-card__tags">' + tags + "</div>" : "") +
      "</li>"
    );
  }

  function initHome() {
    var list = document.querySelector("[data-post-list]");
    if (!list) return;

    var searchInput = document.querySelector("[data-search]");
    var chipHost = document.querySelector("[data-tag-filter]");
    var countHost = document.querySelector("[data-count]");
    var state = { query: "", tag: "" };

    var params = new URLSearchParams(window.location.search);
    if (params.get("tag")) state.tag = params.get("tag");

    var tags = [];
    POSTS.forEach(function (post) {
      tagList(post).forEach(function (tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });
    tags.sort();

    if (chipHost) {
      var chips = ['<button class="tag-chip" type="button" data-tag="" aria-pressed="false">全部</button>'];
      tags.forEach(function (tag) {
        chips.push(
          '<button class="tag-chip" type="button" data-tag="' +
            escapeHtml(tag) +
            '" aria-pressed="false">' +
            escapeHtml(tag) +
            "</button>"
        );
      });
      chipHost.innerHTML = chips.join("");
      chipHost.addEventListener("click", function (event) {
        var button = event.target.closest("[data-tag]");
        if (!button) return;
        state.tag = button.getAttribute("data-tag");
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = searchInput.value.trim().toLowerCase();
        render();
      });
    }

    function matches(post) {
      if (state.tag && tagList(post).indexOf(state.tag) === -1) return false;
      if (!state.query) return true;
      var haystack = [post.title, post.summary || "", tagList(post).join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(state.query) !== -1;
    }

    function render() {
      var visible = POSTS.filter(matches);

      if (chipHost) {
        Array.prototype.forEach.call(chipHost.querySelectorAll("[data-tag]"), function (chip) {
          chip.setAttribute(
            "aria-pressed",
            chip.getAttribute("data-tag") === state.tag ? "true" : "false"
          );
        });
      }

      if (!visible.length) {
        list.innerHTML =
          '<li class="empty-state"><strong>没有找到匹配的文章</strong><br>换个关键词，或者点上面的「全部」看看。</li>';
      } else {
        list.innerHTML = visible.map(postCard).join("");
      }

      if (countHost) {
        countHost.textContent = "共 " + POSTS.length + " 篇，当前显示 " + visible.length + " 篇";
      }
    }

    render();
  }

  /* ---------- 文章页 ---------- */

  function slugFromPath() {
    var match = window.location.pathname.match(/([^/]+)\.html?$/i);
    if (match) return decodeURIComponent(match[1]);
    return "";
  }

  function initProgress() {
    var bar = document.querySelector("[data-progress]");
    if (!bar) return;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.width = (ratio * 100).toFixed(2) + "%";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function initCopyButtons() {
    Array.prototype.forEach.call(document.querySelectorAll(".prose pre"), function (pre) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.textContent = "复制";
      button.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = code ? code.innerText : pre.innerText;
        var done = function () {
          button.textContent = "已复制";
          window.setTimeout(function () {
            button.textContent = "复制";
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {
            button.textContent = "复制失败";
          });
        } else {
          var range = document.createRange();
          range.selectNodeContents(pre);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          button.textContent = "按 Ctrl+C";
        }
      });
      pre.appendChild(button);
    });
  }

  function initToc() {
    var host = document.querySelector("[data-toc]");
    var prose = document.querySelector(".prose");
    if (!host || !prose) return;

    var headings = prose.querySelectorAll("h2, h3");
    if (headings.length < 2) {
      host.remove();
      return;
    }

    var items = [];
    Array.prototype.forEach.call(headings, function (heading, index) {
      if (!heading.id) {
        heading.id = "section-" + (index + 1);
      }
      items.push(
        '<li><a href="#' +
          heading.id +
          '">' +
          escapeHtml(heading.textContent) +
          "</a></li>"
      );
    });

    host.innerHTML =
      '<p class="toc__title">本文目录</p><ol>' + items.join("") + "</ol>";
  }

  function initPostMeta(post) {
    if (!post) return;

    var meta = document.querySelector("[data-post-meta]");
    if (meta) {
      var prose = document.querySelector(".prose");
      meta.innerHTML =
        '<time datetime="' +
        escapeHtml(post.date) +
        '">' +
        escapeHtml(formatDate(post.date)) +
        "</time>" +
        '<span class="dot" aria-hidden="true"></span>' +
        "<span>" +
        escapeHtml(readingTime(prose)) +
        "</span>" +
        (firstTag(post)
          ? '<span class="dot" aria-hidden="true"></span><a href="' +
            url("index.html?tag=" + encodeURIComponent(firstTag(post)) + "#latest") +
            '">' +
            escapeHtml(firstTag(post)) +
            "</a>"
          : "");
    }

    var index = -1;
    for (var i = 0; i < POSTS.length; i++) {
      if (POSTS[i].slug === post.slug) index = i;
    }

    // POSTS 已按时间倒序：index-1 更新，index+1 更旧
    var newer = index > 0 ? POSTS[index - 1] : null;
    var older = index >= 0 && index < POSTS.length - 1 ? POSTS[index + 1] : null;

    var navHost = document.querySelector("[data-post-nav]");
    if (navHost) {
      navHost.innerHTML =
        (older
          ? '<a class="post-nav__item" href="' +
            url(older.file) +
            '"><span>← 上一篇</span><strong>' +
            escapeHtml(older.title) +
            "</strong></a>"
          : '<span class="post-nav__item post-nav__item--empty" aria-hidden="true"></span>') +
        (newer
          ? '<a class="post-nav__item post-nav__item--next" href="' +
            url(newer.file) +
            '"><span>下一篇 →</span><strong>' +
            escapeHtml(newer.title) +
            "</strong></a>"
          : '<span class="post-nav__item post-nav__item--empty" aria-hidden="true"></span>');
    }

    var relatedHost = document.querySelector("[data-related]");
    if (relatedHost) {
      var mine = tagList(post);
      var related = POSTS.filter(function (item) {
        if (item.slug === post.slug) return false;
        return tagList(item).some(function (tag) {
          return mine.indexOf(tag) !== -1;
        });
      }).slice(0, 3);

      if (related.length) {
        relatedHost.innerHTML =
          '<h2 class="section__title">相关文章</h2><ul class="post-list">' +
          related.map(postCard).join("") +
          "</ul>";
      } else {
        relatedHost.remove();
      }
    }
  }

  /* ---------- 启动 ---------- */

  function init() {
    renderHeader();
    renderFooter();
    initTheme();

    if (page === "home") initHome();
    if (page === "post") {
      initProgress();
      initCopyButtons();
      initToc();
      initPostMeta(bySlug(slugFromPath()));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
