export interface RasterInfo {format:'png'|'jpeg'|'webp';width:number;height:number;inflatedBytes?:number;compressed?:Uint8Array;compressedMetadata?:Uint8Array[]}
const invalid=()=>new Error('Logo inválido: usa una imagen PNG, JPEG o WebP completa, estática y de tamaño permitido')
const word=(b:Uint8Array,p:number,n:number)=>String.fromCharCode(...b.subarray(p,p+n))
function size(info:RasterInfo,maxDimension:number,maxPixels:number){if(!info.width||!info.height||info.width>maxDimension||info.height>maxDimension||info.width*info.height>maxPixels)throw new Error('El logo supera las dimensiones o el límite de píxeles permitido');return info}
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0})
function crc(b:Uint8Array,start:number,end:number){let c=0xffffffff;for(let i=start;i<end;i++)c=crcTable[(c^b[i])&255]^(c>>>8);return (c^0xffffffff)>>>0}
/** Inspect bounded bytes before handing an image to a decoder. Never trusts MIME or file extension. */
export function inspectRaster(b:Uint8Array,maxDimension=2048,maxPixels=4194304):RasterInfo{
 const view=new DataView(b.buffer,b.byteOffset,b.byteLength)
 if(b.length>=33&&word(b,0,8)==='\x89PNG\r\n\x1a\n'){
  let p=8,width=0,height=0,depth=0,channels=0,color=0,paletteEntries=0,interlaced=0,ended=false,sawData=false,closedData=false;const parts:Uint8Array[]=[],metadata:Uint8Array[]=[]
  while(p+12<=b.length){const n=view.getUint32(p),type=word(b,p+4,4),start=p+8,end=start+n;if(end+4>b.length||crc(b,p+4,end)!==view.getUint32(end))throw invalid()
   if(p===8&&type!=='IHDR')throw invalid()
   if(type==='IHDR'){if(p!==8||n!==13)throw invalid();width=view.getUint32(start);height=view.getUint32(start+4);depth=b[start+8];color=b[start+9];const allowed:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};channels=({0:1,2:3,3:1,4:2,6:4} as Record<number,number>)[color];if(!allowed[color]?.includes(depth)||b[start+10]||b[start+11]||b[start+12]>1)throw invalid();interlaced=b[start+12]}
   else if(['acTL','fcTL','fdAT'].includes(type))throw invalid()
   else if(type==='iCCP'||type==='zTXt'){let split=start;while(split<end&&b[split]!==0)split++;if(split===start||split-start>79||split+2>=end||b[split+1]!==0)throw invalid();metadata.push(b.subarray(split+2,end))}
   else if(type==='iTXt'){let split=start;while(split<end&&b[split]!==0)split++;if(split===start||split-start>79||split+3>=end||b[split+1]>1||b[split+2])throw invalid();const compressed=b[split+1];split+=3;for(let i=0;i<2;i++){while(split<end&&b[split]!==0)split++;split++}if(split>end)throw invalid();if(compressed)metadata.push(b.subarray(split,end))}
   else if(type==='PLTE'){if(sawData||paletteEntries||n<3||n>768||n%3||[0,4].includes(color)||color===3&&n/3>2**depth)throw invalid();paletteEntries=n/3}
   else if(type==='tRNS'){if(sawData||color===3&&(!paletteEntries||n<1||n>paletteEntries)||color===0&&n!==2||color===2&&n!==6||![0,2,3].includes(color))throw invalid()}
   else if(type==='IDAT'){if(closedData||color===3&&!paletteEntries)throw invalid();sawData=true;parts.push(b.subarray(start,end))}
   else if(type==='IEND'){if(n||!sawData||end+4!==b.length)throw invalid();ended=true;p=end+4;break}
   else{if(sawData)closedData=true;if(type[0]===type[0].toUpperCase()&&type!=='PLTE')throw invalid()}
   p=end+4
  }
  if(!ended||p!==b.length)throw invalid()
  const info=size({format:'png',width,height},maxDimension,maxPixels)
  const passes=interlaced?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]]
  info.compressedMetadata=metadata
  info.inflatedBytes=passes.reduce((sum,[x,y,dx,dy])=>{const w=Math.max(0,Math.ceil((width-x)/dx)),h=Math.max(0,Math.ceil((height-y)/dy));return sum+(w&&h?(1+Math.ceil(w*channels*depth/8))*h:0)},0)
  info.compressed=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;for(const part of parts){info.compressed.set(part,offset);offset+=part.length}return info
 }
 if(b.length>=4&&b[0]===255&&b[1]===216){let p=2,width=0,height=0,scans=0
  while(p<b.length){if(b[p++]!==255)throw invalid();while(b[p]===255)p++;const marker=b[p++];if(marker===217){if(p!==b.length||!scans||!width)throw invalid();return size({format:'jpeg',width,height},maxDimension,maxPixels)}if(marker===0||marker===216||marker>=208&&marker<=215||p+2>b.length)throw invalid();const n=view.getUint16(p);if(n<2||p+n>b.length)throw invalid()
   if([192,193,194].includes(marker)){if(width||n<8||b[p+2]!==8||![1,3,4].includes(b[p+7])||n!==8+3*b[p+7])throw invalid();height=view.getUint16(p+3);width=view.getUint16(p+5);size({format:'jpeg',width,height},maxDimension,maxPixels)}
   else if(marker>=192&&marker<=207&&![196,200,204].includes(marker)||marker===220)throw invalid()
   p+=n
   if(marker===218){if(!width)throw invalid();scans++;while(p<b.length){if(b[p]!==255){p++;continue}let q=p+1;while(b[q]===255)q++;if(b[q]===0||b[q]>=208&&b[q]<=215){p=q+1;continue}break}}
  }throw invalid()
 }
 if(b.length>=20&&word(b,0,4)==='RIFF'&&word(b,8,4)==='WEBP'&&view.getUint32(4,true)+8===b.length){let p=12,width=0,height=0,canvasWidth=0,canvasHeight=0,images=0
  while(p+8<=b.length){const type=word(b,p,4),n=view.getUint32(p+4,true),start=p+8;if(start+n+(n&1)>b.length)throw invalid()
   if(type==='ANIM'||type==='ANMF')throw invalid()
   if(type==='VP8X'){if(p!==12||n!==10||b[start]&0xc3||b[start+1]||b[start+2]||b[start+3])throw invalid();canvasWidth=1+(b[start+4]|b[start+5]<<8|b[start+6]<<16);canvasHeight=1+(b[start+7]|b[start+8]<<8|b[start+9]<<16);size({format:'webp',width:canvasWidth,height:canvasHeight},maxDimension,maxPixels)}
   if(type==='VP8 '){if(n<10||b[start]&1||word(b,start+3,3)!=='\x9d\x01\x2a')throw invalid();width=view.getUint16(start+6,true)&16383;height=view.getUint16(start+8,true)&16383;images++}
   if(type==='VP8L'){if(n<5||b[start]!==47)throw invalid();const bits=view.getUint32(start+1,true);if(bits>>>29)throw invalid();width=(bits&16383)+1;height=((bits>>>14)&16383)+1;images++}
   p=start+n+(n&1)
  }if(p!==b.length||images!==1||canvasWidth&&(canvasWidth!==width||canvasHeight!==height))throw invalid();return size({format:'webp',width,height},maxDimension,maxPixels)
 }throw invalid()
}
export function inspectLogo(value:string){if(value.length>400000)throw invalid();const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match||match[2].length%4)throw invalid();let decoded:string;try{decoded=atob(match[2])}catch{throw invalid()}if(btoa(decoded)!==match[2])throw invalid();const info=inspectRaster(Uint8Array.from(decoded,c=>c.charCodeAt(0)));if(info.format!==match[1])throw invalid();return info}
async function inflateBounded(input:Uint8Array,limit:number,exact=false){
 const stream=new Blob([new Uint8Array(input)]).stream().pipeThrough(new DecompressionStream('deflate')),reader=stream.getReader();let bytes=0
 try{while(true){const result=await reader.read();if(result.done)break;bytes+=result.value.byteLength;if(bytes>limit){await reader.cancel().catch(()=>{});throw invalid()}}if(exact&&bytes!==limit)throw invalid();return bytes}catch{throw invalid()}finally{reader.releaseLock()}
}
export async function validateRaster(info:RasterInfo){if(info.format!=='png')return;let metadataBytes=0;for(const metadata of info.compressedMetadata||[])metadataBytes+=await inflateBounded(metadata,1048576-metadataBytes);await inflateBounded(info.compressed!,info.inflatedBytes!,true)}
export async function validateLogo(value:string|null|undefined){if(!value)return;await validateRaster(inspectLogo(value))}
