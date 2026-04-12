import { useState, useCallback, useEffect } from 'react'
import { loadOfferConfigFromExcel, getActiveOfferConfig } from '../../services/api'
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, Table } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OfferConfigLoader() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState(null)
  const [activeTab, setActiveTab] = useState('externalBands')
  const [batchInfo, setBatchInfo] = useState(null)

  useEffect(() => {
    getActiveOfferConfig().then(data => {
      if (data && Object.keys(data).length > 0) setConfig(data)
    }).catch(() => {})
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx)')
      return
    }
    setLoading(true)
    try {
      const result = await loadOfferConfigFromExcel(file, 'lead-analyst')
      setConfig(result.config)
      setBatchInfo({ batchId: result.batchId, version: result.strategyVersion, filename: result.sourceFilename })
      toast.success(`Config loaded — v${result.strategyVersion} — batchId: ${result.batchId?.slice(0,8)}…`)
    } catch (e) {
      toast.error('Failed to parse Excel: ' + (e.response?.data?.message || e.message))
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const TABS = [
    { key: 'externalBands', label: 'External Bands', icon: '📊' },
    { key: 'internalBands', label: 'Internal Bands', icon: '🔢' },
    { key: 'creditGradeLookup', label: 'Grade Lookup Matrix', icon: '🗺' },
    { key: 'creditGradeOffers', label: 'Grade Offers', icon: '💰' },
    { key: 'tenorOptions', label: 'Tenor Options', icon: '📅' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Offer Config Loader</div>
          <div className="page-subtitle">Upload Excel config → parsed into backend tables with batchId versioning</div>
        </div>
        {batchInfo && (
          <div style={{ background:'var(--success-dim)', border:'1px solid rgba(34,197,94,.25)', borderRadius:8, padding:'8px 14px', fontSize:11 }}>
            <div style={{ fontWeight:700, color:'var(--success)' }}>v{batchInfo.version}</div>
            <div style={{ color:'var(--muted)', fontFamily:'var(--mono)' }}>{batchInfo.batchId?.slice(0,16)}…</div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-light)'}`,
          borderRadius: 'var(--radius-lg)', padding: '32px 20px', textAlign: 'center',
          background: dragging ? 'var(--accent-dim)' : 'var(--bg-card)', cursor: 'pointer',
          transition: 'all .15s', marginBottom: 20
        }}
        onClick={() => document.getElementById('excel-input').click()}
      >
        <input id="excel-input" type="file" accept=".xlsx,.xls" style={{ display:'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:'var(--text-muted)' }}>
            <div className="spinner" /> Parsing Excel config…
          </div>
        ) : (
          <>
            <FileSpreadsheet size={32} color="var(--text-muted)" style={{ marginBottom:8 }} />
            <div style={{ fontWeight:600, marginBottom:4 }}>Drop SimplifiedOfferLogicSampleConfig.xlsx here</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>or click to browse — parses MAIN + OFFER_CONFIG sheets</div>
            <div style={{ marginTop:12, display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              {['External Bands', 'Internal Bands', 'Grade Lookup Matrix', 'Grade Offers', 'Tenor Options'].map(t => (
                <span key={t} style={{ fontSize:10, background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:4, padding:'2px 8px', color:'var(--muted)' }}>{t}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Config Viewer */}
      {config ? (
        <>
          <div style={{ marginBottom:12 }}>
            <div className="tabs">
              {TABS.map(t => (
                <button key={t.key} className={`tab ${activeTab===t.key?'active':''}`} onClick={() => setActiveTab(t.key)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'externalBands' && config.externalBands && (
            <ExternalBandsView data={config.externalBands} />
          )}
          {activeTab === 'internalBands' && config.internalBands && (
            <InternalBandsView data={config.internalBands} />
          )}
          {activeTab === 'creditGradeLookup' && config.creditGradeLookup && (
            <GradeLookupMatrix data={config.creditGradeLookup} />
          )}
          {activeTab === 'creditGradeOffers' && config.creditGradeOffers && (
            <GradeOffersView data={config.creditGradeOffers} />
          )}
          {activeTab === 'tenorOptions' && config.tenorOptions && (
            <TenorOptionsView data={config.tenorOptions} />
          )}
        </>
      ) : (
        <div className="card">
          <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
            <div style={{ fontSize:36, marginBottom:8, opacity:.4 }}>📊</div>
            <div style={{ fontWeight:600, marginBottom:4 }}>No config loaded yet</div>
            <div style={{ fontSize:12 }}>Upload an Excel file to view the parsed config tables</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  A1:'#22c55e', A2:'#4ade80', B1:'#60a5fa', B2:'#93c5fd',
  C1:'#fbbf24', C2:'#fcd34d', D1:'#fb923c', D2:'#fdba74',
  E1:'#f87171', E2:'#fca5a5', F:'#ef4444'
}

function ExternalBandsView({ data }) {
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>External Bands — Vantage Score Ranges</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, padding:16 }}>
        {data.map(b => (
          <div key={b.name} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--accent)', marginBottom:4 }}>EB {b.index}</div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>{b.name}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:12, background:'var(--bg)', borderRadius:6, padding:'4px 8px', color:'var(--text-subtle)' }}>{b.vantageScoreRange}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternalBandsView({ data }) {
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Internal Bands — V11_ADF Score Ranges</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, padding:16 }}>
        {data.map(b => (
          <div key={b.name} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:12, textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--purple)', marginBottom:4 }}>{b.name}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--bg)', borderRadius:6, padding:'3px 6px', color:'var(--text-subtle)' }}>{b.v11AdfRange}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GradeLookupMatrix({ data }) {
  const ibCols = Array.from({length:10}, (_,i) => `IB${i+1}`)
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Credit Grade Lookup Matrix — EB × IB → Grade</div>
      <div style={{ overflowX:'auto', padding:12 }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth:120 }}>External Band</th>
              {ibCols.map(ib => <th key={ib} style={{ textAlign:'center', minWidth:60 }}>{ib}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.externalBand}>
                <td style={{ fontWeight:600 }}>{row.externalBand}</td>
                {ibCols.map(ib => {
                  const grade = row[ib]
                  return (
                    <td key={ib} style={{ textAlign:'center', padding:'6px 4px' }}>
                      <span style={{
                        display:'inline-block', padding:'2px 8px', borderRadius:20,
                        fontSize:11, fontWeight:700,
                        background: grade === 'F' ? 'rgba(239,68,68,.15)' : `${GRADE_COLORS[grade] || '#6b7694'}22`,
                        color: GRADE_COLORS[grade] || 'var(--muted)',
                        border: `1px solid ${grade === 'F' ? 'rgba(239,68,68,.3)' : `${GRADE_COLORS[grade] || '#6b7694'}44`}`
                      }}>{grade}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GradeOffersView({ data }) {
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Credit Grade Offer Table</div>
      <div style={{ overflowX:'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Grade</th>
              <th>Max Loan</th>
              <th>Max Tenor</th>
              <th>Target APR%</th>
              <th>Max Pay (Low CF)</th>
              <th>Max Pay (High CF)</th>
              <th>Min Pay</th>
              <th>Org Fee%</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.creditGrade}>
                <td>
                  <span style={{ fontWeight:800, color: GRADE_COLORS[row.creditGrade] || 'var(--text)', fontFamily:'var(--mono)' }}>
                    {row.creditGrade}
                  </span>
                </td>
                <td><code style={{ fontFamily:'var(--mono)', color:'var(--success)' }}>${row.maxLoanAmount?.toLocaleString()}</code></td>
                <td>{row.maxTenor} mo</td>
                <td><span style={{ color:'var(--warning)', fontFamily:'var(--mono)' }}>{row.targetApr}%</span></td>
                <td>${row.maxMonthlyPaymentLowCF}</td>
                <td>${row.maxMonthlyPaymentHighCF}</td>
                <td>${row.minMonthlyPayment}</td>
                <td><code style={{ fontSize:11, color:'var(--cyan)', fontFamily:'var(--mono)' }}>{(row.orgFeePercent * 100).toFixed(2)}%</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TenorOptionsView({ data }) {
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Tenor Options by Loan Amount Range</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:16 }}>
        {data.map((row, i) => (
          <div key={i} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, marginBottom:8, color:'var(--text)' }}>
              ${row.minLoanAmount?.toLocaleString()} – ${row.maxLoanAmount?.toLocaleString()}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {(Array.isArray(row.tenorOptions) ? row.tenorOptions : String(row.tenorOptions).split(',')).map(t => (
                <span key={t} style={{ background:'var(--accent-dim)', border:'1px solid rgba(79,124,255,.3)', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, color:'var(--accent)' }}>
                  {String(t).trim()} mo
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
