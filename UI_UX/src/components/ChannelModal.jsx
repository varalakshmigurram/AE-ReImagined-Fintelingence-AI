import { useState } from 'react'
import { X } from 'lucide-react'

const CHANNELS = ['CMPQ', 'CKPQ', 'CMACT', 'QS', 'LT', 'ML', 'MO']

export default function ChannelModal({ channel, onSave, onClose }) {
  const [form, setForm] = useState({
    channelCode: channel?.channelCode ?? '',
    minLoanAmount: channel?.minLoanAmount ?? 1000,
    maxLoanAmount: channel?.maxLoanAmount ?? 10000,
    minApr: channel?.minApr ?? 36,
    maxApr: channel?.maxApr ?? 179.9,
    minTermMonths: channel?.minTermMonths ?? 12,
    maxTermMonths: channel?.maxTermMonths ?? 36,
    maxOriginationFee: channel?.maxOriginationFee ?? '',
    maxOriginationFeePercentage: channel?.maxOriginationFeePercentage ?? '',
    suppressedState: channel?.suppressedState ?? '',
    campaign: channel?.campaign ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e, submitAfter = false) => {
    e.preventDefault(); setSaving(true)
    const cleaned = {
      ...form,
      maxOriginationFee: form.maxOriginationFee === '' ? null : Number(form.maxOriginationFee),
      maxOriginationFeePercentage: form.maxOriginationFeePercentage === '' ? null : Number(form.maxOriginationFeePercentage),
      suppressedState: form.suppressedState === '' ? null : form.suppressedState,
      campaign: form.campaign === '' ? null : form.campaign,
    }
    try { await onSave(cleaned, submitAfter) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{channel ? `Edit Channel: ${channel.channelCode}` : 'Add Channel Constraint'}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Channel *</label>
              {channel
                ? <input className="form-control" value={form.channelCode} disabled />
                : (
                  <select className="form-control" required value={form.channelCode} onChange={e => set('channelCode', e.target.value)}>
                    <option value="">Select channel…</option>
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )
              }
            </div>

            <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Min Loan Amount ($)</label>
                <input className="form-control" type="number" value={form.minLoanAmount} onChange={e => set('minLoanAmount', +e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Loan Amount ($)</label>
                <input className="form-control" type="number" value={form.maxLoanAmount} onChange={e => set('maxLoanAmount', +e.target.value)} />
              </div>
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
              <div className="form-group">
                <label className="form-label">Suppressed State</label>
                <input className="form-control" value={form.suppressedState} onChange={e => set('suppressedState', e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Campaign</label>
                <input className="form-control" value={form.campaign} onChange={e => set('campaign', e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {channel && (channel.approvalStatus === 'DRAFT' || channel.approvalStatus === 'REJECTED') && (
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={(e) => handleSubmit(e, true)}>
                {saving ? 'Saving…' : 'Save & Submit'}
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving} onClick={(e) => handleSubmit(e, false)}>
              {saving ? 'Saving…' : (channel ? 'Update Channel' : 'Add Channel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
