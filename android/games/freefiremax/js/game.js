import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// CONSTANTS
// ============================================================
const MAP_W = 4000, MAP_H = 4000;
const BOT_COUNT = 49;
const TOTAL_PLAYERS = 50;
const GRAVITY = -30;

// ============================================================
// UTILITY
// ============================================================
function rnd(a,b){return Math.random()*(b-a)+a;}
function rndInt(a,b){return Math.floor(rnd(a,b+1));}
function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ============================================================
// WEAPONS DATA (12 weapons with rarity)
// ============================================================
const RARITY = { common:'#aaa', uncommon:'#2ecc71', rare:'#3498db', epic:'#9b59b6', legendary:'#ff8c00' };
const WEAPONS = {
  fist:     { name:'Fist',      dmg:18,  rate:300,  range:3,   spread:0,     mag:Infinity, reload:0,    pellets:1,  type:'melee',    icon:'\u{1F44A}', color:0xcccccc, rarity:'common' },
  pistol:   { name:'Pistol',    dmg:24,  rate:200,  range:120, spread:0.04,  mag:15,       reload:1500, pellets:1,  type:'hitscan',  icon:'\u{1F52B}', color:0x666666, rarity:'uncommon' },
  revolver: { name:'Revolver',  dmg:75,  rate:400,  range:140, spread:0.03,  mag:6,        reload:2500, pellets:1,  type:'hitscan',  icon:'\u{1F462}', color:0x8B4513, rarity:'rare' },
  smg:      { name:'SMG',       dmg:17,  rate:85,   range:100, spread:0.08,  mag:35,       reload:1800, pellets:1,  type:'hitscan',  icon:'\u{1F3F9}', color:0x444444, rarity:'uncommon' },
  rifle:    { name:'Rifle',     dmg:33,  rate:110,  range:200, spread:0.03,  mag:30,       reload:2000, pellets:1,  type:'hitscan',  icon:'\u{1F3F9}', color:0x445566, rarity:'rare' },
  shotgun:  { name:'Shotgun',   dmg:20,  rate:700,  range:70,  spread:0.18,  mag:8,        reload:2500, pellets:8,  type:'hitscan',  icon:'\u{1F3F9}', color:0x8B0000, rarity:'rare' },
  sniper:   { name:'Sniper',    dmg:95,  rate:1200, range:400, spread:0.01,  mag:5,        reload:3500, pellets:1,  type:'hitscan',  icon:'\u{1F3F9}', color:0x2F4F4F, rarity:'epic' },
  lmg:      { name:'LMG',       dmg:27,  rate:100,  range:180, spread:0.07,  mag:100,      reload:4000, pellets:1,  type:'hitscan',  icon:'\u{1F3F9}', color:0x556B2F, rarity:'rare' },
  dmr:      { name:'DMR',       dmg:55,  rate:250,  range:300, spread:0.02,  mag:20,       reload:2200, pellets:1,  type:'hitscan',  icon:'\u{1F3F9}', color:0x704214, rarity:'epic' },
  crossbow: { name:'Crossbow',  dmg:85,  rate:1500, range:200, spread:0.005, mag:1,        reload:2500, pellets:1,  type:'projectile',icon:'\u{1F3F9}', color:0x8B6914, rarity:'epic', projSpeed:8 },
  rpg:      { name:'RPG',       dmg:120, rate:2500, range:250, spread:0.02,  mag:1,        reload:3500, pellets:1,  type:'projectile',icon:'\u{1F680}', color:0x556B2F, rarity:'legendary', projSpeed:6, aoe:5 },
  dual:     { name:'Dual Pistol',dmg:20, rate:100,  range:100, spread:0.07,  mag:30,       reload:1800, pellets:2,  type:'hitscan',  icon:'\u{1F52B}', color:0x777777, rarity:'uncommon' },
};
const WEAPON_IDS = Object.keys(WEAPONS);

// ============================================================
// GAME STATE
// ============================================================
const G = {
  state:'lobby',
  scene:null, camera:null, renderer:null, composer:null,
  clock:new THREE.Clock(),
  player:null,
  entities:[],
  pickups:[],
  projectiles:[],
  particles:[],
  buildings:[],
  trees:[],
  grassMeshes:[],
  zone:{ x:MAP_W/2, z:MAP_H/2, radius:1800, target:1800, phase:0, timer:60, shrinking:false },
  mouse:{ x:0, y:0, down:false, right:false },
  keys:{},
  azimuth:0, polar:Math.PI/4,
  aliveCount:0,
  gameTime:0,
  gameStarted:false,
  warmupTime:10,
  killFeed:[],
  lastTime:0,
  cam:{ x:0, y:0, z:0 },
  minimapCtx:null,
  minimapCanvas:null,
  loadProgress:0,
  hitMarkerTimer:0,
  bloomStrength:0.3,
};

