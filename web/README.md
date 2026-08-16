# 知乎搜索前端

这是「知乎搜索 API」项目的 React/Vite 前端,提供搜索、文章/回答阅读界面。

## 命令

```bash
npm ci          # 安装依赖
npm run dev     # 本地开发(Vite 默认端口 5173)
npm run build   # 生产构建,产物输出到 ./dist
npm run lint    # 代码检查
```

## 本地开发

先启动后端(项目根目录):

```bash
python -m uvicorn app:app --reload   # 后端监听 http://localhost:8000
```

再启动前端(本目录):

```bash
npm run dev
```

`vite.config.ts` 会把 `/api`、`/health` 代理到 `http://localhost:8000`。

## 生产部署

`npm run build` 将产物输出到 `./dist`。后端 `app.py` 会在存在 `web/dist` 时自动托管该目录并把根路径 `/` 指向前端(SPA 回退),详情见项目根目录的 Dockerfile。
