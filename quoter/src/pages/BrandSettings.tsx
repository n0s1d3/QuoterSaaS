import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../lib/api'
import type { Branding } from '../lib/types'
export default function BrandSettings() {
  const [brand, setBrand] = useState<Branding | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api<Branding>('/branding').then(setBrand).catch(e => setMessage(e.message)) }, [])
  async function logo(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 280000) { setMessage('Usa PNG, JPEG o WebP de hasta 280 KB.'); return }
    const reader = new FileReader(); reader.onload = () => setBrand(b => b && ({ ...b, logo: String(reader.result) })); reader.readAsDataURL(file)
  }
  async function save(e: FormEvent) { e.preventDefault(); setSaving(true); try { setBrand(await api<Branding>('/branding', brand, 'PUT')); setMessage('Marca guardada.'); } catch(e) { setMessage((e as Error).message) } finally { setSaving(false) } }
  return <><h1>Mi negocio</h1><p>Personaliza la marca que se utilizará en tus cotizaciones y documentos PDF.</p>{message && <p role="status">{message}</p>}{brand && <form onSubmit={save} className="panel"><div className="fields"><label>Nombre del negocio<input required value={brand.name} onChange={e => setBrand({ ...brand, name: e.target.value })} /></label><label>Color principal<input type="color" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} /></label><label>Color secundario<input type="color" value={brand.accentColor} onChange={e => setBrand({ ...brand, accentColor: e.target.value })} /></label><label>Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void logo(e.target.files?.[0]) }} /></label></div>{brand.logo && <><img className="business-logo" src={brand.logo} alt="Logo del negocio" /><button type="button" className="subtle" onClick={() => setBrand({ ...brand, logo: null })}>Quitar logo</button></>}<div className="brand-preview" style={{ borderColor: brand.primaryColor, background: brand.accentColor }}><strong style={{ color: brand.primaryColor }}>{brand.name}</strong><p>Cotización · Q-0001</p><p>Vista previa de tu marca</p></div><button disabled={saving}>{saving ? 'Guardando…' : 'Guardar marca'}</button></form>}</>
}
