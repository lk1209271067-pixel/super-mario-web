// 第二关：原创像素素材的经典横版 run-and-gun 关卡。
// 玩法结构参考 MIT 开源项目 contra-clone 与 Blastix，未复制其美术资源。
import { VIEW_W, VIEW_H } from './config.js';
import { SPRITES, drawSprite } from './sprites.js';

const FLOOR = 382;
const GRAVITY = 0.48;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class ContraStage {
  constructor(carry = {}) { this.carry = carry; this.godMode = !!carry.godMode; this.reset(); }

  reset() {
    this.worldWidth = 6400;
    this.cameraX = 0;
    this.frame = 0;
    this.score = this.carry.score || 0;
    this.state = this.carry.continuous ? 'arrival' : 'intro';
    this.stateT = 0;
    this.player = { identity:'mario', x:80, y:this.carry.continuous ? (this.carry.playerScreenY ?? 92) : FLOOR-44, w:24, h:44, vx:0, vy:this.carry.continuous ? 2.2 : 0, onGround:!this.carry.continuous, facing:1, hp:this.carry.lives ?? 5, big:!!this.carry.big, invuln:0, weapon:'pistol', fireCd:0, anim:0, crouching:false, jumpsUsed:0, submerged:false };
    this.platforms = [
      {x:360,y:315,w:150,h:16},{x:680,y:270,w:160,h:16},{x:1020,y:320,w:180,h:16},
      {x:1390,y:245,w:170,h:16},{x:1770,y:300,w:130,h:16},{x:2020,y:220,w:210,h:16},
      {x:2490,y:292,w:170,h:16},{x:2840,y:240,w:180,h:16},{x:3220,y:310,w:160,h:16},
      {x:3550,y:255,w:150,h:16},{x:3920,y:300,w:180,h:16},{x:4310,y:225,w:180,h:16},
      {x:4660,y:305,w:150,h:16},{x:4930,y:340,w:120,h:16},
    ];
    this.pits = [{x:900,w:95},{x:1640,w:100},{x:2350,w:105},{x:3420,w:95},{x:4500,w:100}];
    this.enemies = [
      this.enemy('runner',620,FLOOR-34), this.enemy('runner',860,FLOOR-34), this.enemy('turret',1120,292),
      this.enemy('sniper',1460,211), this.enemy('runner',1850,FLOOR-34), this.enemy('turret',2130,192),
      this.enemy('runner',2590,FLOOR-34), this.enemy('sniper',2910,206), this.enemy('runner',3300,FLOOR-34),
      this.enemy('turret',3620,227), this.enemy('runner',4020,FLOOR-34), this.enemy('sniper',4380,191),
      this.enemy('runner',4750,FLOOR-34),
    ];
    this.pickups = [
      {x:740,y:238,w:24,h:24,weapon:'spread',alive:true,t:0},
      {x:2090,y:188,w:24,h:24,weapon:'rapid',alive:true,t:0},
      {x:3600,y:222,w:24,h:24,weapon:'spread',alive:true,t:0},
    ];
    this.caches = [
      {id:'wall-S',x:1260,y:FLOOR-64,w:34,h:64,hp:4,broken:false,weapon:'spread'},
      {id:'wall-L',x:3780,y:FLOOR-64,w:34,h:64,hp:5,broken:false,weapon:'laser'},
    ];
    this.capsules = [
      {x:520,y:105,w:34,h:22,vx:1.45,baseY:105,t:0,hp:2,alive:true,weapon:'rapid'},
      {x:2860,y:92,w:34,h:22,vx:1.7,baseY:92,t:2,hp:2,alive:true,weapon:'spread'},
    ];
    this.waterZones = [{x:1120,y:FLOOR-25,w:420,h:25}];
    this.bridge = {triggerX:3160,started:false,t:0,segments:Array.from({length:7},(_,i)=>({x:3020+i*44,y:FLOOR-8,w:44,h:8,broken:false}))};
    this.pits.push({x:3020,w:308});
    this.spawners = [{x:1500,count:3,done:false},{x:2740,count:4,done:false},{x:4180,count:5,done:false}];
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.boss = {kind:'green-cap-commando',x:5260,y:162,w:110,h:208,hp:72,maxHp:72,phases:3,active:false,dead:false,t:0,fireCd:90,flash:0};
    this.thirdLevelEntrance = {x:5900,y:FLOOR-82,w:64,h:82,open:false};
    this.exitReady = false;
  }

  enemy(kind, x, y) {
    return { kind, x, y, w: kind === 'turret' ? 30 : 24, h: kind === 'turret' ? 30 : 34,
      hp: kind === 'turret' ? 4 : kind === 'sniper' ? 3 : 2, dir:-1, baseX:x, alive:true, fireCd:50 + (x % 70), t:0, flash:0 };
  }

  update(input) {
    this.frame++;
    if (this.state === 'arrival') {
      this.player.y += this.player.vy;
      this.player.vy = Math.min(8, this.player.vy + .12);
      if (this.player.y >= FLOOR - this.player.h) {
        this.player.y = FLOOR - this.player.h;
        this.player.vy = 0;
        this.player.onGround = true;
        this.state = 'play';
      }
      return;
    }
    if (this.state === 'intro') { if (++this.stateT > 105 || input.shoot || input.jumpPressed) this.state = 'play'; return; }
    if (this.state === 'gameover') { if (input.restartPressed) this.reset(); return; }
    if (this.state !== 'play' && this.state !== 'mission-complete') return;

    const p = this.player;
    const prevY = p.y;
    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxSpeed = input.run ? 5.6 : 3.5;
    const accel = input.run ? 0.72 : 0.45;
    if (move) { p.vx += move * accel; p.facing = move; }
    else p.vx *= p.onGround ? 0.72 : 0.94;
    p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
    if (input.jumpPressed && p.jumpsUsed < 2) { p.vy = p.jumpsUsed === 0 ? -10.8 : -9.4; p.onGround = false; p.jumpsUsed++; }
    p.vy = Math.min(11, p.vy + GRAVITY);
    p.x = clamp(p.x + p.vx, 0, this.worldWidth - p.w);
    p.y += p.vy;
    p.onGround = false;

    const groundHere = !this.pits.some(g => p.x + p.w * .7 > g.x && p.x + p.w * .3 < g.x + g.w);
    if (groundHere && p.y + p.h >= FLOOR && prevY + p.h <= FLOOR + 14) { p.y = FLOOR - p.h; p.vy = 0; p.onGround = true; p.jumpsUsed = 0; }
    for (const q of this.platforms) {
      if (p.x + p.w > q.x && p.x < q.x + q.w && prevY + p.h <= q.y && p.y + p.h >= q.y) {
        p.y = q.y - p.h; p.vy = 0; p.onGround = true; p.jumpsUsed = 0;
      }
    }
    for (const s of this.bridge.segments) if (!s.broken && p.x+p.w>s.x && p.x<s.x+s.w && prevY+p.h<=s.y && p.y+p.h>=s.y) { p.y=s.y-p.h; p.vy=0; p.onGround=true; p.jumpsUsed=0; }
    if (p.y > VIEW_H + 80) this.hurt(true);

    if (p.fireCd > 0) p.fireCd--;
    p.crouching = !!(input.down && p.onGround);
    p.submerged = this.waterZones.some(w=>p.x+p.w>w.x&&p.x<w.x+w.w&&p.y+p.h>=w.y) && input.down;
    if (input.shoot && p.fireCd <= 0) this.shoot(input);
    if (p.invuln > 0) p.invuln--;
    p.anim += Math.abs(p.vx) * .2;

    this.updateBullets();
    this.updateEnemies();
    this.updateBoss();
    this.updatePickups();
    this.updateStageMechanics();
    this.updateParticles();

    // 走进已开启的 STAGE 3 大门 → 交棒给第三关（冒险岛）
    if (this.thirdLevelEntrance.open && !this.exitReady) {
      const d = this.thirdLevelEntrance;
      if (hit(d, p)) this.exitReady = true;
    }
    this.cameraX = clamp(p.x - VIEW_W * .34, 0, this.worldWidth - VIEW_W);
  }

  shoot(input) {
    const p = this.player;
    const aimY = input.up ? -1 : (input.down && !p.onGround ? 1 : 0);
    const horizontalInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const aimX = aimY && !horizontalInput ? 0 : (horizontalInput || p.facing);
    const base = Math.atan2(aimY, aimX || p.facing);
    const angles = p.weapon === 'spread' ? [-.24, 0, .24] : [0];
    const speed = p.weapon === 'rapid' ? 11 : 9;
    const muzzleY = p.crouching ? p.y + 31 : p.y + 15;
    for (const off of angles) this.bullets.push({x:p.x+p.w/2,y:muzzleY,w:p.weapon==='laser'?24:p.weapon==='flame'?10:7,h:p.weapon==='laser'?3:p.weapon==='flame'?10:4,vx:Math.cos(base+off)*speed,vy:Math.sin(base+off)*speed,life:p.weapon==='flame'?120:90,pierce:p.weapon==='laser'?4:0,kind:p.weapon==='flame'?'flame':'bullet',wave:p.weapon==='flame'?(Math.random()>.5?1:-1):0,t:0});
    p.fireCd = p.weapon === 'rapid' ? 5 : p.weapon === 'spread' ? 15 : p.weapon==='laser'?18:p.weapon==='flame'?22:10;
    this.spark(p.x + (p.facing > 0 ? p.w + 8 : -8), p.y + 15, '#fff59d', 4);
  }

  updateBullets() {
    for (let i=this.bullets.length-1;i>=0;i--) {
      const b=this.bullets[i]; b.t=(b.t||0)+1;b.x+=b.vx;b.y+=b.vy;if(b.kind==='flame'){b.y+=Math.sin(b.t*.45)*b.wave*2.3;b.w=Math.min(20,b.w+.15);b.h=Math.min(20,b.h+.15);}b.life--;
      let used=b.life<=0;
      for (const e of this.enemies) if (!used && e.alive && hit(b,e)) { e.hp-=b.kind==='flame'?2:1; e.flash=5;if(b.pierce>0)b.pierce--;else used=true;if(e.hp<=0){e.alive=false;this.score+=100;this.spark(e.x,e.y,'#ffb347',14);} }
      for (const c of this.caches) if (!used && !c.broken && hit(b,c)) { this.damageCache(c,1); used=true; }
      for (const c of this.capsules) if (!used && c.alive && hit(b,c)) { c.hp--; used=true; if(c.hp<=0){c.alive=false;this.pickups.push({x:c.x,y:c.y,w:24,h:24,weapon:c.weapon,alive:true,t:0,fromCapsule:true});this.spark(c.x,c.y,'#9efcff',14);} }
      if (!used && this.boss.active && !this.boss.dead && hit(b,this.boss)) { this.damageBoss(1); used=true; }
      if(used) this.bullets.splice(i,1);
    }
    for(let i=this.enemyBullets.length-1;i>=0;i--){const b=this.enemyBullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;if(b.life<=0){this.enemyBullets.splice(i,1);continue;}if(!this.player.submerged&&this.player.invuln<=0&&hit(b,this.player)){this.enemyBullets.splice(i,1);this.hurt(false);}}
  }

  updateEnemies() {
    for (const e of this.enemies) {
      if(!e.alive) continue; e.t++; if(e.flash>0)e.flash--;
      if(e.kind==='runner'){e.x+=e.dir*1.15;if(Math.abs(e.x-e.baseX)>75)e.dir*=-1;}
      e.fireCd--; const range=Math.abs(e.x-this.player.x);
      if(e.fireCd<=0&&range<460){this.enemyShoot(e.x+e.w/2,e.y+8,e.kind==='sniper'?4.4:3.2);e.fireCd=e.kind==='turret'?75:e.kind==='sniper'?105:145;}
      if(!this.player.submerged&&this.player.invuln<=0&&hit(e,this.player))this.hurt(false);
    }
  }

  enemyShoot(x,y,speed){const dx=this.player.x+this.player.w/2-x,dy=this.player.y+this.player.h/2-y,m=Math.hypot(dx,dy)||1;this.enemyBullets.push({x,y,w:7,h:7,vx:dx/m*speed,vy:dy/m*speed,life:180});}

  updateBoss(){const b=this.boss;if(b.dead)return;if(!b.active){if(this.player.x>b.x-520)b.active=true;else return;}b.t++;if(b.flash>0)b.flash--;const phase=b.hp>b.maxHp*.66?1:b.hp>b.maxHp*.33?2:3;b.phase=phase;b.x+=Math.sin(b.t*(phase===3?.08:.045))*(phase===3?1.8:.7);b.y=162+Math.sin(b.t*.035)*(phase===1?10:24);b.fireCd--;if(b.fireCd<=0){b.fireCd=phase===1?76:phase===2?50:30;const base=Math.atan2(this.player.y-b.y,this.player.x-b.x);for(let i=-phase;i<=phase;i++){const a=base+i*.16;this.enemyBullets.push({x:b.x+12,y:b.y+72,w:9,h:9,vx:Math.cos(a)*(3+phase*.25),vy:Math.sin(a)*(3+phase*.25),life:220});}}if(this.player.invuln<=0&&hit(b,this.player))this.hurt(false);}

  damageBoss(amount){if(this.boss.dead)return;this.boss.hp-=amount;this.boss.flash=5;if(this.boss.hp<=0){this.boss.hp=0;this.boss.dead=true;this.boss.active=false;this.thirdLevelEntrance.open=true;this.enemyBullets=[];this.score+=3000;this.state='mission-complete';for(let i=0;i<65;i++)this.spark(this.boss.x+Math.random()*this.boss.w,this.boss.y+Math.random()*this.boss.h,i%2?'#ff6b35':'#ffe66d',1);}}

  updatePickups(){for(const p of this.pickups){if(!p.alive)continue;p.t+=.08;if(hit(p,this.player)){p.alive=false;this.player.weapon=p.weapon;this.score+=300;this.spark(p.x,p.y,'#8cff66',15);}}}
  damageCache(cache,amount){if(cache.broken)return;cache.hp-=amount;if(cache.hp<=0){cache.broken=true;this.pickups.push({x:cache.x+5,y:cache.y-30,w:24,h:24,weapon:cache.weapon,alive:true,t:0,fromCache:cache.id});this.spark(cache.x,cache.y,'#d9bd79',18);}}
  updateStageMechanics(){
    for(const c of this.capsules){if(!c.alive)continue;c.t+=.05;c.x+=c.vx;c.y=c.baseY+Math.sin(c.t)*26;}
    for(const s of this.spawners){if(!s.done&&this.player.x>s.x-420){s.done=true;for(let i=0;i<s.count;i++)this.enemies.push(this.enemy('runner',s.x+70+i*42,FLOOR-34));}}
    if(!this.bridge.started&&this.player.x>this.bridge.triggerX-420){this.bridge.started=true;this.bridge.t=0;}
    if(this.bridge.started){this.bridge.t++;const n=Math.floor(this.bridge.t/16);for(let i=0;i<n&&i<this.bridge.segments.length;i++){if(!this.bridge.segments[i].broken){this.bridge.segments[i].broken=true;this.spark(this.bridge.segments[i].x,FLOOR,'#ff9b42',12);}}}
  }
  hurt(pit){const p=this.player;if(this.godMode&&!pit)return;if(p.invuln>0&&!pit)return;p.hp--;p.invuln=90;this.spark(p.x,p.y,'#ff4747',18);if(p.hp<=0){this.state='gameover';return;}p.x=Math.max(20,p.x-(pit?180:75));p.y=FLOOR-p.h;p.vx=0;p.vy=0;}
  spark(x,y,color,n){for(let i=0;i<n;i++)this.particles.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:25+Math.random()*25,color});}
  updateParticles(){for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life--;if(p.life<=0)this.particles.splice(i,1);}}

  render(ctx) {
    this.drawBackground(ctx);
    ctx.save(); ctx.translate(-Math.round(this.cameraX),0);
    this.drawWorld(ctx); this.drawCaches(ctx); this.drawCapsules(ctx); this.drawPickups(ctx); this.drawEnemies(ctx); this.drawBoss(ctx); this.drawProjectiles(ctx); this.drawPlayer(ctx); this.drawParticles(ctx);
    ctx.restore(); this.drawHUD(ctx); this.drawOverlay(ctx);
  }

  drawBackground(ctx){const g=ctx.createLinearGradient(0,0,0,VIEW_H);g.addColorStop(0,'#071a35');g.addColorStop(.48,'#164b62');g.addColorStop(1,'#183d25');ctx.fillStyle=g;ctx.fillRect(0,0,VIEW_W,VIEW_H);const off=this.cameraX*.18;for(let i=-1;i<9;i++){const x=i*180-(off%180);ctx.fillStyle=i%2?'#102f34':'#173f3b';ctx.beginPath();ctx.moveTo(x,330);ctx.lineTo(x+90,130+(i%3)*30);ctx.lineTo(x+190,330);ctx.fill();}for(let i=0;i<55;i++){const x=((i*157-this.cameraX*.4)%900+900)%900;const y=35+(i*47)%210;ctx.fillStyle='rgba(185,255,210,.24)';ctx.fillRect(x,y,2,2);}}
  drawWorld(ctx){ctx.fillStyle='#172b1d';ctx.fillRect(0,FLOOR,this.worldWidth,VIEW_H-FLOOR);ctx.fillStyle='#4f7b32';ctx.fillRect(0,FLOOR,this.worldWidth,7);for(const pit of this.pits){ctx.fillStyle='#03090d';ctx.fillRect(pit.x,FLOOR-2,pit.w,VIEW_H-FLOOR+4);}for(let x=0;x<this.worldWidth;x+=48){ctx.fillStyle='#283f24';ctx.fillRect(x,FLOOR+15,25,5);ctx.fillStyle='#102115';ctx.fillRect(x+31,FLOOR+37,12,7);}for(const p of this.platforms){ctx.fillStyle='#596b43';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#9aad64';ctx.fillRect(p.x,p.y,p.w,4);ctx.fillStyle='#273923';for(let x=p.x+12;x<p.x+p.w;x+=28)ctx.fillRect(x,p.y+7,13,5);}for(const w of this.waterZones){ctx.fillStyle='rgba(35,132,220,.72)';ctx.fillRect(w.x,w.y,w.w,w.h+66);ctx.fillStyle='#92ddff';for(let x=w.x;x<w.x+w.w;x+=30)ctx.fillRect(x,w.y,18,3);}for(const s of this.bridge.segments)if(!s.broken){ctx.fillStyle='#a26a38';ctx.fillRect(s.x,s.y,s.w-2,s.h);ctx.fillStyle='#e0a85b';ctx.fillRect(s.x,s.y,s.w-2,2);}for(let x=300;x<this.worldWidth-500;x+=420){ctx.fillStyle='#244b2a';ctx.fillRect(x,FLOOR-88,16,88);ctx.fillStyle='#39713d';for(let y=FLOOR-105;y<FLOOR-20;y+=22){ctx.beginPath();ctx.moveTo(x+8,y);ctx.lineTo(x-18,y+30);ctx.lineTo(x+34,y+30);ctx.fill();}}if(this.thirdLevelEntrance.open){const d=this.thirdLevelEntrance;ctx.fillStyle='#13131d';ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle='#73ff9a';ctx.lineWidth=5;ctx.strokeRect(d.x,d.y,d.w,d.h);ctx.fillStyle='#73ff9a';ctx.font='bold 13px monospace';ctx.fillText('STAGE 3',d.x-1,d.y-10);ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText('待续',d.x+20,d.y+45);}}
  drawCaches(ctx){for(const c of this.caches){if(c.broken)continue;ctx.fillStyle='#314a2d';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.fillStyle='#58744e';for(let y=c.y+4;y<c.y+c.h;y+=12)ctx.fillRect(c.x+4,y,c.w-8,5);ctx.fillStyle='#a5c27e';ctx.fillRect(c.x+12,c.y+22,10,10);}}
  drawCapsules(ctx){for(const c of this.capsules){if(!c.alive)continue;ctx.fillStyle='#d8e9ef';ctx.beginPath();ctx.ellipse(c.x+17,c.y+11,18,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e54b4b';ctx.fillRect(c.x+5,c.y+6,24,10);ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.fillText(c.weapon==='spread'?'S':'M',c.x+14,c.y+15);}}
  drawPlayer(ctx){const p=this.player;if(p.invuln>0&&Math.floor(p.invuln/4)%2===0)return;if(p.submerged){ctx.fillStyle='#e7402e';ctx.fillRect(p.x+4,FLOOR-10,18,5);ctx.fillStyle='#ffc9a3';ctx.fillRect(p.x+8,FLOOR-5,11,5);return;}const set=p.big?'marioBig':'marioSmall';const img=!p.onGround?SPRITES[set+'Jump']:Math.abs(p.vx)>.3&&Math.floor(p.anim/5)%2?SPRITES[set+'Walk']:SPRITES[set+'Stand'];const y=p.crouching?p.y+12:p.y;if(!p.onGround){ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(this.frame*.18*p.facing);drawSprite(ctx,img,-img.width/2,-img.height/2,false);ctx.restore();}else drawSprite(ctx,img,p.x+p.w/2-img.width/2,y+p.h-img.height,p.facing<0);ctx.save();ctx.translate(p.x+p.w/2,y);ctx.scale(p.facing,1);ctx.fillStyle='#222';ctx.fillRect(10,p.crouching?27:14,18,5);ctx.fillRect(14,p.crouching?31:18,5,8);ctx.fillStyle='#bbc2c7';ctx.fillRect(12,p.crouching?28:15,14,2);ctx.restore();}
  drawEnemies(ctx){for(const e of this.enemies){if(!e.alive)continue;if(e.kind==='turret'){ctx.fillStyle=e.flash?'#fff':'#667064';ctx.fillRect(e.x,e.y,e.w,e.h);ctx.fillStyle='#b8c3ad';ctx.fillRect(e.x+7,e.y-8,16,10);ctx.fillStyle='#202720';ctx.fillRect(e.x-10,e.y+8,22,6);continue;}ctx.save();ctx.translate(e.x+e.w/2,e.y);ctx.scale(e.dir,1);const skin=e.flash?'#fff':e.kind==='sniper'?'#d59b72':'#c98b61';/* 头带与头 */ctx.fillStyle='#202318';ctx.fillRect(-8,0,16,5);ctx.fillStyle=skin;ctx.fillRect(-7,5,14,10);ctx.fillStyle='#24130e';ctx.fillRect(3,8,3,2);/* 裸露肌肉躯干 */ctx.fillStyle=skin;ctx.fillRect(-11,15,22,12);ctx.fillRect(-16,17,7,15);ctx.fillRect(9,17,15,7);ctx.fillStyle='#8b4b32';ctx.fillRect(-2,16,4,11);/* 军裤 */ctx.fillStyle=e.kind==='sniper'?'#6b4938':'#65783a';ctx.fillRect(-10,27,20,7);ctx.fillRect(-10,34,8,10);ctx.fillRect(2,34,8,10);ctx.fillStyle='#181b17';ctx.fillRect(12,18,22,5);ctx.fillRect(22,22,5,7);ctx.restore();}}
  drawPickups(ctx){for(const p of this.pickups){if(!p.alive)continue;const y=p.y+Math.sin(p.t)*5;ctx.fillStyle='#d6edf2';ctx.beginPath();ctx.arc(p.x+12,y+12,13,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.weapon==='spread'?'#e44747':'#ffcb3d';ctx.font='bold 15px monospace';ctx.fillText(p.weapon==='spread'?'S':'M',p.x+7,y+17);}}
  drawBoss(ctx){const b=this.boss;if(b.dead)return;ctx.save();ctx.translate(b.x+b.w/2,b.y);const skin=b.flash?'#fff':'#d49a69';/* 绿帽 */ctx.fillStyle='#305f35';ctx.fillRect(-34,0,58,13);ctx.fillRect(-26,-8,48,11);ctx.fillStyle='#17381d';ctx.fillRect(20,7,27,7);/* 脸 */ctx.fillStyle=skin;ctx.fillRect(-28,13,52,38);ctx.fillStyle='#4f2b1e';ctx.fillRect(-28,38,52,13);ctx.fillStyle='#18130f';ctx.fillRect(10,25,6,6);/* 巨大肩臂 */ctx.fillStyle=skin;ctx.beginPath();ctx.arc(-39,68,28,0,Math.PI*2);ctx.arc(39,68,28,0,Math.PI*2);ctx.fill();ctx.fillRect(-42,65,84,66);ctx.fillStyle='#7a2025';ctx.fillRect(-25,58,50,72);ctx.fillStyle='#432026';ctx.fillRect(-4,59,8,70);/* 机枪 */ctx.fillStyle='#202728';ctx.fillRect(-72,82,55,12);ctx.fillRect(-67,94,12,24);ctx.fillStyle='#9ba7a1';ctx.fillRect(-68,84,48,4);/* 腿 */ctx.fillStyle='#344d2d';ctx.fillRect(-35,130,28,68);ctx.fillRect(7,130,28,68);ctx.fillStyle='#171a16';ctx.fillRect(-41,192,36,12);ctx.fillRect(5,192,38,12);ctx.restore();}
  drawProjectiles(ctx){for(const b of this.bullets){if(b.kind==='flame'){const g=ctx.createRadialGradient(b.x,b.y,1,b.x,b.y,b.w);g.addColorStop(0,'#fff7a8');g.addColorStop(.45,'#ff9c26');g.addColorStop(1,'rgba(255,42,16,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.w,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle=b.pierce>0?'#7df5ff':'#ffe066';ctx.fillRect(b.x,b.y,b.w,b.h);}}ctx.fillStyle='#ff584d';for(const b of this.enemyBullets){ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();}}
  drawParticles(ctx){for(const p of this.particles){ctx.globalAlpha=Math.min(1,p.life/20);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);}ctx.globalAlpha=1;}
  drawHUD(ctx){ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,VIEW_W,34);ctx.fillStyle='#fff';ctx.font='bold 15px monospace';ctx.fillText(`STAGE 2  SCORE ${String(this.score).padStart(6,'0')}`,18,22);ctx.fillStyle='#ff5656';ctx.fillText(`LIFE ${'■'.repeat(Math.max(0,this.player.hp))}`,330,22);ctx.fillStyle='#7dff95';ctx.fillText(`GUN ${this.player.weapon.toUpperCase()}`,560,22);if(this.boss.active&&!this.boss.dead){ctx.fillStyle='#27151a';ctx.fillRect(244,42,280,12);ctx.fillStyle='#ff4338';ctx.fillRect(246,44,276*(this.boss.hp/this.boss.maxHp),8);}}
  drawOverlay(ctx){if(this.state==='intro'){ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,VIEW_W,VIEW_H);ctx.textAlign='center';ctx.fillStyle='#ff5448';ctx.font='bold 38px monospace';ctx.fillText('STAGE 2',VIEW_W/2,155);ctx.fillStyle='#f5e8bf';ctx.font='bold 25px monospace';ctx.fillText('JUNGLE ASSAULT',VIEW_W/2,194);ctx.font='16px monospace';ctx.fillText('移动：A/D  跳跃：W  射击：C  Shift加速  S蹲下',VIEW_W/2,236);ctx.fillText('按射击键进入战斗',VIEW_W/2,270);ctx.textAlign='left';}else if(this.state==='mission-complete'){ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(180,52,408,72);ctx.textAlign='center';ctx.fillStyle='#7dff95';ctx.font='bold 25px monospace';ctx.fillText('MISSION COMPLETE',VIEW_W/2,82);ctx.fillStyle='#fff';ctx.font='14px monospace';ctx.fillText('继续向右前往 STAGE 3 入口',VIEW_W/2,108);ctx.textAlign='left';}else if(this.state==='gameover'){ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(0,0,VIEW_W,VIEW_H);ctx.textAlign='center';ctx.fillStyle='#ff4949';ctx.font='bold 38px monospace';ctx.fillText('GAME OVER',VIEW_W/2,205);ctx.fillStyle='#fff';ctx.font='16px monospace';ctx.fillText('按 R 重新挑战第二关',VIEW_W/2,240);ctx.textAlign='left';}}
}
