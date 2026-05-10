import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Copy, CheckCircle, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { saveEmbeddedRules, validateRules, getVariables, createRule } from '../../services/api'
import { PopupPortal } from '../../components/PopupPortal'
import axios from 'axios'

const v1api = axios.create({ baseURL: '/api/v1/config-versions', timeout: 10000 })
const checkVersion = (ver, scope) => v1api.get('/validate', { params: { version: ver, scope } }).then(r => r.data)

// ─── Operators ────────────────────────────────────────────────────────────────
const OPERATORS = {
  INTEGER: [
    { id:'LT',  label:'is less than',                symbol:'<',       arity:'single' },
    { id:'LTE', label:'is less than or equal to',    symbol:'<=',      arity:'single' },
    { id:'GT',  label:'is greater than',             symbol:'>',       arity:'single' },
    { id:'GTE', label:'is greater than or equal to', symbol:'>=',      arity:'single' },
    { id:'EQ',  label:'equals',                      symbol:'==',      arity:'single' },
    { id:'NEQ', label:'does not equal',              symbol:'!=',      arity:'single' },
    { id:'BTW', label:'is between',                  symbol:'between', arity:'range' },
    { id:'IN',  label:'is one of',                   symbol:'in',      arity:'list' },
  ],
  DOUBLE: [
    { id:'LT',  label:'is less than',               symbol:'<',  arity:'single' },
    { id:'LTE', label:'is less than or equal to',   symbol:'<=', arity:'single' },
    { id:'GT',  label:'is greater than',            symbol:'>',  arity:'single' },
    { id:'GTE', label:'is greater than or equal to',symbol:'>=', arity:'single' },
    { id:'EQ',  label:'equals',                     symbol:'==', arity:'single' },
    { id:'BTW', label:'is between',                 symbol:'between', arity:'range' },
  ],
  BOOLEAN: [
    { id:'IS_TRUE',  label:'is true',  symbol:'== true',  arity:'none' },
    { id:'IS_FALSE', label:'is false', symbol:'== false', arity:'none' },
  ],
  STRING: [
    { id:'EQ',       label:'equals',             symbol:'==',        arity:'single' },
    { id:'NEQ',      label:'does not equal',     symbol:'!=',        arity:'single' },
    { id:'IN',       label:'is one of',          symbol:'in',        arity:'list' },
    { id:'NOT_IN',   label:'is not one of',      symbol:'not in',    arity:'list' },
    { id:'CONTAINS', label:'contains',           symbol:'contains',  arity:'single' },
    { id:'STARTS',   label:'starts with',        symbol:'startsWith',arity:'single' },
    { id:'NULL',     label:'is null / empty',    symbol:'isNull',    arity:'none' },
    { id:'NOT_NULL', label:'is not null',        symbol:'!= null',   arity:'none' },
  ],
}

const RESULT_OPTIONS    = ['HARD','PASS','PEND','SPECIAL']
const EXCEPTION_OPTIONS = ['MARK_ERROR','MARK_TRUE','MARK_FALSE','MARK_SKIP']
const PROVIDER_OPTIONS  = ['tu','ccr','clarity','cbs']

