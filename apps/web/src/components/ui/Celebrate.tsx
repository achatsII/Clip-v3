'use client'

import { createPortal } from 'react-dom'

const COLORS = ['#0078FF', '#00C6FF', '#18c480', '#FFC800', '#FF2B5E', '#9b2cfa']

/** Célébration sobre : une pluie de confettis de 2,5 s (désactivée si l'utilisateur réduit les animations). */
export function Confetti({ show }: { show: boolean }) {
  if (!show || typeof document === 'undefined') return null
  return createPortal(
    <div aria-hidden>
      {Array.from({ length: 70 }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 10) * 0.08}s`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}
    </div>,
    document.body,
  )
}
