import { useSubscription } from './subscription-context'
import { createContext,useContext } from 'react'
export type Role='owner'|'editor'|'viewer'
export const RoleContext=createContext<Role>('viewer')
export function usePermissions(){const role=useContext(RoleContext),{canWrite}=useSubscription();return {role,canEdit:role!=='viewer'&&canWrite,isOwner:role==='owner'&&canWrite}}
