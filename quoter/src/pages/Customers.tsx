import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { Customer } from '../lib/types'
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api<Customer[]>('/customers').then(setCustomers).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget
    setSaving(true); setError('')
    try { const customer = await api<Customer>('/customers', Object.fromEntries(new FormData(form))); setCustomers([...customers, customer].sort((a, b) => a.name.localeCompare(b.name))); form.reset() } catch (e) { setError((e as Error).message) } finally { setSaving(false) }
  }
  return <><div className="page-heading"><div><p className="eyebrow">RELATIONSHIPS</p><h1>Customers</h1><p>Keep customer details ready for your next quote.</p></div></div>{error && <p role="alert" className="error">{error}</p>}<section className="panel"><h2>Add customer</h2><form onSubmit={submit}><div className="fields">{[['name', 'Name', 'text'], ['company', 'Company', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'], ['taxId', 'Tax ID', 'text'], ['address', 'Address', 'text']].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} required={name === 'name'} maxLength={name === 'address' ? 1000 : name === 'email' ? 254 : name === 'phone' || name === 'taxId' ? 100 : 200} /></label>)}</div><button disabled={saving}>{saving ? 'Saving…' : 'Add customer'}</button></form></section><section className="panel"><h2>Customer directory</h2>{loading ? <p>Loading customers…</p> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Email</th></tr></thead><tbody>{customers.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.company || '—'}</td><td>{c.phone || '—'}</td><td>{c.email || '—'}</td></tr>)}</tbody></table>{!customers.length && <p>No customers yet.</p>}</div>}</section></>
}
