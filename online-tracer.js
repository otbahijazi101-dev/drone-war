(()=>{
'use strict';

const oldPhone=/iP(hone|od)/.test(navigator.userAgent)&&Math.max(screen.width||0,screen.height||0)<=736;
const remoteStates=new Map();
const tracers=[];
let patched=false;

const canvas=document.createElement('canvas');
canvas.id='dwOnlineTracerCanvas';
canvas.setAttribute('aria-hidden','true');
Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'11'});
document.body.appendChild(canvas);
const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
let dpr=1,w=innerWidth,h=innerHeight;

function resize(){
  w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);
  dpr=Math.min(window.devicePixelRatio||1,oldPhone?1.25:1.8);
  canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();window.addEventListener('resize',resize,{passive:true});

const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];}
function heading(yaw){return [-Math.sin(Number(yaw)||0),0,-Math.cos(Number(yaw)||0)];}
function rightFromYaw(yaw){return [Math.cos(Number(yaw)||0),0,-Math.sin(Number(yaw)||0)];}
function lerpDir(a,b,t){return norm([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);}

function cameraFrame(){
  const snap=window.DroneArenaOnlineBridge?.snapshot?.();
  if(!snap||!Array.isArray(snap.p))return null;
  const p=snap.p.map(Number),forward=heading(snap.yaw);
  const cam=add(add(p,mul(forward,-13)),[0,6,0]);
  const target=add(add(p,mul(forward,28)),[0,.7,0]);
  const view=norm(sub(target,cam));
  const right=norm(cross(view,[0,1,0]));
  const up=norm(cross(right,view));
  return {p,cam,view,right,up};
}

function project(point,frame){
  const v=sub(point,frame.cam),z=dot(v,frame.view);
  if(z<.7)return null;
  const aspect=w/Math.max(1,h),f=1/Math.tan(80*Math.PI/360);
  const nx=dot(v,frame.right)/z*f/aspect,ny=dot(v,frame.up)/z*f;
  if(Math.abs(nx)>1.35||Math.abs(ny)>1.35)return null;
  return [(nx*.5+.5)*w,(-ny*.5+.5)*h,z];
}

function spawnTracer(id){
  const r=remoteStates.get(id),local=window.DroneArenaOnlineBridge?.snapshot?.();
  if(!r||!Array.isArray(r.p)||!local||!Array.isArray(local.p))return;
  const side=(r.__muzzleSide=(r.__muzzleSide||1)*-1),yaw=Number(r.yaw)||0;
  let dir=heading(yaw);
  const source=add(add(r.p.map(Number),mul(rightFromYaw(yaw),side*.78)),[0,-.24,0]);
  const towardLocal=norm(sub(local.p.map(Number),source));
  if(dot(dir,towardLocal)>.5)dir=lerpDir(dir,towardLocal,.68);
  const born=performance.now();
  tracers.push({source,dir,born,duration:oldPhone?.32:.42,speed:118,length:oldPhone?6.2:8.5});
  const max=oldPhone?18:36;if(tracers.length>max)tracers.splice(0,tracers.length-max);
}

function render(now){
  ctx.clearRect(0,0,w,h);
  const frame=cameraFrame();
  for(let i=tracers.length-1;i>=0;i--){
    const t=tracers[i],age=(now-t.born)/1000;
    if(age>=t.duration){tracers.splice(i,1);continue;}
    if(!frame)continue;
    const dist=Math.min(52,1.8+age*t.speed),tailDist=Math.max(0,dist-t.length);
    const a=add(t.source,mul(t.dir,tailDist)),b=add(t.source,mul(t.dir,dist));
    const pa=project(a,frame),pb=project(b,frame);if(!pa||!pb)continue;
    const alpha=Math.max(0,1-age/t.duration),depth=Math.min(pa[2],pb[2]);
    const width=Math.max(oldPhone?1.8:2.2,Math.min(oldPhone?4:5.5,72/Math.max(10,depth)));
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';
    if(!oldPhone){ctx.shadowColor='#ff563d';ctx.shadowBlur=8;}
    const g=ctx.createLinearGradient(pa[0],pa[1],pb[0],pb[1]);g.addColorStop(0,'rgba(255,66,49,.12)');g.addColorStop(.55,'rgba(255,86,61,.95)');g.addColorStop(1,'rgba(255,222,180,1)');
    ctx.strokeStyle=g;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,245,220,.92)';ctx.lineWidth=Math.max(1,width*.28);ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.stroke();ctx.restore();
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function patchBridge(){
  if(patched)return true;
  const bridge=window.DroneArenaOnlineBridge;if(!bridge)return false;
  const upsert=bridge.upsertRemote?.bind(bridge),remoteFire=bridge.remoteFire?.bind(bridge),remove=bridge.removeRemote?.bind(bridge),stop=bridge.stop?.bind(bridge);
  if(!upsert||!remoteFire)return false;
  bridge.upsertRemote=(id,state)=>{const prev=remoteStates.get(id)||{};remoteStates.set(id,{...prev,...state});return upsert(id,state);};
  bridge.remoteFire=id=>{remoteFire(id);spawnTracer(id);};
  if(remove)bridge.removeRemote=id=>{remoteStates.delete(id);return remove(id);};
  if(stop)bridge.stop=(...args)=>{remoteStates.clear();tracers.length=0;return stop(...args);};
  patched=true;return true;
}
if(!patchBridge()){
  let tries=0;const timer=setInterval(()=>{tries++;if(patchBridge()||tries>80)clearInterval(timer);},100);
}

window.DroneArenaOnlineTracer={clear(){tracers.length=0;remoteStates.clear();}};
})();
