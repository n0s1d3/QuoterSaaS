import { createContext,useContext } from 'react'
export type Role='owner'|'editor'|'viewer'
export const RoleContext=createContext<Role>('viewer')
export function usePermissions(){const role=useContext(RoleContext);return {role,canEdit:role!=='viewer',isOwner:role==='owner'}}
