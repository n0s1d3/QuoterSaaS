export default function CatalogChoice({ label, value, options, maxLength, onChange }: { label: string; value: string; options: string[]; maxLength: number; onChange: (value: string) => void }) {
  const isCustom = !options.includes(value)
  return <div><label>{label}<select aria-label={label} value={isCustom ? '__custom__' : value} onChange={e => {
    if (e.target.value === '__custom__') onChange('')
    else onChange(e.target.value)
  }}>{options.map(option => <option key={option} value={option}>{option}</option>)}<option value="__custom__">Otra opción…</option></select></label>{isCustom && <label className="inline-customer">{label} personalizado<input aria-label={`${label} personalizado`} required maxLength={maxLength} value={value} onChange={e => onChange(e.target.value)} placeholder="Escribe tu opción" /></label>}</div>
}
