import { motion } from 'framer-motion'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../ui/components/Button'

type CurrencyCode = 'EUR' | 'USD' | 'GBP'

interface BusinessProfile {
  companyName: string
  address: string
  email?: string
  phone?: string
  siret?: string
  vatNumber?: string
  logoDataUrl?: string
}

interface ClientInfo {
  name: string
  address: string
  email?: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxExempt?: boolean
}

interface InvoiceDoc {
  id: string
  number: string
  date: string
  dueDate?: string
  currency: CurrencyCode
  taxRate: number
  vatApplicable: boolean
  clientType: 'b2c' | 'b2b'
  client: ClientInfo
  items: InvoiceItem[]
  notes?: string
  createdAt: number
}

const PROFILE_KEY = 'vw_billing_profile'
const INVOICES_KEY = 'vw_invoices'

function loadProfile(): BusinessProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as BusinessProfile) : null
  } catch {
    return null
  }
}

function saveProfile(p: BusinessProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  } catch {}
}

function loadInvoices(): InvoiceDoc[] {
  try {
    const raw = localStorage.getItem(INVOICES_KEY)
    return raw ? (JSON.parse(raw) as InvoiceDoc[]) : []
  } catch {
    return []
  }
}

function saveInvoices(list: InvoiceDoc[]) {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(list))
  } catch {}
}

function pad(num: number, size: number) {
  let s = String(num)
  while (s.length < size) s = '0' + s
  return s
}

