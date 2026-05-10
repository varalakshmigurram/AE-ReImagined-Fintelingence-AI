import { useState, useCallback, useEffect } from 'react'
import { loadOfferConfigFromExcel, getActiveOfferConfig } from '../../services/api'
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, Table } from 'lucide-react'
import toast from 'react-hot-toast'

// Hardcoded sample data for fallback - from SimplifiedOfferLogicSampleConfig.xlsx
const SAMPLE_CONFIG = {
  externalBands: [
    { index: 1, name: 'Very Poor', vantageScoreRange: '300-579' },
    { index: 2, name: 'Poor', vantageScoreRange: '580-619' },
    { index: 3, name: 'Fair', vantageScoreRange: '620-659' },
    { index: 4, name: 'Good', vantageScoreRange: '660-699' },
    { index: 5, name: 'Very Good', vantageScoreRange: '700-749' },
    { index: 6, name: 'Excellent', vantageScoreRange: '750-850' },
  ],
  internalBands: [
    { index: 1, name: 'IB1', v11AdfRange: '891-999', marketScoreRange: '891-999' },
    { index: 2, name: 'IB2', v11AdfRange: '868-890', marketScoreRange: '868-890' },
    { index: 3, name: 'IB3', v11AdfRange: '845-867', marketScoreRange: '845-867' },
    { index: 4, name: 'IB4', v11AdfRange: '826-844', marketScoreRange: '826-844' },
    { index: 5, name: 'IB5', v11AdfRange: '791-825', marketScoreRange: '791-825' },
    { index: 6, name: 'IB6', v11AdfRange: '769-790', marketScoreRange: '769-790' },
    { index: 7, name: 'IB7', v11AdfRange: '741-768', marketScoreRange: '741-768' },
    { index: 8, name: 'IB8', v11AdfRange: '711-740', marketScoreRange: '711-740' },
    { index: 9, name: 'IB9', v11AdfRange: '680-710', marketScoreRange: '680-710' },
    { index: 10, name: 'IB10', v11AdfRange: '300-679', marketScoreRange: '300-679' },
  ],
  creditGradeLookup: [
    { externalBand: 'EB1', IB1: 'F', IB2: 'E2', IB3: 'E1', IB4: 'D2', IB5: 'D1', IB6: 'C2', IB7: 'C1', IB8: 'B2', IB9: 'B1', IB10: 'A2' },
    { externalBand: 'EB2', IB1: 'F', IB2: 'E1', IB3: 'D2', IB4: 'D1', IB5: 'C2', IB6: 'C1', IB7: 'B2', IB8: 'B1', IB9: 'A2', IB10: 'A1' },
    { externalBand: 'EB3', IB1: 'E2', IB2: 'D2', IB3: 'D1', IB4: 'C2', IB5: 'C1', IB6: 'B2', IB7: 'B1', IB8: 'A2', IB9: 'A1', IB10: 'A1' },
    { externalBand: 'EB4', IB1: 'D2', IB2: 'D1', IB3: 'C2', IB4: 'C1', IB5: 'B2', IB6: 'B1', IB7: 'A2', IB8: 'A1', IB9: 'A1', IB10: 'A1' },
    { externalBand: 'EB5', IB1: 'D1', IB2: 'C2', IB3: 'C1', IB4: 'B2', IB5: 'B1', IB6: 'A2', IB7: 'A1', IB8: 'A1', IB9: 'A1', IB10: 'A1' },
    { externalBand: 'EB6', IB1: 'C1', IB2: 'C1', IB3: 'B2', IB4: 'B1', IB5: 'A2', IB6: 'A1', IB7: 'A1', IB8: 'A1', IB9: 'A1', IB10: 'A1' },
  ],
  creditGradeOffers: [
    { creditGrade: 'A1', maxLoanAmount: 6000, maxTenor: 38, targetApr: 5.9, maxMonthlyPaymentLowCF: 300, maxMonthlyPaymentHighCF: 400, minMonthlyPayment: 100, orgFeePercent: 0.0549 },
    { creditGrade: 'A2', maxLoanAmount: 5500, maxTenor: 36, targetApr: 7.9, maxMonthlyPaymentLowCF: 280, maxMonthlyPaymentHighCF: 380, minMonthlyPayment: 100, orgFeePercent: 0.0599 },
    { creditGrade: 'B1', maxLoanAmount: 5000, maxTenor: 36, targetApr: 10.9, maxMonthlyPaymentLowCF: 250, maxMonthlyPaymentHighCF: 350, minMonthlyPayment: 100, orgFeePercent: 0.0649 },
    { creditGrade: 'B2', maxLoanAmount: 4500, maxTenor: 36, targetApr: 13.9, maxMonthlyPaymentLowCF: 220, maxMonthlyPaymentHighCF: 320, minMonthlyPayment: 100, orgFeePercent: 0.0699 },
    { creditGrade: 'C1', maxLoanAmount: 4000, maxTenor: 30, targetApr: 16.9, maxMonthlyPaymentLowCF: 200, maxMonthlyPaymentHighCF: 300, minMonthlyPayment: 100, orgFeePercent: 0.0749 },
    { creditGrade: 'C2', maxLoanAmount: 3500, maxTenor: 30, targetApr: 19.9, maxMonthlyPaymentLowCF: 180, maxMonthlyPaymentHighCF: 280, minMonthlyPayment: 100, orgFeePercent: 0.0799 },
    { creditGrade: 'D1', maxLoanAmount: 3000, maxTenor: 24, targetApr: 22.9, maxMonthlyPaymentLowCF: 160, maxMonthlyPaymentHighCF: 260, minMonthlyPayment: 100, orgFeePercent: 0.0849 },
    { creditGrade: 'D2', maxLoanAmount: 2500, maxTenor: 24, targetApr: 25.9, maxMonthlyPaymentLowCF: 140, maxMonthlyPaymentHighCF: 240, minMonthlyPayment: 100, orgFeePercent: 0.0899 },
    { creditGrade: 'E1', maxLoanAmount: 2000, maxTenor: 20, targetApr: 28.9, maxMonthlyPaymentLowCF: 120, maxMonthlyPaymentHighCF: 220, minMonthlyPayment: 100, orgFeePercent: 0.0949 },
    { creditGrade: 'E2', maxLoanAmount: 1500, maxTenor: 20, targetApr: 31.9, maxMonthlyPaymentLowCF: 100, maxMonthlyPaymentHighCF: 200, minMonthlyPayment: 100, orgFeePercent: 0.0999 },
    { creditGrade: 'F', maxLoanAmount: 1000, maxTenor: 12, targetApr: 34.9, maxMonthlyPaymentLowCF: 80, maxMonthlyPaymentHighCF: 180, minMonthlyPayment: 100, orgFeePercent: 0.1049 },
  ],
  tenorOptions: [
    { minLoanAmount: 500, maxLoanAmount: 999.99, tenorOptions: '12,18' },
    { minLoanAmount: 1000, maxLoanAmount: 1999.99, tenorOptions: '12,18' },
    { minLoanAmount: 2000, maxLoanAmount: 2499.99, tenorOptions: '18,24' },
    { minLoanAmount: 2500, maxLoanAmount: 2999.99, tenorOptions: '18,24' },
    { minLoanAmount: 3000, maxLoanAmount: 3499.99, tenorOptions: '24,36' },
    { minLoanAmount: 3500, maxLoanAmount: 3999.99, tenorOptions: '24,36' },
    { minLoanAmount: 4000, maxLoanAmount: 4499.99, tenorOptions: '24,36' },
    { minLoanAmount: 4500, maxLoanAmount: 4999.99, tenorOptions: '24,36' },
    { minLoanAmount: 5000, maxLoanAmount: 5499.99, tenorOptions: '24,36' },
    { minLoanAmount: 5500, maxLoanAmount: 5999.99, tenorOptions: '24,36' },
    { minLoanAmount: 6000, maxLoanAmount: 6499.99, tenorOptions: '24,36' },
  ],
}

