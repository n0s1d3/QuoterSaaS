import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { inspectLogo,inspectRaster,validateLogo } from '../src/lib/raster.ts'
function crc(data:Buffer){let n=0xffffffff;for(const byte of data){n^=byte;for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1}return(n^0xffffffff)>>>0}
function chunk(type:string,data:Buffer){const header=Buffer.alloc(4),footer=Buffer.alloc(4);header.writeUInt32BE(data.length);footer.writeUInt32BE(crc(Buffer.concat([Buffer.from(type),data])));return Buffer.concat([header,Buffer.from(type),data,footer])}
function png(width=1,height=1,inflated=Buffer.from([0,255,255]),animated=false){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=4;const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),...(animated?[chunk('acTL',Buffer.alloc(8))]:[]),chunk('IDAT',deflateSync(inflated)),chunk('IEND',Buffer.alloc(0))]);return 'data:image/png;base64,'+bytes.toString('base64')}
test('logos require actual signature, consistent MIME, canonical base64 and bounded dimensions',async()=>{
 const good=png();assert.equal(inspectLogo(good).width,1);await validateLogo(good)
 assert.throws(()=>inspectLogo(good.replace('image/png','image/jpeg')));assert.throws(()=>inspectLogo('data:image/png;base64,'+Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')));assert.throws(()=>inspectLogo(png(100000,100000)));assert.throws(()=>inspectLogo(png(1,1,undefined,true)));assert.throws(()=>inspectRaster(Buffer.from([255,216,255,217])))
 const corrupted=Buffer.from(good.split(',')[1],'base64');corrupted[corrupted.length-5]^=1;assert.throws(()=>inspectLogo('data:image/png;base64,'+corrupted.toString('base64')))
})
test('PNG expansion cannot exceed dimensions declared by its valid header',async()=>{await assert.rejects(()=>validateLogo(png(1,1,Buffer.alloc(1024*1024))));await assert.rejects(()=>validateLogo(png(1,1,Buffer.alloc(2))))})

test('compressed PNG metadata has its own expansion budget',async()=>{
 const good=png(),bytes=Buffer.from(good.split(',')[1],'base64'),profile=chunk('iCCP',Buffer.concat([Buffer.from('Profile\0'),Buffer.from([0]),deflateSync(Buffer.alloc(2*1024*1024))]));const forged=Buffer.concat([bytes.subarray(0,33),profile,bytes.subarray(33)]);await assert.rejects(()=>validateLogo('data:image/png;base64,'+forged.toString('base64')))
})
