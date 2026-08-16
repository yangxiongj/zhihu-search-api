import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Search, ThumbsUp, MessageCircle } from "lucide-react"
import { api } from "@/lib/api-client"
import type { SearchResult } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

function stripHtml(html?: string): string {
  if (!html) return ""
  return html.replace(/<[^>]+>/g, "").trim()
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setError("")
    try {
      const data = await api.search(q)
      setResults(data.results)
      if (data.results.length === 0) {
        setError("没有找到相关结果")
      }
    } catch (err) {
      setResults([])
      setError(err instanceof Error ? err.message : "搜索失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索知乎：问题、文章、话题…"
          autoFocus
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-11 gap-2"
        >
          {loading ? <LoadingSpinner size={16} /> : <Search className="size-4" />}
          搜索
        </Button>
      </form>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-border/60 p-4"
            >
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-full rounded bg-muted/70" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-muted-foreground">{error}</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link
                to={
                  item.type === "answer"
                    ? `/answer/${item.id}`
                    : `/article/${item.id}`
                }
                className="block rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-medium leading-snug">
                    {stripHtml(item.title)}
                  </h3>
                  <Badge
                    variant={item.type === "article" ? "secondary" : "outline"}
                  >
                    {item.type === "article" ? "文章" : "回答"}
                  </Badge>
                </div>

                {item.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {stripHtml(item.excerpt)}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  {item.author?.name && <span>{item.author.name}</span>}
                  {typeof item.voteup_count === "number" && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="size-3.5" />
                      {item.voteup_count}
                    </span>
                  )}
                  {typeof item.comment_count === "number" && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" />
                      {item.comment_count}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
