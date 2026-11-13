import { useEffect, useState } from 'react'

/** La valeur, une fois qu'elle ne bouge plus depuis `ms` (une recherche part quand on s'arrête de taper). */
export function useSettledValue<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}
