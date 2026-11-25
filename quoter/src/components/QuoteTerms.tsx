import {quoteTermSections} from '../lib/quote-conditions'
export default function QuoteTerms({value}:{value?:string|null}){
 return <div className="quote-terms">{value?quoteTermSections(value).map((section,index)=><div key={index}><p className="notes">{section.title&&<strong>{section.title}: </strong>}{section.text}</p></div>):<p>No especificadas.</p>}</div>
}
