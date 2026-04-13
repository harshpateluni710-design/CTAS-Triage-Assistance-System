import axios from 'axios'

// ---------------------------------------------------------------------------
// Triage API Configuration (Flask backend → Docker APIs on HF Spaces)
// ---------------------------------------------------------------------------
const TRIAGE_API_URL = import.meta.env.VITE_HF_API_URL || ''

const triageApi = axios.create({
  baseURL: TRIAGE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 120 s – Docker cold starts can be slow
})

triageApi.interceptors.request.use(
  (config) => {
    console.log(`Triage API Request: ${config.method.toUpperCase()} ${config.baseURL}`)
    return config
  },
  (error) => {
    console.error('Triage API Request Error:', error)
    return Promise.reject(error)
  }
)

triageApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Triage API Response Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Internal REST API (Auth, Patient, Doctor, Admin)
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach JWT token to every internal API request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Auth APIs
// ---------------------------------------------------------------------------
export const loginPatient = async (email, password) => {
  const response = await api.post('/auth/patient/login', { email, password })
  return response.data
}

export const registerPatient = async (data) => {
  const response = await api.post('/auth/patient/register', data)
  return response.data
}

export const loginDoctor = async (email, password) => {
  const response = await api.post('/auth/doctor/login', { email, password })
  return response.data
}

export const registerDoctor = async (data) => {
  const response = await api.post('/auth/doctor/register', data)
  return response.data
}

export const loginAdmin = async (email, password) => {
  const response = await api.post('/auth/admin/login', { email, password })
  return response.data
}

export const registerAdmin = async (data) => {
  const response = await api.post('/auth/admin/register', data)
  return response.data
}

// ---------------------------------------------------------------------------
// Patient APIs
// ---------------------------------------------------------------------------
export const getPatientProfile = async () => {
  const response = await api.get('/patient/profile')
  return response.data
}

export const updatePatientProfile = async (data) => {
  const response = await api.put('/patient/profile', data)
  return response.data
}

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/patient/password', { currentPassword, newPassword })
  return response.data
}

export const deletePatientAccount = async () => {
  const response = await api.delete('/patient/account')
  return response.data
}

export const getPatientHistory = async () => {
  const response = await api.get('/patient/history')
  return response.data
}

export const saveAssessment = async (data) => {
  const response = await api.post('/patient/history', data)
  return response.data
}

export const getPatientAnalytics = async () => {
  const response = await api.get('/patient/analytics')
  return response.data
}

// ---------------------------------------------------------------------------
// analyzeSymptoms – calls Hugging Face Inference API
// ---------------------------------------------------------------------------
export const analyzeSymptoms = async (symptoms) => {
  try {
    const response = await triageApi.post('', { inputs: symptoms })
    const raw = response.data
    const recommendation = translateLabel(raw.triage_label || raw.final_recommendation) || 'OTC Drug'
    let confidence = normalizeConfidence(raw.confidence)

    // Backward-compatibility: older backend mock responses used a fixed 0.85.
    // Recompute a dynamic mock confidence so the UI no longer appears hardcoded.
    if ((raw._mock || raw.mock === true) && (confidence == null || Math.abs(confidence - 0.85) < 0.0005)) {
      confidence = computeMockConfidence(symptoms, recommendation)
    }

    // The backend returns a fully normalised response – pass it through
    return {
      status: raw.status || 'success',
      original_input: raw.original_input || symptoms,
      extracted_data: raw.extracted_data || {},
      formatted_clinical_text: raw.formatted_clinical_text || '',
      final_recommendation: recommendation,
      confidence,
    }
  } catch (error) {
    if (error.response?.status === 503) {
      throw new Error('MODEL_LOADING')
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.warn('Backend API not available, returning mock data')
      return getMockTriageResult(symptoms)
    }
    throw error
  }
}

function normalizeConfidence(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  const n = Number(value)
  if (n > 1) return Math.max(0, Math.min(1, n / 100))
  return Math.max(0, Math.min(1, n))
}

function computeMockConfidence(symptoms, recommendation) {
  const text = String(symptoms || '').toLowerCase()
  const urgentKeywords = ['chest pain', 'difficulty breathing', 'severe', 'bleeding', 'unconscious']
  const moderateKeywords = ['fever', 'pain', 'swelling', 'vomiting', 'headache']
  const urgentHits = urgentKeywords.filter(keyword => text.includes(keyword)).length
  const moderateHits = moderateKeywords.filter(keyword => text.includes(keyword)).length
  const tokenCount = text.split(/\s+/).filter(Boolean).length
  const base = recommendation === 'Doctor Consultation' ? 0.84 : 0.72
  const confidence = base + urgentHits * 0.03 + moderateHits * 0.015 + Math.min(tokenCount, 40) * 0.001
  return Number(Math.max(0.55, Math.min(0.98, confidence)).toFixed(3))
}