function buildCondition(clauses) {
  if (!clauses?.length) return { condition:'', humanReadable:'' }
  const parts = clauses.map((c, idx) => {
    const { variableSource:src, variableName:name, variableDataType:dt, operator, value, value2, valueType } = c
    const fullVar = src ? `${src}.${name}` : (name || '')
    const ref = valueType === 'CUTOFF_REF' ? `cutoffs['${value}']` : value
    let cond = '', human = ''
    switch (operator) {
      case 'LT':  cond=`${fullVar} < ${ref}`;  human=`${fullVar} < ${value}`; break
      case 'LTE': cond=`${fullVar} <= ${ref}`; human=`${fullVar} ≤ ${value}`; break
      case 'GT':  cond=`${fullVar} > ${ref}`;  human=`${fullVar} > ${value}`; break
      case 'GTE': cond=`${fullVar} >= ${ref}`; human=`${fullVar} ≥ ${value}`; break
      case 'EQ':  cond=`${fullVar} == ${dt==='STRING'?`'${value}'`:value}`; human=`${fullVar} = "${value}"`; break
      case 'NEQ': cond=`${fullVar} != ${dt==='STRING'?`'${value}'`:value}`; human=`${fullVar} ≠ "${value}"`; break
      case 'BTW': cond=`${fullVar} >= ${value} && ${fullVar} <= ${value2}`; human=`${value} ≤ ${fullVar} ≤ ${value2}`; break
      case 'IN': {
        const vs = value.split(',').map(v=>v.trim())
        cond=`{${vs.map(v=>dt==='STRING'?`'${v}'`:v).join(',')}}.contains(${fullVar})`
        human=`${fullVar} ∈ [${vs.join(', ')}]`; break
      }
      case 'NOT_IN': {
        const vs=value.split(',').map(v=>v.trim())
        cond=`!{${vs.map(v=>`'${v}'`).join(',')}}.contains(${fullVar})`
        human=`${fullVar} ∉ [${vs.join(', ')}]`; break
      }
      case 'CONTAINS': cond=`${fullVar}.contains('${value}')`; human=`${fullVar} contains "${value}"`; break
      case 'STARTS':   cond=`${fullVar}.startsWith('${value}')`; human=`${fullVar} starts with "${value}"`; break
      case 'IS_TRUE':  cond=`${fullVar} == true`; human=`${fullVar} is true`; break
      case 'IS_FALSE': cond=`${fullVar} == false`; human=`${fullVar} is false`; break
      case 'NULL':     cond=`(${fullVar} == null || ${fullVar}.isEmpty())`; human=`${fullVar} is null`; break
      case 'NOT_NULL': cond=`${fullVar} != null`; human=`${fullVar} is not null`; break
      default: break
    }
    const conn = idx < clauses.length-1 ? ` ${c.connector||'AND'} ` : ''
    return { cond: cond+conn, human: human+conn }
  })
  return {
    condition: parts.map(p=>p.cond).join('').trim(),
    humanReadable: parts.map(p=>p.human).join('').trim()
  }
}