// ============================================================
// THREE.JS SETUP
// ============================================================
function initScene(){
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(0x87CEEB);
  G.scene.fog = new THREE.FogExp2(0xc8d8e8, 0.00012);

  G.renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  G.renderer.shadowMap.enabled = true;
  G.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  G.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  G.renderer.toneMappingExposure = 1.0;
  G.renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game-container').appendChild(G.renderer.domElement);

  G.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 5000);

  // Bloom post-processing
  G.composer = new EffectComposer(G.renderer);
  G.composer.addPass(new RenderPass(G.scene, G.camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    G.bloomStrength, 0.2, 0.1
  );
  G.composer.addPass(bloom);

  // Lights
  const ambient = new THREE.AmbientLight(0x8899bb, 0.5);
  G.scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3d2817, 0.6);
  G.scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffeedd, 2.5);
  sun.position.set(800, 1500, 200);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 3000;
  sun.shadow.camera.left = -800;
  sun.shadow.camera.right = 800;
  sun.shadow.camera.top = 800;
  sun.shadow.camera.bottom = -800;
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.02;
  G.scene.add(sun);

  // Sun glow sprite
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width=128; glowCanvas.height=128;
  const gctx = glowCanvas.getContext('2d');
  const grad = gctx.createRadialGradient(64,64,0,64,64,64);
  grad.addColorStop(0,'rgba(255,220,150,1)');
  grad.addColorStop(0.2,'rgba(255,200,100,0.6)');
  grad.addColorStop(0.5,'rgba(255,180,80,0.2)');
  grad.addColorStop(1,'rgba(255,180,80,0)');
  gctx.fillStyle=grad; gctx.fillRect(0,0,128,128);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const glowMat = new THREE.SpriteMaterial({ map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.position.copy(sun.position).multiplyScalar(1.5);
  glowSprite.scale.set(200,200,1);
  G.scene.add(glowSprite);

  createSky();

  window.addEventListener('resize', ()=>{
    G.camera.aspect = window.innerWidth/window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
    G.composer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================================
// SKY
// ============================================================
function createSky(){
  const canvas = document.createElement('canvas');
  canvas.width=4; canvas.height=512;
  const ctx=canvas.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#0b0b2a');
  g.addColorStop(0.3,'#1a3a7a');
  g.addColorStop(0.45,'#4a8ad0');
  g.addColorStop(0.55,'#e87830');
  g.addColorStop(0.7,'#f0a050');
  g.addColorStop(0.85,'#c87840');
  g.addColorStop(1,'#8a6040');
  ctx.fillStyle=g; ctx.fillRect(0,0,4,512);
  const tex=new THREE.CanvasTexture(canvas);
  const skyGeo=new THREE.SphereGeometry(2400, 48, 48);
  const skyMat=new THREE.MeshBasicMaterial({ map:tex, side:THREE.BackSide });
  const sky=new THREE.Mesh(skyGeo,skyMat);
  G.scene.add(sky);

  // Clouds
  const cc=document.createElement('canvas');
  cc.width=256; cc.height=128;
  const cctx=cc.getContext('2d');
  cctx.clearRect(0,0,256,128);
  for(let i=0;i<25;i++){
    const x=rnd(0,256), y=rnd(0,128), r=rnd(20,50);
    const cg=cctx.createRadialGradient(x,y,0,x,y,r);
    cg.addColorStop(0,'rgba(255,255,255,0.5)');
    cg.addColorStop(0.5,'rgba(255,255,255,0.2)');
    cg.addColorStop(1,'rgba(255,255,255,0)');
    cctx.fillStyle=cg; cctx.fillRect(x-r,y-r,r*2,r*2);
  }
  const cloudTex=new THREE.CanvasTexture(cc);
  for(let i=0;i<40;i++){
    const cm=new THREE.MeshBasicMaterial({ map:cloudTex, transparent:true, opacity:rnd(0.25,0.5), side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending });
    const cg=new THREE.PlaneGeometry(rnd(200,600), rnd(100,250));
    const cloud=new THREE.Mesh(cg,cm);
    cloud.position.set(rnd(-2000,2000), rnd(250,500), rnd(-2000,2000));
    cloud.rotation.x=-rnd(0.1,0.3);
    cloud.rotation.z=rnd(-0.2,0.2);
    cloud.userData.cloudSpeed=rnd(0.2,0.8);
    G.scene.add(cloud);
    G.trees.push(cloud);
  }
}

// ============================================================
// MAP GENERATION
// ============================================================
function createGroundTexture(){
  const canvas=document.createElement('canvas');
  canvas.width=1024; canvas.height=1024;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#3a7d3a'; ctx.fillRect(0,0,1024,1024);
  for(let i=0;i=2000;i++){
    ctx.fillStyle=`hsl(${100+rndInt(0,30)},${rndInt(30,60)}%,${rndInt(15,32)}%)`;
    ctx.beginPath(); ctx.arc(rnd(0,1024), rnd(0,1024), rnd(1,5), 0, Math.PI*2); ctx.fill();
  }
  for(let i=0;i<150;i++){
    ctx.fillStyle=`hsl(35,${rndInt(20,40)}%,${rndInt(25,40)}%)`;
    ctx.beginPath(); ctx.arc(rnd(0,1024), rnd(0,1024), rnd(4,25), 0, Math.PI*2); ctx.fill();
  }
  for(let i=0;i<80;i++){
    ctx.fillStyle=`hsl(30,${rndInt(15,30)}%,${rndInt(30,45)}%)`;
    ctx.beginPath(); ctx.arc(rnd(0,1024), rnd(0,1024), rnd(3,12), 0, Math.PI*2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function generateMap(){
  // Ground
  const groundGeo=new THREE.PlaneGeometry(MAP_W, MAP_H, 128, 128);
  const pos=groundGeo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), y=pos.getY(i);
    let h=0;
    h+=Math.sin(x*0.002+y*0.003)*3;
    h+=Math.sin(x*0.007+y*0.005)*1.5;
    h+=Math.cos(x*0.015+y*0.012)*0.8;
    pos.setZ(i, h);
  }
  pos.needsUpdate=true;
  groundGeo.computeVertexNormals();

  const groundTex=createGroundTexture();
  groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;
  groundTex.repeat.set(50,50);
  groundTex.anisotropy=4;
  const groundMat=new THREE.MeshStandardMaterial({ map:groundTex, roughness:0.85, metalness:0.05, color:0x5a9a5a });
  const ground=new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  G.scene.add(ground);

  // Grass patches
  const grassCanvas=document.createElement('canvas');
  grassCanvas.width=32; grassCanvas.height=32;
  const gctx=grassCanvas.getContext('2d');
  gctx.fillStyle='rgba(0,0,0,0)'; gctx.fillRect(0,0,32,32);
  gctx.fillStyle='#5aaa3a'; gctx.beginPath();
  gctx.moveTo(16,30); gctx.lineTo(6,8); gctx.lineTo(26,8); gctx.closePath(); gctx.fill();
  gctx.fillStyle='#4a9a2a'; gctx.beginPath();
  gctx.moveTo(16,28); gctx.lineTo(8,12); gctx.lineTo(24,12); gctx.closePath(); gctx.fill();
  const grassTex=new THREE.CanvasTexture(grassCanvas);
  const grassMat=new THREE.MeshBasicMaterial({ map:grassTex, transparent:true, side:THREE.DoubleSide, depthWrite:false });
  for(let i=0;i<600;i++){
    const gx=rnd(20,MAP_W-20), gz=rnd(20,MAP_H-20);
    let onB=false;
    for(const b of G.buildings){
      if(gx>b.x-10&&gx<b.x+b.w+10&&gz>b.z-10&&gz<b.z+b.h+10){ onB=true; break; }
    }
    if(!onB){
      const gg=new THREE.PlaneGeometry(rnd(6,14), rnd(10,20));
      const gm=grassMat.clone();
      gm.opacity=rnd(0.4,0.8);
      gm.color=new THREE.Color().setHSL(rnd(0.25,0.32), rnd(0.4,0.6), rnd(0.25,0.4));
      const mesh=new THREE.Mesh(gg, gm);
      mesh.position.set(gx, 0.1, gz);
      mesh.rotation.x=-rnd(0.2,0.5);
      mesh.rotation.z=rnd(0,Math.PI*2);
      G.scene.add(mesh);
      G.grassMeshes.push(mesh);
    }
  }

  // Buildings with window textures
  const bPositions=[];
  const winCanvas=document.createElement('canvas');
  winCanvas.width=64; winCanvas.height=64;
  const wctx=winCanvas.getContext('2d');
  wctx.fillStyle='#333'; wctx.fillRect(0,0,64,64);
  wctx.fillStyle='#555'; wctx.fillRect(0,0,64,1); wctx.fillRect(0,63,64,1);
  wctx.fillRect(0,0,1,64); wctx.fillRect(63,0,1,64);
  for(let r=0;r<3;r++) for(let c=0;c<3;c++){
    const lit=Math.random()<0.4;
    wctx.fillStyle=lit?'#ffdd88':'#224466';
    wctx.fillRect(c*21+3, r*21+3, 16, 16);
    wctx.fillStyle='rgba(0,0,0,0.3)';
    wctx.fillRect(c*21+3, r*21+3, 16, 2);
    wctx.fillRect(c*21+3, r*21+3, 2, 16);
    if(lit){
      wctx.fillStyle='rgba(255,220,100,0.15)';
      wctx.fillRect(c*21+5, r*21+5, 12, 12);
    }
  }
  const winTex=new THREE.CanvasTexture(winCanvas);

  for(let i=0;i<35;i++){
    const bx=rnd(100, MAP_W-200), bz=rnd(100, MAP_H-200);
    const bw=rnd(60, 180), bh=rnd(60, 180), bheight=rnd(25, 70);
    let overlap=false;
    for(const o of bPositions){
      if(bx<o.x+o.w+80&&bx+bw+80>o.x&&bz<o.z+o.h+80&&bz+bh+80>o.z){ overlap=true; break; }
    }
    if(!overlap){
      bPositions.push({x:bx,z:bz,w:bw,h:bh});
      const hue=rnd(0.05,0.12), sat=rnd(0.1,0.3), lit=rnd(0.2,0.45);
      const color=new THREE.Color().setHSL(hue,sat,lit);
      const mat=new THREE.MeshStandardMaterial({
        color, roughness:0.7, metalness:0.1,
        map:winTex, repeat:new THREE.Vector2(Math.ceil(bw/30), Math.ceil(bheight/20))
      });
      const geo=new THREE.BoxGeometry(bw, bheight, bh);
      const mesh=new THREE.Mesh(geo, mat);
      mesh.position.set(bx+bw/2, bheight/2, bz+bh/2);
      mesh.castShadow=true; mesh.receiveShadow=true;
      G.scene.add(mesh);
      G.buildings.push({x:bx,z:bz,w:bw,h:bh,height:bheight,mesh});

      // Roof edge
      const roofMat=new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(hue,sat,lit-0.08), roughness:0.8 });
      const roofGeo=new THREE.BoxGeometry(bw+2, 1, bh+2);
      const roof=new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(bx+bw/2, bheight+0.5, bz+bh/2);
      G.scene.add(roof);
    }
  }

  // Trees (detailed)
  for(let i=0;i<200;i++){
    const tx=rnd(20,MAP_W-20), tz=rnd(20,MAP_H-20);
    let onB=false;
    for(const b of G.buildings){
      if(tx>b.x-20&&tx<b.x+b.w+20&&tz>b.z-20&&tz<b.z+b.h+20){ onB=true; break; }
    }
    if(!onB){
      const h=rnd(12,22), canopyR=rnd(7,16);
      const trunkGeo=new THREE.CylinderGeometry(1.5,2.5,h*0.4);
      const trunkMat=new THREE.MeshStandardMaterial({ color:0x4a3520, roughness:0.9 });
      const trunk=new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(tx, h*0.2, tz);
      trunk.castShadow=true;
      G.scene.add(trunk);
      const col=new THREE.Color().setHSL(rnd(0.25,0.35), rnd(0.4,0.7), rnd(0.12,0.22));
      const cMat=new THREE.MeshStandardMaterial({ color:col, roughness:0.9 });
      const cGeo=new THREE.SphereGeometry(canopyR, 7, 7);
      const cMesh=new THREE.Mesh(cGeo, cMat);
      cMesh.position.set(tx+rnd(-2,2), h*0.6+rnd(-2,2), tz+rnd(-2,2));
      cMesh.castShadow=true;
      G.scene.add(cMesh);
      // Second canopy layer
      const cMat2=new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(rnd(0.25,0.35), rnd(0.4,0.6), rnd(0.1,0.18)) });
      const cGeo2=new THREE.SphereGeometry(canopyR*0.7, 6, 6);
      const cMesh2=new THREE.Mesh(cGeo2, cMat2);
      cMesh2.position.set(tx+rnd(-4,4), h*0.5+rnd(-1,3), tz+rnd(-4,4));
      cMesh2.castShadow=true;
      G.scene.add(cMesh2);
      G.trees.push({x:tx,z:tz,radius:canopyR,trunk,canopy:cMesh,canopy2:cMesh2});
    }
  }

  // Pickups
  for(let i=0;i<100;i++){
    const px=rnd(50,MAP_W-50), pz=rnd(50,MAP_H-50);
    let onB=false;
    for(const b of G.buildings){
      if(px>b.x&&px<b.x+b.w&&pz>b.z&&pz<b.z+b.h){ onB=true; break; }
    }
    if(!onB){
      const r=Math.random();
      let p;
      if(r<0.35){
        const wid=['pistol','rifle','shotgun','sniper','smg','revolver','lmg','dmr','crossbow','rpg','dual'][rndInt(0,10)];
        p=createPickupMesh(px,pz,'weapon',wid);
      } else if(r<0.55) p=createPickupMesh(px,pz,'medkit',null);
      else if(r<0.7) p=createPickupMesh(px,pz,'armor',null);
      else p=createPickupMesh(px,pz,'ammo',null);
      G.pickups.push(p);
    }
  }
}

function createPickupMesh(x,z,type,id){
  let color, radius=7, label='', emissiveIntensity=0.3;
  if(type==='weapon'){
    const w=WEAPONS[id];
    color=w?parseInt(RARITY[w.rarity].slice(1),16):0xff8c00;
    radius=8; label=w?w.icon:'?'; emissiveIntensity=0.5;
  } else if(type==='medkit'){ color=0x2ecc71; label='+'; }
  else if(type==='armor'){ color=0x3498db; label='\u{1F6E1}'; }
  else { color=0xe74c3c; label='A'; }

  const geo=new THREE.SphereGeometry(radius, 10, 10);
  const mat=new THREE.MeshStandardMaterial({
    color, emissive:color, emissiveIntensity, roughness:0.3, metalness:0.2
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x, radius+2, z);
  mesh.castShadow=true;
  G.scene.add(mesh);

  const glowGeo=new THREE.SphereGeometry(radius*1.8, 10, 10);
  const glowMat=new THREE.MeshBasicMaterial({
    color, transparent:true, opacity:0.12, blending:THREE.AdditiveBlending
  });
  const glow=new THREE.Mesh(glowGeo, glowMat);
  glow.position.copy(mesh.position);
  G.scene.add(glow);

  return {x,z,type,id,mesh,glow,radius,label,bob:rnd(0,Math.PI*2)};
}

// ============================================================
// ENTITY 3D MODEL (improved)
// ============================================================
function createEntityModel(color, isPlayer){
  const group=new THREE.Group();

  const skinColor=0xf0c8a0, skinColorDark=0xdbb890;
  const pantsColor=isPlayer?0x2c3e50:0x34495e;

  const bodyGeo=new THREE.BoxGeometry(0.75, 0.9, 0.45);
  const bodyMat=new THREE.MeshStandardMaterial({ color, roughness:0.6, metalness:0.15 });
  const body=new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y=0.6; body.castShadow=true;
  group.add(body);

  // Shoulder pads
  const spMat=new THREE.MeshStandardMaterial({ color:isPlayer?0x2980b9:0xc0392b, roughness:0.5, metalness:0.3 });
  [ -0.45, 0.45 ].forEach(off=>{
    const sp=new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 5), spMat);
    sp.position.set(off, 0.9, 0); group.add(sp);
  });

  const headGeo=new THREE.SphereGeometry(0.26, 10, 10);
  const headMat=new THREE.MeshStandardMaterial({ color:isPlayer?skinColor:skinColorDark, roughness:0.7 });
  const head=new THREE.Mesh(headGeo, headMat);
  head.position.y=1.3; head.castShadow=true;
  group.add(head);

  const armGeo=new THREE.BoxGeometry(0.16, 0.55, 0.16);
  const armMat=new THREE.MeshStandardMaterial({ color, roughness:0.6 });
  const leftArm=new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.47, 0.65, 0); leftArm.castShadow=true;
  group.add(leftArm);
  const rightArm=new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.47, 0.65, 0); rightArm.castShadow=true;
  group.add(rightArm);

  const legGeo=new THREE.BoxGeometry(0.2, 0.5, 0.2);
  const legMat=new THREE.MeshStandardMaterial({ color:pantsColor, roughness:0.75 });
  const leftLeg=new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.18, 0.22, 0);
  group.add(leftLeg);
  const rightLeg=new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.18, 0.22, 0);
  group.add(rightLeg);

  // Boots
  const bootMat=new THREE.MeshStandardMaterial({ color:0x222222, roughness:0.8 });
  [-0.18,0.18].forEach(off=>{
    const boot=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.28), bootMat);
    boot.position.set(off, 0.05, 0.03); group.add(boot);
  });

  // Weapon model
  const gunMat=new THREE.MeshStandardMaterial({ color:0x333, metalness:0.6, roughness:0.3 });
  const gun=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.5), gunMat);
  gun.position.set(0.52, 0.7, -0.4); gun.rotation.x=-0.3;
  group.add(gun);

  group.userData={body,head,leftArm,rightArm,leftLeg,rightLeg,gun};
  return group;
}

