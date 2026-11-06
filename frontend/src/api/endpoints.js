import { api } from './client'

export async function fetchProducts() {
  const { data } = await api.get('/products')

  return data
}

export async function createOrder(payload) {
  const { data } = await api.post('/orders', payload)

  return data.data
}

export async function fetchReceipt(receiptToken) {
  const { data } = await api.get(`/receipts/${receiptToken}`)

  return data.data
}

export async function loginAdmin(payload) {
  const { data } = await api.post('/auth/login', payload)

  return data.data
}

export async function logoutAdmin() {
  await api.post('/auth/logout')
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')

  return data.data
}

export async function fetchAdminProducts() {
  const { data } = await api.get('/admin/products')

  return data.data
}

export async function fetchAdminProduct(productId) {
  const { data } = await api.get(`/admin/products/${productId}`)

  return data.data
}

export async function createProduct(payload) {
  const { data } = await api.post('/admin/products', payload)

  return data.data
}

export async function updateProduct(productId, payload) {
  const { data } = await api.patch(`/admin/products/${productId}`, payload)

  return data.data
}

export async function deleteProduct(productId) {
  await api.delete(`/admin/products/${productId}`)
}

export async function fetchAdminOrders() {
  const { data } = await api.get('/admin/orders')

  return data.data
}

export async function fetchAdminOrder(orderId) {
  const { data } = await api.get(`/admin/orders/${orderId}`)

  return data.data
}

export async function markOrderPaid(orderId) {
  const { data } = await api.post(`/admin/orders/${orderId}/mark-paid`)

  return data.data
}

export async function updateOrderStatus(orderId, status) {
  const { data } = await api.patch(`/admin/orders/${orderId}/status`, {
    status,
  })

  return data.data
}
