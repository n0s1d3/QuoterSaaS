import type { ReactNode } from 'react'
import { useSubscription } from '../lib/subscription-context'
export default function WriteAccess({children}:{children:ReactNode}){
 const {canWrite,subscription}=useSubscription()
 // Keep the editor mounted so expiry does not discard an unsaved draft.
 return <>{!canWrite&&<p>{subscription?'Este negocio está en modo de solo lectura. Renueva el plan para crear o editar cotizaciones.':'Comprobando la vigencia del negocio…'}</p>}<fieldset className="readonly-fields" disabled={!canWrite}>{children}</fieldset></>
}
