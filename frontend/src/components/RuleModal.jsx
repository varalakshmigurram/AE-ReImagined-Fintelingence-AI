import { useState } from 'react'
import { X } from 'lucide-react'

const PHASES = ['BEFORE_DATA_PULL', 'TU_PULL', 'CREDIT_GRADE', 'OFFER_LOGIC', 'POST_TU']
const STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT']
const ENVS = ['TEST', 'PROD']

export default function RuleModal({ rule, onSave, onClose }) {
  const [form, setForm] = useState({
    ruleId: rule?.ruleId ?? '',
    ruleNumber: rule?.ruleNumber ?? '',
    description: rule?.description ?? '',
    applicableSegment: rule?.applicableSegment ?? '',
    cutoffs: rule?.cutoffs ?? '',
    applyPercentage: rule?.applyPercentage ?? '',
    phase: rule?.phase ?? 'BEFORE_DATA_PULL',
    status: rule?.status ?? 'DRAFT',
    environment: rule?.environment ?? 'TEST',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{rule ? 'Edit Rule' : 'New Rule'}</div>
            {rule && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ID: {rule.id}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Rule ID *</label>
                <input className="form-control" required value={form.ruleId} onChange={e => set('ruleId', e.target.value)} placeholder="e.g. AE_INVALID_STATE" disabled={!!rule} />
              </div>
              <div className="form-group">
                <label className="form-label">Rule Number *</label>
                <input className="form-control" required value={form.ruleNumber} onChange={e => set('ruleNumber', e.target.value)} placeholder="e.g. 1, 2a, b1" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Description *</label>
              <textarea className="form-control" required value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the rule logic..." rows={3} />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Applicable Segment *</label>
              <input className="form-control" required value={form.applicableSegment} onChange={e => set('applicableSegment', e.target.value)} placeholder="e.g. All, QS, ML, Segment_flag = Others" />
            </div>

            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Cutoffs</label>
                <input className="form-control" value={form.cutoffs} onChange={e => set('cutoffs', e.target.value)} placeholder="e.g. 500 or cutoff1=42000, cutoff2=540" />
              </div>
              <div className="form-group">
                <label className="form-label">Apply % (X)</label>
                <input className="form-control" value={form.applyPercentage} onChange={e => set('applyPercentage', e.target.value)} placeholder="e.g. 1 = 100%, 0.9 = 90%" />
              </div>
            </div>

            <div className="grid grid-3" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Phase *</label>
                <select className="form-control" value={form.phase} onChange={e => set('phase', e.target.value)}>
                  {PHASES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Environment</label>
                <select className="form-control" value={form.environment} onChange={e => set('environment', e.target.value)}>
                  {ENVS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
