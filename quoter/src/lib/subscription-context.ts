import { createContext,useContext } from 'react'
import type { Subscription } from './subscription'
export const SubscriptionContext=createContext<{canWrite:boolean;subscription:Subscription|null}>({canWrite:true,subscription:null})
export const useSubscription=()=>useContext(SubscriptionContext)