// ============================================================
// SPAWNING
// ============================================================
function spawnPlayer(){
  let x,z,valid;
  for(let a=0;a<100;a++){
    x=rnd(100,MAP_W-100); z=rnd(100,MAP_H-100); valid=true;
    for(const b of G.buildings){
      if(x>b.x-30&&x<b.x+b.w+30&&z>b.z-30&&z<b.z+b.h+30){ valid=false; break; }
    }
    if(valid) break;
  }
  const p={
    x,z,y:0, vx:0,vy:0,vz:0,
    radius:0.5, height:1.6,
    health:100, maxHealth:100,
    armor:0, maxArmor:100,
    alive:true, isPlayer:true, isBot:false,
    angle:0, speed:0, maxSpeed:5, sprintMult:1.3,
    weapons:[{id:'fist',ammo:Infinity}],
    weaponSlot:0, lastFireTime:0,
    reloading:false, reloadTimer:0,
    kills:0, name:'You', model:null,
    hitFlash:0, nearbyPickup:null,
    jumping:false, onGround:true,
    strafeX:0, strafeZ:0, crouching:false, aimY:0,
  };
  p.model=createEntityModel(0x2980b9, true);
  p.model.position.set(x,0,z);
  G.scene.add(p.model);
  p.addWeapon=(id)=>addWeapon(p,id);
  p.addWeapon('pistol'); p.weaponSlot=0;
  G.player=p; G.entities.push(p);
}