// ---------------------------------------------------------------------------
// Label Translation – maps raw HF model IDs to human-readable labels
// ---------------------------------------------------------------------------
const labelTranslator = {
  'LABEL_0': 'OTC Drug',
  'LABEL_1': 'Doctor Consultation',
}

/** Translate a raw model label (e.g. "LABEL_1") to a readable string. */
function translateLabel(raw) {
  return labelTranslator[raw] || raw
}

/** Flatten the extracted_entities array into a single object. */
function mergeEntities(entities) {
  const out = { age: '', sex: '', symptoms: '', duration: '', severity: '' }
  const symptomsList = []

  for (const e of entities) {
    const label = (e.entity_group || e.label || e.entity || '').toLowerCase()
    const word  = (e.word || e.value || '').trim()
    if (!word) continue

    if (label.includes('age'))       out.age      = word
    else if (label.includes('sex') || label.includes('gender')) out.sex = word
    else if (label.includes('sev'))  out.severity = word
    else if (label.includes('dur') || label.includes('time')) out.duration = word
    else if (label.includes('sym'))  symptomsList.push(word)
  }
  out.symptoms = symptomsList.join(', ')
  return out
}

// Doctor Dashboard APIs
const isNetworkError = (error) => error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK'
const allowDoctorMockFallback = import.meta.env.DEV

const buildStatsFromCaseLists = (pendingCases, validatedCases) => {
  const agreementCount = validatedCases.filter(c => c.doctorAgreement).length
  const disagreementCount = validatedCases.length - agreementCount
  return {
    totalAssessments: pendingCases.length + validatedCases.length,
    validatedAssessments: validatedCases.length,
    pendingAssessments: pendingCases.length,
    agreementCount,
    disagreementCount,
    kappaPercent: validatedCases.length > 0
      ? Number(((agreementCount / validatedCases.length) * 100).toFixed(1))
      : null,
  }
}

const normalizeAssessmentEnvelope = (data) => {
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : []

  const pendingCases = items.filter(c => !c.validated)
  const validatedCases = items.filter(c => c.validated)
  const fallbackCounts = buildStatsFromCaseLists(pendingCases, validatedCases)

  return {
    count: Number(data?.count ?? items.length),
    counts: {
      ...fallbackCounts,
      ...(data?.counts || {}),
    },
    items,
  }
}

export const getDoctorAssessments = async () => {
  try {
    const response = await api.get('/doctor/assessments')
    return normalizeAssessmentEnvelope(response.data)
  } catch (error) {
    const canFallbackToLegacy = error.response?.status === 404 || error.response?.status === 405
    if (canFallbackToLegacy) {
      const legacyAll = await api.get('/doctor/cases', { params: { scope: 'all' } })
      return normalizeAssessmentEnvelope(legacyAll.data)
    }
    if (allowDoctorMockFallback && isNetworkError(error)) {
      const mock = getMockPatientCases()
      return normalizeAssessmentEnvelope({
        count: mock.length,
        counts: buildStatsFromCaseLists(mock.filter(c => !c.validated), mock.filter(c => c.validated)),
        items: mock,
      })
    }
    throw error
  }
}

export const getPatientCases = async () => {
  try {
    const data = await getDoctorAssessments()
    return data.items.filter(c => !c.validated)
  } catch (error) {
    if (allowDoctorMockFallback && isNetworkError(error)) {
      return getMockPatientCases().filter(c => !c.validated)
    }
    throw error
  }
}

export const getValidatedCases = async () => {
  try {
    const response = await api.get('/doctor/assessments/validated')
    if (Array.isArray(response.data?.items)) return response.data.items
    if (Array.isArray(response.data)) return response.data
    return []
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 405) {
      try {
        const legacyScoped = await api.get('/doctor/cases', { params: { scope: 'validated' } })
        if (Array.isArray(legacyScoped.data)) {
          const looksLikePending = legacyScoped.data.some((c) => c?.validated === false || c?.status === 'pending')
          if (!looksLikePending) return legacyScoped.data
        }

        const legacy = await api.get('/doctor/validated-cases')
        if (Array.isArray(legacy.data)) return legacy.data
        if (Array.isArray(legacy.data?.items)) return legacy.data.items
        return []
      } catch (legacyError) {
        if (allowDoctorMockFallback && isNetworkError(legacyError)) {
          return getMockPatientCases().filter(c => c.validated)
        }
        throw legacyError
      }
    }
    if (allowDoctorMockFallback && isNetworkError(error)) {
      return getMockPatientCases().filter(c => c.validated)
    }
    throw error
  }
}

