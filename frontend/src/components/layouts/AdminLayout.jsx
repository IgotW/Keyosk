import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'

function navClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`
}

export function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="no-print border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 text-base font-black text-white">
              K
            </span>
            <span className="font-black tracking-tight">Keyosk Admin</span>
          </div>

          <nav className="flex flex-wrap items-center gap-1" aria-label="Admin">
            <NavLink to="/admin/products" className={navClass}>
              Products
            </NavLink>
            <NavLink to="/admin/orders" className={navClass}>
              Orders
            </NavLink>
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              View store
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
