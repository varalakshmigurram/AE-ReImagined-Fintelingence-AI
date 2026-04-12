import { useState } from 'react'
import { X } from 'lucide-react'

const US_STATES = ['AK','AL','AR','AZ','CA','CO','DE','FL','HI','ID','IN','KS','KY','LA','MI','MN','MO','MS','MT','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI']

export default function StateModal({ state, onSave, onClose }) {
  const [form, setForm] = useState({
    stateCode: state?.stateCode ?? '',
    minLoanAmount: state?.minLoanAmount ?? 1000,
    maxLoanAmount: state?.maxLoanAmount ?? 10000,
    minApr: state?.minApr ?? 36,
    maxApr: state?.maxApr ?? 179.9,
    minTermMonths: state?.minTermMonths ?? 12,
    maxTermMonths: state?.maxTermMonths ?? 36,
    maxOriginationFee: state?.maxOriginationFee ?? '',
    maxOriginationFeePercentage: state?.maxOriginationFeePercentage ?? '',
    stateOnOff: state?.stateOnOff ?? '',
    originationFeeLogic: state?.originationFeeLogic ?? 'X % of disbursal amount (refer to OF table in Offer logic tab)',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    const cleaned = {
      ...form,
      maxOriginationFee: form.maxOriginationFee === '' ? null : Number(form.maxOriginationFee),
      maxOriginationFeePercentage: form.maxOriginationFeePercentage === '' ? null : Number(form.maxOriginationFeePercentage),
      stateOnOff: form.stateOnOff === '' ? null : form.stateOnOff,
    }
    try { await onSave(cleaned) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{state ? `Edit State: ${state.stateCode}` : 'Add State Constraint'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Configure loan constraints for this state</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">State Code *</label>
                {state
                  ? <input className="form-control" value={form.stateCode} disabled />
                  : (
                    <select className="form-control" required value={form.stateCode} onChange={e => set('stateCode', e.target.value)}>
                      <option value="">Select state…</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )
                }
              </div>
              <div className="form-group">
                <label className="form-label">State ON/OFF</label>
                <select className="form-control" value={form.stateOnOff} onChange={e => set('stateOnOff', e.target.value)}>
                  <option value="">ON (default)</option>
                  <option value="OFF">OFF</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loan Amount Constraints</div>
            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Min Loan Amount ($)</label>
                <input className="form-control" type="number" value={form.minLoanAmount} onChange={e => set('minLoanAmount', +e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Loan Amount ($)</label>
                <input className="form-control" type="number" value={form.maxLoanAmount} onChange={e => set('maxLoanAmount', +e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>APR & Term</div>
            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Min APR (%)</label>
                <input className="form-control" type="number" step="0.1" value={form.minApr} onChange={e => set('minApr', +e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max APR (%)</label>
                <input className="form-control" type="number" step="0.1" value={form.maxApr} onChange={e => set('maxApr', +e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Term (months)</label>
                <input className="form-control" type="number" value={form.minTermMonths} onChange={e => set('minTermMonths', +e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Term (months)</label>
                <input className="form-control" type="number" value={form.maxTermMonths} onChange={e => set('maxTermMonths', +e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origination Fee</div>
            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Max Origination Fee ($)</label>
                <input className="form-control" type="number" value={form.maxOriginationFee} onChange={e => set('maxOriginationFee', e.target.value ? +e.target.value : '')} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Orig Fee % (decimal)</label>
                <input className="form-control" type="number" step="0.01" value={form.maxOriginationFeePercentage} onChange={e => set('maxOriginationFeePercentage', e.target.value ? +e.target.value : '')} placeholder="e.g. 0.05 = 5%" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Origination Fee Logic</label>
              <input className="form-control" value={form.originationFeeLogic} onChange={e => set('originationFeeLogic', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (state ? 'Update State' : 'Add State')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