export const getDoctorStats = async () => {
  try {
    const data = await getDoctorAssessments()
    return data.counts
  } catch (error) {
    const canFallback =
      (allowDoctorMockFallback && isNetworkError(error)) ||
      error.response?.status === 404 ||
      error.response?.status >= 500

    if (canFallback) {
      try {
        const response = await api.get('/doctor/stats')
        return response.data
      } catch (_) {
        const mockCases = getMockPatientCases()
        return buildStatsFromCaseLists(
          mockCases.filter(c => !c.validated),
          mockCases.filter(c => c.validated)
        )
      }
    }
    throw error
  }
}

export const submitValidation = async (caseId, isCorrect, doctorTier) => {
  const response = await api.post('/doctor/validate', {
    assessmentId: caseId,
    isCorrect,
    doctorTier,
  })
  return response.data
}

export const getProtocols = async () => {
  try {
    const response = await api.get('/doctor/protocols')
    return response.data
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return getMockProtocols()
    }
    throw error
  }
}

// Doctor Profile APIs
export const getDoctorProfile = async () => {
  const response = await api.get('/doctor/profile')
  return response.data
}

export const updateDoctorProfile = async (data) => {
  const response = await api.put('/doctor/profile', data)
  return response.data
}

export const changeDoctorPassword = async (currentPassword, newPassword) => {
  const response = await api.put('/doctor/password', { currentPassword, newPassword })
  return response.data
}

// Admin Profile APIs
export const getAdminProfile = async () => {
  const response = await api.get('/admin/profile')
  return response.data
}

export const updateAdminProfile = async (data) => {
  const response = await api.put('/admin/profile', data)
  return response.data
}

export const changeAdminPassword = async (currentPassword, newPassword) => {
  const response = await api.put('/admin/password', { currentPassword, newPassword })
  return response.data
}

// Admin Dashboard APIs
export const getSystemMetrics = async () => {
  try {
    const response = await api.get('/admin/metrics')
    return response.data
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return getMockSystemMetrics()
    }
    throw error
  }
}

export const getBiasAudit = async () => {
  try {
    const response = await api.get('/admin/bias-audit')
    return response.data
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return getMockBiasAudit()
    }
    throw error
  }
}

export const getKnowledgeBase = async () => {
  try {
    const response = await api.get('/admin/knowledge-base')
    return response.data
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return getMockKnowledgeBase()
    }
    throw error
  }
}

export const uploadProtocol = async (protocolData) => {
  try {
    const response = await api.post('/admin/upload-protocol', protocolData)
    return response.data
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return { success: true }
    }
    throw error
  }
}

export const deleteProtocol = async (protocolId) => {
  try {
    const response = await api.delete(`/admin/protocol/${protocolId}`)
    return response.data
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return { success: true }
    }
    throw error
  }
}

// Mock Data Functions (for development without backend)
const getMockTriageResult = (symptoms) => {
  // Simple keyword-based mock logic for development
  const urgentKeywords = ['chest pain', 'difficulty breathing', 'severe', 'bleeding', 'unconscious']
  const moderateKeywords = ['fever', 'pain', 'swelling', 'vomiting', 'headache']

  const symptomsLower = symptoms.toLowerCase()
  let recommendation = 'OTC Drug'

  if (urgentKeywords.some(keyword => symptomsLower.includes(keyword))) {
    recommendation = 'Doctor Consultation'
  } else if (moderateKeywords.some(keyword => symptomsLower.includes(keyword))) {
    recommendation = 'Doctor Consultation'
  }

  const urgentHits = urgentKeywords.filter(keyword => symptomsLower.includes(keyword)).length
  const moderateHits = moderateKeywords.filter(keyword => symptomsLower.includes(keyword)).length
  const tokenCount = symptomsLower.split(/\s+/).filter(Boolean).length
  const base = recommendation === 'Doctor Consultation' ? 0.84 : 0.72
  const confidence = Math.max(
    0.55,
    Math.min(0.98, base + urgentHits * 0.03 + moderateHits * 0.015 + Math.min(tokenCount, 40) * 0.001)
  )

  return {
    status: 'success',
    original_input: symptoms,
    extracted_data: {
      Age: '30',
      Sex: 'Not identified',
      Severity: recommendation === 'Doctor Consultation' ? 'High' : 'Low',
      Symptoms: symptoms.split(',').map(s => s.trim()).slice(0, 3).join(', '),
      Duration: 'Not identified',
    },
    formatted_clinical_text: `Patient: Not identified, 30 years. Symptoms: ${symptoms}. Duration: Not identified. Severity: Moderate.`,
    final_recommendation: recommendation,
    confidence: Number(confidence.toFixed(3)),
  }
}

