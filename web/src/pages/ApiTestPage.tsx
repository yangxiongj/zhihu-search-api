import { useState } from "react"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

interface TesterProps {
  title: string
  method: string
  path: string
  placeholder: string
  required?: boolean
  run: (value: string) => Promise<unknown>
}

function EndpointTester({
  title,
  method,
  path,
  placeholder,
  required = true,
  run,
}: TesterProps) {
  const [value, setValue] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    setError("")
    setResult("")
    try {
      const data = await run(value.trim())
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{method}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{path}</span>
        <span className="ml-auto text-sm font-medium">{title}</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 flex-1"
          onKeyDown={(e) => e.key === "Enter" && handle()}
        />
        <Button
          size="sm"
          onClick={handle}
          disabled={loading || (required && !value.trim())}
          className="h-9 gap-1.5"
        >
          {loading ? <LoadingSpinner size={14} /> : null}
          发送
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <pre className="max-h-72 overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
          {result}
        </pre>
      )}
    </div>
  )
}

export default function ApiTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">接口测试</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          手动调用每个接口并查看返回结果。
        </p>
      </div>

      <EndpointTester
        title="健康检查"
        method="GET"
        path="/health"
        placeholder="无需参数"
        required={false}
        run={() => api.health()}
      />
      <EndpointTester
        title="搜索"
        method="GET"
        path="/api/search/{query}"
        placeholder="输入关键词，如：python"
        run={(q) => api.search(q)}
      />
      <EndpointTester
        title="文章详情"
        method="GET"
        path="/api/article/{id}"
        placeholder="输入文章 ID"
        run={(id) => api.getArticle(id)}
      />
      <EndpointTester
        title="回答详情"
        method="GET"
        path="/api/answer/{id}"
        placeholder="输入回答 ID"
        run={(id) => api.getAnswer(id)}
      />
      <EndpointTester
        title="查看 Cookie"
        method="GET"
        path="/api/cookie"
        placeholder="无需参数"
        required={false}
        run={() => api.getCookie()}
      />
    </div>
  )
}
