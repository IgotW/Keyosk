export function FieldError({ message }) {
  if (!message) {
    return null
  }

  return <p className="text-xs font-medium text-red-600">{message}</p>
}
