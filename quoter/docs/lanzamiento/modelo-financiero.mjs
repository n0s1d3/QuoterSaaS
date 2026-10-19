/** Planning only: not accounting, provider prices or forecasts. No network/state. */
export function finance(v){
 const months=Number(v.months??12),discount=Number(v.discount??15),refund=Number(v.refund??3)
 if(![1,3,6,12].includes(months)||discount<0||discount>100||refund<0||refund>100)throw new Error('Periodo o porcentaje inválido')
 const weights=[v.mix1,v.mix2,v.mix3].map(Number),weight=weights.reduce((a,b)=>a+b,0)
 if(!(weight>0))throw new Error('Mezcla de planes inválida')
 const prices=[v.price1,v.price2,v.price3].map(Number)
 const totals=prices.map(price=>Math.round(price*100*months*(1-discount/100))/100)
 const periodPrice=totals.reduce((sum,total,i)=>sum+total*weights[i]/weight,0)
 const nominal=periodPrice/months
 const infrastructure=(v.workers+v.email+v.domain/12+v.backup+v.monitor)*v.fx
 const fixedCash=infrastructure+v.marketing+v.extra
 const fixedTime=(v.operations+v.commercial)*v.hourly
 const onboarding=v.onboardings*v.onboardingMinutes*v.hourly/60
 const variableTime=(v.support+v.paymentMinutes/months)*v.hourly/60
 // Percentage fees are on gross receipts; fixed fees occur once per contract.
 // Full-refund reserve reduces recognized revenue. No fee recovery is assumed.
 const feePerBusiness=nominal*v.feePercent/100+v.feeFixed/months
 const retained=nominal*(1-refund/100)/(1+v.tax/100)
 const cashContribution=retained-feePerBusiness,economicContribution=cashContribution-variableTime
 const economicBreakEven=economicContribution>0?Math.ceil((fixedCash+fixedTime+onboarding)/economicContribution):null
 const cashBreakEven=cashContribution>0?Math.ceil(fixedCash/cashContribution):null
 function portfolio(n){const gross=nominal*n,net=retained*n,cash=net-feePerBusiness*n-fixedCash,economic=cash-fixedTime-variableTime*n-onboarding;return{businesses:n,gross,net,cash,economic,initialCohortCash:periodPrice*n}}
 return{months,discount,refund,periodPrice,nominal,infrastructure,fixedCash,fixedTime,onboarding,variableTime,cashContribution,economicContribution,economicBreakEven,cashBreakEven,portfolio}
}
