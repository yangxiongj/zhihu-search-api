import { Link, NavLink, Outlet } from "react-router-dom"
import { LogoMark } from "@/components/shared/LogoMark"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "搜索", end: true },
  { to: "/test", label: "接口测试" },
  { to: "/settings", label: "设置" },
]

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-6 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="text-sm font-semibold tracking-tight">
              知乎搜索
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            接口文档
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
