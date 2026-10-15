import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto'
import { createReadStream,createWriteStream,appendFileSync,closeSync,openSync,readSync,readFileSync,writeFileSync,existsSync,statSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
export const maxSnapshotBytes=128*1024*1024
const magic=Buffer.from('QUOTER-D1-AESGCM-v1\n'),headerBytes=magic.length+12,tagBytes=16
export function backupKey(path,{create=false}={}){if(create&&!existsSync(path))writeFileSync(path,randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});const text=readFileSync(path,'utf8').trim();if(!/^[a-f0-9]{64}$/i.test(text))throw new Error('La clave privada de respaldo no es válida');return Buffer.from(text,'hex')}
function bounded(){let bytes=0;return new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;done(bytes>maxSnapshotBytes?new Error('El respaldo supera 128 MiB; usa el procedimiento D1 para bases mayores'):null,chunk)}})}
export async function encryptSnapshot(source,destination,key){
 if(!statSync(source).size)throw new Error('La exportación SQL está vacía')
 const header=Buffer.concat([magic,randomBytes(12)]),cipher=createCipheriv('aes-256-gcm',key,header.subarray(magic.length));cipher.setAAD(header)
 writeFileSync(destination,header,{flag:'wx',mode:0o600})
 await pipeline(createReadStream(source),bounded(),cipher,createWriteStream(destination,{flags:'a'}))
 appendFileSync(destination,cipher.getAuthTag())
}
export async function decryptSnapshot(source,destination,key){
 const size=statSync(source).size;if(size<headerBytes+tagBytes+1||size>maxSnapshotBytes+headerBytes+tagBytes)throw new Error('Tamaño de respaldo inválido')
 const header=Buffer.alloc(headerBytes),tag=Buffer.alloc(tagBytes),fd=openSync(source,'r');try{if(readSync(fd,header,0,header.length,0)!==header.length||readSync(fd,tag,0,tag.length,size-tag.length)!==tag.length)throw new Error('Respaldo incompleto')}finally{closeSync(fd)}
 if(!header.subarray(0,magic.length).equals(magic))throw new Error('Formato de respaldo no compatible')
 const decipher=createDecipheriv('aes-256-gcm',key,header.subarray(magic.length));decipher.setAAD(header);decipher.setAuthTag(tag)
 try{await pipeline(createReadStream(source,{start:headerBytes,end:size-tagBytes-1}),decipher,bounded(),createWriteStream(destination,{flags:'wx',mode:0o600}))}catch{throw new Error('No se pudo autenticar el respaldo: clave incorrecta o archivo alterado')}
}