function spawnBots(){
  const names=['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Golf','Hotel','India','Juliet',
    'Kilo','Lima','Mike','Nova','Oscar','Papa','Quebec','Romeo','Sierra','Tango',
    'Unity','Victor','Whisper','Xeno','Yuki','Zara','Blaze','Cipher','Dragon','Ember',
    'Frost','Ghost','Hawk','Ion','Jinx','Kraken','Lynx','Maverick','Night','Omega',
    'Phantom','Raven','Shadow','Titan','Umbra','Viper','Warrior','Xenon','Zen'];
  const botColors=[0xe74c3c,0xe67e22,0x9b59b6,0x1abc9c,0x34495e,0x7f8c8d,0xc0392b,0xd35400,0x8e44ad,0x16a085];
  for(let i=0;i<BOT_COUNT&&i<names.length;i++){
    let x,z,valid;
    for(let a=0;a<50;a++){ x=rnd(100,MAP_W-100);z=rnd(100,MAP_H-100);valid=true;
      for(const b of G.buildings){ if(x>b.x-30&&x<b.x+b.w+30&&z>b.z-30&&z<b.z+b.h+30){valid=false;break;} }
      if(valid)break;
    }
    const bot={
      x,z,y:0, vx:0,vy:0,vz:0,
      radius:0.5, height:1.6,
      health:100, maxHealth:100,
      armor:Math.random()<0.3?rnd(20,80):0, maxArmor:100,
      alive:true, isPlayer:false, isBot:true,
      angle:rnd(0,Math.PI*2), speed:0, maxSpeed:rnd(3.5,5.5), sprintMult:1.3,
      weapons:[{id:'fist',ammo:Infinity}], weaponSlot:0,
      lastFireTime:0, reloading:false, reloadTimer:0,
      kills:0, name:names[i], model:null,
      hitFlash:0, nearbyPickup:null,
      onGround:true, botState:'explore',
      botTarget:{x:rnd(100,MAP_W-100),z:rnd(100,MAP_H-100)},
      botTimer:rnd(2,5), botDetectRange:rnd(200,350),
      botPersonality:rnd(0.5,1.5), botAccuracy:rnd(0.5,1.2), aimY:0, strafeX:0, strafeZ:0,
    };
    const col=botColors[i%botColors.length];
    bot.model=createEntityModel(col, false);
    bot.model.position.set(x,0,z);
    G.scene.add(bot.model);
    bot.addWeapon=(id)=>addWeapon(bot,id);
    const w1=['pistol','rifle','shotgun','smg','revolver'][rndInt(0,4)];
    bot.addWeapon(w1);
    if(Math.random()<0.3) bot.addWeapon(['rifle','shotgun','sniper','lmg','dmr'][rndInt(0,4)]);
    bot.weaponSlot=0;
    G.entities.push(bot);
  }
  G.aliveCount=G.entities.filter(e=>e.alive).length;
}

// ============================================================
// WEAPON HELPERS
// ============================================================
function addWeapon(entity,id){
  const idx=entity.weapons.findIndex(w=>w.id===id);
  const wpn=WEAPONS[id];
  if(idx>=0){
    if(wpn.mag>0) entity.weapons[idx].ammo=Math.min(entity.weapons[idx].ammo+wpn.mag, wpn.mag*4);
    entity.weaponSlot=idx; entity.reloading=false; return;
  }
  if(entity.weapons.length>=4) return;
  entity.weapons.push({id, ammo:wpn.mag>0?wpn.mag:Infinity});
  entity.weaponSlot=entity.weapons.length-1; entity.reloading=false;
}

function getWeaponStats(entity){
  const w=entity.weapons[entity.weaponSlot];
  return w?WEAPONS[w.id]||WEAPONS.fist:WEAPONS.fist;
}
function currentAmmo(entity){
  const w=entity.weapons[entity.weaponSlot];
  return w?w.ammo:Infinity;
}

// ============================================================
// INPUT SETUP
// ============================================================
let touchId=null, touchId2=null, touchStartX=0, touchStartY=0;

function setupInput(){
  document.addEventListener('keydown', e=>{
    G.keys[e.key.toLowerCase()]=true;
    const k=e.key;
    if(k>='1'&&k<='4'){ const idx=parseInt(k)-1; if(G.player) equipWeapon(idx); }
    if(k==='0'&&G.player) equipWeapon(3);
    if(k==='r'||k==='R') doReload();
    if(k==='e'||k==='E') interact();
    if(k==='i'||k==='I') toggleInventory();
    if(k==='g'||k==='G') dropWeapon();
    if(k===' '||k==='Space'){ e.preventDefault(); if(G.player&&G.player.onGround) G.player.vy=12; }
  });
  document.addEventListener('keyup', e=>{ G.keys[e.key.toLowerCase()]=false; });

  const el=G.renderer.domElement;
  el.addEventListener('mousemove', e=>{
    G.mouse.x=e.clientX; G.mouse.y=e.clientY;
    if(document.pointerLockElement===el){
      G.azimuth-=e.movementX*0.003;
      G.polar=Math.max(0.1, Math.min(Math.PI/2-0.05, G.polar+e.movementY*0.003));
    }
  });
  el.addEventListener('mousedown', e=>{
    if(e.button===0){ G.mouse.down=true; if(!document.pointerLockElement) el.requestPointerLock(); }
    if(e.button===2) G.mouse.right=true;
  });
  el.addEventListener('mouseup', e=>{
    if(e.button===0) G.mouse.down=false;
    if(e.button===2) G.mouse.right=false;
  });
  el.addEventListener('click', e=>{ if(!document.pointerLockElement) el.requestPointerLock(); });
  document.addEventListener('pointerlockchange', ()=>{ if(document.pointerLockElement!==el) G.mouse.down=false; });
  document.addEventListener('contextmenu', e=>e.preventDefault());

  el.addEventListener('touchstart', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(touchId===null){ touchId=t.identifier; touchStartX=t.clientX; touchStartY=t.clientY; }
      else if(touchId2===null){ touchId2=t.identifier; G.mouse.down=true; }
    }
    G.mouse.x=e.changedTouches[0].clientX; G.mouse.y=e.changedTouches[0].clientY;
  }, {passive:false});
  el.addEventListener('touchmove', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier===touchId){
        const dx=(t.clientX-touchStartX)/80, dy=(t.clientY-touchStartY)/80;
        G.azimuth-=dx*0.05; G.polar=Math.max(0.2,Math.min(1.3,G.polar+dy*0.05));
        touchStartX=t.clientX; touchStartY=t.clientY;
        G.mouse.x=t.clientX; G.mouse.y=t.clientY;
      }
    }
  }, {passive:false});
  el.addEventListener('touchend', e=>{
    for(const t of e.changedTouches){
      if(t.identifier===touchId) touchId=null;
      if(t.identifier===touchId2){ touchId2=null; G.mouse.down=false; }
    }
  });
}

