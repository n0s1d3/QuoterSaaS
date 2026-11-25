export function normalizeWebsite(value:unknown):string|null{
 if(value==null||value==='')return null
 if(typeof value!=='string'||value.length>2048)throw new Error('Sitio web inválido: usa una dirección http:// o https:// de hasta 2048 caracteres')
 const text=value.trim();if(!text)return null
 if(Array.from(text).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))throw new Error('Sitio web inválido')
 try{
  const url=new URL(text)
  if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw new Error('invalid')
  return url.href
 }catch{throw new Error('Sitio web inválido: usa una dirección http:// o https:// sin usuario ni contraseña')}
}
