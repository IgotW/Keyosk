import { useEffect, useMemo, useReducer } from 'react'
import { cartReducer } from './cartReducer'
import { CartContext } from './cartContext'
import { cartTotals } from '../lib/money'
import { loadCartItems, saveCartItems } from '../lib/storage'

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCartItems)

  useEffect(() => {
    saveCartItems(items)
  }, [items])

  const totals = useMemo(() => cartTotals(items), [items])

  const value = useMemo(
    () => ({
      items,
      count: totals.count,
      totalCents: totals.totalCents,
      addItem: (product, quantity = 1) =>
        dispatch({ type: 'add', product, quantity }),
      setQuantity: (productId, quantity) =>
        dispatch({ type: 'setQuantity', productId, quantity }),
      removeItem: (productId) => dispatch({ type: 'remove', productId }),
      clearCart: () => dispatch({ type: 'clear' }),
      replaceCart: (nextItems) => dispatch({ type: 'replace', items: nextItems }),
    }),
    [items, totals.count, totals.totalCents],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
