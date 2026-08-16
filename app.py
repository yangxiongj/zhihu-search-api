import asyncio
import html
import json
import os
import re
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pyppeteer import launch
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 当前生效的知乎 Cookie（可在运行时通过 /api/cookie 更新，并持久化到 .env）
current_cookie = os.getenv('ZHIHU_COOKIE') or ""
ENV_PATH = Path(__file__).parent / ".env"

# 访问令牌（为空则关闭认证）
API_TOKEN = os.getenv('API_TOKEN') or ""

app = FastAPI()

# 存储全局的浏览器实例和事件循环
browser_instances = set()
loop = None

# 前端构建产物目录（仅当存在时才托管静态资源）
DIST_DIR = Path(__file__).parent / "web" / "dist"

# Bearer 令牌校验依赖（未配置 API_TOKEN 时放行）
_bearer = HTTPBearer(auto_error=False)

async def require_token(credentials: HTTPAuthorizationCredentials = Depends(_bearer)):
    if not API_TOKEN:
        return
    if credentials is None or credentials.credentials != API_TOKEN:
        raise HTTPException(status_code=401, detail="认证失败：无效的访问令牌")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def cleanup_browser(browser):
    """安全地清理浏览器实例"""
    if browser:
        try:
            browser_instances.discard(browser)
            if not browser.process.returncode:
                await browser.close()
        except Exception as e:
            print(f"关闭浏览器时出错: {e}")

async def cleanup_all_browsers():
    """清理所有浏览器实例"""
    tasks = [cleanup_browser(browser) for browser in browser_instances.copy()]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

@app.on_event("startup")
async def startup_event():
    """服务启动时的初始化"""
    global loop
    loop = asyncio.get_running_loop()

@app.on_event("shutdown")
async def shutdown_event():
    """服务关闭时的清理"""
    await cleanup_all_browsers()

def _resolve_chromium_path():
    """解析 Chromium 可执行文件路径"""
    chromium_path = os.getenv('CHROMIUM_PATH')
    if not chromium_path:
        raise Exception("未找到Chromium路径环境变量")

    # 优先检查项目目录中的Chrome（Linux/Render部署场景）
    project_chrome_path = os.path.join(os.getcwd(), ".local-chromium/chrome-linux/chrome")
    if os.path.exists(project_chrome_path):
        chromium_path = project_chrome_path
    elif not os.path.exists(chromium_path):
        raise Exception(f"未找到可用的Chrome可执行文件，已检查路径: {project_chrome_path}, {chromium_path}")

    # 仅在 Linux/macOS 上需要给可执行文件加执行权限
    if os.name == 'posix':
        try:
            os.chmod(chromium_path, 0o755)
        except Exception as e:
            print(f"设置执行权限失败: {e}")

    return chromium_path

async def _open_page():
    """启动无头浏览器，注入反检测并写入知乎 Cookie，返回 (browser, page)"""
    chromium_path = _resolve_chromium_path()

    browser = await launch(
        headless=True,
        executablePath=chromium_path,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--start-maximized',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--no-first-run',
            '--disable-notifications'
        ],
        ignoreHTTPSErrors=True,
        handleSIGINT=False,
        handleSIGTERM=False,
        handleSIGHUP=False,
    )
    browser_instances.add(browser)

    try:
        page = await browser.newPage()

        # 设置浏览器特征
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
        await page.setViewport({'width': 1920, 'height': 1080})

        # 注入反检测代码
        await page.evaluateOnNewDocument('''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
        ''')

        # 获取当前生效的 cookie
        cookie_str = current_cookie
        if not cookie_str:
            raise Exception("未配置知乎 cookie，请在「设置」页面填写")

        cookies = []
        for cookie_part in cookie_str.split('; '):
            try:
                name, value = cookie_part.split('=', 1)
                cookies.append({
                    'name': name,
                    'value': value,
                    'domain': '.zhihu.com',
                    'path': '/'
                })
            except ValueError:
                pass

        await page.setCookie(*cookies)
        return browser, page
    except Exception:
        await cleanup_browser(browser)
        raise

