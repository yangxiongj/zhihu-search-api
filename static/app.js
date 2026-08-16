// ===== 工具函数 =====
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]))
}
function stripHtml(html) {
  return String(html ?? "").replace(/<[^>]+>/g, "").trim()
}

// ===== API 客户端 =====
const TOKEN_KEY = "zhihu-search.token"
function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || "" } catch { return "" }
}
function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch {}
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = "Bearer " + token
  if (options.body) headers["Content-Type"] = "application/json"
  const res = await fetch("/api" + path, { ...options, headers })
  let data = {}
  try { data = await res.json() } catch {}
  if (res.status === 401) throw new Error("认证失败：访问令牌无效或未设置")
  if (!res.ok) throw new Error(data.detail || "请求失败 (" + res.status + ")")
  return data
}

const API = {
  health: () => fetch("/health").then((r) => r.json()),
  search: (q) => api("/search/" + encodeURIComponent(q)),
  article: (id) => api("/article/" + id),
  answer: (id) => api("/answer/" + id),
  getCookie: () => api("/cookie"),
  setCookie: (cookie) => api("/cookie", { method: "POST", body: JSON.stringify({ cookie }) }),
}

// ===== 路由 =====
function router() {
  const hash = location.hash || "#/"
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean)
  const route = parts[0] || ""
  const param = parts[1] || ""

  document.querySelectorAll(".nav a[data-nav]").forEach((a) => {
    const active = a.dataset.nav === route || (!route && a.dataset.nav === "search")
    a.classList.toggle("active", active)
  })

  const app = document.getElementById("app")
  if (route === "article") return renderArticle(app, param)
  if (route === "answer") return renderAnswer(app, param)
  if (route === "test") return renderTest(app)
  if (route === "settings") return renderSettings(app)
  return renderSearch(app)
}

// ===== 搜索页 =====
function renderSearch(app) {
  app.innerHTML = `
    <form class="search-form" id="search-form">
      <input type="text" id="search-input" placeholder="搜索知乎：问题、文章、话题…" autocomplete="off" />
      <button type="submit">搜索</button>
    </form>
    <div id="search-result"></div>
  `
  const form = document.getElementById("search-form")
  const input = document.getElementById("search-input")
  const result = document.getElementById("search-result")

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const q = input.value.trim()
    if (!q) return
    result.innerHTML = '<p class="muted">搜索中…</p>'
    try {
      const data = await API.search(q)
      if (!data.results || data.results.length === 0) {
        result.innerHTML = '<p class="muted">没有找到相关结果</p>'
        return
      }
      result.innerHTML = data.results.map((item) => {
        const isArticle = item.type === "article"
        const href = isArticle ? "#/article/" + item.id : "#/answer/" + item.id
        const type = isArticle ? "文章" : "回答"
        const badge = isArticle ? "badge-article" : "badge-answer"
        const author = item.author && item.author.name ? "<span>" + esc(item.author.name) + "</span>" : ""
        const vote = typeof item.voteup_count === "number" ? "<span>赞 " + item.voteup_count + "</span>" : ""
        const comment = typeof item.comment_count === "number" ? "<span>评论 " + item.comment_count + "</span>" : ""
        return `
          <a class="card result-card" href="${href}">
            <div class="result-head">
              <h3>${esc(stripHtml(item.title))}</h3>
              <span class="badge ${badge}">${type}</span>
            </div>
            ${item.excerpt ? '<p class="muted result-excerpt">' + esc(stripHtml(item.excerpt)) + "</p>" : ""}
            <div class="result-meta">${author}${vote}${comment}</div>
          </a>
        `
      }).join("")
    } catch (err) {
      result.innerHTML = '<p class="error">' + esc(err.message) + "</p>"
    }
  })
}

// ===== 文章页 =====
function renderArticle(app, id) {
  app.innerHTML = '<p class="muted">加载中…</p>'
  API.article(id)
    .then((data) => {
      app.innerHTML = `
        <a href="#/" class="back">← 返回搜索</a>
        <h1 class="detail-title">${esc(data.title)}</h1>
        ${data.author ? '<p class="muted">' + esc(data.author) + "</p>" : ""}
        ${data.url ? '<p><a href="' + esc(data.url) + '" target="_blank" rel="noreferrer">查看原文 ↗</a></p>' : ""}
        <div class="content-text">${esc(data.content_text)}</div>
      `
    })
    .catch((err) => {
      app.innerHTML = '<p class="error">' + esc(err.message) + '</p><a href="#/" class="back">← 返回搜索</a>'
    })
}

// ===== 回答页 =====
function renderAnswer(app, id) {
  app.innerHTML = '<p class="muted">加载中…</p>'
  API.answer(id)
    .then((data) => {
      let author = ""
      if (data.author && data.author.name) {
        author = data.author.name + (data.author.headline ? " · " + data.author.headline : "")
      }
      app.innerHTML = `
        <a href="#/" class="back">← 返回搜索</a>
        ${data.question_title ? '<h1 class="detail-title">' + esc(data.question_title) + "</h1>" : ""}
        ${author ? '<p class="muted">' + esc(author) + "</p>" : ""}
        ${data.url ? '<p><a href="' + esc(data.url) + '" target="_blank" rel="noreferrer">查看原文 ↗</a></p>' : ""}
        <div class="content-text">${esc(data.content_text)}</div>
      `
    })
    .catch((err) => {
      app.innerHTML = '<p class="error">' + esc(err.message) + '</p><a href="#/" class="back">← 返回搜索</a>'
    })
}

