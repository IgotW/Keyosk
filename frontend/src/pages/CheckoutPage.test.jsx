import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CartProvider } from '../cart/CartProvider'
import { CheckoutPage } from './CheckoutPage'

vi.mock('../api/endpoints', () => ({
  createOrder: vi.fn(),
  fetchProducts: vi.fn().mockResolvedValue({
    data: [],
    meta: { currency: 'USD' },
  }),
}))

describe('CheckoutPage', () => {
  it('redirects to the cart when the cart is empty', async () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <CartProvider>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/cart" element={<p>Cart page marker</p>} />
          </Routes>
        </CartProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Cart page marker')).toBeInTheDocument()
  })
})