function generateInvoiceNumber(existing: InvoiceDoc[]): string {
  const now = new Date()
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`
  const sameDay = existing.filter((i) => i.number.startsWith(`F-${ymd}-`))
  const idx = pad(sameDay.length + 1, 3)
  return `F-${ymd}-${idx}`
}

function money(n: number, currency: CurrencyCode) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n)
  } catch {
    return n.toFixed(2) + ' ' + currency
  }
}

const BillingPage: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfile>(
    () =>
      loadProfile() || {
        companyName: '',
        address: '',
        email: '',
        phone: '',
        siret: '',
        vatNumber: '',
      },
  )
  const [client, setClient] = useState<ClientInfo>({ name: '', address: '', email: '' })
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c')
  const [currency, setCurrency] = useState<CurrencyCode>('EUR')
  const [vatApplicable, setVatApplicable] = useState<boolean>(false)
  const [taxRate, setTaxRate] = useState<number>(0)
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState<string>('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])
  const [number, setNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [invoices, setInvoices] = useState<InvoiceDoc[]>(() => loadInvoices())
  const [filter, setFilter] = useState<string>('')
  const previewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!number) {
      setNumber(generateInvoiceNumber(invoices))
    }
  }, [invoices, number])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0)
    const base = items.reduce(
      (sum, it) => sum + (it.taxExempt ? 0 : (it.quantity || 0) * (it.unitPrice || 0)),
      0,
    )
    const taxable = vatApplicable ? base : 0
    const vat = vatApplicable ? (taxable * (taxRate || 0)) / 100 : 0
    const total = subtotal + vat
    return { subtotal, vat, total }
  }, [items, taxRate, vatApplicable])

  function updateItem(index: number, patch: Partial<InvoiceItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfile((p) => ({ ...p, logoDataUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  function saveProfileClick() {
    saveProfile(profile)
  }

  function saveInvoice() {
    const doc: InvoiceDoc = {
      id: crypto.randomUUID(),
      number: number || generateInvoiceNumber(invoices),
      date,
      dueDate: dueDate || undefined,
      currency,
      taxRate,
      vatApplicable,
      clientType,
      client,
      items,
      notes: notes || undefined,
      createdAt: Date.now(),
    }
    const next = [doc, ...invoices]
    setInvoices(next)
    saveInvoices(next)
    if (!number) setNumber(doc.number)
  }

  function exportJSON() {
    const doc = {
      profile,
      number,
      date,
      dueDate,
      currency,
      taxRate,
      vatApplicable,
      clientType,
      client,
      items,
      totals,
      notes,
    }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${number || 'facture'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printInvoice() {
    const html = previewRef.current?.innerHTML || ''
    const w = window.open('', '_blank', 'width=900,height=1000')
    if (!w) return
    const styles = `
      <style>
        body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111; }
        .inv { width: 820px; margin: 24px auto; }
        .hdr { display:flex; justify-content:space-between; align-items:flex-start; }
        .hdr .info h2 { margin:0; font-size: 22px; }
        .muted { color: #555; }
        table { width:100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background:#f6f6f6; text-align:left; }
        .totals { margin-top: 12px; width: 320px; float: right; }
        .totals td { border:none; }
      </style>
    `
    w.document.write(
      `<html><head><title>${number}</title>${styles}</head><body>${html}</body></html>`,
    )
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  const filteredInvoices = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (i) =>
        i.number.toLowerCase().includes(q) ||
        i.client.name.toLowerCase().includes(q) ||
        (i.client.email || '').toLowerCase().includes(q),
    )
  }, [filter, invoices])

  // Couleurs dynamiques selon le type de client
  const colors = {
    primary: clientType === 'b2c' ? '#10B981' : '#3B82F6',
    secondary: clientType === 'b2c' ? '#059669' : '#1D4ED8',
    accent: clientType === 'b2c' ? '#34D399' : '#60A5FA',
    muted: clientType === 'b2c' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
    border: clientType === 'b2c' ? '#10B981' : '#3B82F6',
  }

  return (
    <div style={{ padding: '20px', background: 'var(--background)', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 900,
            margin: '0 0 24px 0',
            backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}
        >
          💼 Système de Facturation
        </h1>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Colonne principale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section Profil */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: `linear-gradient(145deg, ${colors.muted}, rgba(255,255,255,0.05))`,
              borderRadius: '20px',
              padding: '24px',
              border: `2px solid ${colors.border}`,
              boxShadow: `0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px ${colors.border}20`,
            }}
          >
            <h3
              style={{
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 700,
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {clientType === 'b2c' ? '👤 Profil Client' : '🏢 Profil Entreprise'}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              <input
                placeholder={clientType === 'b2c' ? 'Nom du client' : "Nom de l'entreprise"}
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <input
                placeholder="Email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <input
                placeholder="Téléphone"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />

              {clientType === 'b2b' ? (
                <>
                  <input
                    placeholder="SIRET"
                    value={profile.siret || ''}
                    onChange={(e) => setProfile({ ...profile, siret: e.target.value })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '2px solid #3B82F6',
                      outline: 'none',
                      fontSize: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <input
                    placeholder="N° TVA intracommunautaire"
                    value={profile.vatNumber || ''}
                    onChange={(e) => setProfile({ ...profile, vatNumber: e.target.value })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '2px solid #3B82F6',
                      outline: 'none',
                      fontSize: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '2px dashed #10B981',
                      color: '#10B981',
                      background: 'rgba(16,185,129,0.1)',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    ✅ Mode Particulier: pas de SIRET/TVA requis
                  </div>
                  <div />
                </>
              )}

              <input
                placeholder="Adresse complète"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                style={{
                  gridColumn: '1 / span 2',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            {clientType === 'b2b' && (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '20px',
                  alignItems: 'center',
                  padding: '16px',
                  background: 'rgba(59,130,246,0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59,130,246,0.3)',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoPick}
                  style={{ fontSize: '14px' }}
                />
                <Button variant="outline" onClick={saveProfileClick}>
                  💾 Enregistrer le profil
                </Button>
              </div>
            )}
          </motion.div>

          {/* Section Facture */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              background: `linear-gradient(145deg, ${colors.muted}, rgba(255,255,255,0.05))`,
              borderRadius: '20px',
              padding: '24px',
              border: `2px solid ${colors.border}`,
              boxShadow: `0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px ${colors.border}20`,
            }}
          >
            <h3
              style={{
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 700,
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📄 Détails de la Facture
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <input
                placeholder="N° facture"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <input
                type="date"
                placeholder="Échéance"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>

              {vatApplicable ? (
                <input
                  type="number"
                  step="0.1"
                  placeholder="TVA %"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '2px solid #3B82F6',
                    outline: 'none',
                    fontSize: '14px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    transition: 'all 0.2s ease',
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: '14px 16px',
                    color: '#10B981',
                    background: 'rgba(16,185,129,0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16,185,129,0.3)',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🚫 TVA non applicable
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '20px',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={vatApplicable}
                  onChange={(e) => {
                    const on = e.target.checked
                    setVatApplicable(on)
                    if (!on) setTaxRate(0)
                  }}
                  style={{ transform: 'scale(1.2)' }}
                />
                TVA applicable
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Type de client:
                <select
                  value={clientType}
                  onChange={(e) => {
                    const v = e.target.value as 'b2c' | 'b2b'
                    setClientType(v)
                    if (v === 'b2c') {
                      setVatApplicable(false)
                      setTaxRate(0)
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="b2c">👤 Particulier</option>
                  <option value="b2b">🏢 Professionnel</option>
                </select>
              </label>
            </div>

            <h4
              style={{
                margin: '20px 0 16px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              👥 Client ({clientType === 'b2c' ? 'Particulier' : 'Professionnel'})
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <input
                placeholder={clientType === 'b2c' ? 'Nom' : 'Société'}
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <input
                placeholder="Email"
                value={client.email || ''}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
              <input
                placeholder="Adresse complète"
                value={client.address}
                onChange={(e) => setClient({ ...client, address: e.target.value })}
                style={{
                  gridColumn: '1 / span 2',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            <h4
              style={{
                margin: '20px 0 16px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              📋 Lignes de facturation
            </h4>

            <div style={{ display: 'grid', gap: '16px' }}>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 140px 120px 90px',
                    gap: '16px',
                    alignItems: 'center',
                    background:
                      'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                    border: `2px dashed ${colors.border}`,
                    borderRadius: '16px',
                    padding: '16px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `2px solid ${colors.border}`,
                      outline: 'none',
                      fontSize: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Qté"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `2px solid ${colors.border}`,
                      outline: 'none',
                      fontSize: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="PU HT"
                    value={it.unitPrice}
                    onChange={(e) =>
                      updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                    }
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `2px solid ${colors.border}`,
                      outline: 'none',
                      fontSize: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <div
                    style={{
                      color: colors.primary,
                      fontWeight: 600,
                      fontSize: '14px',
                      textAlign: 'center',
                    }}
                  >
                    {money((it.quantity || 0) * (it.unitPrice || 0), currency)}
                  </div>
                  {vatApplicable && (
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!it.taxExempt}
                        onChange={(e) => updateItem(idx, { taxExempt: e.target.checked })}
                        style={{ transform: 'scale(1.1)' }}
                      />
                      HT
                    </label>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '20px',
                alignItems: 'center',
              }}
            >
              <Button
                variant="ghost"
                onClick={addItem}
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                ➕ Ajouter une ligne
              </Button>

              <div
                style={{
                  display: 'grid',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}30`,
                }}
              >
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                  Sous‑total HT:{' '}
                  <span style={{ fontWeight: 600, color: colors.primary }}>
                    {money(totals.subtotal, currency)}
                  </span>
                </div>
                {vatApplicable && (
                  <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    TVA ({taxRate}%):{' '}
                    <span style={{ fontWeight: 600, color: '#3B82F6' }}>
                      {money(totals.vat, currency)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    textAlign: 'right',
                    fontWeight: 800,
                    fontSize: '16px',
                    color: colors.primary,
                    borderTop: `1px solid ${colors.border}30`,
                    paddingTop: '8px',
                  }}
                >
                  Total {vatApplicable ? 'TTC' : 'à payer'}: {money(totals.total, currency)}
                </div>
              </div>
            </div>

            <textarea
              placeholder="Notes / conditions de paiement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                marginTop: '20px',
                width: '100%',
                minHeight: '100px',
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                outline: 'none',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)',
                resize: 'vertical',
                transition: 'all 0.2s ease',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '20px',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                onClick={saveInvoice}
                variant="primary"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                💾 Enregistrer
              </Button>
              <Button
                onClick={exportJSON}
                variant="outline"
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                📤 Export JSON
              </Button>
              <Button
                onClick={printInvoice}
                variant="warn"
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                🖨️ Export PDF
              </Button>
            </div>
          </motion.div>

          {/* Aperçu imprimable */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            ref={previewRef}
            style={{
              background: 'linear-gradient(145deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))',
              borderRadius: '20px',
              padding: '24px',
              border: '2px solid #6366F1',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px #6366F120',
            }}
          >
            <h3
              style={{
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 700,
                color: '#6366F1',
                textAlign: 'center',
              }}
            >
              👁️ Aperçu de la Facture
            </h3>

            <div className="inv">
              <div className="hdr">
                <div className="info">
                  <h2>Facture {number || '—'}</h2>
                  <div className="muted">Date: {date}</div>
                  {dueDate ? <div className="muted">Échéance: {dueDate}</div> : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {clientType === 'b2b' ? (
                    <>
                      {profile.logoDataUrl ? (
                        <img src={profile.logoDataUrl} alt="logo" style={{ maxHeight: 72 }} />
                      ) : (
                        <strong>{profile.companyName || '—'}</strong>
                      )}
                      <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                        {profile.address || ''}
                      </div>
                      {profile.siret && <div className="muted">SIRET: {profile.siret}</div>}
                      {profile.vatNumber && <div className="muted">TVA: {profile.vatNumber}</div>}
                      {profile.email && <div className="muted">Email: {profile.email}</div>}
                      {profile.phone && <div className="muted">Tél: {profile.phone}</div>}
                    </>
                  ) : (
                    <>
                      <strong>{profile.companyName || client.name || '—'}</strong>
                      <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                        {profile.address || client.address || ''}
                      </div>
                      {(profile.email || client.email) && (
                        <div className="muted">Email: {profile.email || client.email}</div>
                      )}
                      {profile.phone && <div className="muted">Tél: {profile.phone}</div>}
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Client</strong>
                <div>{client.name || '—'}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{client.address || ''}</div>
                {client.email && <div className="muted">{client.email}</div>}
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qté</th>
                    <th>PU HT</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        {it.description || '—'}
                        {(!vatApplicable || it.taxExempt) && (
                          <div className="muted">TVA non applicable</div>
                        )}
                      </td>
                      <td>{(it.quantity || 0).toFixed(2)}</td>
                      <td>{money(it.unitPrice || 0, currency)}</td>
                      <td>{money((it.quantity || 0) * (it.unitPrice || 0), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="totals">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'right' }}>Sous‑total HT:</td>
                    <td style={{ textAlign: 'right' }}>{money(totals.subtotal, currency)}</td>
                  </tr>
                  {vatApplicable && (
                    <tr>
                      <td style={{ textAlign: 'right' }}>TVA ({taxRate}%):</td>
                      <td style={{ textAlign: 'right' }}>{money(totals.vat, currency)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      Total {vatApplicable ? 'TTC' : 'à payer'}:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      {money(totals.total, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {!vatApplicable && (
                <div style={{ marginTop: 12 }} className="muted">
                  TVA non applicable – article 293 B du CGI.
                </div>
              )}
              {notes ? (
                <div style={{ marginTop: 24 }}>
                  <strong>Notes</strong>
                  <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {notes}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>

        {/* Colonne droite: liste des factures */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            background: 'linear-gradient(145deg, rgba(244,114,182,0.1), rgba(244,114,182,0.05))',
            borderRadius: '20px',
            padding: '24px',
            height: 'fit-content',
            border: '2px solid #F472B6',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px #F472B620',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: '#F472B6',
              }}
            >
              📚 Mes Factures
            </h3>
          </div>

          <input
            placeholder="🔍 Rechercher (n°, client, email)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: `2px solid ${colors.border}`,
              outline: 'none',
              fontSize: '14px',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text)',
              marginBottom: '20px',
              transition: 'all 0.2s ease',
            }}
          />

          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredInvoices.map((inv) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: colors.primary, fontSize: '14px' }}>
                    {inv.number}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {inv.client.name} • {inv.date}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNumber(inv.number)
                      setDate(inv.date)
                      setDueDate(inv.dueDate || '')
                      setCurrency(inv.currency)
                      setTaxRate(inv.taxRate)
                      setVatApplicable(!!inv.vatApplicable)
                      setClientType(inv.clientType || 'b2c')
                      setClient(inv.client)
                      setItems(inv.items)
                      setNotes(inv.notes || '')
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  >
                    📖
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = invoices.filter((i) => i.id !== inv.id)
                      setInvoices(next)
                      saveInvoices(next)
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      color: '#EF4444',
                    }}
                  >
                    🗑️
                  </Button>
                </div>
              </motion.div>
            ))}
            {!filteredInvoices.length && (
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  textAlign: 'center',
                  padding: '32px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255,255,255,0.1)',
                }}
              >
                📝 Aucune facture enregistrée
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default BillingPage