// ============================================================
// CAMERA
// ============================================================
function updateCamera(){
  const p=G.player;
  if(!p||!p.alive) return;
  const dist=7;
  const tx=p.x+Math.sin(G.azimuth)*dist*Math.cos(G.polar);
  const ty=p.y+1.5+dist*Math.sin(G.polar);
  const tz=p.z+Math.cos(G.azimuth)*dist*Math.cos(G.polar);
  G.camera.position.lerp(new THREE.Vector3(tx,ty,tz), 0.12);
  G.camera.lookAt(p.x, p.y+0.8, p.z);
}

// ============================================================
// MOVEMENT
// ============================================================
function updatePlayerMovement(dt){
  const p=G.player;
  if(!p||!p.alive) return;
  let mx=0,mz=0;
  if(G.keys['w']||G.keys['arrowup']) mz=-1;
  if(G.keys['s']||G.keys['arrowdown']) mz=1;
  if(G.keys['a']||G.keys['arrowleft']) mx=-1;
  if(G.keys['d']||G.keys['arrowright']) mx=1;
  const sprint=G.keys['shift']&&mz<0;
  p.speed=p.maxSpeed*(sprint?p.sprintMult:1);
  if(p.crouching) p.speed*=0.5;
  if(mx!==0||mz!==0){
    const len=Math.hypot(mx,mz); mx/=len; mz/=len;
    const sin=Math.sin(G.azimuth), cos=Math.cos(G.azimuth);
    p.strafeX=mx*cos-mz*sin; p.strafeZ=mx*sin+mz*cos;
  } else { p.strafeX=0; p.strafeZ=0; }
  p.vx=p.strafeX*p.speed; p.vz=p.strafeZ*p.speed;
  if(!p.onGround) p.vy+=GRAVITY*dt;
  p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
  if(p.y<=0){ p.y=0; p.vy=0; p.onGround=true; } else p.onGround=false;
  p.x=clamp(p.x,1,MAP_W-1); p.z=clamp(p.z,1,MAP_H-1);
  for(const b of G.buildings){
    if(circRect3D(p.x,p.z,p.radius,b.x,b.z,b.w,b.h)){
      const cx=clamp(p.x,b.x,b.x+b.w), cz=clamp(p.z,b.z,b.z+b.h);
      const d=Math.hypot(p.x-cx,p.z-cz);
      if(d<p.radius){ p.x+=(p.x-cx)/d; p.z+=(p.z-cz)/d; }
    }
  }
  p.model.position.set(p.x, p.y, p.z);
  p.model.rotation.y=G.azimuth+Math.PI;
  if(mx!==0||mz!==0){
    const s=Math.sin(performance.now()/200)*0.3;
    p.model.userData.leftLeg.rotation.x=s;
    p.model.userData.rightLeg.rotation.x=-s;
  } else {
    p.model.userData.leftLeg.rotation.x=0;
    p.model.userData.rightLeg.rotation.x=0;
  }
  if(p.hitFlash>0) p.hitFlash-=16;
  p.nearbyPickup=null;
  for(const pu of G.pickups){
    if(Math.hypot(p.x-pu.x, p.z-pu.z)<3){ p.nearbyPickup=pu; break; }
  }
}

function circRect3D(cx,cz,cr,rx,rz,rw,rh){
  return Math.hypot(cx-clamp(cx,rx,rx+rw), cz-clamp(cz,rz,rz+rh))<cr;
}

// ============================================================
// BOT AI
// ============================================================
function updateBots(dt){
  for(const bot of G.entities){
    if(!bot.alive||!bot.isBot) continue;
    let nearestEnemy=null, nearestDist=Infinity;
    let nearestPickup=null, pickupDist=Infinity;
    for(const e of G.entities){
      if(!e.alive||e===bot) continue;
      const d=Math.hypot(bot.x-e.x, bot.z-e.z);
      if(d<nearestDist){ nearestDist=d; nearestEnemy=e; }
    }
    for(const p of G.pickups){
      const d=Math.hypot(bot.x-p.x, bot.z-p.z);
      if(d<pickupDist){ pickupDist=d; nearestPickup=p; }
    }
    bot.botTimer-=dt;
    if(nearestEnemy&&nearestDist<bot.botDetectRange) bot.botState='combat';
    else if(bot.botTimer<=0){
      bot.botState='explore';
      bot.botTarget={x:rnd(100,MAP_W-100),z:rnd(100,MAP_H-100)};
      bot.botTimer=rnd(2,5);
    }
    let moveX=0,moveZ=0,speed=0;
    if(bot.botState==='explore'){
      const a=Math.atan2(bot.botTarget.z-bot.z, bot.botTarget.x-bot.x);
      moveX=Math.cos(a); moveZ=Math.sin(a);
      speed=bot.maxSpeed*0.5; bot.angle=a;
      if(Math.hypot(bot.x-bot.botTarget.x, bot.z-bot.botTarget.z)<60)
        bot.botTarget={x:rnd(100,MAP_W-100),z:rnd(100,MAP_H-100)};
      if(nearestPickup&&pickupDist<3.5) pickupItem(bot,nearestPickup);
    } else if(bot.botState==='combat'){
      const a=Math.atan2(nearestEnemy.z-bot.z, nearestEnemy.x-bot.x);
      bot.angle=a;
      if(bot.health>40){ moveX=-Math.cos(a); moveZ=-Math.sin(a); speed=bot.maxSpeed*0.3; }
      else{ const fa=a+rnd(-1,1); moveX=Math.cos(fa); moveZ=Math.sin(fa); speed=bot.maxSpeed*0.6; }
      if(entityCanFire(bot)){
        const sp=(1-bot.botPersonality)*0.2;
        entityFire(bot, nearestEnemy.x+rnd(-sp*60,sp*60), nearestEnemy.y+0.8, nearestEnemy.z+rnd(-sp*60,sp*60));
      }
      if(bot.health<30){ bot.botState='flee'; bot.botTimer=rnd(2,4); bot.botTarget={x:bot.x+rnd(-400,400),z:bot.z+rnd(-400,400)}; }
    } else if(bot.botState==='flee'){
      const a=Math.atan2(bot.botTarget.z-bot.z, bot.botTarget.x-bot.x);
      moveX=Math.cos(a); moveZ=Math.sin(a); speed=bot.maxSpeed*0.7; bot.angle=a;
      if(Math.hypot(bot.x-bot.botTarget.x,bot.z-bot.botTarget.z)<100||bot.botTimer<=0){ bot.botState='explore'; bot.botTimer=rnd(2,5); }
    }
    bot.vx=moveX*speed; bot.vz=moveZ*speed;
    bot.x+=bot.vx; bot.z+=bot.vz;
    bot.x=clamp(bot.x,1,MAP_W-1); bot.z=clamp(bot.z,1,MAP_H-1);
    for(const b of G.buildings){
      if(circRect3D(bot.x,bot.z,bot.radius,b.x,b.z,b.w,b.h)){
        const cx=clamp(bot.x,b.x,b.x+b.w), cz=clamp(bot.z,b.z,b.z+b.h);
        const d=Math.hypot(bot.x-cx,bot.z-cz);
        if(d<bot.radius){ bot.x+=(bot.x-cx)/d; bot.z+=(bot.z-cz)/d; }
      }
    }
    bot.model.position.set(bot.x,0,bot.z);
    bot.model.rotation.y=Math.PI/2-bot.angle;
  }
}

