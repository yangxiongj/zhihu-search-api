# 知乎搜索 API

基于 FastAPI + Pyppeteer 的知乎搜索服务，模拟浏览器行为抓取知乎搜索结果、文章正文与回答正文，并内置一个 React 前端界面。

## 功能特性

- 搜索知乎内容（问题 / 文章 / 回答）
- 抓取专栏文章完整正文
- 抓取回答完整正文
- 运行时更新知乎 Cookie（无需重启服务）
- Bearer Token 认证（可选）
- 内置前端：搜索页 + 文章/回答阅读 + 接口测试 + 设置
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

### 2. 安装依赖并启动后端

```bash
pip install -r requirements.txt
python -m uvicorn app:app --reload
```

服务运行在 http://localhost:8000。

### 3. 启动前端（可选）

```bash
cd web
npm ci
npm run dev
```

前端运行在 http://localhost:5173，已配置代理到后端。

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

## Docker 部署

```bash
docker compose up --build -d
```

- 前端与后端打包在同一个镜像，访问 `http://localhost:<映射端口>`（compose 中配置）。
- 镜像内已安装 Chromium，无需手动配置 `CHROMIUM_PATH`。
- `.env` 中的 `ZHIHU_COOKIE` 和 `API_TOKEN` 通过 `env_file` 注入。

## Render 部署

仓库内已提供 `render.yaml` 与 `build.sh`（构建阶段自动下载 Chromium）。在 Render 上新建 Web Service 并连接仓库即可，需在环境变量中添加 `ZHIHU_COOKIE`。

> 注意：`build.sh` 目前只下载 Chromium、不构建前端，因此 Render 上默认只提供 API（不含前端页面）。如需在 Render 上同时部署前端，需在构建命令中加入前端构建步骤。

## 注意事项

- 每次请求会启动一个无头浏览器，单次搜索约 9 秒，注意并发资源占用。
- 请遵守知乎使用条款，建议控制请求频率。
- Docker 中通过 `/api/cookie` 接口更新的 Cookie 仅在容器运行期间生效（不落盘）；如需持久化，请在宿主机 `.env` 中修改后重建/重启容器。
- 建议在公网部署时配置 `API_TOKEN` 以保护接口。
