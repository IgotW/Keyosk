import { Button } from './Button'
import { Card } from './Card'
import { Spinner } from './Spinner'

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  className = '',
}) {
  return (
    <Card className={`mx-auto max-w-xl p-8 text-center ${className}`}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-xl">
        !
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        We hit a snag
      </h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  )
}

export function EmptyState({ title, description, action, className = '' }) {
  return (
    <Card className={`mx-auto max-w-xl p-8 text-center ${className}`}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl">
        --
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  )
}
