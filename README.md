# 知乎搜索 API

基于 FastAPI + Pyppeteer 的知乎搜索服务，模拟浏览器行为抓取知乎搜索结果、文章正文与回答正文，内置一个原生 HTML 前端（无 Node、无构建步骤）。

## 功能特性

- 搜索知乎内容（问题 / 文章 / 回答）
- 抓取专栏文章完整正文
- 抓取回答完整正文
- 运行时更新知乎 Cookie（无需重启服务）
- Bearer Token 认证（可选）
- 内置前端：搜索页 + 文章/回答阅读 + 接口测试 + 设置（原生 HTML/CSS/JS）
- 内置 Swagger 接口文档（`/docs`）

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填入 `ZHIHU_COOKIE` 和 `CHROMIUM_PATH`：

| 变量 | 必填 | 说明 |
|------|------|------|
| `ZHIHU_COOKIE` | 是 | 知乎 Cookie（登录知乎后，从浏览器开发者工具复制） |
| `CHROMIUM_PATH` | 是 | Chrome/Chromium 可执行文件路径（Docker 部署无需配置） |
| `API_TOKEN` | 否 | 访问令牌，填写后所有 `/api/*` 接口需认证 |

### 2. 安装依赖并启动

```bash
pip install -r requirements.txt
python -m uvicorn app:app --reload
```

访问 http://localhost:8000 即可使用前端页面与 API。

## API 接口

认证：若配置了 `API_TOKEN`，所有 `/api/*` 接口需携带请求头 `Authorization: Bearer <令牌>`。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查（不鉴权） |
| GET | `/api/search/{query}` | 搜索，返回精简结果列表 |
| GET | `/api/article/{id}` | 专栏文章正文 |
| GET | `/api/answer/{id}` | 回答正文 |
| GET | `/api/cookie` | 查看 Cookie 状态（脱敏预览） |
| POST | `/api/cookie` | 更新 Cookie，body：`{"cookie": "..."}` |

示例：

```bash
curl "http://localhost:8000/api/search/python"
curl -H "Authorization: Bearer 你的令牌" "http://localhost:8000/api/cookie"
```

交互式文档：http://localhost:8000/docs（Swagger UI，可在线调试）。

## 前端

前端是 `static/` 目录下的原生 HTML/CSS/JS 单页应用（Hash 路由），无任何构建步骤，由后端直接托管：

- `static/index.html` — 页面骨架与导航
- `static/style.css` — 样式（跟随系统深浅色）
- `static/app.js` — 逻辑与 API 调用

页面包含：搜索、文章/回答阅读、接口测试、设置（令牌与 Cookie 管理）。

## Docker 部署

```bash
docker compose up --build -d
```

- 单阶段构建（无 Node），镜像内已安装 Chromium。
- 访问 `http://localhost:<映射端口>`（compose 中配置）。
- `.env` 中的 `ZHIHU_COOKIE` 和 `API_TOKEN` 通过 `env_file` 注入。

## Render 部署

仓库内已提供 `render.yaml` 与 `build.sh`（构建阶段自动下载 Chromium）。在 Render 上新建 Web Service 并连接仓库即可，需在环境变量中添加 `ZHIHU_COOKIE`。

## 注意事项

- 每次请求会启动一个无头浏览器，单次搜索约 9 秒，注意并发资源占用。
- 请遵守知乎使用条款，建议控制请求频率。
- Docker 中通过 `/api/cookie` 接口更新的 Cookie 仅在容器运行期间生效（不落盘）；如需持久化，请在宿主机 `.env` 中修改后重建/重启容器。
- 建议在公网部署时配置 `API_TOKEN` 以保护接口。
