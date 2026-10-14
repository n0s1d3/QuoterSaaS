const fields=['name','company','phone','email','tax_id','address'] as const
/** Exact complete profiles, never a fuzzy name/email-only match. Empty optional values are equivalent. */
export function customerProfile(row:Record<string,unknown>){return JSON.stringify(fields.map(field=>String(row[field]??'').trim()))}
export function resolveCustomers(incoming:Record<string,unknown>[],own:Record<string,unknown>[],initial:Map<string,string>,aliases:Map<string,string>){
 const maps=new Map(initial),byId=new Map(own.map(row=>[String(row.id),row])),groups=new Map<string,Record<string,unknown>[]>()
 for(const row of own){const key=customerProfile(row),group=groups.get(key)||[];group.push(row);groups.set(key,group)}
 const reserved=new Set(incoming.map(row=>String(row.id)).filter(id=>byId.has(id))),selected=new Map<string,string>()
 const baseIdentity=(row:Record<string,unknown>)=>{const id=String(row.id);return byId.has(id)?id:aliases.get(id)||initial.get(id)!}
 // Resolve known destinations before new source copies, independent of JSON row order.
 const ordered=incoming.slice().sort((a,b)=>Number(!byId.has(baseIdentity(a)))-Number(!byId.has(baseIdentity(b))))
 for(const row of ordered){
  const source=String(row.id),base=baseIdentity(row)
  const known=byId.get(base),profile=customerProfile(row),matches=groups.get(profile)||[]
  // An explicit identity wins when restoring changed contact information.
  let target=base
  if(!known||customerProfile(known)===profile){
   const explicit=matches.filter(match=>reserved.has(String(match.id)))
   const candidates=explicit.length?explicit:matches
   target=selected.get(profile)||String(candidates.slice().sort((a,b)=>String(a.created_at??'').localeCompare(String(b.created_at??''))||String(a.id).localeCompare(String(b.id)))[0]?.id??base)
   selected.set(profile,target)
  }
  if(!selected.has(profile))selected.set(profile,target)
  maps.set(source,target)
 }
 const targets=new Set(maps.values()),duplicates=new Map<string,string>()
 const profiles=new Map<string,string>()
 for(const row of incoming){
  const target=maps.get(String(row.id))!,profile=customerProfile(row)
  if(profiles.has(target)&&profiles.get(target)!==profile)throw new Error('Dos clientes del respaldo apuntan al mismo destino con datos diferentes')
  profiles.set(target,profile)
  // Only remove identical existing profiles covered by this confirmed restore.
  if(byId.has(target)&&customerProfile(byId.get(target)!)===profile)for(const match of groups.get(profile)||[]){const id=String(match.id);if(id!==target&&!targets.has(id))duplicates.set(id,target)}
 }
 return {maps,duplicates}
}
