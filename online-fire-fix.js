(()=>{
'use strict';

const remoteFireSeq=new Map();
let localFireSeq=0,patched=false;

function patch(){
  if(patched)return true;
  const bridge=window.DroneArenaOnlineBridge,net=window.DroneArenaOnlineNet;
  if(!bridge||!net||!bridge.snapshot||!bridge.upsertRemote||!bridge.remoteFire||!net.onLocalFire)return false;

  const originalSnapshot=bridge.snapshot.bind(bridge);
  const originalUpsert=bridge.upsertRemote.bind(bridge);
  const originalRemoteFire=bridge.remoteFire.bind(bridge);
  const originalLocalFire=net.onLocalFire.bind(net);

  bridge.snapshot=()=>{
    const snap=originalSnapshot();
    if(snap)snap.fireSeq=localFireSeq;
    return snap;
  };

  net.onLocalFire=(...args)=>{
    localFireSeq=(localFireSeq+1)>>>0;
    return originalLocalFire(...args);
  };

  bridge.upsertRemote=(id,state)=>{
    const seq=Number(state?.fireSeq)||0;
    const previous=remoteFireSeq.get(id);
    const result=originalUpsert(id,state);
    if(seq){
      remoteFireSeq.set(id,seq);
      if(previous!==undefined&&seq!==previous){
        const delta=(seq-previous)>>>0;
        const count=Math.max(1,Math.min(3,delta));
        for(let i=0;i<count;i++)setTimeout(()=>originalRemoteFire(id,state),i*18);
      }
    }
    return result;
  };

  const oldStop=bridge.stop?.bind(bridge);
  if(oldStop)bridge.stop=(...args)=>{remoteFireSeq.clear();localFireSeq=0;return oldStop(...args);};

  patched=true;
  return true;
}

if(!patch()){
  let tries=0;
  const timer=setInterval(()=>{tries++;if(patch()||tries>100)clearInterval(timer);},100);
}
})();