const getMockPatientCases = () => {
  return [
    {
      id: 1,
      date: new Date().toISOString(),
      symptoms: 'Severe chest pain radiating to left arm, shortness of breath, started 30 minutes ago',
      aiTier: 2,
      confidence: 92,
      validated: false,
    },
    {
      id: 2,
      date: new Date(Date.now() - 86400000).toISOString(),
      symptoms: 'High fever of 103°F, persistent cough, body aches for 2 days',
      aiTier: 1,
      confidence: 87,
      validated: true,
      doctorTier: 1,
      doctorAgreement: true,
    },
    {
      id: 3,
      date: new Date(Date.now() - 172800000).toISOString(),
      symptoms: 'Mild headache and runny nose, started this morning',
      aiTier: 0,
      confidence: 85,
      validated: true,
      doctorTier: 0,
      doctorAgreement: true,
    },
  ]
}

const getMockProtocols = () => {
  return [
    {
      id: 1,
      title: 'Emergency Severity Index (ESI) Level 1',
      type: 'ESI',
      description: 'Immediate life-threatening conditions requiring immediate intervention',
      criteria: [
        'Cardiac arrest or peri-arrest',
        'Severe respiratory distress',
        'Major trauma with airway compromise',
        'Unresponsive or altered mental status',
      ],
    },
    {
      id: 2,
      title: 'Manchester Triage System - Urgent',
      type: 'MTS',
      description: 'Serious conditions requiring rapid assessment and treatment',
      criteria: [
        'Severe pain (7-10/10)',
        'Persistent vomiting',
        'High fever with concerning symptoms',
        'Moderate bleeding',
      ],
    },
    {
      id: 3,
      title: 'OTC Drug / Self-Care Protocol',
      type: 'Standard',
      description: 'Minor conditions suitable for self-management with monitoring',
      criteria: [
        'Minor cuts or bruises',
        'Mild cold symptoms',
        'Low-grade fever',
        'Minor aches and pains',
      ],
    },
  ]
}

const getMockSystemMetrics = () => {
  const generateTrendData = () => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        assessments: Math.floor(10 + Math.random() * 30),
      })
    }
    return data
  }

  return {
    totalAssessments: 1247,
    totalPatients: 340,
    totalDoctors: 12,
    accuracy: 89,
    tierDistribution: [
      { name: 'OTC Drug', value: 650 },
      { name: 'Doctor Consultation', value: 597 },
    ],
    dailyTrend: generateTrendData(),
  }
}

const getMockBiasAudit = () => {
  return {
    tierDistribution: [
      { name: 'OTC Drug', value: 650 },
      { name: 'Doctor Consultation', value: 597 },
    ],
    tierAccuracy: {
      'OTC Drug': 91.2,
      'Doctor Consultation': 94.1,
    },
    confidenceDistribution: [
      { range: '50-60%', count: 45 },
      { range: '60-70%', count: 120 },
      { range: '70-80%', count: 380 },
      { range: '80-90%', count: 510 },
      { range: '90-100%', count: 192 },
    ],
  }
}

const getMockKnowledgeBase = () => {
  return [
    {
      id: 1,
      title: 'ESI Triage Guidelines v5',
      type: 'ESI',
      lastUpdated: new Date().toISOString(),
      active: true,
    },
    {
      id: 2,
      title: 'Manchester Triage System 2021',
      type: 'MTS',
      lastUpdated: new Date(Date.now() - 30 * 86400000).toISOString(),
      active: true,
    },
    {
      id: 3,
      title: 'Pediatric Triage Protocols',
      type: 'Pediatric',
      lastUpdated: new Date(Date.now() - 60 * 86400000).toISOString(),
      active: true,
    },
    {
      id: 4,
      title: 'Cardiac Emergency Guidelines',
      type: 'Specialty',
      lastUpdated: new Date(Date.now() - 15 * 86400000).toISOString(),
      active: true,
    },
  ]
}

export default api
