import { createBrowserRouter, RouterProvider } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import SearchPage from "@/pages/SearchPage"
import ArticlePage from "@/pages/ArticlePage"
import AnswerPage from "@/pages/AnswerPage"
import ApiTestPage from "@/pages/ApiTestPage"
import SettingsPage from "@/pages/SettingsPage"

function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6">
      <div className="text-7xl font-bold text-muted-foreground/30">404</div>
      <p className="text-lg text-muted-foreground">页面不存在</p>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <SearchPage /> },
      { path: "article/:id", element: <ArticlePage /> },
      { path: "answer/:id", element: <AnswerPage /> },
      { path: "test", element: <ApiTestPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
