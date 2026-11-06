import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchAdminOrder,
  markOrderPaid,
  updateOrderStatus,
} from '../../api/endpoints'
import { Badge } from '../../components/ui/Badge'
import {
  orderStatusTone,
  paymentStatusTone,
} from '../../components/ui/badgeTones'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { toApiError } from '../../lib/apiError'
import { formatMoney } from '../../lib/money'

const statuses = ['pending', 'completed', 'cancelled']

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—'
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [nextStatus, setNextStatus] = useState('pending')

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAdminOrder(id)
      setOrder(data)
      setNextStatus(data.status)
    } catch (requestError) {
      setError(toApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const handleMarkPaid = async () => {
    setBusy(true)
    setActionError(null)

    try {
      const data = await markOrderPaid(order.id)
      setOrder(data)
      setNextStatus(data.status)
    } catch (requestError) {
      setActionError(toApiError(requestError).message)
    } finally {
      setBusy(false)
    }
  }

  const handleStatusChange = async (event) => {
    event.preventDefault()

    if (nextStatus === order.status) {
      return
    }

    setBusy(true)
    setActionError(null)

    try {
      const data = await updateOrderStatus(order.id, nextStatus)
      setOrder(data)
      setNextStatus(data.status)
    } catch (requestError) {
      setActionError(toApiError(requestError).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingState label="Loading order..." />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={loadOrder} />
        <p className="text-center text-sm">
          <Link to="/admin/orders" className="font-semibold text-orange-700">
            Back to orders
          </Link>
        </p>
      </div>
    )
  }

  const canMarkPaid =
    order.payment_method === 'cash' &&
    order.payment_status !== 'paid' &&
    order.status !== 'cancelled'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          to="/admin/orders"
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          &larr; Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Placed {formatDateTime(order.created_at)}
            </p>
          </div>
          <Link
            to={`/receipt/${order.receipt_token}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Open receipt
          </Link>
        </div>
      </div>

      {actionError ? (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {actionError}
        </p>
      ) : null}

      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={orderStatusTone(order.status)}>{order.status}</Badge>
            <Badge tone={paymentStatusTone(order.payment_status)}>
              {order.payment_status}
            </Badge>
            <Badge tone="info">
              {order.payment_method === 'cash' ? 'Cash' : 'Online (mock)'}
            </Badge>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Total
              </dt>
              <dd className="mt-0.5 text-xl font-black text-slate-900">
                {formatMoney(order.total_cents, order.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Payment reference
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {order.payment_reference || 'Not applicable'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Paid at
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {formatDateTime(order.paid_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Last updated
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {formatDateTime(order.updated_at)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">Items</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="py-2 font-bold">Item</th>
                  <th className="py-2 text-center font-bold">Qty</th>
                  <th className="py-2 text-right font-bold">Unit</th>
                  <th className="py-2 text-right font-bold">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">
                      {item.product_name}
                      {item.product_id === null ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (deleted)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-center text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">
                      {formatMoney(item.unit_price_cents, order.currency)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {formatMoney(item.line_total_cents, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">Actions</h2>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleMarkPaid}
              disabled={!canMarkPaid || busy}
              variant="dark"
            >
              {order.payment_status === 'paid'
                ? 'Already paid'
                : 'Mark cash as paid'}
            </Button>
            {order.payment_method === 'online' ? (
              <p className="text-xs text-slate-500">
                Online orders are paid automatically in this demo.
              </p>
            ) : null}
            {order.status === 'cancelled' ? (
              <p className="text-xs text-slate-500">
                Cancelled orders cannot be marked as paid.
              </p>
            ) : null}
          </div>

          <form
            onSubmit={handleStatusChange}
            className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5"
          >
            <label className="block space-y-1.5">
              <span className="block text-sm font-semibold text-slate-700">
                Order status
              </span>
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              disabled={busy || nextStatus === order.status}
            >
              Update status
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
