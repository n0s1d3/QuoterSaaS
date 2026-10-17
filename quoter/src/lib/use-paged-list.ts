import { useEffect,useRef,useState } from 'react'
import { api } from './api'
export interface ListPage<T> {items:T[];total:number;hasMore:boolean}
interface PageState<T> extends ListPage<T> {key:string;loading:boolean;error:string}
function pagePath(path:string,offset:number){return `${path}${path.includes('?')?'&':'?'}paged=1&limit=50&offset=${offset}`}
/** Search requests cancel older pages; only one bounded page is fetched at a time. */
export function usePagedList<T extends {id:string}>(path:string,enabled=true) {
 const [state,setState]=useState<PageState<T>>({key:'',items:[],total:0,hasMore:false,loading:false,error:''}),[version,setVersion]=useState(0)
 const generation=useRef(0),offset=useRef(0),pending=useRef(false),controller=useRef<AbortController|null>(null)
 const key=JSON.stringify([path,enabled,version])
 useEffect(()=>{
  const current=++generation.current,abort=new AbortController();controller.current=abort;pending.current=enabled;offset.current=0
  const timer=enabled?setTimeout(()=>{
   setState({key,items:[],total:0,hasMore:false,loading:true,error:''})
   api<ListPage<T>>(pagePath(path,0),undefined,'GET',{signal:abort.signal}).then(page=>{
    if(current!==generation.current||abort.signal.aborted)return
    offset.current=page.items.length;setState({...page,key,loading:false,error:''})
   }).catch(error=>{if(current===generation.current&&!abort.signal.aborted)setState({key,items:[],total:0,hasMore:false,loading:false,error:(error as Error).message})}).finally(()=>{if(current===generation.current)pending.current=false})
  },200):undefined
  return ()=>{if(timer!==undefined)clearTimeout(timer);abort.abort()}
 },[path,enabled,key])
 const visible=state.key===key?state:{items:[] as T[],total:0,hasMore:false,loading:enabled,error:''}
 async function loadMore() {
  const abort=controller.current
  if(!enabled||pending.current||visible.loading||!visible.hasMore||!abort||abort.signal.aborted)return
  const current=generation.current;pending.current=true;setState(previous=>({...previous,loading:true,error:''}))
  try {
   const page=await api<ListPage<T>>(pagePath(path,offset.current),undefined,'GET',{signal:abort.signal})
   if(current!==generation.current||abort.signal.aborted)return
   offset.current+=page.items.length
   setState(previous=>({...previous,items:[...previous.items,...page.items.filter(item=>!previous.items.some(row=>row.id===item.id))],total:page.total,hasMore:page.hasMore,loading:false}))
  }catch(error){if(current===generation.current&&!abort.signal.aborted)setState(previous=>({...previous,loading:false,error:(error as Error).message}))}finally{if(current===generation.current)pending.current=false}
 }
 return {...visible,loadMore,reload:()=>setVersion(value=>value+1)}
}
