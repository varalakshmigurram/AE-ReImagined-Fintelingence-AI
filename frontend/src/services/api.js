import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

api.interceptors.response.use(
  r => r,
  err => {
    console.error('[API Error]', err.config?.method?.toUpperCase(), err.config?.url, err.response?.status, err.response?.data)
    return Promise.reject(err)
  }
)

// ─── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data)
export const getRecentActivity = () => api.get('/dashboard/activity').then(r => r.data)

// ─── Rules ──────────────────────────────────────────────────────────────────
export const getRules = (env) => api.get('/rules', { params: env ? { env } : {} }).then(r => r.data)
export const getRule = (id) => api.get(`/rules/${id}`).then(r => r.data)
export const getPendingRules = () => api.get('/rules/pending').then(r => r.data)
export const createRule = (data, user = 'lead-analyst') => api.post('/rules', data, { params: { user } }).then(r => r.data)
export const updateRule = (id, data, user = 'lead-analyst') => api.put(`/rules/${id}`, data, { params: { user } }).then(r => r.data)
export const submitRuleForReview = (id, user = 'lead-analyst') => api.post(`/rules/${id}/submit`, {}, { params: { user } }).then(r => r.data)
export const reviewRule = (id, data) => api.post(`/rules/${id}/review`, data).then(r => r.data)
export const promoteRule = (id, promotedBy = 'manager') => api.post(`/rules/${id}/promote`, {}, { params: { promotedBy } }).then(r => r.data)
export const getRuleAudit = (id) => api.get(`/rules/${id}/audit`).then(r => r.data)

// ─── State Constraints ──────────────────────────────────────────────────────
export const getStates = (env) => api.get('/constraints/states', { params: env ? { env } : {} }).then(r => r.data)
export const getPendingStates = () => api.get('/constraints/states/pending').then(r => r.data)
export const upsertState = (data, user = 'lead-analyst') => api.post('/constraints/states', data, { params: { user } }).then(r => r.data)
export const submitStateForReview = (id, user = 'lead-analyst') => api.post(`/constraints/states/${id}/submit`, {}, { params: { user } }).then(r => r.data)
export const reviewState = (id, data) => api.post(`/constraints/states/${id}/review`, data).then(r => r.data)
export const promoteState = (id, user = 'manager') => api.post(`/constraints/states/${id}/promote`, {}, { params: { user } }).then(r => r.data)

// ─── Channel Constraints ────────────────────────────────────────────────────
export const getChannels = (env) => api.get('/constraints/channels', { params: env ? { env } : {} }).then(r => r.data)
export const getPendingChannels = () => api.get('/constraints/channels/pending').then(r => r.data)
export const upsertChannel = (data, user = 'lead-analyst') => api.post('/constraints/channels', data, { params: { user } }).then(r => r.data)
export const submitChannelForReview = (id, user = 'lead-analyst') => api.post(`/constraints/channels/${id}/submit`, {}, { params: { user } }).then(r => r.data)
export const reviewChannel = (id, data) => api.post(`/constraints/channels/${id}/review`, data).then(r => r.data)
export const promoteChannel = (id, user = 'manager') => api.post(`/constraints/channels/${id}/promote`, {}, { params: { user } }).then(r => r.data)

// ─── Embedded Rule Engine ────────────────────────────────────────────────────
const v1 = axios.create({ baseURL: '/api/v1/embedded', timeout: 15000 })
export const saveEmbeddedRules = (payload) => v1.post('/rules/save', payload).then(r => r.data)
export const executeRules = (payload) => v1.post('/rules/execute', payload).then(r => r.data)
export const validateRules = (payload) => v1.post('/rules/validate', payload).then(r => r.data)
export const getVariables = () => v1.get('/rules/variables').then(r => r.data)
export const translateDescription = (ruleId, description) => v1.get('/rules/translate', { params: { ruleId, description } }).then(r => r.data)
export const loadOfferConfigFromExcel = (file, uploadedBy = 'lead-analyst') => {
  const fd = new FormData(); fd.append('file', file); fd.append('uploadedBy', uploadedBy)
  return v1.post('/offer-config/load', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
export const getActiveOfferConfig = () => v1.get('/offer-config/active').then(r => r.data)

// ─── Cutoff Entries (production tracking table) ──────────────────────────────
export const getCutoffEntries = (groupName, env) => v1.get('/cutoffs/entries', { params: { ...(groupName?{groupName}:{}), environment:env||'TEST' } }).then(r => r.data)
export const getCutoffGroups  = () => v1.get('/cutoffs/groups').then(r => r.data)
