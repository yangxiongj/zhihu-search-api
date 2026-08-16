import { useEffect, useState } from "react"
import { api, getToken, setToken } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

export default function SettingsPage() {
  // Cookie
  const [hasCookie, setHasCookie] = useState(false)
  const [preview, setPreview] = useState("")
  const [cookieInput, setCookieInput] = useState("")
  const [cookieLoading, setCookieLoading] = useState(false)
  const [cookieMessage, setCookieMessage] = useState("")
  const [cookieError, setCookieError] = useState("")

  // Token
  const [tokenInput, setTokenInput] = useState("")
  const [tokenMessage, setTokenMessage] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<"" | "ok" | "fail">("")

  useEffect(() => {
    setTokenInput(getToken())
    api
      .getCookie()
      .then((c) => {
        setHasCookie(c.set)
        setPreview(c.preview || "")
      })
      .catch(() => {})
  }, [])

  const handleSaveCookie = async () => {
    if (!cookieInput.trim()) {
      setCookieError("请输入 cookie")
      return
    }
    setCookieLoading(true)
    setCookieError("")
    setCookieMessage("")
    try {
      const r = await api.setCookie(cookieInput.trim())
      setHasCookie(r.set)
      setPreview(r.preview || "")
      setCookieInput("")
      setCookieMessage("cookie 已更新，立即生效并已写入 .env")
    } catch (err) {
      setCookieError(err instanceof Error ? err.message : "更新失败")
    } finally {
      setCookieLoading(false)
    }
  }

  const handleSaveToken = () => {
    setToken(tokenInput.trim())
    setTokenMessage(tokenInput.trim() ? "令牌已保存到本地" : "已清除令牌")
    setVerifyResult("")
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult("")
    try {
      await api.getCookie()
      setVerifyResult("ok")
    } catch {
      setVerifyResult("fail")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理访问令牌与知乎 Cookie。
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border/60 p-4">
        <div>
          <p className="text-sm font-medium">访问令牌</p>
          <p className="mt-1 text-sm text-muted-foreground">
            在服务器 <code className="font-mono text-xs">.env</code> 中设置{" "}
            <code className="font-mono text-xs">API_TOKEN</code>{" "}
            后，在此输入相同令牌。未配置则无需认证。
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="输入访问令牌"
            className="h-9 flex-1 font-mono"
          />
          <Button size="sm" onClick={handleSaveToken} className="h-9">
            保存
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleVerify}
            disabled={verifying}
            className="h-9 gap-1.5"
          >
            {verifying ? <LoadingSpinner size={14} /> : null}
            验证
          </Button>
        </div>
        {tokenMessage && (
          <p className="text-sm text-muted-foreground">{tokenMessage}</p>
        )}
        {verifyResult === "ok" && (
          <p className="text-sm text-success">令牌有效</p>
        )}
        {verifyResult === "fail" && (
          <p className="text-sm text-destructive">令牌无效或未匹配</p>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-border/60 p-4">
        <div>
          <p className="text-sm font-medium">当前 Cookie 状态</p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {hasCookie ? `已配置（${preview}）` : "未配置"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">新的知乎 Cookie</label>
          <Textarea
            value={cookieInput}
            onChange={(e) => setCookieInput(e.target.value)}
            placeholder="粘贴完整的知乎 Cookie 字符串…"
            rows={6}
            className="font-mono text-xs"
          />
        </div>

        {cookieError && <p className="text-sm text-destructive">{cookieError}</p>}
        {cookieMessage && <p className="text-sm text-success">{cookieMessage}</p>}

        <Button
          onClick={handleSaveCookie}
          disabled={cookieLoading || !cookieInput.trim()}
          className="gap-2"
        >
          {cookieLoading ? <LoadingSpinner size={16} /> : null}
          保存并更新
        </Button>
      </div>
    </div>
  )
}
