export function orderStatusTone(status) {
  if (status === 'completed') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'danger'
  }

  return 'warning'
}

export function paymentStatusTone(status) {
  return status === 'paid' ? 'success' : 'warning'
}
