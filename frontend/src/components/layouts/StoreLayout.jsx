import { Link, NavLink, Outlet } from 'react-router-dom'
import { useCart } from '../../cart/cartContext'

function navClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-orange-100 text-orange-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

export function StoreLayout() {
  const { count } = useCart()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 text-base font-black text-white shadow-sm">
              K
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Keyosk
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Menu
            </NavLink>
            <NavLink to="/cart" className={navClass}>
              Cart
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                {count}
              </span>
            </NavLink>
            <Link
              to="/admin/products"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <Outlet />
      </main>

      <footer className="no-print border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Keyosk ordering demo. Payments are simulated.</p>
          <p>Order number and receipt number are the same.</p>
        </div>
      </footer>
    </div>
  )
}
