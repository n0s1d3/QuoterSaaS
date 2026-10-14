export class HttpError extends Error { status: number; retryAfter?:number; constructor(status: number, message: string,retryAfter?:number) { super(message); this.status = status;this.retryAfter=retryAfter } }
export function text(value: unknown, name: string, required = false, max = 1000): string | null {
  if (value == null || value === '') { if (required) throw new HttpError(400, `El campo ${name} es obligatorio`); return null }
  if (typeof value !== 'string' || value.length > max || value.trim().length > max || (required && !value.trim())) throw new HttpError(400, `El campo ${name} no es válido`)
  return value.trim() || null
}
export async function boundedText(request:Request,maxBytes:number){
 if(!request.body)return ''
 const reader=request.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});let bytes=0,output='',oversized=false
 try{
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){oversized=true;output='';if(bytes>maxBytes+1048576){await reader.cancel().catch(()=>{});throw new HttpError(413,'La solicitud supera el tamaño permitido')}continue}output+=decoder.decode(value,{stream:true})}
  if(oversized)throw new HttpError(413,'La solicitud supera el tamaño permitido')
  return output+decoder.decode()
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'El cuerpo de la solicitud no es válido')}finally{reader.releaseLock()}
}
export async function body(request: Request): Promise<Record<string, unknown>> {
 const raw=await boundedText(request,(/^\/api\/(auth|security)\//.test(new URL(request.url).pathname))?16384:1048576)
 let data: unknown
 try { data = JSON.parse(raw) } catch { throw new HttpError(400, 'JSON inválido') }
 if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Se esperaba un objeto JSON')
 return data as Record<string, unknown>
}

export function guardTransport(request:Request){
 const url=new URL(request.url)
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new HttpError(426,'Usa HTTPS para acceder a la aplicación')
}