// ============================================================
// RELOADS
// ============================================================
function updateReloads(dt){
  for(const e of G.entities){
    if(!e.alive) continue;
    if(e.reloading){
      e.reloadTimer-=dt*1000;
      if(e.reloadTimer<=0){
        e.reloading=false;
        const slot=e.weapons[e.weaponSlot];
        if(slot&&slot.ammo>=0){ const wpn=WEAPONS[slot.id]; if(wpn) slot.ammo=wpn.mag; }
      }
    }
  }
}

// ============================================================
// COMBAT
// ============================================================
function entityCanFire(entity){
  if(!entity.alive||entity.reloading) return false;
  const w=getWeaponStats(entity);
  if(!w) return false;
  if(performance.now()-entity.lastFireTime<w.rate) return false;
  const ammo=currentAmmo(entity);
  if(ammo<=0) return false;
  return true;
}

function entityFire(entity,tx,ty,tz){
  if(!entityCanFire(entity)) return;
  const w=getWeaponStats(entity);
  const slot=entity.weapons[entity.weaponSlot];
  if(!w||!slot) return;
  entity.lastFireTime=performance.now();
  if(w.mag>0) slot.ammo--;
  if(slot.ammo<=0&&w.mag>0) entityReload(entity);

  const origin=new THREE.Vector3(entity.x,entity.y+0.8,entity.z);
  for(let p=0;p<w.pellets;p++){
    const sx=rnd(-w.spread,w.spread), sy=rnd(-w.spread,w.spread);
    const dir=new THREE.Vector3(tx-entity.x+sx, ty-0.8+sy, tz-entity.z).normalize();
    if(w.type==='hitscan'){
      const ray=new THREE.Raycaster(origin, dir, 0, w.range);
      let hit=false;
      for(const e of G.entities){
        if(e===entity||!e.alive) continue;
        const ip=new THREE.Vector3();
        if(ray.ray.intersectBox(new THREE.Box3().setFromObject(e.model), ip)){
          const dmg=w.dmg*(Math.random()<0.15?1.5:1);
          applyDamage(e,dmg,entity);
          hit=true;
          spawnBloodParticles(ip.x,ip.y,ip.z);
          if(entity.isPlayer) showHitMarker();
          break;
        }
      }
      if(!hit){
        for(const b of G.buildings){
          const ip=new THREE.Vector3();
          if(ray.ray.intersectBox(new THREE.Box3().setFromObject(b.mesh), ip)){
            spawnImpactParticles(ip.x,ip.y,ip.z);
            break;
          }
        }
      }
      spawnTracer(origin,dir,w.range);
    } else if(w.type==='projectile'){
      G.projectiles.push({x:entity.x,y:entity.y+0.8,z:entity.z, vx:dir.x*w.projSpeed,vy:dir.y*w.projSpeed,vz:dir.z*w.projSpeed, dmg:w.dmg,owner:entity,life:4,radius:0.3,aoe:w.aoe||0,mesh:null});
    }
  }
  spawnMuzzleFlash(entity.x+Math.sin(entity.angle)*0.8,entity.y+0.8,entity.z+Math.cos(entity.angle)*0.8);
}

function applyDamage(entity,dmg,attacker){
  if(!entity.alive) return;
  const absorb=Math.min(entity.armor,dmg*0.4);
  entity.armor-=absorb; dmg-=absorb;
  entity.health-=dmg;
  entity.hitFlash=200;
  if(entity.health<=0){
    entity.health=0; entity.alive=false; entity.model.visible=false;
    if(attacker&&attacker!==entity){ attacker.kills++; addKillFeed(attacker.name||'You',entity.name||'Bot'); }
    G.aliveCount=G.entities.filter(e=>e.alive).length;
    if(G.player&&G.player.alive&&G.aliveCount<=1) endGame(true);
    if(G.player&&!G.player.alive&&G.aliveCount<=1) endGame(false);
  }
}

function entityReload(entity){
  const slot=entity.weapons[entity.weaponSlot];
  if(!slot||slot.ammo<0) return;
  const w=WEAPONS[slot.id];
  if(!w||slot.ammo>=w.mag) return;
  entity.reloading=true; entity.reloadTimer=w.reload;
}

function doReload(){ const p=G.player; if(p&&p.alive) entityReload(p); }

// ============================================================
// PROJECTILES
// ============================================================
function updateProjectiles(dt){
  for(let i=G.projectiles.length-1;i>=0;i--){
    const b=G.projectiles[i];
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt; b.life-=dt;
    if(!b.mesh){
      const m=new THREE.Mesh(new THREE.SphereGeometry(b.radius,6,6), new THREE.MeshBasicMaterial({color:0xffd700}));
      b.mesh=m; G.scene.add(m);
    }
    b.mesh.position.set(b.x,b.y,b.z);
    for(const e of G.entities){
      if(!e.alive||e===b.owner) continue;
      if(Math.hypot(b.x-e.x,b.z-e.z)<e.radius+0.3&&Math.abs(b.y-(e.y+0.8))<1){
        applyDamage(e,b.dmg,b.owner);
        if(b.aoe) for(const e2 of G.entities) if(e2!==e&&e2!==b.owner&&e2.alive&&Math.hypot(b.x-e2.x,b.z-e2.z)<b.aoe) applyDamage(e2,b.dmg*0.5,b.owner);
        b.life=0; spawnExplosion(b.x,b.y,b.z); break;
      }
    }
    if(b.life<=0){ if(b.mesh){ G.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); } G.projectiles.splice(i,1); }
  }
}

// ============================================================
// PARTICLES
// ============================================================
function spawnBloodParticles(x,y,z){
  for(let i=0;i<8;i++) G.particles.push({x,y,z,vx:rnd(-3,3),vy:rnd(-3,3),vz:rnd(-3,3),life:rnd(0.3,0.8),maxLife:0.8,color:0xe74c3c,radius:rnd(0.05,0.15),mesh:null});
}
function spawnMuzzleFlash(x,y,z){
  for(let i=0;i<6;i++) G.particles.push({x,y,z,vx:rnd(-2,2),vy:rnd(-2,2),vz:rnd(-2,2),life:rnd(0.05,0.15),maxLife:0.15,color:0xffd700,radius:rnd(0.1,0.3),mesh:null});
}
function spawnImpactParticles(x,y,z){
  for(let i=0;i<6;i++) G.particles.push({x,y,z,vx:rnd(-2,2),vy:rnd(-2,2),vz:rnd(-2,2),life:rnd(0.1,0.3),maxLife:0.3,color:0xaaaaaa,radius:rnd(0.05,0.15),mesh:null});
}
function spawnExplosion(x,y,z){
  for(let i=0;i<30;i++){
    const th=rnd(0,Math.PI*2), ph=rnd(0,Math.PI), sp=rnd(3,10);
    G.particles.push({x,y,z,vx:Math.sin(ph)*Math.cos(th)*sp,vy:Math.cos(ph)*sp,vz:Math.sin(ph)*Math.sin(th)*sp,life:rnd(0.3,1.2),maxLife:1.2,color:0xff4400,radius:rnd(0.1,0.5),mesh:null});
  }
}
function spawnTracer(origin,dir,range){
  G.particles.push({x:origin.x,y:origin.y,z:origin.z,vx:dir.x*60,vy:dir.y*60,vz:dir.z*60,life:0.08,maxLife:0.08,color:0xffd700,radius:0.05,mesh:null,isTracer:true});
}

