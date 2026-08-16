export interface SearchResult {
  type: string
  id: string
  title?: string
  excerpt?: string
  url?: string
  voteup_count?: number
  comment_count?: number
  author?: {
    name?: string
    headline?: string
  }
  question_id?: string
  question_title?: string
}

export interface SearchResponse {
  results: SearchResult[]
  paging: {
    is_end: boolean
    next?: string
  }
}

export interface ArticleDetail {
  type: string
  id: string
  url: string
  title: string
  author: string
  content_html: string
  content_text: string
}

export interface AnswerAuthor {
  name?: string
  url_token?: string
  headline?: string
}

export interface AnswerDetail {
  type: string
  id: string
  url: string
  question_id?: string
  question_title?: string
  author: AnswerAuthor
  content_html: string
  content_text: string
}

export interface ApiError {
  detail: string
}

export interface CookieInfo {
  set: boolean
  preview?: string
}
