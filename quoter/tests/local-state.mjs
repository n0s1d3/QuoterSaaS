import { resolve } from 'node:path'
export function localStateArgs(){
 const state=process.env.QUOTER_IMPORT_STATE
 if(!state||resolve(state)===resolve('.wrangler/state'))throw new Error('Esta prueba necesita QUOTER_IMPORT_STATE con una D1 temporal aislada. Usa npm run test:integration.')
 return ['--local','--persist-to',resolve(state),...(process.env.QUOTER_TEST_CONFIG?['--config',resolve(process.env.QUOTER_TEST_CONFIG)]:[])]
}