function updateParticles(dt){
  for(let i=G.particles.length-1;i>=0;i--){
    const p=G.particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
    if(!p.isTracer) p.vy-=5*dt;
    p.life-=dt;
    if(!p.mesh){
      const m=new THREE.Mesh(new THREE.SphereGeometry(p.radius,4,4), new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:1}));
      p.mesh=m; G.scene.add(m);
    }
    const a=Math.max(0,p.life/p.maxLife);
    p.mesh.material.opacity=a;
    p.mesh.scale.setScalar(1+(1-a)*2);
    p.mesh.position.set(p.x,p.y,p.z);
    if(p.life<=0){ G.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); G.particles.splice(i,1); }
  }
}

// ============================================================
// PICKUPS
// ============================================================
function pickupItem(entity,pickup){
  const idx=G.pickups.indexOf(pickup);
  if(idx<0) return;
  if(pickup.type==='weapon') entity.addWeapon(pickup.id);
  else if(pickup.type==='medkit') entity.health=Math.min(entity.maxHealth,entity.health+40);
  else if(pickup.type==='armor') entity.armor=Math.min(entity.maxArmor,entity.armor+50);
  else if(pickup.type==='ammo') for(const w of entity.weapons) if(w.ammo>0&&w.ammo<Infinity){ const wd=WEAPONS[w.id]; if(wd) w.ammo=Math.min(w.ammo+wd.mag*0.5,wd.mag*4); }
  G.scene.remove(pickup.mesh); G.scene.remove(pickup.glow);
  pickup.mesh.geometry.dispose(); pickup.mesh.material.dispose();
  pickup.glow.geometry.dispose(); pickup.glow.material.dispose();
  G.pickups.splice(idx,1);
}

function interact(){
  const p=G.player;
  if(!p||!p.alive||!p.nearbyPickup) return;
  pickupItem(p,p.nearbyPickup); p.nearbyPickup=null;
}

function dropWeapon(){
  const p=G.player;
  if(!p||!p.alive||p.weapons.length<=1) return;
  const dropped=p.weapons.splice(p.weaponSlot,1)[0];
  if(p.weaponSlot>=p.weapons.length) p.weaponSlot=p.weapons.length-1;
  G.pickups.push(createPickupMesh(p.x+rnd(-2,2),p.z+rnd(-2,2),'weapon',dropped.id));
}

// ============================================================
// SAFE ZONE
// ============================================================
let zoneRing=null, zoneWall=null;

