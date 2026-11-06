import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-black tracking-[0.25em] text-orange-600 uppercase">
        404
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Back to the menu</Button>
      </Link>
    </div>
  )
}
