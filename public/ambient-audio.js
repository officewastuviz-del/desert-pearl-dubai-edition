(() => {
  "use strict";
  const config=window.PROPERTY_CONFIG||{};
  const source=config.bgmUrl||"media/music/ambient.m4a";
  const preferredVolume=Math.max(.05,Math.min(.6,Number(config.bgmVolume)||.28));
  const storageKey="dubai-property-ambience";
  const wrapper=document.createElement("div");
  wrapper.className="ambient-sound";
  wrapper.innerHTML=`<audio data-ambient-audio src="${source}" loop preload="metadata"></audio><button class="ambient-toggle" type="button" data-ambient-toggle aria-pressed="false" aria-label="Play ambient soundtrack"><span class="ambient-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="ambient-label">Ambience ready</span></button>`;
  document.body.append(wrapper);
  const audio=wrapper.querySelector("[data-ambient-audio]");
  const button=wrapper.querySelector("[data-ambient-toggle]");
  const label=wrapper.querySelector(".ambient-label");
  let enabled=true;
  let started=false;
  try { enabled=localStorage.getItem(storageKey)!=="off"; } catch {}
  audio.volume=0;

  const update=()=>{
    const playing=enabled&&started&&!audio.paused;
    button.classList.toggle("is-playing",playing);
    button.setAttribute("aria-pressed",String(playing));
    button.setAttribute("aria-label",playing?"Pause ambient soundtrack":"Play ambient soundtrack");
    label.textContent=playing?"Ambience on":(enabled?"Ambience ready":"Ambience off");
  };
  const fade=(target,duration=650)=>{
    const start=audio.volume; const began=performance.now();
    const step=(now)=>{const progress=Math.min(1,(now-began)/duration);audio.volume=start+(target-start)*progress;if(progress<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  };
  const play=async()=>{
    if(!enabled)return;
    try { await audio.play(); started=true; fade(preferredVolume,900); update(); } catch { update(); }
  };
  const pause=()=>{fade(0,420);window.setTimeout(()=>{audio.pause();update();},440);};
  const remember=()=>{try{localStorage.setItem(storageKey,enabled?"on":"off");}catch{}};
  const firstGesture=(event)=>{if(button.contains(event.target))return;document.removeEventListener("pointerdown",firstGesture,true);document.removeEventListener("keydown",firstGesture,true);if(enabled)play();};
  document.addEventListener("pointerdown",firstGesture,true);
  document.addEventListener("keydown",firstGesture,true);
  button.addEventListener("click",()=>{
    if(!started||audio.paused){enabled=true;remember();play();return;}
    enabled=false;remember();pause();
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&!audio.paused)pause(); else if(!document.hidden&&enabled&&started)play();
  });
  update();
})();
