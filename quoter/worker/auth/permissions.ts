import { HttpError } from '../http'
import type { Account } from './session'
export function permissions(user:Account,request:Request,path:string) {
 if(path.startsWith('/api/team')){if(user.role!=='owner')throw new HttpError(403,'Solo el propietario puede administrar el equipo');return}
 if(request.method==='GET')return
 if(user.role==='viewer')throw new HttpError(403,'Tu permiso es de solo lectura')
 if((path==='/api/branding'||request.method==='DELETE')&&user.role!=='owner')throw new HttpError(403,'Esta acción requiere permiso de propietario')
}
