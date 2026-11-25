import {deflateSync} from 'node:zlib'
export function productPng(width=2,height=2,red=245,noise=false){
 function chunk(type,data){const name=Buffer.from(type),bytes=Buffer.concat([name,data]);let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1}const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,bytes,tail])}
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2
 let seed=42;const byte=()=>{seed=(seed*1664525+1013904223)>>>0;return seed>>>24}
 const rows=Buffer.alloc(height*(width*3+1));for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*(width*3+1)+1+x*3;rows[p]=noise?byte():red;rows[p+1]=noise?byte():160;rows[p+2]=noise?byte():7}
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64')
}