def _strip_html(content_html: str) -> str:
    """将 HTML 转为纯文本"""
    if not content_html:
        return ""
    text = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', content_html, flags=re.S)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</(p|div|li|h[1-6]|blockquote)>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def _extract_search_results(api_data):
    """从知乎搜索原始响应中提取精简结果，ID 统一转字符串（避免前端 JS 精度丢失）"""
    results = []
    for item in (api_data or {}).get('data', []):
        if item.get('type') != 'search_result':
            continue
        obj = item.get('object', {}) or {}
        if not obj.get('id'):
            continue
        author = obj.get('author') or {}
        question = obj.get('question') or {}
        entry = {
            'type': obj.get('type'),  # 'answer' 或 'article'
            'id': str(obj.get('id')),
            'title': obj.get('title'),
            'excerpt': obj.get('excerpt'),
            'url': obj.get('url'),
            'voteup_count': obj.get('voteup_count'),
            'comment_count': obj.get('comment_count'),
            'author': {
                'name': author.get('name'),
                'headline': author.get('headline'),
            },
        }
        if question.get('id'):
            entry['question_id'] = str(question.get('id'))
            entry['question_title'] = question.get('title')
        results.append(entry)
    return results

class CookieUpdate(BaseModel):
    cookie: str

def _mask_cookie(cookie: str) -> str:
    """返回 cookie 的脱敏预览（仅显示首尾若干字符）"""
    if len(cookie) <= 12:
        return cookie[:2] + "..." + cookie[-2:]
    return cookie[:6] + "..." + cookie[-6:]

def _persist_cookie(cookie: str):
    """将 cookie 持久化到 .env（尽力而为，失败不影响运行时生效）"""
    try:
        lines = ENV_PATH.read_text(encoding='utf-8').splitlines() if ENV_PATH.exists() else []
        new_lines = []
        found = False
        for line in lines:
            if line.startswith('ZHIHU_COOKIE='):
                new_lines.append(f'ZHIHU_COOKIE={cookie}')
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f'ZHIHU_COOKIE={cookie}')
        ENV_PATH.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')
    except Exception as e:
        print(f"持久化 cookie 到 .env 失败: {e}")

async def search_zhihu(query: str):
    browser = None
    try:
        browser, page = await _open_page()

        # 存储API响应数据
        api_data = None
        done = asyncio.Event()

        # 监听网络请求
        async def intercept_response(response):
            nonlocal api_data
            if 'api/v4/search_v3?' in response.url:
                try:
                    data = await response.json()
                    if 'error' not in data:
                        api_data = data
                        done.set()
                except Exception as e:
                    print(f"解析API响应时出错: {e}")

        page.on('response', lambda res: asyncio.ensure_future(intercept_response(res)))

        # 访问搜索页面
        search_url = f'https://www.zhihu.com/search?type=content&q={query}'
        await page.goto(search_url, {
            'waitUntil': 'networkidle0',
            'timeout': 30000
        })

        # 等待API数据
        try:
            await asyncio.wait_for(done.wait(), timeout=10)
        except asyncio.TimeoutError:
            raise Exception("获取API数据超时")

        return api_data

    finally:
        if browser:
            await cleanup_browser(browser)

