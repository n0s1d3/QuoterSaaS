import { chmodSync,lstatSync,realpathSync } from 'node:fs'

// A create mode does not tighten an existing file. Never follow a link here.
export function privateFile(path){
 const info=lstatSync(path)
 if(!info.isFile()||info.isSymbolicLink())throw new Error('El archivo privado debe ser un archivo regular, sin enlaces')
 if(process.platform!=='win32')chmodSync(path,0o600)
 return realpathSync(path)
}
export function privateFileIfExists(path){
 try{lstatSync(path)}catch(error){if(error.code==='ENOENT')return false;throw error}
 privateFile(path);return true
}
