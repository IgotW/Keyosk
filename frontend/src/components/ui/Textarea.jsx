import { FieldError } from './FieldError'

export function Textarea({
  label,
  error,
  id,
  name,
  className = '',
  rows = 4,
  ...props
}) {
  const inputId = id || name

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        name={name}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 ${
          error ? 'border-red-400' : 'border-slate-200'
        } ${className}`}
        {...props}
      />
      <FieldError message={error} />
    </div>
  )
}
