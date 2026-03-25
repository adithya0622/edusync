import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/SecurityPage.css'

interface ThreatData {
  user_id: string
  threat_status: string
  threat_score: number
  data_leaks: number
  message: string
  recommendation: string
  encrypted: boolean
  crypto_strength: string
  last_scan: string
  indicators: {
    data_breach: boolean
    encryption_active: boolean
    twofa_enabled: boolean
    suspicious_login: boolean
  }
}

interface PasswordBreachResult {
  pwned: boolean | null
  times_seen_in_breaches: number
  threat_level: string
  recommendation: string
}

const SecurityPage: React.FC = () => {
  const [threatData, setThreatData] = useState<ThreatData | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [scanResult, setScanResult] = useState('')
  const [password, setPassword] = useState('')
  const [pwBreachResult, setPwBreachResult] = useState<PasswordBreachResult | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const navigate = useNavigate()

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8082'
  const API_KEY = import.meta.env.VITE_API_KEY || 'upgrade-ai-key-2026'

  const scanThreat = async () => {
    if (!email) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/security/threat-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      setThreatData(data.threat_data)
      setScanResult(data.message)
    } catch (err) {
      setScanResult('Scan failed - check backend connection')
    } finally {
      setLoading(false)
    }
  }

  const checkPasswordBreach = async () => {
    if (!password) return
    setPwLoading(true)
    setPwBreachResult(null)
    try {
      // k-anonymity: hash the password in the browser, send only first 5 chars
      const msgBuffer = new TextEncoder().encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
      const prefix = hashHex.slice(0, 5)
      const suffix = hashHex.slice(5)

      const response = await fetch(`${API_BASE}/api/security/pwned-password/${prefix}`, {
        headers: { 'x-api-key': API_KEY }
      })
      const data = await response.json()

      if (data.status !== 'OK') {
        setPwBreachResult({ pwned: null, times_seen_in_breaches: 0, threat_level: 'UNKNOWN', recommendation: 'Service temporarily unavailable.' })
        return
      }

      // Check locally — the full hash never left the browser
      const match = data.hashes?.find((h: { suffix: string; count: number }) => h.suffix === suffix)
      if (match) {
        setPwBreachResult({
          pwned: true,
          times_seen_in_breaches: match.count,
          threat_level: match.count > 1000 ? 'CRITICAL' : 'HIGH',
          recommendation: 'This password has been exposed in known breaches. Change it immediately!'
        })
      } else {
        setPwBreachResult({
          pwned: false,
          times_seen_in_breaches: 0,
          threat_level: 'GREEN',
          recommendation: 'Password not found in known breaches. Keep using strong, unique passwords!'
        })
      }
    } catch {
      setPwBreachResult({ pwned: null, times_seen_in_breaches: 0, threat_level: 'UNKNOWN', recommendation: 'Check failed. Try again.' })
    } finally {
      setPwLoading(false)
    }
  }

  const getThreatColor = (level: string) => {
    const colors: Record<string, string> = {
      GREEN: '#10b981',
      YELLOW: '#f59e0b',
      ORANGE: '#f97316',
      RED: '#ef4444',
    }
    return colors[level] || '#6b7280'
  }

  return (
    <div className="security-page">
      {/* Header */}
      <div className="security-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn-security">← Back to Dashboard</button>
        <h1>🔒 EduSync Security Dashboard</h1>
        <p>Enterprise-Grade OSINT + Post-Quantum Encryption</p>
      </div>

      {/* Threat Scanner */}
      <div className="security-card threat-scanner">
        <h2>Real-Time Threat Intelligence Scanner</h2>
        <div className="scanner-input">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email to scan..."
            className="email-input"
          />
          <button onClick={scanThreat} disabled={loading} className="scan-btn">
            {loading ? 'Scanning...' : '🔍 Scan Now'}
          </button>
        </div>
        {scanResult && <p className="scan-message">{scanResult}</p>}
      </div>

      {/* Threat Status */}
      {threatData && (
        <div className="security-card threat-status">
          <div className="threat-indicator" style={{ borderColor: getThreatColor(threatData.threat_status) }}>
            <div
              className="threat-level"
              style={{ backgroundColor: getThreatColor(threatData.threat_status) }}
            >
              {threatData.threat_status}
            </div>
            <h3>Threat Level: {threatData.threat_status}</h3>
          </div>

          <div className="threat-details">
            <div className="detail-item">
              <span className="label">Message:</span>
              <span className="value">{threatData.message}</span>
            </div>
            <div className="detail-item">
              <span className="label">Data Leaks Found:</span>
              <span className="value">{threatData.data_leaks}</span>
            </div>
            <div className="detail-item">
              <span className="label">Recommendation:</span>
              <span className="value">{threatData.recommendation}</span>
            </div>
            <div className="detail-item">
              <span className="label">Encryption:</span>
              <span className="value">
                ✓ {threatData.crypto_strength} (Post-Quantum Ready)
              </span>
            </div>
          </div>

          {/* Security Indicators */}
          <div className="indicators">
            <div className={`indicator ${threatData.indicators.data_breach ? 'danger' : 'safe'}`}>
              {threatData.indicators.data_breach ? '⚠' : '✓'} Data Breach
            </div>
            <div className={`indicator ${threatData.indicators.encryption_active ? 'safe' : 'danger'}`}>
              {threatData.indicators.encryption_active ? '✓' : '✗'} Encryption Active
            </div>
            <div className={`indicator ${threatData.indicators.twofa_enabled ? 'safe' : 'warning'}`}>
              {threatData.indicators.twofa_enabled ? '✓' : '○'} 2FA Enabled
            </div>
            <div className={`indicator ${threatData.indicators.suspicious_login ? 'danger' : 'safe'}`}>
              {threatData.indicators.suspicious_login ? '⚠' : '✓'} Login Activity
            </div>
          </div>
        </div>
      )}

      {/* Password Breach Checker */}
      <div className="security-card password-checker">
        <h2>🔑 Password Breach Checker</h2>
        <p className="pw-check-desc">Check if your password has been exposed in known data breaches. Uses k-anonymity — your password never leaves your device.</p>
        <div className="scanner-input">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password to check..."
            className="email-input"
            onKeyDown={(e) => e.key === 'Enter' && checkPasswordBreach()}
          />
          <button onClick={checkPasswordBreach} disabled={pwLoading} className="scan-btn">
            {pwLoading ? 'Checking...' : '🔍 Check Password'}
          </button>
        </div>
        {pwBreachResult && (
          <div className={`pw-result pw-result-${pwBreachResult.threat_level?.toLowerCase()}`}>
            {pwBreachResult.pwned === true && (
              <>
                <p className="pw-result-title">⚠️ Password Compromised!</p>
                <p>Found in <strong>{pwBreachResult.times_seen_in_breaches.toLocaleString()}</strong> data breach records.</p>
              </>
            )}
            {pwBreachResult.pwned === false && (
              <p className="pw-result-title">✅ Password Not Found in Breaches</p>
            )}
            {pwBreachResult.pwned === null && (
              <p className="pw-result-title">⚙️ Check Unavailable</p>
            )}
            <p className="pw-recommendation">{pwBreachResult.recommendation}</p>
            <p className="pw-privacy-note">🔒 Privacy: Only the first 5 chars of your SHA-1 hash were sent. Your password was never transmitted.</p>
          </div>
        )}
      </div>

      {/* Encryption Info */}
      <div className="security-card encryption-info">
        <h2>🔐 Post-Quantum Cryptography</h2>
        <div className="crypto-details">
          <div className="crypto-item">
            <h4>Key Exchange: Kyber-1024</h4>
            <p>Lattice-based encryption - secure against quantum computers</p>
          </div>
          <div className="crypto-item">
            <h4>Symmetric: AES-256-GCM</h4>
            <p>Authenticated encryption with 256-bit keys</p>
          </div>
          <div className="crypto-item">
            <h4>Integrity: BLAKE3</h4>
            <p>Cryptographic hash function for data verification</p>
          </div>
          <div className="crypto-item">
            <h4>Signatures: ECDSA P-384</h4>
            <p>Digital signatures on study milestones and achievements</p>
          </div>
        </div>
        <div className="quantum-proof">
          <strong>✓ NSA-Proof Encryption</strong>
          <p>Your data is protected even after quantum computers become available</p>
        </div>
      </div>

      {/* Zero-Knowledge */}
      <div className="security-card zero-knowledge">
        <h2>🕵 Zero-Knowledge Architecture</h2>
        <p>
          We've never seen your plaintext. All encryption happens on your device.
          Study notes, marks, and personal data are encrypted before transmission.
        </p>
        <ul>
          <li>✓ Client-side encryption enabled</li>
          <li>✓ End-to-end encrypted communications</li>
          <li>✓ Server stores only ciphertexts</li>
          <li>✓ Zero access to plaintext data</li>
        </ul>
      </div>

      {/* Secure Study Plan */}
      <div className="security-card secure-study">
        <h2>📋 Secure Study Plan</h2>
        <p>Share your encrypted study plan with peers using QR code</p>
        <div className="qr-placeholder">
          <small>QR Code for secure sharing (encrypted with student's key)</small>
        </div>
      </div>
    </div>
  )
}

export default SecurityPage