// ─── Popup Step 1: Variable ───────────────────────────────────────────────────
function VariablePopup({ variables, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [src, setSrc] = useState('ALL')
  const sources = ['ALL', ...new Set(Object.values(variables).map(v=>v?.source).filter(Boolean))]
  const TYPE_COLOR = { INTEGER:'#2563EB', DOUBLE:'#D97706', BOOLEAN:'#059669', STRING:'#7C3AED' }
  const filtered = Object.entries(variables).filter(([n, info]) => {
    if (src !== 'ALL' && info?.source !== src) return false
    if (search && !n.toLowerCase().includes(search.toLowerCase()) && !info?.source?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  return (
    <div>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>① Select Variable</div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><X size={14}/></button>
      </div>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', display:'flex', gap:8 }}>
        <input className="form-control" placeholder="Search variables…" value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1, fontSize:12 }} autoFocus/>
        <select className="form-control" style={{ width:110, fontSize:11 }} value={src} onChange={e=>setSrc(e.target.value)}>
          {sources.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ maxHeight:260, overflowY:'auto' }}>
        {filtered.length === 0 && <div style={{ padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>No variables found</div>}
        {filtered.map(([name, info]) => (
          <div key={name} onClick={()=>onSelect({ variableName:name, variableSource:info?.source||'', variableDataType:info?.dataType||'STRING', variableDisplayName:`${info?.source}.${name}` })}
            style={{ padding:'8px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center', transition:'background .08s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <code style={{ fontSize:12, color:TYPE_COLOR[info?.dataType]||'#64748B', fontFamily:'var(--mono)' }}>{info?.source}.{name}</code>
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:`${TYPE_COLOR[info?.dataType]||'#64748B'}18`, color:TYPE_COLOR[info?.dataType]||'#64748B', fontWeight:700, marginLeft:'auto', flexShrink:0 }}>{info?.dataType}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Popup Step 2: Operator ───────────────────────────────────────────────────
function OperatorPopup({ dataType, onSelect, onClose }) {
  const ops = OPERATORS[dataType] || OPERATORS.STRING
  const ARITY_DESC = { single:'One value', range:'Min and max values', list:'Comma-separated list', none:'No value needed' }
  return (
    <div>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>② Select Condition</div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><X size={14}/></button>
      </div>
      {ops.map(op => (
        <div key={op.id} onClick={()=>onSelect(op)}
          style={{ display:'flex', gap:12, padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', alignItems:'center', transition:'background .08s' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <code style={{ width:64, fontSize:12, color:'#D97706', fontFamily:'var(--mono)', flexShrink:0, fontWeight:600 }}>{op.symbol}</code>
          <div>
            <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{op.label}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{ARITY_DESC[op.arity]}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Popup Step 3: Value ──────────────────────────────────────────────────────
function ValuePopup({ arity, dataType, onConfirm, onClose, existingValue='', existingValue2='', existingValueType='LITERAL' }) {
  const [value, setValue]   = useState(existingValue)
  const [value2, setValue2] = useState(existingValue2)
  const [vtype, setVtype]   = useState(existingValueType)
  const valid = arity === 'range' ? (value.trim() && value2.trim()) : value.trim()

  if (arity === 'none') { setTimeout(() => onConfirm({ value:'', value2:'', valueType:'LITERAL' }), 0); return null }

  return (
    <div>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>③ Enter Value</div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><X size={14}/></button>
      </div>
      <div style={{ padding:14 }}>
        <div className="form-group" style={{ marginBottom:10 }}>
          <label className="form-label">Value Type</label>
          <select className="form-control" value={vtype} onChange={e=>setVtype(e.target.value)}>
            <option value="LITERAL">Fixed Value</option>
            <option value="CUTOFF_REF">Cutoff Reference (resolved at runtime)</option>
          </select>
        </div>
        {arity === 'range' ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div className="form-group"><label className="form-label">Minimum</label><input className="form-control" type="number" value={value} onChange={e=>setValue(e.target.value)} autoFocus/></div>
            <div className="form-group"><label className="form-label">Maximum</label><input className="form-control" type="number" value={value2} onChange={e=>setValue2(e.target.value)}/></div>
          </div>
        ) : arity === 'list' ? (
          <div className="form-group" style={{ marginBottom:12 }}>
            <label className="form-label">Values (comma separated)</label>
            <input className="form-control" value={value} onChange={e=>setValue(e.target.value)} placeholder="A, B, C" autoFocus/>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Separate each value with a comma</div>
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom:12 }}>
            <label className="form-label">{vtype==='CUTOFF_REF'?'Cutoff Name':'Value'}</label>
            <input className="form-control"
              type={dataType==='STRING'||vtype==='CUTOFF_REF'?'text':'number'}
              value={value} onChange={e=>setValue(e.target.value)}
              placeholder={vtype==='CUTOFF_REF'?'e.g. cvScoreCutoff':'500'}
              autoFocus/>
            {vtype==='CUTOFF_REF' && <div style={{ fontSize:10, color:'var(--accent)', marginTop:3 }}>Resolved at runtime via creditGrade × channel × state dimensions</div>}
          </div>
        )}
        <button className="btn btn-primary" style={{ width:'100%' }} disabled={!valid} onClick={()=>onConfirm({ value, value2, valueType:vtype })}>
          Confirm →
        </button>
      </div>
    </div>
  )
}

// ─── Single clause row (using portal for popups) ──────────────────────────────
function ClauseRow({ clause, idx, variables, onChange, onRemove }) {
  const varBtnRef  = useRef()
  const opBtnRef   = useRef()
  const valBtnRef  = useRef()
  const [popup, setPopup] = useState(null) // 'var' | 'op' | 'val' | null

  const ops      = OPERATORS[clause.variableDataType] || OPERATORS.STRING
  const selOp    = ops.find(o => o.id === clause.operator)
  const isComplete = clause.variableName && clause.operator && (selOp?.arity === 'none' || clause.value)

  const preview = isComplete ? buildCondition([clause]).humanReadable : null

  const openVar = () => setPopup(popup==='var' ? null : 'var')
  const openOp  = () => setPopup(popup==='op'  ? null : 'op')
  const openVal = () => setPopup(popup==='val'  ? null : 'val')
  const close   = () => setPopup(null)

  const onVarSelect = (v) => {
    onChange({ ...clause, ...v, operator:'', value:'', value2:'', valueType:'LITERAL' })
    setPopup('op')
  }
  const onOpSelect = (op) => {
    onChange({ ...clause, operator:op.id, operatorLabel:op.label, operatorArity:op.arity })
    if (op.arity === 'none') { close(); onChange({ ...clause, operator:op.id, operatorLabel:op.label, operatorArity:'none', value:'', value2:'', valueType:'LITERAL' }) }
    else setPopup('val')
  }
  const onValConfirm = ({ value, value2, valueType }) => {
    onChange({ ...clause, value, value2, valueType })
    close()
  }

  return (
    <div style={{ border:`1px solid ${isComplete?'#059669':'var(--border)'}`, borderRadius:'var(--radius)', padding:12, marginBottom:8, background: isComplete?'var(--success-light)':'var(--bg-card2)' }}>
      {idx > 0 && (
        <div style={{ marginBottom:8 }}>
          <select className="form-control" style={{ width:140, fontSize:11 }} value={clause.connector||'AND'} onChange={e=>onChange({...clause,connector:e.target.value})}>
            <option value="AND">AND — all must be true</option>
            <option value="OR">OR — any may be true</option>
          </select>
        </div>
      )}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        {/* Step 1 */}
        <div ref={varBtnRef} style={{ position:'relative' }}>
          <button className="btn btn-ghost btn-sm" onClick={openVar}
            style={{ background:clause.variableName?'var(--accent-light)':'', borderColor:clause.variableName?'var(--accent)':'' }}>
            {clause.variableName
              ? <code style={{ color:'var(--accent)', fontSize:11, fontFamily:'var(--mono)', fontWeight:600 }}>{clause.variableDisplayName||clause.variableName}</code>
              : <><span style={{ color:'var(--accent)', fontWeight:700 }}>①</span> Select Variable</>}
            <ChevronDown size={11}/>
          </button>
          <PopupPortal triggerRef={varBtnRef} open={popup==='var'} onClose={close} width={400}>
            <VariablePopup variables={variables} onSelect={onVarSelect} onClose={close}/>
          </PopupPortal>
        </div>

        {/* Step 2 */}
        {clause.variableName && (
          <div ref={opBtnRef} style={{ position:'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={openOp}
              style={{ background:clause.operator?'var(--warning-light)':'', borderColor:clause.operator?'var(--warning)':'' }}>
              {clause.operator
                ? <span style={{ color:'var(--warning)', fontWeight:600 }}>{selOp?.label}</span>
                : <><span style={{ color:'var(--warning)', fontWeight:700 }}>②</span> Select Condition</>}
              <ChevronDown size={11}/>
            </button>
            <PopupPortal triggerRef={opBtnRef} open={popup==='op'} onClose={close} width={320}>
              <OperatorPopup dataType={clause.variableDataType} onSelect={onOpSelect} onClose={close}/>
            </PopupPortal>
          </div>
        )}

        {/* Step 3 */}
        {clause.operator && selOp?.arity !== 'none' && (
          <div ref={valBtnRef} style={{ position:'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={openVal}
              style={{ background:clause.value?'var(--success-light)':'', borderColor:clause.value?'var(--success)':'' }}>
              {clause.value
                ? <span style={{ color:'var(--success)', fontFamily:'var(--mono)', fontSize:11, fontWeight:600 }}>
                    {clause.valueType==='CUTOFF_REF'?`[${clause.value}]`:clause.value}
                    {clause.value2?` — ${clause.value2}`:''}
                  </span>
                : <><span style={{ color:'var(--success)', fontWeight:700 }}>③</span> Enter Value</>}
              <ChevronDown size={11}/>
            </button>
            <PopupPortal triggerRef={valBtnRef} open={popup==='val'} onClose={close} width={340}>
              <ValuePopup arity={selOp?.arity} dataType={clause.variableDataType}
                onConfirm={onValConfirm} onClose={close}
                existingValue={clause.value} existingValue2={clause.value2} existingValueType={clause.valueType}/>
            </PopupPortal>
          </div>
        )}

        <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft:'auto', color:'var(--danger)' }} onClick={onRemove}><Trash2 size={12}/></button>
      </div>

      {isComplete && preview && (
        <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, background:'var(--success-light)', border:'1px solid rgba(5,150,105,.2)', borderRadius:'var(--radius-sm)', padding:'5px 10px' }}>
          <CheckCircle size={12} color="var(--success)"/>
          <span style={{ fontSize:11, color:'var(--success)', fontStyle:'italic', fontWeight:500 }}>{preview}</span>
        </div>
      )}
    </div>
  )
}

// ─── Version input with collision check ───────────────────────────────────────
function VersionInput({ version, setVersion, onStatusChange }) {
  const [status, setStatus] = useState(null)
  const [msg, setMsg]       = useState('')
  const [suggested, setSuggested] = useState('')

  const check = async () => {
    if (!version.trim() || !/^\d+\.\d+\.\d+$/.test(version.trim())) { 
      setStatus('error'); 
      setMsg('Must be x.y.z format')
      onStatusChange?.('error')
      return 
    }
    setStatus('checking')
    onStatusChange?.('checking')
    try {
      const r = await checkVersion(version.trim(), 'RULES')
      if (r.valid) { 
        setStatus('ok'); 
        setMsg('Version available')
        setSuggested('')
        onStatusChange?.('ok')
      }
      else { 
        setStatus('error'); 
        setMsg(r.error||'Version taken'); 
        setSuggested(r.suggestedNext||'')
        onStatusChange?.('error')
      }
    } catch { 
      setStatus(null)
      onStatusChange?.(null)
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">Config Version * <span style={{ textTransform:'none', fontWeight:400, color:'var(--text-muted)' }}>— unique per scope (x.y.z)</span></label>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input className="form-control" value={version} onChange={e=>{setVersion(e.target.value);setStatus(null);onStatusChange?.(null)}}
          onBlur={check} placeholder="1.0.0" style={{ width:110, fontFamily:'var(--mono)' }}/>
        {status==='checking' && <div className="spinner" style={{width:14,height:14}}/>}
        {status==='ok'    && <CheckCircle size={15} color="var(--success)"/>}
        {status==='error' && <AlertCircle size={15} color="var(--danger)"/>}
        {status==='ok'    && <span style={{ fontSize:11, color:'var(--success)', fontWeight:500 }}>{msg}</span>}
        {status==='error' && (
          <span style={{ fontSize:11, color:'var(--danger)' }}>{msg}
            {suggested && <> — try <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:11, fontFamily:'var(--mono)', fontWeight:600 }} onClick={()=>{setVersion(suggested);setStatus(null);onStatusChange?.(null)}}>{suggested}</button></>}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Rule card ────────────────────────────────────────────────────────────────
const defaultClause = () => ({ _id:Math.random(), variableName:'', operator:'', value:'', connector:'AND' })

function RuleCard({ rule, variables, onUpdate, onRemove }) {
  const [exp, setExp] = useState(true)

  const updateClause = (ci, val) => {
    const clauses = [...(rule.clauses||[])]; clauses[ci] = val
    const { condition, humanReadable } = buildCondition(clauses)
    onUpdate({ ...rule, clauses, condition, description: humanReadable })
  }
  const addClause    = () => onUpdate({ ...rule, clauses:[...(rule.clauses||[]), defaultClause()] })
  const removeClause = (ci) => {
    const clauses = (rule.clauses||[]).filter((_,i)=>i!==ci)
    const { condition, humanReadable } = buildCondition(clauses)
    onUpdate({ ...rule, clauses, condition, description: humanReadable })
  }

  const done = (rule.clauses||[]).length > 0 && (rule.clauses||[]).every(c => {
    const op = (OPERATORS[c.variableDataType]||OPERATORS.STRING).find(o=>o.id===c.operator)
    return c.variableName && c.operator && (op?.arity==='none'||c.value)
  })

  return (
    <div className="card" style={{ marginBottom:10, borderLeft:`3px solid ${done&&rule.ruleId?'var(--success)':'var(--border-strong)'}` }}>
      <div style={{ padding:'10px 14px', display:'flex', gap:10, alignItems:'center', cursor:'pointer' }} onClick={()=>setExp(e=>!e)}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:rule.enabled!==false?'var(--success)':'var(--text-muted)', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>
            {rule.ruleId || <span style={{ color:'var(--text-muted)', fontStyle:'italic', fontWeight:400 }}>New Rule — click to configure</span>}
          </div>
          {rule.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, fontStyle:'italic' }}>"{rule.description.slice(0,80)}{rule.description.length>80?'…':''}"</div>}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {rule.result && <span className={`badge badge-${rule.result==='HARD'?'rejected':rule.result==='PASS'?'approved':rule.result==='PEND'?'pending':'draft'}`} style={{ fontSize:10 }}>{rule.result}</span>}
          {(rule.clauses||[]).length>0 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{rule.clauses.length} clause{rule.clauses.length>1?'s':''}</span>}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={e=>{e.stopPropagation();onRemove()}}><Trash2 size={11}/></button>
          {exp ? <ChevronUp size={14} color="var(--text-muted)"/> : <ChevronDown size={14} color="var(--text-muted)"/>}
        </div>
      </div>

      {exp && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, marginTop:12, marginBottom:14 }}>
            <div className="form-group">
              <label className="form-label">Rule ID *</label>
              <input className="form-control" value={rule.ruleId||''} onChange={e=>onUpdate({...rule,ruleId:e.target.value})} placeholder="AE_MY_RULE" style={{ fontFamily:'var(--mono)' }}/>
            </div>
            <div className="form-group">
              <label className="form-label">Result</label>
              <select className="form-control" value={rule.result||'HARD'} onChange={e=>onUpdate({...rule,result:e.target.value})}>
                {RESULT_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">On Exception</label>
              <select className="form-control" value={rule.exceptionHandling||'MARK_ERROR'} onChange={e=>onUpdate({...rule,exceptionHandling:e.target.value})}>
                {EXCEPTION_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Active</label>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', paddingTop:8 }}>
                <input type="checkbox" checked={rule.enabled!==false} onChange={e=>onUpdate({...rule,enabled:e.target.checked})}/>
                <span style={{ fontSize:12, fontWeight:500 }}>{rule.enabled!==false?'Yes':'No'}</span>
              </label>
            </div>
          </div>

          {/* Condition builder */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ fontWeight:600, fontSize:12, color:'var(--text)' }}>
                Rule Condition
                <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400, marginLeft:6 }}>Use the 3-step guided selectors — no code needed</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={addClause}><Plus size={11}/> Add Clause</button>
            </div>

            {(rule.clauses||[]).length === 0 ? (
              <div style={{ border:'2px dashed var(--border-strong)', borderRadius:'var(--radius)', padding:20, textAlign:'center', background:'var(--bg)' }}>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>No conditions yet</div>
                <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:12 }}>
                  {[['①','Select Variable','var(--accent)'],['②','Select Condition','var(--warning)'],['③','Enter Value','var(--success)']].map(([n,l,c])=>(
                    <div key={n} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', background:'var(--bg-card)', border:`1px solid ${c}44`, borderRadius:20, fontSize:11 }}>
                      <span style={{ color:c, fontWeight:700 }}>{n}</span><span style={{ color:'var(--text-muted)' }}>{l}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" onClick={addClause}><Plus size={12}/> Add First Clause</button>
              </div>
            ) : (rule.clauses||[]).map((clause,ci)=>(
              <ClauseRow key={clause._id||ci} clause={clause} idx={ci} variables={variables}
                onChange={v=>updateClause(ci,v)} onRemove={()=>removeClause(ci)}/>
            ))}

            {rule.condition && (
              <div style={{ marginTop:8, padding:'8px 12px', background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Compiled Condition</div>
                <code style={{ fontSize:11, color:'var(--accent)', background:'transparent', border:'none', padding:0, fontFamily:'var(--mono)', wordBreak:'break-all' }}>{rule.condition}</code>
              </div>
            )}
          </div>

          {/* Tags & Providers */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input className="form-control" style={{ fontSize:12 }} value={(rule.tags||[]).join(',')}
                onChange={e=>onUpdate({...rule,tags:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)})}
                placeholder="ELIGIBLE_FOR_JGW, APPROVAL"/>
            </div>
            <div className="form-group">
              <label className="form-label">Data Provider Requirements</label>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:6 }}>
                {PROVIDER_OPTIONS.map(p=>(
                  <label key={p} style={{ display:'flex', gap:4, alignItems:'center', cursor:'pointer', fontSize:12 }}>
                    <input type="checkbox" checked={(rule.thirdPartySources||[]).includes(p)}
                      onChange={e=>{const cur=rule.thirdPartySources||[];onUpdate({...rule,thirdPartySources:e.target.checked?[...cur,p]:cur.filter(x=>x!==p)})}}/>
                    <span style={{ fontFamily:'var(--mono)', color:'var(--cyan)', fontSize:11, fontWeight:600 }}>{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const defaultRule = () => ({ _id:Math.random(), ruleId:'', result:'HARD', exceptionHandling:'MARK_ERROR', enabled:true, tags:[], thirdPartySources:[], channelOverrides:[], clauses:[], condition:'', description:'' })

export default function RuleBuilder() {
  const [groups, setGroups]       = useState({ CREDIT:[defaultRule()] })
  const [activeGroup, setActive]  = useState('CREDIT')
  const [newGrpName, setNewGrp]   = useState('')
  const [variables, setVariables] = useState({})
  const [version, setVersion]     = useState('1.0.0')
  const [versionDesc, setVDesc]   = useState('')
  const [versionStatus, setVersionStatus] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setVR] = useState(null)
  const [showAddVar, setShowAddVar] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarSource, setNewVarSource] = useState('custom')
  const [newVarType, setNewVarType] = useState('STRING')
  const [ruleCountOnLoad, setRuleCountOnLoad] = useState(1)

  useEffect(() => { 
    getVariables().then(setVariables).catch(()=>{})
    setRuleCountOnLoad(1)
  }, [])

  const incrementVersion = () => {
    const parts = version.split('.')
    parts[2] = String(parseInt(parts[2]) + 1)
    setVersion(parts.join('.'))
  }

  const rules = groups[activeGroup] || []
  const upGrp = fn => setGroups(g => ({...g, [activeGroup]: fn(g[activeGroup]||[])}))
  const addRule   = () => {
    upGrp(rs => [...rs, defaultRule()])
    incrementVersion()
  }
  const upRule    = (i, v) => upGrp(rs => rs.map((r,j) => j===i ? v : r))
  const remRule   = (i) => upGrp(rs => rs.filter((_,j) => j!==i))

  const addCustomVariable = () => {
    if (!newVarName.trim()) {
      toast.error('Variable name is required')
      return
    }
    const fullName = `${newVarSource}.${newVarName.trim()}`
    setVariables(v => ({
      ...v,
      [fullName]: { source: newVarSource, dataType: newVarType }
    }))
    toast.success(`Added variable: ${fullName}`)
    setNewVarName('')
    setNewVarSource('custom')
    setNewVarType('STRING')
    setShowAddVar(false)
  }

  const addGroup = () => {
    const n = newGrpName.trim().toUpperCase(); if (!n) return
    setGroups(g => ({...g,[n]:[defaultRule()]})); setActive(n); setNewGrp('')
  }
  const remGroup = (n) => {
    if (n===activeGroup && Object.keys(groups).length>1) setActive(Object.keys(groups).filter(k=>k!==n)[0])
    setGroups(g=>{const ng={...g};delete ng[n];return ng})
  }

  const buildPayload = () => ({
    version, versionDescription:versionDesc, createdBy:'lead-analyst',
    rulesByGroup: Object.fromEntries(Object.entries(groups).map(([gn,rs])=>[gn, rs.map(r=>({
      ruleId:r.ruleId, description:r.description, condition:r.condition,
      result:r.result, exceptionHandling:r.exceptionHandling, enabled:r.enabled!==false,
      tags:r.tags||[], thirdPartySources:r.thirdPartySources||[], channelOverrides:r.channelOverrides||[],
    }))]))
  })

  const handleValidate = async () => {
    setValidating(true)
    try {
      const r = await validateRules(buildPayload()); setVR(r)
      if (r.success) toast.success('Validation passed ✓')
      else toast.error(`${r.validationErrors?.length} error(s)`)
    } catch(e) { toast.error(e.message) } finally { setValidating(false) }
  }

  const handleSave = async () => {
    if (versionStatus !== 'ok') { 
      toast.error('Please validate version first'); 
      return 
    }
    setSaving(true)
    try {
      // Save each rule to the Rules page
      const payload = buildPayload()
      let savedCount = 0
      for (const [groupName, rulesList] of Object.entries(payload.rulesByGroup)) {
        for (const rule of rulesList) {
          if (!rule.ruleId?.trim()) {
            toast.error('All rules must have a Rule ID')
            setSaving(false)
            return
          }
          await createRule({
            ruleId: rule.ruleId,
            ruleNumber: rule.ruleId.split('_').pop(),
            description: rule.description || rule.ruleId,
            applicableSegment: 'All',
            phase: 'BEFORE_DATA_PULL',
            status: 'DRAFT',
            environment: 'TEST'
          })
          savedCount++
        }
      }
      toast.success(`✓ Saved ${savedCount} rule${savedCount !== 1 ? 's' : ''} to Rules page`)
      setVersionStatus(null)
    } catch(e) { 
      const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message
      toast.error(errorMsg)
    } finally { setSaving(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Rule Builder</div>
          <div className="page-subtitle">Build rules using guided 3-step popups — no code required</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={()=>{navigator.clipboard.writeText(JSON.stringify(buildPayload(),null,2));toast.success('Copied')}}>
            <Copy size={13}/> Copy JSON
          </button>
          <button className="btn btn-ghost" onClick={handleValidate} disabled={validating}>
            {validating?<div className="spinner" style={{width:13,height:13}}/>:'✓'} Validate
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || versionStatus !== 'ok'}>
            {saving?<><div className="spinner" style={{width:13,height:13}}/> Saving…</>:<><Save size={13}/> Save v{version}</>}
          </button>
        </div>
      </div>

      {/* Version strip */}
      <div className="card" style={{ padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 180px', gap:16, alignItems:'start' }}>
          <VersionInput version={version} setVersion={setVersion} onStatusChange={setVersionStatus}/>
          <div className="form-group">
            <label className="form-label">Change Description</label>
            <input className="form-control" value={versionDesc} onChange={e=>setVDesc(e.target.value)} placeholder="e.g. Updated PTSMI cutoff from 0.10 to 0.115"/>
          </div>
          <div style={{ paddingTop:20 }}>
            <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'8px 10px', fontSize:10, color:'var(--text-muted)', lineHeight:1.8 }}>
              <div><b style={{ color:'var(--text)' }}>x</b>.y.z — requires code deploy</div>
              <div>x.<b style={{ color:'var(--text)' }}>y</b>.z — value-only change</div>
              <div>x.y.<b style={{ color:'var(--text)' }}>z</b> — QA/test only</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16 }}>
        {/* Group sidebar */}
        <div>
          <div className="card" style={{ marginBottom:12 }}>
            <div className="card-header" style={{ fontSize:13, fontWeight:600 }}>Rule Groups</div>
            {Object.keys(groups).map(gn=>(
              <div key={gn} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:gn===activeGroup?'var(--bg-hover)':'', borderLeft:gn===activeGroup?'3px solid var(--accent)':'3px solid transparent' }}
                onClick={()=>setActive(gn)}>
                <span style={{ flex:1, fontSize:12, fontWeight:gn===activeGroup?700:500, fontFamily:'var(--mono)', color:gn===activeGroup?'var(--accent)':'var(--text-muted)' }}>{gn}</span>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>{(groups[gn]||[]).length}</span>
                {Object.keys(groups).length>1&&<button style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--text-muted)' }} onClick={e=>{e.stopPropagation();remGroup(gn)}}><Trash2 size={11}/></button>}
              </div>
            ))}
            <div style={{ padding:10, display:'flex', gap:6 }}>
              <input className="form-control" placeholder="GROUP_NAME" value={newGrpName} onChange={e=>setNewGrp(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&addGroup()} style={{ fontSize:11, padding:'4px 8px' }}/>
              <button className="btn btn-ghost btn-sm" onClick={addGroup}><Plus size={11}/></button>
            </div>
          </div>

          {validationResult && (
            <div className="card" style={{ marginBottom:12, borderLeft:`3px solid ${validationResult.success?'var(--success)':'var(--danger)'}` }}>
              <div style={{ padding:'8px 12px', fontWeight:600, fontSize:11, color:validationResult.success?'var(--success)':'var(--danger)' }}>
                {validationResult.success ? '✓ Validation Passed' : `✗ ${validationResult.validationErrors?.length} Error(s)`}
              </div>
              <div style={{ padding:'0 12px 10px' }}>
                {validationResult.validationErrors?.map((e,i)=>(
                  <div key={i} style={{ fontSize:11, color:'var(--danger)', marginBottom:3 }}>• {e}</div>
                ))||<div style={{ fontSize:11, color:'var(--success)' }}>All rules are valid</div>}
              </div>
            </div>
          )}

          {/* Variable quick ref */}
          <div className="card">
            <div className="card-header" style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              Variable Reference
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowAddVar(!showAddVar)} style={{ fontSize:10, padding:'2px 6px' }}>+ Add</button>
            </div>
            {showAddVar && (
              <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', background:'var(--bg-card2)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label" style={{ fontSize:10 }}>Source</label>
                    <input className="form-control" value={newVarSource} onChange={e=>setNewVarSource(e.target.value)} placeholder="e.g. tu, custom" style={{ fontSize:11, padding:'4px 6px' }}/>
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label" style={{ fontSize:10 }}>Variable Name</label>
                    <input className="form-control" value={newVarName} onChange={e=>setNewVarName(e.target.value)} placeholder="e.g. customScore" style={{ fontSize:11, padding:'4px 6px' }}/>
                  </div>
                </div>
                <div style={{ marginBottom:8 }}>
                  <label className="form-label" style={{ fontSize:10 }}>Data Type</label>
                  <select className="form-control" value={newVarType} onChange={e=>setNewVarType(e.target.value)} style={{ fontSize:11, padding:'4px 6px' }}>
                    <option value="STRING">STRING</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="DOUBLE">DOUBLE</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </select>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-primary btn-sm" onClick={addCustomVariable} style={{ fontSize:10, padding:'4px 8px', flex:1 }}>Add Variable</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setShowAddVar(false)} style={{ fontSize:10, padding:'4px 8px' }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ maxHeight:220, overflowY:'auto', padding:'4px 0' }}>
              {Object.entries(variables).slice(0,25).map(([name,info])=>(
                <div key={name} style={{ display:'flex', justifyContent:'space-between', padding:'4px 12px', fontSize:10 }}>
                  <code style={{ color:'var(--accent)', fontFamily:'var(--mono)', background:'transparent', border:'none', padding:0 }}>{info?.source}.{name}</code>
                  <span style={{ color:'var(--text-muted)' }}>{info?.dataType}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rules */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:14, fontFamily:'var(--mono)', color:'var(--accent)' }}>{activeGroup}</div>
            <button className="btn btn-ghost btn-sm" onClick={addRule}><Plus size={12}/> Add Rule</button>
          </div>
          {rules.length===0 ? (
            <div className="card">
              <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                <Shield size={28} style={{ marginBottom:10, opacity:.3 }}/>
                <div style={{ marginBottom:12 }}>No rules in this group</div>
                <button className="btn btn-primary btn-sm" onClick={addRule}><Plus size={12}/> Add First Rule</button>
              </div>
            </div>
          ) : rules.map((rule,idx)=>(
            <RuleCard key={rule._id} rule={rule} variables={variables} onUpdate={v=>upRule(idx,v)} onRemove={()=>remRule(idx)}/>
          ))}
        </div>
      </div>
    </div>
  )
}

// Needed for the empty state icon
function Shield({ size, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