function initZone(){
  const gri=new THREE.RingGeometry(G.zone.radius*0.98, G.zone.radius, 64);
  const grm=new THREE.MeshBasicMaterial({color:0x0096ff,side:THREE.DoubleSide,transparent:true,opacity:0.12,blending:THREE.AdditiveBlending});
  zoneRing=new THREE.Mesh(gri,grm);
  zoneRing.rotation.x=-Math.PI/2;
  zoneRing.position.set(G.zone.x,0.5,G.zone.z);
  G.scene.add(zoneRing);

  // Vertical wall glow
  const wallMat=new THREE.MeshBasicMaterial({color:0x0096ff,transparent:true,opacity:0.06,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(G.zone.radius,G.zone.radius,80,64,1,true), wallMat);
  wall.position.set(G.zone.x,40,G.zone.z);
  G.scene.add(wall);
  zoneWall=wall;
}

function updateZone(dt){
  if(!G.gameStarted) return;
  G.zone.timer-=dt;
  if(G.zone.timer<=0&&G.zone.phase<5){
    G.zone.phase++; G.zone.timer=40;
    G.zone.target=Math.max(60, G.zone.radius*(1-0.15*G.zone.phase));
    G.zone.x+=rnd(-200,200); G.zone.z+=rnd(-200,200);
    G.zone.x=clamp(G.zone.x,G.zone.target+50,MAP_W-G.zone.target-50);
    G.zone.z=clamp(G.zone.z,G.zone.target+50,MAP_H-G.zone.target-50);
  }
  G.zone.radius=lerp(G.zone.radius,G.zone.target,0.02);
  if(zoneRing){
    G.scene.remove(zoneRing); zoneRing.geometry.dispose();
    zoneRing.geometry=new THREE.RingGeometry(Math.max(1,G.zone.radius-3),G.zone.radius,64);
    zoneRing.position.set(G.zone.x,0.5,G.zone.z);
    G.scene.add(zoneRing);
  }
  if(zoneWall){
    zoneWall.position.set(G.zone.x,40,G.zone.z);
    zoneWall.geometry.dispose();
    zoneWall.geometry=new THREE.CylinderGeometry(G.zone.radius,G.zone.radius,80,64,1,true);
    zoneWall.material.opacity=0.04+0.08*(1-G.zone.radius/1800);
  }
  for(const e of G.entities){
    if(!e.alive) continue;
    const d=Math.hypot(e.x-G.zone.x, e.z-G.zone.z);
    if(d>G.zone.radius-3) applyDamage(e,2+(d-(G.zone.radius-3))*0.05,null);
  }
}

// ============================================================
// UI HELPERS
// ============================================================
window.equipWeapon=function(idx){
  const p=G.player;
  if(!p||!p.alive) return;
  if(idx>=0&&idx<p.weapons.length){ p.weaponSlot=idx; p.reloading=false; }
};
window.toggleInventory=function(){
  const o=document.getElementById('inventory-overlay');
  if(!o) return;
  o.classList.toggle('active');
  if(o.classList.contains('active')) renderInventory();
};

function renderInventory(){
  const p=G.player;
  if(!p) return;
  const body=document.querySelector('#inventory-panel .inv-body');
  if(!body) return;
  let html='<div class="inv-section"><h4>Weapons</h4><div class="inv-row">';
  p.weapons.forEach((w,i)=>{
    const wd=WEAPONS[w.id];
    const rc=wd?RARITY[wd.rarity]:'#aaa';
    html+=`<div class="inv-item${i===p.weaponSlot?' active-item':''}" onclick="equipWeapon(${i});renderInventory()" style="border-color:${rc}">`+
      (wd?wd.icon+' '+(wd.name||w.id):w.id)+(w.ammo<Infinity?' ('+Math.floor(w.ammo)+')':'')+(i===p.weaponSlot?' \u{1F3C6}':'')+'</div>';
  });
  html+='</div></div><div class="inv-section"><h4>Stats</h4>';
  html+=`<div style="font-size:13px;color:#ccc;">Health: ${Math.ceil(p.health)}/${p.maxHealth}</div>`;
  html+=`<div style="font-size:13px;color:#ccc;">Armor: ${Math.ceil(p.armor)}/${p.maxArmor}</div>`;
  html+=`<div style="font-size:13px;color:#ccc;">Kills: ${p.kills}</div>`;
  body.innerHTML=html;
}

function showHitMarker(){
  G.hitMarkerTimer=200;
  const el=document.getElementById('hit-marker');
  if(el) el.classList.add('show');
}

// ============================================================
// KILL FEED
// ============================================================
function addKillFeed(killer,victim){
  G.killFeed.unshift({killer,victim,time:performance.now()});
  if(G.killFeed.length>6) G.killFeed.pop();
}

// ============================================================
// MINIMAP
// ============================================================
function renderMinimap(){
  const mc=G.minimapCtx;
  if(!mc) return;
  const mw=150,mh=150,scale=mw/MAP_W;
  mc.fillStyle='rgba(0,0,0,0.35)';
  mc.fillRect(0,0,mw,mh);
  mc.strokeStyle='rgba(0,150,255,0.5)'; mc.lineWidth=2;
  mc.beginPath(); mc.arc(G.zone.x*scale,G.zone.z*scale,G.zone.radius*scale,0,Math.PI*2); mc.stroke();
  mc.fillStyle='#555';
  for(const b of G.buildings) mc.fillRect(b.x*scale,b.z*scale,Math.max(2,b.w*scale),Math.max(2,b.h*scale));
  for(const e of G.entities){
    if(!e.alive) continue;
    mc.fillStyle=e===G.player?'#2ecc71':'#e74c3c';
    mc.beginPath(); mc.arc(e.x*scale,e.z*scale,e===G.player?3:2,0,Math.PI*2); mc.fill();
  }
  if(G.player&&G.player.alive){
    mc.strokeStyle='rgba(46,204,113,0.4)'; mc.lineWidth=1;
    mc.beginPath();
    mc.moveTo(G.player.x*scale,G.player.z*scale);
    mc.lineTo((G.player.x+Math.sin(G.azimuth)*60)*scale,(G.player.z+Math.cos(G.azimuth)*60)*scale);
    mc.stroke();
  }
}

// ============================================================
// HUD UPDATE
// ============================================================
function updateHUD(){
  const p=G.player;
  if(!p) return;
  document.getElementById('health-label').textContent=Math.ceil(p.health);
  document.getElementById('health-fill').style.height=(p.health/p.maxHealth*100)+'%';
  document.getElementById('armor-fill').style.height=(p.armor/p.maxArmor*100)+'%';
  document.getElementById('armor-label').textContent=Math.ceil(p.armor);
  const slot=p.weapons[p.weaponSlot];
  const wpn=slot?WEAPONS[slot.id]:null;
  document.getElementById('ammo-count').textContent=slot&&slot.ammo<Infinity?Math.floor(slot.ammo):'\u221E';
  document.getElementById('ammo-max').textContent=slot&&wpn&&wpn.mag<Infinity?wpn.mag:'';
  document.getElementById('weapon-name').textContent=wpn?wpn.name:'?';
  const rc=wpn?RARITY[wpn.rarity]:'#fff';
  document.getElementById('weapon-name').style.color=rc;

  const slotsEl=document.getElementById('weapon-slots');
  slotsEl.innerHTML=p.weapons.map((w,i)=>{
    const wd=WEAPONS[w.id];
    const c=wd?RARITY[wd.rarity]:'#aaa';
    return `<div class="slot${i===p.weaponSlot?' active':''}" onclick="equipWeapon(${i})" style="${i===p.weaponSlot?`border-color:${c};box-shadow:0 0 8px ${c}40`:''}">`+
      `<span class="icon">${wd?wd.icon:'?'}</span>`+
      `<span class="name">${wd?wd.name:'?'}</span>`+
      `<span class="key">[${i+1}]</span></div>`;
  }).join('');

  document.getElementById('kills-count').textContent=p.kills;
  document.getElementById('alive-count').textContent=G.aliveCount;
  const zt=document.getElementById('zt-text');
  zt.textContent=G.gameStarted?Math.ceil(G.zone.timer)+'s':'Starting '+Math.ceil(G.warmupTime)+'s';
  document.getElementById('crosshair').classList.toggle('active',p.alive);
  const dv=document.getElementById('damage-vignette');
  dv.style.borderColor=p.hitFlash>100?'rgba(255,0,0,0.4)':'transparent';
  const rh=document.getElementById('reload-hint');
  rh.style.opacity=p.reloading||(slot&&slot.ammo<=0&&slot.ammo<Infinity)?'1':'0';
  const ih=document.getElementById('interact-hint');
  if(p.nearbyPickup&&p.alive){
    const label=p.nearbyPickup.type==='weapon'&&WEAPONS[p.nearbyPickup.id]?WEAPONS[p.nearbyPickup.id].name:p.nearbyPickup.type;
    ih.innerHTML=`Press <kbd>E</kbd> to pick up ${label}`; ih.style.display='block';
  } else ih.style.display='none';
  const kf=document.getElementById('kill-feed');
  const now=performance.now();
  kf.innerHTML=G.killFeed.filter(k=>now-k.time<8000).map(k=>
    `<div class="kill-msg"><span class="highlight">${escHtml(k.killer)}</span> killed <span class="highlight">${escHtml(k.victim)}</span></div>`
  ).join('');

  // Hit marker
  if(G.hitMarkerTimer>0){
    G.hitMarkerTimer-=16;
    if(G.hitMarkerTimer<=0) document.getElementById('hit-marker').classList.remove('show');
  }

  // Pickup bob
  for(const pu of G.pickups){
    pu.bob+=0.05;
    pu.mesh.position.y=pu.radius+2+Math.sin(pu.bob)*0.3;
    pu.glow.position.copy(pu.mesh.position);
    pu.glow.material.opacity=0.08+Math.sin(pu.bob)*0.04;
  }
}

// ============================================================
// GAME END
// ============================================================
function endGame(won){
  G.state='gameover';
  document.getElementById('game-over').classList.add('active');
  const p=G.player;
  document.getElementById('go-title').textContent=won?'VICTORY':'DEFEATED';
  document.getElementById('go-title').className=won?'go-title win':'go-title lose';
  document.getElementById('go-subtitle').textContent=won?'Winner Winner!':'Game Over';
  document.getElementById('go-kills').textContent=p?p.kills:0;
  document.getElementById('go-survived').textContent=Math.floor(G.gameTime)+'s';
  document.getElementById('go-rank').textContent='#'+(G.aliveCount||1);
  document.exitPointerLock();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(){
  if(G.state!=='playing') return;
  requestAnimationFrame(gameLoop);
  const dt=Math.min(G.clock.getDelta(),0.05);
  if(!G.gameStarted){ G.warmupTime-=dt; if(G.warmupTime<=0){ G.gameStarted=true; G.zone.timer=60; }}
  if(G.gameStarted) updateZone(dt);
  updateReloads(dt);
  updatePlayerMovement(dt);
  updateBots(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updateCamera();
  updateHUD();
  renderMinimap();
  G.composer.render();
  G.gameTime+=dt;
}

// ============================================================
// START
// ============================================================
function startGame(){
  G.state='loading';
  document.getElementById('lobby').style.display='none';
  document.getElementById('loading-screen').classList.add('active');
  let progress=0;
  const progInterval=setInterval(()=>{
    progress=Math.min(progress+Math.random()*15,90);
    document.getElementById('progress-fill').style.width=progress+'%';
  },200);
  setTimeout(()=>{
    clearInterval(progInterval);
    document.getElementById('progress-fill').style.width='100%';
    setTimeout(()=>{
      initScene();
      setupInput();
      generateMap();
      initZone();
      spawnPlayer();
      spawnBots();
      G.minimapCanvas=document.getElementById('minimap-canvas');
      G.minimapCtx=G.minimapCanvas.getContext('2d');
      document.getElementById('loading-screen').classList.remove('active');
      document.getElementById('hud').classList.add('active');
      document.getElementById('crosshair').classList.add('active');
      document.getElementById('game-over').classList.remove('active');
      document.getElementById('hit-marker').classList.remove('show');
      G.state='playing';
      G.clock.start();
      document.getElementById('inv-close-btn').addEventListener('click',()=>toggleInventory());
      gameLoop();
    },500);
  },1500);
}

document.getElementById('play-btn').addEventListener('click', startGame);
