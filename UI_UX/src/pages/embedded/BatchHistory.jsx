import { useState, useEffect } from 'react'
import { RefreshCw, Package, Archive, Layers } from 'lucide-react'
import { getActiveOfferConfig } from '../../services/api'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'

const v1 = axios.create({ baseURL: '/api/v1/embedded', timeout: 10000 })
const getBatchHistory = () => v1.get('/rules/batches').then(r => r.data)

export default function BatchHistory() {
  const [batches, setBatches] = useState([])
  const [selected, setSelected] = useState(null)
  const [offerConfig, setOfferConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([getBatchHistory(), getActiveOfferConfig()])
      .then(([b, oc]) => {
        setBatches(b)
        setSelected(b[0] || null)
        setOfferConfig(oc)
      })
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const CACHE_CARDS = [
    { icon:'🧠', label:'Local JVM Cache', sub:'Compiled rules + cutoffs — sub-ms access', color:'var(--accent)' },
    { icon:'🗄', label:'DB Snapshot Tables', sub:'rule_bundle_snapshot · cutoff_group_snapshot', color:'var(--purple)' },
    { icon:'🔑', label:'BatchId Invalidation', sub:'New save → new UUID → all caches cleared', color:'var(--cyan)' },
    { icon:'⚡', label:'Provider Indexing', sub:'O(1) lookup: providerToRulesMap rebuilt on save', color:'var(--warning)' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Batch History</div>
          <div className="page-subtitle">Rule engine batch snapshots — batchId cache invalidation architecture</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>

      {/* Cache Architecture */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {CACHE_CARDS.map(c => (
          <div key={c.label} className="card" style={{ padding:14, borderTop:`2px solid ${c.color}` }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{c.icon}</div>
            <div style={{ fontWeight:700, fontSize:12 }}>{c.label}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, lineHeight:1.5 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>
        {/* Batch list */}
        <div className="card">
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
            <Archive size={12}/> Rule Batches {!loading && `(${batches.length})`}
          </div>
          {loading ? (
            <div style={{ padding:30, display:'flex', justifyContent:'center' }}><div className="spinner"/></div>
          ) : batches.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:12 }}>
              No batches yet — save rules first
            </div>
          ) : batches.map(b => (
            <div key={b.batchId} onClick={() => setSelected(b)} style={{
              padding:'11px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
              background: selected?.batchId===b.batchId ? 'var(--bg-hover)' : 'transparent',
              borderLeft: b.isActive ? '3px solid var(--success)' : '3px solid transparent',
              transition:'background .1s'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                {b.isActive
                  ? <span style={{ fontSize:9, background:'var(--success-dim)', color:'var(--success)', borderRadius:4, padding:'1px 6px', fontWeight:700 }}>ACTIVE</span>
                  : <span style={{ fontSize:9, background:'var(--border)', color:'var(--muted)', borderRadius:4, padding:'1px 6px' }}>ARCHIVED</span>
                }
                <span style={{ fontSize:10, color:'var(--muted)', marginLeft:'auto' }}>
                  {b.createdAt ? formatDistanceToNow(new Date(b.createdAt), {addSuffix:true}) : ''}
                </span>
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-subtle)' }}>
                {b.batchId?.slice(0,8)}…{b.batchId?.slice(-4)}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4, fontSize:10, color:'var(--muted)' }}>
                <span>📋 {b.totalRules} rules</span>
                <span style={{ color:'var(--accent)' }}>{(b.groups||[]).join(', ')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Batch Detail */}
        <div>
          {selected ? (
            <>
              <div className="card" style={{ marginBottom:14 }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>Batch Detail</div>
                  {selected.isActive && (
                    <span className="badge badge-approved" style={{ fontSize:10 }}>ACTIVE IN JVM CACHE</span>
                  )}
                </div>
                <div style={{ padding:16 }}>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>BATCH ID</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--accent)', wordBreak:'break-all' }}>{selected.batchId}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      {label:'Rule Groups', val:(selected.groups||[]).length},
                      {label:'Total Rules', val:selected.totalRules},
                      {label:'Status', val:selected.isActive ? 'ACTIVE' : 'ARCHIVED'},
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg-card2)', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>{s.label}</div>
                        <div style={{ fontWeight:700, fontSize:16, color: s.val==='ACTIVE'?'var(--success)':undefined }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.05em' }}>Rule Groups</div>
                  {(selected.groups||[]).map(g => (
                    <div key={g} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--bg-card2)', borderRadius:8, marginBottom:6, border:'1px solid var(--border)' }}>
                      <Layers size={13} color="var(--accent)"/>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent)' }}>{g}</span>
                      <span style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto' }}>filterByProviders: true</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Offer Config */}
              {offerConfig && Object.keys(offerConfig).filter(k => !['batchId','strategyVersion'].includes(k)).length > 0 && (
                <div className="card">
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                    <Package size={14} color="var(--purple)"/> Active Offer Config
                    {offerConfig.strategyVersion && (
                      <span className="badge badge-test" style={{ fontSize:10 }}>v{offerConfig.strategyVersion}</span>
                    )}
                  </div>
                  <div style={{ padding:16 }}>
                    {offerConfig.batchId && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>OFFER CONFIG BATCH ID</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--purple)' }}>{offerConfig.batchId}</div>
                      </div>
                    )}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {['EXTERNAL_BAND','INTERNAL_BAND','CREDIT_GRADE_LOOKUP','CREDIT_GRADE_OFFER','TENOR_OPTIONS'].map(s => {
                        const loaded = !!offerConfig[s]
                        return (
                          <div key={s} style={{
                            padding:'4px 10px', borderRadius:6, fontSize:11,
                            background: loaded ? 'var(--success-dim)' : 'var(--border)',
                            color: loaded ? 'var(--success)' : 'var(--muted)',
                            border: `1px solid ${loaded ? 'rgba(34,197,94,.25)' : 'var(--border)'}`,
                          }}>
                            {loaded ? '✓' : '○'} {s.replace(/_/g,' ')}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center', color:'var(--muted)' }}>
                <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>📦</div>
                <div>Select a batch to view details</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
