(() => {
  const teams=['valor','mystic','instinct'];
  const state=window.TC_LOCKED_BACKGROUNDS={images:{},ready:false};
  async function loadTeam(team){
    const r=await fetch(`assets/locked/${team}.b64?v=18`,{cache:'force-cache'});
    if(!r.ok)throw new Error(`Missing locked background ${team}`);
    const b64=(await r.text()).trim();
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='data:image/avif;base64,'+b64;});
    state.images[team]=img;
  }
  state.load=async()=>{
    if(state.promise)return state.promise;
    state.promise=Promise.all(teams.map(loadTeam)).then(()=>{
      state.ready=true;
      window.TC?.drawFront?.();window.TC?.drawBack?.();
      return state.images;
    }).catch(e=>{console.error('locked backgrounds',e);throw e;});
    return state.promise;
  };
  state.load();
})();
