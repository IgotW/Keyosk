import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOrders } from '../../api/endpoints'
import { Badge } from '../../components/ui/Badge'
import {
  orderStatusTone,
  paymentStatusTone,
} from '../../components/ui/badgeTones'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { toApiError } from '../../lib/apiError'
import { formatMoney } from '../../lib/money'

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—'
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setOrders(await fetchAdminOrders())
    } catch (requestError) {
      setError(toApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-orange-600 uppercase">
            Counter
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review incoming orders, collect cash, and update order status.
          </p>
        </div>
        <Button variant="secondary" onClick={loadOrders} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? <LoadingState label="Loading orders..." /> : null}

      {!loading && error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Orders placed from the storefront will appear here."
        />
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Placed</th>
                  <th className="px-4 py-3 font-bold">Items</th>
                  <th className="px-4 py-3 font-bold">Total</th>
                  <th className="px-4 py-3 font-bold">Payment</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-black text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.items_count}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMoney(order.total_cents, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="info">
                          {order.payment_method === 'cash' ? 'Cash' : 'Online'}
                        </Badge>
                        <Badge tone={paymentStatusTone(order.payment_status)}>
                          {order.payment_status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={orderStatusTone(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
