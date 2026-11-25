import {quoteTermSections} from '../lib/quote-conditions'
export default function QuoteTerms({value}:{value?:string|null}){
 return <div className="quote-terms">{value?quoteTermSections(value).map((section,index)=><div key={index}>{section.title&&<strong>{section.title}:</strong>}<p className="notes">{section.text}</p></div>):<p>No especificadas.</p>}</div>
}