// ===== 接口测试页 =====
function testCard({ title, method, path, placeholder, required = true }) {
  return `
    <div class="card test-card">
      <div class="test-head">
        <span class="badge badge-method">${method}</span>
        <code>${path}</code>
        <span class="test-title">${title}</span>
      </div>
      <div class="test-row">
        <input type="text" placeholder="${esc(placeholder)}" data-test-input />
        <button data-test-run>发送</button>
      </div>
      <pre class="test-output" data-test-output hidden></pre>
      <p class="error" data-test-error hidden></p>
    </div>
  `
}

function renderTest(app) {
  app.innerHTML = `
    <h1 class="page-title">接口测试</h1>
    <p class="muted">手动调用每个接口并查看返回结果。</p>
    <div id="test-list"></div>
  `
  const list = document.getElementById("test-list")
  const cases = [
    { title: "健康检查", method: "GET", path: "/health", placeholder: "无需参数", required: false, run: () => API.health() },
    { title: "搜索", method: "GET", path: "/api/search/{query}", placeholder: "输入关键词，如 python", run: (v) => API.search(v) },
    { title: "文章详情", method: "GET", path: "/api/article/{id}", placeholder: "输入文章 ID", run: (v) => API.article(v) },
    { title: "回答详情", method: "GET", path: "/api/answer/{id}", placeholder: "输入回答 ID", run: (v) => API.answer(v) },
    { title: "查看 Cookie", method: "GET", path: "/api/cookie", placeholder: "无需参数", required: false, run: () => API.getCookie() },
  ]
  list.innerHTML = cases.map((c) => testCard(c)).join("")

  list.querySelectorAll(".test-card").forEach((card, i) => {
    const input = card.querySelector("[data-test-input]")
    const runBtn = card.querySelector("[data-test-run]")
    const output = card.querySelector("[data-test-output]")
    const errEl = card.querySelector("[data-test-error]")
    const c = cases[i]

    const run = async () => {
      if (c.required && !input.value.trim()) return
      runBtn.disabled = true
      output.hidden = true
      errEl.hidden = true
      try {
        const data = await c.run(input.value.trim())
        output.textContent = JSON.stringify(data, null, 2)
        output.hidden = false
      } catch (err) {
        errEl.textContent = err.message
        errEl.hidden = false
      } finally {
        runBtn.disabled = false
      }
    }
    runBtn.addEventListener("click", run)
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") run() })
  })
}

// ===== 设置页 =====
function renderSettings(app) {
  app.innerHTML = `
    <h1 class="page-title">设置</h1>
    <p class="muted">管理访问令牌与知乎 Cookie。</p>

    <div class="card settings-section">
      <h2>访问令牌</h2>
      <p class="muted">在服务器 .env 中设置 API_TOKEN 后，在此输入相同令牌。未配置则无需认证。</p>
      <div class="test-row">
        <input type="password" id="token-input" placeholder="输入访问令牌" autocomplete="off" />
        <button id="token-save">保存</button>
        <button id="token-verify" class="ghost">验证</button>
      </div>
      <p id="token-msg" class="muted" style="margin:8px 0 0"></p>
    </div>

    <div class="card settings-section">
      <h2>知乎 Cookie</h2>
      <p class="muted" id="cookie-status">加载中…</p>
      <textarea id="cookie-input" rows="6" placeholder="粘贴完整的知乎 Cookie 字符串…"></textarea>
      <button id="cookie-save">保存并更新</button>
      <p id="cookie-msg"></p>
    </div>
  `

  // 令牌
  const tokenInput = document.getElementById("token-input")
  tokenInput.value = getToken()
  document.getElementById("token-save").addEventListener("click", () => {
    setToken(tokenInput.value.trim())
    const msg = document.getElementById("token-msg")
    msg.textContent = tokenInput.value.trim() ? "令牌已保存到本地" : "已清除令牌"
    msg.className = "muted"
  })
  document.getElementById("token-verify").addEventListener("click", async () => {
    const btn = document.getElementById("token-verify")
    const msg = document.getElementById("token-msg")
    btn.disabled = true
    try {
      await API.getCookie()
      msg.textContent = "令牌有效"
      msg.className = "success"
    } catch (err) {
      msg.textContent = "令牌无效或未匹配"
      msg.className = "error"
    } finally {
      btn.disabled = false
    }
  })

  // Cookie
  const cookieStatus = document.getElementById("cookie-status")
  API.getCookie()
    .then((c) => { cookieStatus.textContent = c.set ? "已配置（" + (c.preview || "") + "）" : "未配置" })
    .catch(() => { cookieStatus.textContent = "未配置" })

  document.getElementById("cookie-save").addEventListener("click", async () => {
    const input = document.getElementById("cookie-input")
    const msg = document.getElementById("cookie-msg")
    const btn = document.getElementById("cookie-save")
    if (!input.value.trim()) { msg.textContent = "请输入 cookie"; msg.className = "error"; return }
    btn.disabled = true
    try {
      const r = await API.setCookie(input.value.trim())
      input.value = ""
      cookieStatus.textContent = "已配置（" + (r.preview || "") + "）"
      msg.textContent = "cookie 已更新，立即生效并已写入 .env"
      msg.className = "success"
    } catch (err) {
      msg.textContent = err.message
      msg.className = "error"
    } finally {
      btn.disabled = false
    }
  })
}

// ===== 启动 =====
window.addEventListener("hashchange", router)
router()
