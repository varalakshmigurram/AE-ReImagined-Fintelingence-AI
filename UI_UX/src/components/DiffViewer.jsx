/**
 * Bitbucket-style field-level diff viewer.
 * Compares two JSON snapshots and highlights changed fields.
 */
export default function DiffViewer({ before, after, fields }) {
  if (!before && !after) return <div className="empty"><div>No diff available</div></div>

  let beforeObj = {}
  let afterObj = {}

  try { if (before) beforeObj = JSON.parse(before) } catch {}
  try { if (after) afterObj = JSON.parse(after) } catch {}

  const allKeys = fields || [...new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])]
    .filter(k => !['id', 'createdAt', 'updatedAt', 'previousSnapshot', 'submittedBy', 'reviewedBy', 'approvedBy', 'performedBy'].includes(k))

  const changed = allKeys.filter(k => {
    const bv = JSON.stringify(beforeObj[k])
    const av = JSON.stringify(afterObj[k])
    return bv !== av
  })

  const unchanged = allKeys.filter(k => !changed.includes(k))

  const fmt = (val) => {
    if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>
    if (typeof val === 'boolean') return <span style={{ color: 'var(--cyan)' }}>{String(val)}</span>
    return String(val)
  }

  const label = (key) => key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, s => s.toUpperCase())
    .trim()

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', fontSize: 12 }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', background: 'var(--bg-card2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid var(--border)' }}>Field</div>
        <div style={{ padding: '8px 12px', color: '#fca5a5', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid var(--border)', background: 'rgba(239,68,68,0.04)' }}>
          Before
        </div>
        <div style={{ padding: '8px 12px', color: '#86efac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(34,197,94,0.04)' }}>
          After
        </div>
      </div>

      {/* Changed rows */}
      {changed.length > 0 && (
        <>
          <div style={{ padding: '6px 12px', background: 'var(--bg-card2)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ⚡ {changed.length} Changed Field{changed.length > 1 ? 's' : ''}
          </div>
          {changed.map(key => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '9px 12px', color: 'var(--text)', fontWeight: 500, borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', background: 'var(--bg-hover)' }}>
                {label(key)}
              </div>
              <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.06)', color: '#fca5a5', fontFamily: 'var(--mono)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', textDecoration: 'line-through', opacity: 0.8, fontWeight: 600 }}>
                {fmt(beforeObj[key])}
              </div>
              <div style={{ padding: '9px 12px', background: 'rgba(34,197,94,0.06)', color: '#86efac', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                {fmt(afterObj[key])}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Unchanged rows (collapsible) */}
      {unchanged.length > 0 && (
        <>
          <div style={{ padding: '6px 12px', background: 'var(--bg-card2)', borderBottom: '1px solid var(--border)', borderTop: changed.length > 0 ? '2px solid var(--border)' : 'none', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {unchanged.length} Unchanged Field{unchanged.length > 1 ? 's' : ''}
          </div>
          {unchanged.map(key => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', borderBottom: '1px solid var(--border)', opacity: 0.6 }}>
              <div style={{ padding: '7px 12px', color: 'var(--text-muted)', fontWeight: 500, borderRight: '1px solid var(--border)', fontSize: 12 }}>
                {label(key)}
              </div>
              <div style={{ padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', borderRight: '1px solid var(--border)', fontSize: 12 }}>
                {fmt(beforeObj[key] ?? afterObj[key])}
              </div>
              <div style={{ padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                {fmt(afterObj[key] ?? beforeObj[key])}
              </div>
            </div>
          ))}
        </>
      )}

      {changed.length === 0 && unchanged.length === 0 && (
        <div className="empty"><div>No data to compare</div></div>
      )}
    </div>
  )
}
