import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { api } from "@/lib/api-client"
import type { ArticleDetail } from "@/types"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const result = await api.getArticle(id)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size={28} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{error || "文章不存在"}</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          返回搜索
        </Link>
      </div>
    )
  }

  return (
    <article className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回搜索
      </Link>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold leading-snug">{data.title}</h1>
        {data.author && (
          <p className="text-sm text-muted-foreground">{data.author}</p>
        )}
      </header>

      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          查看原文 <ExternalLink className="size-3" />
        </a>
      )}

      <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
        {data.content_text}
      </div>
    </article>
  )
}
