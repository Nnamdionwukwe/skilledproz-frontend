import { useState } from 'react'
import {
  ArrowLeft, User, FileText, MapPin, Phone,
  Globe, DollarSign, Save, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import s from './UserProfile.module.css'
import e from './EditProfile.module.css'

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR']
const LANGUAGES  = ['English', 'French', 'Yoruba', 'Igbo', 'Hausa', 'Arabic', 'Swahili']

export default function EditProfile({ user, onSaved, onCancel }) {
  const { setAuth, accessToken, refreshToken } = useAuthStore()

  const [form, setForm] = useState({
    firstName:  user.firstName  ?? '',
    lastName:   user.lastName   ?? '',
    bio:        user.bio        ?? '',
    phone:      user.phone      ?? '',
    country:    user.country    ?? '',
    city:       user.city       ?? '',
    state:      user.state      ?? '',
    address:    user.address    ?? '',
    currency:   user.currency   ?? 'NGN',
    language:   user.language   ?? 'English',
    latitude:   user.latitude   ?? '',
    longitude:  user.longitude  ?? '',
  })

  const [status, setStatus]   = useState('idle') // idle | saving | saved | error
  const [errMsg, setErrMsg]   = useState('')

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setStatus('saving')
    setErrMsg('')
    try {
      const { data } = await api.put('/users/me', form)
      // Keep Zustand in sync
      setAuth({ ...user, ...data.data.user }, accessToken, refreshToken)
      setStatus('saved')
      setTimeout(() => onSaved(data.data.user), 900)
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'Update failed. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className={e.wrap}>
      {/* Header */}
      <div className={e.header}>
        <button className={e.backBtn} onClick={onCancel}>
          <ArrowLeft size={15} /> Cancel
        </button>
        <div>
          <p className={e.eyebrow}>Edit your profile</p>
          <h2 className={e.title}>Profile settings</h2>
        </div>
      </div>

      {/* Alerts */}
      {status === 'error' && (
        <div className={e.alertError}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {errMsg}
        </div>
      )}
      {status === 'saved' && (
        <div className={e.alertSuccess}>
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          Profile updated successfully!
        </div>
      )}

      <form className={e.form} onSubmit={handleSubmit} noValidate>

        {/* ── Personal info ── */}
        <div className={e.section}>
          <p className={e.sectionLabel}>Personal Information</p>

          <div className={e.row}>
            <div className={e.field}>
              <label className={e.label}>First name</label>
              <div className={e.inputWrap}>
                <span className={e.icon}><User size={14} /></span>
                <input
                  className={`${e.input} ${e.inputPad}`}
                  type="text" name="firstName"
                  placeholder="John"
                  value={form.firstName} onChange={onChange}
                  required
                />
              </div>
            </div>
            <div className={e.field}>
              <label className={e.label}>Last name</label>
              <div className={e.inputWrap}>
                <input
                  className={e.input}
                  type="text" name="lastName"
                  placeholder="Doe"
                  value={form.lastName} onChange={onChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className={e.field}>
            <label className={e.label}>Bio</label>
            <div className={e.inputWrap}>
              <span className={e.icon} style={{ top: 14, transform: 'none' }}><FileText size={14} /></span>
              <textarea
                className={`${e.input} ${e.inputPad} ${e.textarea}`}
                name="bio"
                placeholder="Tell clients about your experience, skills and what makes you stand out…"
                rows={4}
                value={form.bio} onChange={onChange}
              />
            </div>
            <span className={e.charCount}>{form.bio.length} / 500</span>
          </div>

          <div className={e.field}>
            <label className={e.label}>Phone</label>
            <div className={e.inputWrap}>
              <span className={e.icon}><Phone size={14} /></span>
              <input
                className={`${e.input} ${e.inputPad}`}
                type="tel" name="phone"
                placeholder="+234 801 234 5678"
                value={form.phone} onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div className={e.section}>
          <p className={e.sectionLabel}>Location</p>

          <div className={e.row}>
            <div className={e.field}>
              <label className={e.label}>Country</label>
              <div className={e.inputWrap}>
                <span className={e.icon}><Globe size={14} /></span>
                <input
                  className={`${e.input} ${e.inputPad}`}
                  type="text" name="country"
                  placeholder="Nigeria"
                  value={form.country} onChange={onChange}
                />
              </div>
            </div>
            <div className={e.field}>
              <label className={e.label}>State</label>
              <div className={e.inputWrap}>
                <input
                  className={e.input}
                  type="text" name="state"
                  placeholder="Lagos State"
                  value={form.state} onChange={onChange}
                />
              </div>
            </div>
          </div>

          <div className={e.row}>
            <div className={e.field}>
              <label className={e.label}>City</label>
              <div className={e.inputWrap}>
                <span className={e.icon}><MapPin size={14} /></span>
                <input
                  className={`${e.input} ${e.inputPad}`}
                  type="text" name="city"
                  placeholder="Ikeja"
                  value={form.city} onChange={onChange}
                />
              </div>
            </div>
            <div className={e.field}>
              <label className={e.label}>Address</label>
              <div className={e.inputWrap}>
                <input
                  className={e.input}
                  type="text" name="address"
                  placeholder="15 Allen Avenue"
                  value={form.address} onChange={onChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className={e.section}>
          <p className={e.sectionLabel}>Preferences</p>

          <div className={e.row}>
            <div className={e.field}>
              <label className={e.label}>Currency</label>
              <div className={e.inputWrap}>
                <span className={e.icon}><DollarSign size={14} /></span>
                <select
                  className={`${e.select} ${e.inputPad}`}
                  name="currency"
                  value={form.currency} onChange={onChange}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className={e.field}>
              <label className={e.label}>Language</label>
              <div className={e.inputWrap}>
                <span className={e.icon}><Globe size={14} /></span>
                <select
                  className={`${e.select} ${e.inputPad}`}
                  name="language"
                  value={form.language} onChange={onChange}
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div className={e.danger}>
          <p className={e.sectionLabel} style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
            Danger Zone
          </p>
          <div className={e.dangerRow}>
            <div>
              <p className={e.dangerTitle}>Deactivate account</p>
              <p className={e.dangerSub}>Your profile will be hidden and you won't receive new bookings.</p>
            </div>
            <button
              type="button"
              className={e.dangerBtn}
              onClick={() => {
                if (window.confirm('Are you sure you want to deactivate your account?')) {
                  api.delete('/users/me').then(() => window.location.href = '/login')
                }
              }}
            >
              Deactivate
            </button>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={e.actions}>
          <button type="button" className={e.btnCancel} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className={e.btnSave}
            disabled={status === 'saving' || status === 'saved'}
          >
            {status === 'saving'
              ? <><Loader2 size={15} className={e.spin} /> Saving…</>
              : status === 'saved'
              ? <><CheckCircle2 size={15} /> Saved!</>
              : <><Save size={15} /> Save changes</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