async def fetch_article(article_id: str):
    """抓取知乎专栏文章正文（通过文章页 DOM）"""
    browser = None
    try:
        browser, page = await _open_page()
        url = f'https://zhuanlan.zhihu.com/p/{article_id}'
        await page.goto(url, {
            'waitUntil': 'networkidle0',
            'timeout': 30000
        })

        # 等待正文渲染出来
        for _ in range(10):
            rendered = await page.evaluate("!!document.querySelector('div.Post-RichText')")
            if rendered:
                break
            await asyncio.sleep(0.5)

        title = await page.evaluate("document.querySelector('h1.Post-Title')?.innerText || ''")
        author = await page.evaluate("document.querySelector('.AuthorInfo-name')?.innerText || ''")
        content_html = await page.evaluate("document.querySelector('div.Post-RichText')?.innerHTML || ''")
        content_text = await page.evaluate("document.querySelector('div.Post-RichText')?.innerText || ''")

        if not content_html:
            raise Exception("未找到文章正文")

        return {
            'type': 'article',
            'id': article_id,
            'url': url,
            'title': title.strip(),
            'author': author.strip(),
            'content_html': content_html,
            'content_text': content_text,
        }

    finally:
        if browser:
            await cleanup_browser(browser)

async def fetch_answer(answer_id: str):
    """抓取知乎回答正文（通过知乎 API）"""
    browser = None
    try:
        browser, page = await _open_page()

        # 先访问知乎首页建立同源上下文，再同源 fetch API
        await page.goto('https://www.zhihu.com', {
            'waitUntil': 'domcontentloaded',
            'timeout': 30000
        })

        js = f"""
        (async () => {{
            const r = await fetch('/api/v4/answers/{answer_id}?include=content', {{credentials: 'include'}});
            return await r.text();
        }})()
        """
        raw = await page.evaluate(js, force_expr=True)
        data = json.loads(raw)

        if not data or 'error' in data:
            message = (data or {}).get('error', {}).get('message', '未知错误')
            raise Exception(f"获取回答失败: {message}")

        content_html = data.get('content') or ''
        author = data.get('author') or {}
        question = data.get('question') or {}
        question_id = str(question.get('id')) if question.get('id') else None

        return {
            'type': 'answer',
            'id': str(data.get('id', answer_id)),
            'url': f'https://www.zhihu.com/question/{question_id}/answer/{answer_id}',
            'question_id': question_id,
            'question_title': question.get('title'),
            'author': {
                'name': author.get('name'),
                'url_token': author.get('url_token'),
                'headline': author.get('headline'),
            },
            'content_html': content_html,
            'content_text': _strip_html(content_html),
        }

    finally:
        if browser:
            await cleanup_browser(browser)

@app.get("/health")
async def health():
    return {"message": "知乎搜索API服务正常运行中"}

@app.get("/api/cookie", dependencies=[Depends(require_token)])
async def get_cookie():
    if not current_cookie:
        return {"set": False, "preview": ""}
    return {"set": True, "preview": _mask_cookie(current_cookie)}

@app.post("/api/cookie", dependencies=[Depends(require_token)])
async def set_cookie(payload: CookieUpdate):
    global current_cookie
    new_cookie = (payload.cookie or "").strip()
    if not new_cookie:
        raise HTTPException(status_code=400, detail="cookie 不能为空")
    current_cookie = new_cookie
    _persist_cookie(new_cookie)
    return {"set": True, "preview": _mask_cookie(new_cookie)}

@app.get("/api/search/{query}", dependencies=[Depends(require_token)])
async def search(query: str):
    try:
        result = await search_zhihu(query)
        if result:
            return {
                'results': _extract_search_results(result),
                'paging': result.get('paging'),
            }
        else:
            raise HTTPException(status_code=500, detail="搜索失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/article/{article_id}", dependencies=[Depends(require_token)])
async def article(article_id: str):
    if not article_id.isdigit():
        raise HTTPException(status_code=400, detail="无效的文章ID")
    try:
        return await fetch_article(article_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/answer/{answer_id}", dependencies=[Depends(require_token)])
async def answer(answer_id: str):
    if not answer_id.isdigit():
        raise HTTPException(status_code=400, detail="无效的回答ID")
    try:
        return await fetch_answer(answer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 托管前端构建产物并支持 SPA 回退（须在所有 API 路由之后注册）
if DIST_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        candidate = DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/")
    async def root():
        return {"message": "知乎搜索API服务正常运行中"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
