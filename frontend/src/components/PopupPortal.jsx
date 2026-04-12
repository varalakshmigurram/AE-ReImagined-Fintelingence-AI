import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children in a portal positioned relative to a trigger element.
 * Fixes the popup clipping issue inside overflow:hidden cards.
 */
export function PopupPortal({ triggerRef, open, onClose, children, width = 380 }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !triggerRef?.current) return

    const updatePos = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportH = window.innerHeight
      const popupH = 360 // estimated

      let top = rect.bottom + 4
      let left = rect.left

      // Flip up if would overflow bottom
      if (top + popupH > viewportH - 20) {
        top = rect.top - popupH - 4
      }

      // Keep within viewport horizontally
      if (left + width > window.innerWidth - 16) {
        left = window.innerWidth - width - 16
      }

      setPos({ top, left })
    }

    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, triggerRef, width])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (triggerRef?.current && !triggerRef.current.contains(e.target)) {
        // Check if click is inside the portal itself
        const portals = document.querySelectorAll('[data-popup-portal]')
        for (const p of portals) { if (p.contains(e.target)) return }
        onClose?.()
      }
    }
    // Delay to avoid immediate close on open-click
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, triggerRef])

  if (!open) return null

  return createPortal(
    <div
      data-popup-portal
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 9999,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  )
}
