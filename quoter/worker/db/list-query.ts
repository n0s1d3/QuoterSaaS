import { HttpError } from '../http.ts'
export function listQuery(url:URL) {
 const paged=url.searchParams.get('paged')
 if(paged!==null&&!['1','true'].includes(paged))throw new HttpError(400,'Paginación inválida')
 const limit=Number(url.searchParams.get('limit')??50),offset=Number(url.searchParams.get('offset')??0)
 if(!Number.isSafeInteger(limit)||limit<1||limit>50||!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'Página inválida')
 const search=(url.searchParams.get('search')||'').trim()
 if(search.length>200)throw new HttpError(400,'La búsqueda admite hasta 200 caracteres')
 return {paged:paged!==null,limit,offset,search:search.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()}
}
// SQL expression names are constants supplied by routes. User input is bound and
// LIKE metacharacters are escaped, so searching for %, _ or \ matches literally.
export function listSearch(expression:string,search:string) {
 let folded=expression
 for(const [letters,base] of [['áÁ','a'],['éÉ','e'],['íÍ','i'],['óÓ','o'],['úÚüÜ','u'],['ñÑ','n'],['çÇ','c']])for(const letter of letters)folded=`replace(${folded},'${letter}','${base}')`
 return {sql:`lower(${folded}) LIKE ? ESCAPE '\\'`,value:'%'+search.replace(/[\\%_]/g,'\\$&')+'%'}
}
