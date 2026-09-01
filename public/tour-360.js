(() => {
  "use strict";

  const config = window.PROPERTY_CONFIG || {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base = "media/360/";
  const scenes = [
    {title:"Grand Arrival", zone:"Arrival", description:"Begin at the illuminated waterfront arrival court.", file:"01-arrival-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Arrival Passage", zone:"Arrival", description:"Follow the sheltered arrival sequence toward the grand lobby.", file:"02-arrival-to-lobby-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.04},
    {title:"Grand Lobby", zone:"Lobby", description:"Enter a double-height welcome composed in stone, bronze and filtered light.", file:"03-lobby-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.02},
    {title:"Garden Passage", zone:"Lobby to Landscape", description:"Move from the crafted interior into the private waterfront landscape.", file:"04-lobby-to-garden-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.04},
    {title:"Waterfront Garden", zone:"Landscape", description:"Discover a green sanctuary shaped by water, shade and native planting.", file:"05-waterfront-garden-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Pool Promenade", zone:"Landscape to Leisure", description:"Continue through the garden toward the horizon-edge pool terrace.", file:"06-garden-to-pool-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.04},
    {title:"Infinity Pool", zone:"Leisure", description:"Water, skyline and sunset become one uninterrupted view.", file:"07-infinity-pool-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.02},
    {title:"Sky Lounge Passage", zone:"Leisure to Social", description:"Rise from the pool terrace into the residents-only sky lounge.", file:"08-pool-to-sky-lounge-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Sky Lounge", zone:"Social", description:"Gather above the city in an intimate salon framed by blue-hour views.", file:"09-sky-lounge-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.01},
    {title:"Residence Passage", zone:"Social to Residence", description:"Move from shared hospitality into the privacy of the residences.", file:"10-sky-lounge-to-residence-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Residence Living", zone:"Residence", description:"A generous living room opens toward panoramic waterfront light.", file:"11-residence-living-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.02},
    {title:"Dining Passage", zone:"Residence", description:"Flow naturally from the living room toward the private dining setting.", file:"12-living-to-dining-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Private Dining", zone:"Residence", description:"A refined dining salon designed for memorable evenings at home.", file:"13-dining-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.02},
    {title:"Bedroom Passage", zone:"Residence", description:"Continue from the social spaces into the quiet private wing.", file:"14-dining-to-bedroom-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Primary Bedroom", zone:"Private Suite", description:"A serene suite of soft materials, generous proportions and dawn light.", file:"15-bedroom-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.01},
    {title:"Spa Passage", zone:"Suite to Wellness", description:"Complete the private journey through to the restorative spa suite.", file:"16-bedroom-to-spa-transition-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.03},
    {title:"Private Spa", zone:"Wellness", description:"Finish in a warm, tranquil sanctuary dedicated to water and restoration.", file:"17-private-spa-original-final-8k-equirectangular-8192x4096.webp", yaw:0, pitch:-.01}
  ];

  const panorama = document.querySelector("[data-panorama]");
  const canvas = document.querySelector("[data-vr-canvas]");
  const loading = document.querySelector("[data-loading]");
  const loadingLabel = document.querySelector("[data-loading-label]");
  const hint = document.querySelector("[data-drag-hint]");
  const hotspotLayer = document.querySelector("[data-hotspot-layer]");
  const drawer = document.querySelector("[data-scene-drawer]");
  const sceneList = document.querySelector("[data-scene-list]");
  const dotsHost = document.querySelector("[data-sequence-dots]");
  const gl = canvas.getContext("webgl", {antialias:false, alpha:false, powerPreference:"high-performance"});
  let current = 0;
  let yaw = 0;
  let pitch = -.03;
  let fov = 67;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startYaw = 0;
  let startPitch = 0;
  let texture = null;
  let loadToken = 0;

  document.querySelectorAll("[data-property-name]").forEach((el) => { if (config.name) el.textContent = config.name; });
  document.querySelectorAll("[data-property-logo]").forEach((el) => { if (config.logo) el.src = config.logo; el.alt = `${config.name || "Property"} logo`; });
  if (config.name) document.title = `360° VR Tour | ${config.name}`;

  if (!gl) {
    loading.querySelector("b").textContent = "360° view unavailable";
    loadingLabel.textContent = "This browser does not support WebGL.";
    return;
  }

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, `attribute vec2 a_position; varying vec2 v_position; void main(){v_position=a_position;gl_Position=vec4(a_position,0.0,1.0);}`));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, `precision highp float; varying vec2 v_position; uniform sampler2D u_texture; uniform float u_yaw; uniform float u_pitch; uniform float u_tanHalfFov; uniform float u_aspect; const float PI=3.141592653589793; void main(){vec3 ray=normalize(vec3(v_position.x*u_aspect*u_tanHalfFov,v_position.y*u_tanHalfFov,1.0));float cp=cos(u_pitch),sp=sin(u_pitch);ray=vec3(ray.x,cp*ray.y+sp*ray.z,-sp*ray.y+cp*ray.z);float cy=cos(u_yaw),sy=sin(u_yaw);ray=vec3(cy*ray.x+sy*ray.z,ray.y,-sy*ray.x+cy*ray.z);float lon=atan(ray.x,ray.z);float lat=asin(clamp(ray.y,-1.0,1.0));vec2 uv=vec2(fract(lon/(2.0*PI)+0.5),lat/PI+0.5);gl_FragColor=texture2D(u_texture,uv);}`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {
    yaw: gl.getUniformLocation(program, "u_yaw"), pitch: gl.getUniformLocation(program, "u_pitch"),
    tanHalfFov: gl.getUniformLocation(program, "u_tanHalfFov"), aspect: gl.getUniformLocation(program, "u_aspect"),
    texture: gl.getUniformLocation(program, "u_texture")
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
  };
  const normaliseAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const renderHotspots = () => {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const tanHalf = Math.tan(fov * Math.PI / 360);
    hotspotLayer.querySelectorAll("[data-hotspot-yaw]").forEach((button) => {
      const hotspotYaw = Number(button.dataset.hotspotYaw);
      const hotspotPitch = Number(button.dataset.hotspotPitch);
      const cosPitch = Math.cos(hotspotPitch);
      const world = {x:Math.sin(hotspotYaw)*cosPitch,y:Math.sin(hotspotPitch),z:Math.cos(hotspotYaw)*cosPitch};
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = cy*world.x - sy*world.z;
      const z1 = sy*world.x + cy*world.z;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const yCam = cp*world.y - sp*z1;
      const zCam = sp*world.y + cp*z1;
      const xNdc = (x1 / Math.max(.001,zCam)) / (aspect*tanHalf);
      const yNdc = (yCam / Math.max(.001,zCam)) / tanHalf;
      const visible = zCam > .05 && Math.abs(xNdc) < 1.12 && Math.abs(yNdc) < 1.12;
      button.classList.toggle("is-hidden", !visible);
      button.style.left = `${(xNdc*.5+.5)*100}%`;
      button.style.top = `${(-yNdc*.5+.5)*100}%`;
    });
  };
  const draw = () => {
    resize();
    gl.useProgram(program);
    gl.uniform1f(uniforms.yaw, yaw);
    gl.uniform1f(uniforms.pitch, pitch);
    gl.uniform1f(uniforms.tanHalfFov, Math.tan(fov * Math.PI / 360));
    gl.uniform1f(uniforms.aspect, canvas.width / canvas.height);
    gl.uniform1i(uniforms.texture, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    document.querySelector("[data-compass]").style.transform = `rotate(${-yaw}rad)`;
    renderHotspots();
  };
  const requestDraw = () => requestAnimationFrame(draw);

  const makeTexture = (image) => {
    if (texture) gl.deleteTexture(texture);
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    let source = image;
    if (image.naturalWidth > max) {
      const scale = max / image.naturalWidth;
      const downsample = document.createElement("canvas");
      downsample.width = max;
      downsample.height = Math.round(image.naturalHeight * scale);
      downsample.getContext("2d").drawImage(image, 0, 0, downsample.width, downsample.height);
      source = downsample;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };

  const updateHotspots = () => {
    const previous = (current - 1 + scenes.length) % scenes.length;
    const next = (current + 1) % scenes.length;
    hotspotLayer.innerHTML = `<button class="hotspot" type="button" data-hotspot-target="${next}" data-hotspot-yaw="0" data-hotspot-pitch="-.2" aria-label="Continue to ${scenes[next].title}"><span class="hotspot-mark"><i>↑</i></span><span>Continue · ${scenes[next].title}</span></button><button class="hotspot" type="button" data-hotspot-target="${previous}" data-hotspot-yaw="${Math.PI}" data-hotspot-pitch="-.16" aria-label="Return to ${scenes[previous].title}"><span class="hotspot-mark"><i>←</i></span><span>Back · ${scenes[previous].title}</span></button>`;
    hotspotLayer.querySelectorAll("[data-hotspot-target]").forEach((button) => button.addEventListener("click", () => loadScene(Number(button.dataset.hotspotTarget))));
  };
  const updateInterface = () => {
    const scene = scenes[current];
    const previous = (current - 1 + scenes.length) % scenes.length;
    const next = (current + 1) % scenes.length;
    document.querySelector("[data-scene-index]").textContent = String(current + 1).padStart(2,"0");
    document.querySelector("[data-scene-zone]").textContent = scene.zone;
    document.querySelector("[data-scene-title]").textContent = scene.title;
    document.querySelector("[data-scene-description]").textContent = scene.description;
    document.querySelector("[data-tour-progress]").textContent = `Scene ${String(current+1).padStart(2,"0")} of ${scenes.length}`;
    document.querySelector("[data-previous-label]").textContent = scenes[previous].title;
    document.querySelector("[data-next-label]").textContent = scenes[next].title;
    document.querySelector("[data-sequence-label]").textContent = `${scene.zone} · Scene ${String(current+1).padStart(2,"0")}`;
    document.querySelectorAll("[data-menu-scene]").forEach((button) => button.classList.toggle("is-active", Number(button.dataset.menuScene) === current));
    document.querySelectorAll("[data-dot-scene]").forEach((button) => button.classList.toggle("is-active", Number(button.dataset.dotScene) === current));
    updateHotspots();
  };
  const loadScene = (index) => {
    current = (index + scenes.length) % scenes.length;
    const scene = scenes[current];
    const token = ++loadToken;
    loadingLabel.textContent = scene.title;
    loading.classList.remove("is-hidden");
    updateInterface();
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (token !== loadToken) return;
      makeTexture(image);
      yaw = scene.yaw;
      pitch = scene.pitch;
      fov = 67;
      requestDraw();
      requestAnimationFrame(() => loading.classList.add("is-hidden"));
      window.setTimeout(() => { const preload = new Image(); preload.src = base + scenes[(current+1)%scenes.length].file; }, 900);
    };
    image.onerror = () => { if (token === loadToken) { loading.querySelector("b").textContent = "Scene could not be loaded"; loadingLabel.textContent = scene.title; } };
    image.src = base + scene.file;
  };

  sceneList.innerHTML = scenes.map((scene,index) => `<button class="scene-menu-button" type="button" data-menu-scene="${index}"><span>${String(index+1).padStart(2,"0")}</span><b>${scene.title}<small>${scene.zone}</small></b><i>→</i></button>`).join("");
  dotsHost.innerHTML = scenes.map((_,index) => `<button class="sequence-dot" type="button" data-dot-scene="${index}" aria-label="Go to scene ${index+1}"></button>`).join("");
  document.querySelectorAll("[data-menu-scene],[data-dot-scene]").forEach((button) => button.addEventListener("click", () => { loadScene(Number(button.dataset.menuScene ?? button.dataset.dotScene)); drawer.classList.remove("is-open"); document.querySelector("[data-open-scenes]").setAttribute("aria-expanded","false"); }));
  document.querySelector("[data-previous-scene]").addEventListener("click", () => loadScene(current-1));
  document.querySelector("[data-next-scene]").addEventListener("click", () => loadScene(current+1));
  document.querySelector("[data-open-scenes]").addEventListener("click", (event) => { const open = !drawer.classList.contains("is-open"); drawer.classList.toggle("is-open", open); event.currentTarget.setAttribute("aria-expanded", String(open)); });
  document.querySelector("[data-close-scenes]").addEventListener("click", () => { drawer.classList.remove("is-open"); document.querySelector("[data-open-scenes]").setAttribute("aria-expanded","false"); });

  const hideHint = () => hint.classList.add("is-hidden");
  panorama.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button,a")) return;
    dragging=true; startX=event.clientX; startY=event.clientY; startYaw=yaw; startPitch=pitch; panorama.setPointerCapture(event.pointerId); panorama.classList.add("is-dragging"); hideHint();
  });
  panorama.addEventListener("pointermove", (event) => { if (!dragging) return; yaw=normaliseAngle(startYaw-(event.clientX-startX)*.0042); pitch=Math.max(-1.25,Math.min(1.25,startPitch+(event.clientY-startY)*.0036)); requestDraw(); });
  const stopDrag = () => { dragging=false; panorama.classList.remove("is-dragging"); };
  panorama.addEventListener("pointerup", stopDrag);
  panorama.addEventListener("pointercancel", stopDrag);
  panorama.addEventListener("wheel", (event) => { event.preventDefault(); hideHint(); fov=Math.max(38,Math.min(82,fov+Math.sign(event.deltaY)*4)); requestDraw(); }, {passive:false});
  panorama.addEventListener("keydown", (event) => { if (event.target.closest("button,a")) return; const key=event.key; if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-"].includes(key)) return; event.preventDefault(); hideHint(); if(key==="ArrowLeft") yaw=normaliseAngle(yaw-.08); if(key==="ArrowRight") yaw=normaliseAngle(yaw+.08); if(key==="ArrowUp") pitch=Math.min(1.25,pitch+.06); if(key==="ArrowDown") pitch=Math.max(-1.25,pitch-.06); if(key==="+"||key==="=") fov=Math.max(38,fov-4); if(key==="-") fov=Math.min(82,fov+4); requestDraw(); });
  document.querySelector("[data-zoom-in]").addEventListener("click", () => { fov=Math.max(38,fov-6); requestDraw(); });
  document.querySelector("[data-zoom-out]").addEventListener("click", () => { fov=Math.min(82,fov+6); requestDraw(); });
  document.querySelector("[data-reset-view]").addEventListener("click", () => { yaw=scenes[current].yaw; pitch=scenes[current].pitch; fov=67; requestDraw(); });
  document.querySelector("[data-fullscreen]").addEventListener("click", async () => { if(!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); });
  window.addEventListener("resize", requestDraw);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) requestDraw(); });
  if (reducedMotion) hint.classList.add("is-hidden");
  loadScene(0);
})();