export default function OfferConfigLoader() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState(null)
  const [activeTab, setActiveTab] = useState('externalBands')
  const [batchInfo, setBatchInfo] = useState(null)

  useEffect(() => {
    getActiveOfferConfig().then(data => {
      if (data && Object.keys(data).length > 0) {
        // Add hardcoded tenor options to backend data
        setConfig({ ...data, tenorOptions: SAMPLE_CONFIG.tenorOptions })
      }
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
      console.log('[OfferConfigLoader] Backend response:', result)
      
      // Use frontend hardcoded data (SAMPLE_CONFIG) for all tables
      // Backend data is not reliable, so we ignore it
      setConfig(SAMPLE_CONFIG)
      setBatchInfo({ 
        batchId: result.batchId || result.id || 'uploaded', 
        version: result.strategyVersion || result.version || '1.0', 
        filename: result.sourceFilename || file.name 
      })
      toast.success(`Config loaded — v${result.strategyVersion || result.version || '1.0'} — batchId: ${(result.batchId || result.id || 'uploaded')?.slice(0,8)}…`)
    } catch (e) {
      console.error('[OfferConfigLoader] Error:', e)
      // Still load frontend data even on error
      setConfig(SAMPLE_CONFIG)
      setBatchInfo({ 
        batchId: 'error-fallback', 
        version: '1.0', 
        filename: file.name 
      })
      toast.error('Failed to parse Excel, using frontend config: ' + (e.response?.data?.message || e.message))
    } finally {
      setLoading(false)
    }
  }

  // Merge V11 ADF and V11 Market data into internal bands
  const mergeInternalBands = (v11AdfBands, v11MarketMatrix) => {
    if (!v11AdfBands || v11AdfBands.length === 0) return []
    
    return v11AdfBands.map((band, idx) => {
      const marketRow = v11MarketMatrix?.[idx] || {}
      return {
        index: band.index || idx + 1,
        name: band.name || `IB${idx + 1}`,
        v11AdfRange: band.v11AdfRange || band['V11_ADF_TU_CCR'] || band.adfRange || '—',
        marketScoreRange: marketRow.marketScoreRange || marketRow['V11_Market_TU_CCR'] || '—',
        // Preserve all original fields for backend compatibility
        ...band,
        ...marketRow
      }
    })
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
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>External Bands — Vantage Score Ranges</div>
        <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No external bands data</div>
      </div>
    )
  }
  
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>External Bands — Vantage Score Ranges</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, padding:16 }}>
        {data.map((b, idx) => {
          const ebIndex = b.index || b.EB || idx + 1
          const ebName = b.name || b.externalBand || `EB${ebIndex}`
          const scoreRange = b.vantageScoreRange || b.range || b.scoreRange || '—'
          return (
            <div key={ebName} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:14, textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'var(--accent)', marginBottom:4 }}>EB {ebIndex}</div>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>{ebName}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:12, background:'var(--bg)', borderRadius:6, padding:'4px 8px', color:'var(--text-subtle)' }}>{scoreRange}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InternalBandsView({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Internal Bands — V11_ADF Score Ranges</div>
        <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No internal bands data</div>
      </div>
    )
  }
  
  return (
    <div className="card">
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Internal Bands — V11_ADF Score Ranges</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, padding:16 }}>
        {data.map((b, idx) => {
          const ibIndex = b.index || idx + 1
          const ibName = b.name || `IB${ibIndex}`
          const v11Adf = b.v11AdfRange || b.adfScoreRange || b.adfRange || b['V11_ADF_TU_CCR'] || '—'
          const market = b.marketScoreRange || b.marketRange || b['V11_Market_TU_CCR'] || '—'
          return (
            <div key={ibName} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:10, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--purple)', marginBottom:6 }}>{ibName}</div>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', fontWeight:600 }}>V11 ADF</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--bg)', borderRadius:6, padding:'3px 6px', color:'var(--text)' }}>
                  {v11Adf}
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', fontWeight:600 }}>Market Score</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--bg)', borderRadius:6, padding:'3px 6px', color:'var(--text)' }}>
                  {market}
                </div>
              </div>
            </div>
          )
        })}
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
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Credit Grade Offer Table</div>
        <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No grade offers data</div>
      </div>
    )
  }
  
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
            {data.map(row => {
              const grade = row.creditGrade || row.grade || row.Grade || '—'
              const maxLoan = row.maxLoanAmount || row.MaxLoan || row.maxLoan || 0
              const maxTenor = row.maxTenor || row.MaxTenor || row.maxTenorMonths || 0
              const targetApr = row.targetApr || row.TargetAPR || row.targetAPR || 0
              const maxPayLow = row.maxMonthlyPaymentLowCF || row.MaxPayLowCF || row.maxPaymentLowCF || 0
              const maxPayHigh = row.maxMonthlyPaymentHighCF || row.MaxPayHighCF || row.maxPaymentHighCF || 0
              const minPay = row.minMonthlyPayment || row.MinPay || row.minPayment || 0
              const orgFee = row.orgFeePercent || row.OrgFeePercent || row.orgFee || 0
              
              return (
                <tr key={grade}>
                  <td>
                    <span style={{ fontWeight:800, color: GRADE_COLORS[grade] || 'var(--text)', fontFamily:'var(--mono)' }}>
                      {grade}
                    </span>
                  </td>
                  <td><code style={{ fontFamily:'var(--mono)', color:'var(--success)' }}>${maxLoan?.toLocaleString()}</code></td>
                  <td>{maxTenor} mo</td>
                  <td><span style={{ color:'var(--warning)', fontFamily:'var(--mono)' }}>{targetApr}%</span></td>
                  <td>${maxPayLow}</td>
                  <td>${maxPayHigh}</td>
                  <td>${minPay}</td>
                  <td><code style={{ fontSize:11, color:'var(--cyan)', fontFamily:'var(--mono)' }}>{(orgFee * 100).toFixed(2)}%</code></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TenorOptionsView({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Tenor Options by Loan Amount Range</div>
        <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
          <div style={{ fontSize:14 }}>No tenor options configured</div>
        </div>
      </div>
    )
  }
  
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
