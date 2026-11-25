import type {jsPDF} from 'jspdf'
import {quoteTermSections} from './quote-conditions.ts'
type Style='normal'|'bold'
export interface PdfTermLine {runs:{text:string;style:Style}[];gap:number}
/** Wrap styled runs before pagination so continuation lines retain the full width. */
export function layoutPdfTerms(doc:jsPDF,value:string,width:number,fontSize:number){
 doc.setFontSize(fontSize)
 const result:PdfTermLine[]=[]
 const measure=(text:string,style:Style)=>{doc.setFont('helvetica',style);return doc.getTextWidth(text)}
 for(const section of quoteTermSections(value)){
  let runs:PdfTermLine['runs']=[],used=0,space=false
  const flush=()=>{result.push({runs,gap:0});runs=[];used=0;space=false}
  const append=(text:string,style:Style)=>{const last=runs.at(-1);if(last?.style===style)last.text+=text;else runs.push({text,style});used+=measure(text,style)}
  const parts:{text:string;style:Style}[]=[...(section.title?[{text:section.title+': ',style:'bold' as const}]:[]),{text:section.text,style:'normal'}]
  for(const part of parts)for(const token of part.text.replace(/\r\n?/g,'\n').split(/(\n|[^\S\n]+)/)){
   if(!token)continue
   if(token==='\n'){flush();continue}
   if(/^\s+$/.test(token)){space=runs.length>0;continue}
   const wordWidth=measure(token,part.style),spaceWidth=space?measure(' ',part.style):0
   if(runs.length&&used+spaceWidth+wordWidth>width)flush()
   if(space&&runs.length)append(' ',part.style)
   space=false
   if(wordWidth<=width)append(token,part.style)
   else for(const letter of token){const size=measure(letter,part.style);if(runs.length&&used+size>width)flush();append(letter,part.style)}
  }
  if(runs.length)flush()
  if(result.length)result[result.length-1].gap=2
 }
 return result
}
