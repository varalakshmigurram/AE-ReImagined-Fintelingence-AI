import { useState } from 'react'
import { Plus, Trash2, Save, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { saveEmbeddedRules } from '../../services/api'

const DIMENSION_PRESETS = {
  'creditGrade,channel,state': { dims: ['creditGrade','channel','state'], label: 'Grade × Channel × State' },
  'creditGrade,channel':       { dims: ['creditGrade','channel'],         label: 'Grade × Channel' },
  'creditGrade':               { dims: ['creditGrade'],                    label: 'Grade Only' },
}

const GRADE_OPTIONS    = ['A','B','C','D','E','A1','A2','B1','B2','C1','C2','D1','D2','E1','E2','F']
const CHANNEL_OPTIONS  = ['ORG','ONLINE','CKPQ','QS','LT','ML','MO','CMPQ','CMACT']
const STATE_OPTIONS    = ['AK','AL','AR','AZ','CA','CO','DE','FL','HI','ID','IN','KS','KY','LA','MI','MN','MO_ST','MS','MT','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI']

const OPTIONS_MAP = { creditGrade: GRADE_OPTIONS, channel: CHANNEL_OPTIONS, state: STATE_OPTIONS }

function buildKey(dims, vals) { return dims.map(d => vals[d] || '*').join(',') }

export default function CutoffManager() {
  const [groups, setGroups] = useState([
    {
      name: 'fraudScoreCutoff',
      dimPreset: 'creditGrade,channel,state',
      entries: [
        { dims: { creditGrade:'A', channel:'ORG', state:'AK' }, value: 500 },
        { dims: { creditGrade:'B', channel:'ORG', state:'AK' }, value: 450 },
        { dims: { creditGrade:'A', channel:'ONLINE', state:'AK' }, value: 550 },
      ]
    },
    {
      name: 'cvScoreCutoff',
      dimPreset: 'creditGrade,channel,state',
      entries: [
        { dims: { creditGrade:'A', channel:'ORG', state:'AK' }, value: 800 },
        { dims: { creditGrade:'B', channel:'ORG', state:'AK' }, value: 750 },
      ]
    }
  ])
  const [saving, setSaving] = useState(false)

  const addGroup = () => setGroups(g => [...g, { name: 'newCutoff', dimPreset: 'creditGrade,channel,state', entries: [] }])
  const removeGroup = (i) => setGroups(g => g.filter((_,j) => j!==i))
  const updateGroupName = (i, name) => setGroups(g => g.map((gr,j) => j===i ? {...gr, name} : gr))
  const updateGroupPreset = (i, preset) => setGroups(g => g.map((gr,j) => j===i ? {...gr, dimPreset:preset, entries:[]} : gr))

  const addEntry = (gi) => {
    const dims = DIMENSION_PRESETS[groups[gi].dimPreset]?.dims || []
    const emptyDims = Object.fromEntries(dims.map(d => [d, dims.length > 0 ? OPTIONS_MAP[d]?.[0] || '' : '']))
    setGroups(g => g.map((gr,j) => j===gi ? {...gr, entries:[...gr.entries, {dims:emptyDims, value:0}]} : gr))
  }

  const removeEntry = (gi, ei) => setGroups(g => g.map((gr,j) => j===gi ? {...gr, entries:gr.entries.filter((_,k) => k!==ei)} : gr))

  const updateEntry = (gi, ei, field, val) => {
    setGroups(g => g.map((gr,j) => j===gi ? {
      ...gr, entries: gr.entries.map((e,k) => k===ei
        ? (field === 'value' ? {...e, value: isNaN(Number(val)) ? val : Number(val)}
                             : {...e, dims: {...e.dims, [field]: val}})
        : e)
    } : gr))
  }

  const buildPayload = () => {
    const cutoffs = {}
    groups.forEach(gr => {
      const dims = DIMENSION_PRESETS[gr.dimPreset]?.dims || []
      cutoffs[gr.name] = {}
      gr.entries.forEach(e => {
        cutoffs[gr.name][buildKey(dims, e.dims)] = e.value
      })
    })
    return { cutoffs }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      const r = await saveEmbeddedRules(payload)
      if (r.success) toast.success(`Cutoffs saved — batchId: ${r.batchId?.slice(0,8)}…`)
      else toast.error(r.validationErrors?.[0] || 'Save failed')
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Cutoff Manager</div>
          <div className="page-subtitle">Multi-dimensional cutoff configuration — creditGrade × channel × state</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={addGroup}><Plus size={13}/> Add Cutoff Group</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{width:13,height:13}}/> Saving…</> : <><Save size={13}/> Save to Backend</>}
          </button>
        </div>
      </div>

      {/* Payload Preview */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
          <Info size={12} color="var(--accent)"/> Preview — will be sent to POST /api/v1/embedded/rules/save
        </div>
        <pre style={{ padding:12, fontSize:11, fontFamily:'var(--mono)', color:'#93c5fd', background:'#0d1117', margin:0, maxHeight:120, overflowY:'auto', borderRadius:'0 0 var(--radius-lg) var(--radius-lg)' }}>
          {JSON.stringify(buildPayload(), null, 2)}
        </pre>
      </div>

      {groups.map((group, gi) => {
        const dims = DIMENSION_PRESETS[group.dimPreset]?.dims || []
        return (
          <div key={gi} className="card" style={{ marginBottom:16 }}>
            {/* Group Header */}
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
              <input
                className="form-control"
                style={{ width:240, fontFamily:'var(--mono)', fontSize:13 }}
                value={group.name}
                onChange={e => updateGroupName(gi, e.target.value)}
                placeholder="cutoffGroupName"
              />
              <select
                className="form-control"
                style={{ width:220 }}
                value={group.dimPreset}
                onChange={e => updateGroupPreset(gi, e.target.value)}
              >
                {Object.entries(DIMENSION_PRESETS).map(([k,v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => addEntry(gi)}>
                  <Plus size={11}/> Add Row
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => removeGroup(gi)}>
                  <Trash2 size={11}/>
                </button>
              </div>
            </div>

            {/* Entries Table */}
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead>
                  <tr>
                    {dims.map(d => <th key={d} style={{ textTransform:'capitalize' }}>{d}</th>)}
                    <th>Dimension Key</th>
                    <th>Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.length === 0 ? (
                    <tr><td colSpan={dims.length + 3} style={{ textAlign:'center', padding:20, color:'var(--muted)' }}>
                      No entries — click "Add Row"
                    </td></tr>
                  ) : group.entries.map((entry, ei) => (
                    <tr key={ei}>
                      {dims.map(d => (
                        <td key={d} style={{ padding:'6px 10px' }}>
                          <select
                            className="form-control"
                            style={{ padding:'4px 8px', fontSize:12 }}
                            value={entry.dims[d] || ''}
                            onChange={e => updateEntry(gi, ei, d, e.target.value)}
                          >
                            {(OPTIONS_MAP[d] || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                      ))}
                      <td style={{ padding:'6px 10px' }}>
                        <code style={{ fontSize:11, color:'var(--cyan)', fontFamily:'var(--mono)', background:'var(--bg-card2)', padding:'2px 8px', borderRadius:4 }}>
                          {buildKey(dims, entry.dims)}
                        </code>
                      </td>
                      <td style={{ padding:'6px 10px' }}>
                        <input
                          className="form-control"
                          type="number"
                          style={{ width:100, padding:'4px 8px', fontSize:12, fontFamily:'var(--mono)' }}
                          value={entry.value}
                          onChange={e => updateEntry(gi, ei, 'value', e.target.value)}
                        />
                      </td>
                      <td style={{ padding:'6px 10px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => removeEntry(gi, ei)}>
                          <Trash2 size={11}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
