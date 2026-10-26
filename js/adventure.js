// 第三关：ADVENTURE ISLAND（冒险岛）—— 野人装马里奥的单关逃亡。
// 只保留小霸王《冒险岛》(Hudson, 1986) 的核心玩法：
//   体力槽持续衰减，吃水果/喝牛奶回复，耗尽即丢命；
//   碰到敌人或落水即丢命（滑板可挡一次，妖精期间无敌）；
//   蛋砸开后给出石斧 / 火球 / 牛奶 / 滑板 / 妖精；
//   石斧同时最多 2 把并逐渐下坠，火球飞得更远；
//   旗杆为检查点，终点为巫医 Boss，击败后通关。
// 关卡长度与敌人/平台密度对齐前两关。
import { VIEW_W, VIEW_H } from './config.js';
import { SPRITES, drawSprite } from './sprites.js';
import { STAGE, FRUITS, EGG_ITEMS, FLOOR } from './adventureData.js';

const GRAVITY = 0.5;
const MAX_FALL = 11;
const RUN_MAX = 2.9;
const BOARD_MAX = 4.6;
const JUMP_V = -10.8;
const VITAL_MAX = 12;
// 体力衰减标定（40 秒耗尽满槽）：
//   熟练直通约 18 秒到 Boss、整关约 38 秒 → 全程不吃补给会在 Boss 战中饿死；
//   正常顺路吃水果/牛奶则始终有余量。水果因此是必需而非装饰。
const VITAL_DRAIN = 0.0050;
const COYOTE_FRAMES = 6;         // 土狼时间：踏空后仍可起跳的宽限帧
const JUMP_BUFFER = 6;           // 跳跃预输入：落地前按下也能生效
const ENEMY_SIZE = { snail: [22, 16], snake: [26, 14], frog: [20, 18], bat: [20, 14] };
const WEAPON_LIMIT = 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class AdventureStage {
  constructor(carry = {}) {
    this.carry = carry;
    this.godMode = !!carry.godMode;
    this.reset();
  }

  reset() {
    const c = this.carry;
    this.score = c.score || 0;
    this.hp = c.lives ?? 5;
    this.frame = 0;
    this.shake = 0;
    this.player = {
      x: 60, y: FLOOR - 28, w: 20, h: 28,
      vx: 0, vy: 0, onGround: false, facing: 1, anim: 0,
      invuln: 0, weapon: c.weapon === 'axe' || c.weapon === 'fire' ? c.weapon : null,
      board: false, fairy: 0, vital: VITAL_MAX, dead: false,
      jumpBuffer: 0, coyote: 0,
    };
    this.state = 'intro';
    this.stateT = 0;
    this.checkpointX = 60;
    this.banner = null;
    this.buildStage();
  }

  // ---------------- 关卡装配 ----------------

  buildStage() {
    const s = STAGE;
    this.worldWidth = s.width;
    this.goalX = s.goalX;
    this.cameraX = 0;
    this.platforms = s.platforms.map((p) => ({ ...p }));
    this.pits = s.pits.map((p) => ({ ...p }));
    this.enemies = s.enemies.map((e) => this.initEnemy(e));
    this.eggs = s.eggs.map((e) => this.initEgg(e));
    this.fruits = s.fruits.map((f) => ({ ...f, w: 20, h: 20, alive: true, t: Math.random() * 6 }));
    this.checkpoints = s.checkpoints.map((x) => ({ x, y: FLOOR - 62, w: 30, h: 62, taken: false }));
    this.drops = [];
    this.weapons = [];
    this.bossBullets = [];
    this.particles = [];
    this.goalOpen = false;
    this.boss = {
      x: s.bossX, y: FLOOR - 88, w: 64, h: 88,
      hp: 54, maxHp: 54, active: false, dead: false,
      t: 0, phase: 1, vy: 0, throwCd: 90, flash: 0, dir: -1,
    };

    const p = this.player;
    p.x = 60;
    p.y = FLOOR - p.h;
    p.vx = 0;
    p.vy = 0;
    p.dead = false;
    p.invuln = 90;
    this.checkpointX = 60;
  }

  initEnemy(e) {
    const [w, h] = ENEMY_SIZE[e.kind];
    const en = {
      ...e, w, h, baseX: e.x, baseY: e.y, dir: -1, alive: true,
      t: Math.random() * 60, vy: 0, flash: 0, hopCd: 60 + Math.random() * 40,
    };
    if (e.y > FLOOR - 40) en.y = FLOOR - h;
    if (e.kind === 'bat') {
      en.minX = Math.max(40, e.x - 120);
      en.maxX = Math.min(this.worldWidth - 40, e.x + 120);
    } else {
      const span = this.surfaceSpan(en);
      en.minX = span[0];
      en.maxX = span[1];
    }
    return en;
  }

  // 敌人在其所在平面上的可行走区间（避开水沟）
  surfaceSpan(e) {
    const footY = e.y + e.h;
    const plat = this.platforms.find((p) => Math.abs(p.y - footY) < 8 && e.x + e.w > p.x && e.x < p.x + p.w);
    if (plat) return [plat.x + 4, plat.x + plat.w - e.w - 4];
    let left = 0;
    let right = this.worldWidth;
    for (const pit of this.pits) {
      if (pit.x + pit.w <= e.x) left = Math.max(left, pit.x + pit.w + 6);
      if (pit.x >= e.x + e.w) right = Math.min(right, pit.x - 6);
    }
    return [left, right - e.w];
  }

  initEgg(e) {
    return { ...e, w: 24, h: 28, cracked: 0, alive: true, flying: false, vx: 0, vy: 0, t: Math.random() * 6 };
  }

  // ---------------- 主更新 ----------------

  update(input) {
    this.frame++;
    if (this.shake > 0) this.shake--;
    if (this.banner) {
      this.banner.t++;
      if (this.banner.t > this.banner.life) this.banner = null;
    }

    if (this.state === 'intro') {
      this.stateT++;
      if (this.stateT > 120 || input.shoot || input.jumpPressed) {
        this.state = 'play';
        this.stateT = 0;
      }
      return;
    }
    if (this.state === 'gameover') {
      if (input.restartPressed) {
        this.carry = { ...this.carry, continuous: false };
        this.reset();
      }
      return;
    }
    if (this.state === 'ending') return;

    if (this.state === 'cleared') {
      this.stateT++;
      this.updateParticles();
      if (this.stateT > 90) this.state = 'ending';
      return;
    }

    if (this.state === 'dying') {
      this.stateT++;
      const p = this.player;
      p.vy = Math.min(MAX_FALL, p.vy + GRAVITY);
      p.y += p.vy;
      this.updateParticles();
      if (this.stateT > 80) this.respawn();
      return;
    }

    if (this.state !== 'play') return;

    this.updatePlayer(input);
    this.updateVitality();
    this.updateWeapons();
    this.updateEnemies();
    this.updateBoss();
    this.updateBossBullets();
    this.updateEggs();
    this.updateFruits();
    this.updateDrops();
    this.updateCheckpoints();
    this.updateParticles();
    this.updateGoal();

    this.cameraX = clamp(this.player.x - VIEW_W * 0.36, 0, Math.max(0, this.worldWidth - VIEW_W));
  }

  updatePlayer(input) {
    const p = this.player;
    const prevY = p.y;

    if (p.board) {
      // 滑板：不能停，只能靠按左减速
      const target = input.left ? 0.9 : BOARD_MAX;
      p.vx += clamp(target - p.vx, -0.18, 0.18);
      p.facing = p.vx < 0 ? -1 : 1;
    } else {
      const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (move) {
        p.vx += move * 0.34;
        p.facing = move;
      } else {
        p.vx *= p.onGround ? 0.74 : 0.94;
      }
      p.vx = clamp(p.vx, -RUN_MAX, RUN_MAX);
    }

    if (input.jumpPressed) p.jumpBuffer = JUMP_BUFFER;
    else if (p.jumpBuffer > 0) p.jumpBuffer--;

    if (p.onGround) p.coyote = COYOTE_FRAMES;
    else if (p.coyote > 0) p.coyote--;

    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = JUMP_V;
      p.onGround = false;
      p.jumpBuffer = 0;
      p.coyote = 0;
    }
    if (!input.jump && p.vy < -4) p.vy = -4;   // 可变跳高
    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY);

    p.x = clamp(p.x + p.vx, 0, this.worldWidth - p.w);
    p.y += p.vy;
    p.onGround = false;

    const overPit = this.pits.some((g) => p.x + p.w * 0.65 > g.x && p.x + p.w * 0.35 < g.x + g.w);
    if (!overPit && p.y + p.h >= FLOOR && prevY + p.h <= FLOOR + 16) {
      p.y = FLOOR - p.h;
      p.vy = 0;
      p.onGround = true;
    }
    for (const q of this.platforms) {
      if (p.x + p.w > q.x && p.x < q.x + q.w && prevY + p.h <= q.y && p.y + p.h >= q.y) {
        p.y = q.y - p.h;
        p.vy = 0;
        p.onGround = true;
      }
    }

    if (p.invuln > 0) p.invuln--;
    if (p.fairy > 0) p.fairy--;
    p.anim += Math.abs(p.vx) * 0.25;

    if (input.shoot && (p.weapon === 'axe' || p.weapon === 'fire')) this.throwWeapon();

    // 落水 / 坠坑必死
    if (p.y > VIEW_H + 40) this.die('water');
  }

  updateVitality() {
    const p = this.player;
    p.vital -= VITAL_DRAIN;
    if (this.godMode) {
      p.vital = Math.max(1, p.vital);
      return;
    }
    if (p.vital <= 0) {
      p.vital = 0;
      this.die('exhausted');
    }
  }

  // ---------------- 武器 ----------------

  throwWeapon() {
    const p = this.player;
    if (this.weapons.length >= WEAPON_LIMIT) return;
    const isFire = p.weapon === 'fire';
    this.weapons.push({
      kind: isFire ? 'fire' : 'axe',
      x: p.x + p.w / 2 + p.facing * 8,
      y: p.y + 12,
      vx: p.facing * (isFire ? 6.2 : 5.2),
      vy: isFire ? -1.6 : -2.4,
      w: 12, h: 12, life: 120, t: 0,
    });
  }

  updateWeapons() {
    for (const w of this.weapons) {
      w.t++;
      w.x += w.vx;
      w.y += w.vy;
      // 石斧直线飞行后下坠，火球几乎不下坠且飞得更远
      w.vy += w.kind === 'fire' ? 0.06 : 0.16;
      w.life--;
    }

    const remove = new Set();
    for (const w of this.weapons) {
      if (w.life <= 0 || w.x < -20 || w.x > this.worldWidth + 20) remove.add(w);

      // 打蛋：第一下裂开，第二下破开
      for (const e of this.eggs) {
        if (!e.alive || e.flying) continue;
        if (!hit(w, { x: e.x, y: e.y, w: e.w, h: e.h })) continue;
        remove.add(w);
        e.cracked++;
        this.spark(e.x + 12, e.y + 14, '#fff', 6);
        if (e.cracked >= 2) this.breakEgg(e);
        break;
      }

      // 打敌人
      for (const e of this.enemies) {
        if (!e.alive || !hit(w, e)) continue;
        e.alive = false;
        remove.add(w);
        this.score += 100;
        this.spark(e.x + e.w / 2, e.y + e.h / 2, '#ffd166', 12);
        break;
      }

      // 打 Boss
      if (this.boss && !this.boss.dead && this.boss.active && hit(w, this.boss)) {
        this.damageBoss(1);
        remove.add(w);
      }
    }
    this.weapons = this.weapons.filter((w) => !remove.has(w));
  }

  breakEgg(egg) {
    egg.alive = false;
    this.drops.push({
      kind: egg.content, x: egg.x + 2, y: egg.y + 4, w: 24, h: 24,
      vx: 0, vy: -1.4, t: 0, landed: false,
    });
    this.spark(egg.x + 12, egg.y + 14, '#fff6c0', 14);
  }

  // ---------------- 道具 ----------------

  updateDrops() {
    const p = this.player;
    for (const d of this.drops) {
      d.t++;
      if (!d.landed) {
        d.vy = Math.min(8, d.vy + 0.35);
        d.y += d.vy;
        const footY = d.y + d.h;
        const onFloor = !this.pits.some((g) => d.x + d.w > g.x && d.x < g.x + g.w) && footY >= FLOOR;
        const plat = this.platforms.find((q) => d.x + d.w > q.x && d.x < q.x + q.w && footY >= q.y && footY < q.y + 18);
        if (onFloor || plat) {
          d.y = (plat ? plat.y : FLOOR) - d.h;
          d.vy = 0;
          d.landed = true;
        }
        if (d.y > VIEW_H + 60) d.dead = true;
      }
      if (d.dead) continue;
      if (!hit(d, p)) continue;
      d.dead = true;
      this.applyItem(d.kind);
    }
    this.drops = this.drops.filter((d) => !d.dead);
  }

  applyItem(kind) {
    const p = this.player;
    const info = EGG_ITEMS[kind];
    this.score += 200;
    this.banner = { text: info ? info.label : kind, sub: '', t: 0, life: 60 };
    switch (kind) {
      case 'axe':
      case 'fire':
        p.weapon = kind;
        break;
      case 'milk':
        p.vital = VITAL_MAX;
        break;
      case 'fairy':
        p.fairy = 480;
        break;
      case 'skateboard':
        p.board = true;
        break;
      default:
        break;
    }
    this.spark(p.x + p.w / 2, p.y, '#8cff66', 12);
  }

  updateFruits() {
    const p = this.player;
    for (const f of this.fruits) {
      if (!f.alive) continue;
      f.t += 0.06;
      const y = f.y + Math.sin(f.t) * 4;
      if (!hit({ x: f.x, y, w: f.w, h: f.h }, p)) continue;
      const info = FRUITS[f.kind] || FRUITS.apple;
      f.alive = false;
      p.vital = Math.min(VITAL_MAX, p.vital + info.bars);
      this.score += info.points;
      this.spark(f.x + 10, y + 10, info.color, 8);
    }
  }

  // ---------------- 敌人 ----------------

  updateEnemies() {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t++;
      if (e.flash > 0) e.flash--;

      if (e.kind === 'bat') {
        e.x += e.dir * 0.9;
        if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
        if (e.x > e.maxX) { e.x = e.maxX; e.dir = -1; }
        e.y = e.baseY + Math.sin(e.t * 0.05) * 16;
      } else if (e.kind === 'frog') {
        if (e.onGround !== false) {
          e.hopCd--;
          if (e.hopCd <= 0) {
            e.hopCd = 80 + Math.random() * 40;
            e.vy = -6.6;
            e.vx = (p.x > e.x ? 1 : -1) * 1.5;
            e.onGround = false;
          }
        }
        if (!e.onGround) {
          e.vy = Math.min(9, e.vy + GRAVITY);
          e.x += e.vx;
          e.y += e.vy;
          const footY = e.y + e.h;
          const plat = this.platforms.find((q) => e.x + e.w > q.x && e.x < q.x + q.w && footY >= q.y && footY < q.y + 16);
          const ground = !this.pits.some((g) => e.x + e.w > g.x && e.x < g.x + g.w);
          if ((plat && footY >= plat.y) || (ground && footY >= FLOOR)) {
            e.y = (plat ? plat.y : FLOOR) - e.h;
            e.vy = 0;
            e.vx = 0;
            e.onGround = true;
          }
          if (e.y > VIEW_H + 60) e.alive = false;
        }
      } else {
        const speed = e.kind === 'snake' ? 0.8 : 0.45;
        e.x += e.dir * speed;
        if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
        if (e.x >= e.maxX) { e.x = e.maxX; e.dir = -1; }
      }

      if (!hit(e, p)) continue;
      if (p.fairy > 0) {
        e.alive = false;
        this.score += 50;
        this.spark(e.x + e.w / 2, e.y + e.h / 2, '#ffe9a0', 12);
      } else if (p.invuln <= 0) {
        if (p.board) {
          p.board = false;
          p.invuln = 90;
          e.alive = false;
          this.spark(p.x, p.y, '#9ad8ff', 14);
        } else {
          this.die('enemy');
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  // ---------------- 蛋 ----------------

  updateEggs() {
    const p = this.player;
    for (const e of this.eggs) {
      if (!e.alive) continue;
      e.t += 0.06;

      if (e.flying) {
        e.vy = Math.min(8, e.vy + 0.35);
        e.x += e.vx;
        e.y += e.vy;
        const footY = e.y + e.h;
        const overPit = this.pits.some((g) => e.x + e.w > g.x && e.x < g.x + g.w);
        const plat = this.platforms.find((q) => e.x + e.w > q.x && e.x < q.x + q.w && footY >= q.y && footY < q.y + 18);
        if (overPit && footY >= FLOOR) {
          e.alive = false;   // 蛋掉进水里，道具丢失（原作机制）
          continue;
        }
        if (plat || footY >= FLOOR) {
          e.y = (plat ? plat.y : FLOOR) - e.h;
          this.breakEgg(e);
        }
        continue;
      }

      // 跑撞蛋 → 蛋被顶飞，落地后破开
      if (!hit(e, p)) continue;
      e.flying = true;
      e.vx = p.facing * 1.8;
      e.vy = -3.4;
    }
  }

  updateCheckpoints() {
    const p = this.player;
    for (const c of this.checkpoints) {
      if (c.taken || !hit(c, p)) continue;
      c.taken = true;
      this.checkpointX = c.x;
      this.banner = { text: 'CHECKPOINT', sub: '复活点已记录', t: 0, life: 70 };
      this.spark(c.x + 15, c.y + 10, '#7dff95', 14);
    }
  }

  updateGoal() {
    if (!this.goalOpen) return;
    const p = this.player;
    if (p.x + p.w < this.goalX) return;
    // 通关结算：剩余体力折算奖励分（原作机制）
    const bonus = Math.round(p.vital * 100) + 1000;
    this.score += bonus;
    this.state = 'cleared';
    this.stateT = 0;
    this.clearBonus = bonus;
    this.banner = null;
    this.spark(this.goalX, FLOOR - 40, '#ffd166', 24);
  }

  // ---------------- Boss ----------------

  updateBoss() {
    const b = this.boss;
    if (!b || b.dead) return;
    if (!b.active) {
      if (this.player.x > b.x - 380) {
        b.active = true;
        this.banner = { text: 'WITCH DOCTOR', sub: '巫医现身', t: 0, life: 80 };
      } else return;
    }
    b.t++;
    if (b.flash > 0) b.flash--;
    b.phase = b.hp > b.maxHp * 0.66 ? 1 : b.hp > b.maxHp * 0.33 ? 2 : 3;

    // 左右跳动
    b.vy = Math.min(9, b.vy + 0.42);
    b.y += b.vy;
    if (b.y + b.h >= FLOOR) {
      b.y = FLOOR - b.h;
      b.vy = -7.6 - b.phase * 0.6;
      b.dir = this.player.x < b.x ? -1 : 1;
    }
    b.x = clamp(b.x + b.dir * (0.9 + b.phase * 0.35), 3450, this.worldWidth - b.w - 20);

    // 投掷法术弹
    b.throwCd--;
    if (b.throwCd <= 0) {
      b.throwCd = b.phase === 1 ? 100 : b.phase === 2 ? 78 : 58;
      const count = b.phase;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.5;
        this.bossBullets.push({
          x: b.x + b.w / 2, y: b.y + 30,
          vx: (b.dir || -1) * (2.2 + b.phase * 0.5) + spread,
          vy: -3.4,
          w: 12, h: 12, life: 220,
        });
      }
    }

    if (this.player.invuln <= 0 && hit(b, this.player)) {
      if (this.player.fairy > 0) this.damageBoss(1);
      else this.die('enemy');
    }
  }

  updateBossBullets() {
    const p = this.player;
    for (const b of this.bossBullets) {
      b.vy += 0.14;
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.y > VIEW_H + 40) b.dead = true;
      if (!b.dead && p.invuln <= 0 && p.fairy <= 0 && hit(b, p)) {
        if (p.board) { p.board = false; p.invuln = 90; b.dead = true; }
        else this.die('enemy');
      }
    }
    this.bossBullets = this.bossBullets.filter((b) => !b.dead);
  }

  damageBoss(n) {
    const b = this.boss;
    if (b.dead) return;
    b.hp -= n;
    b.flash = 5;
    this.spark(b.x + b.w / 2, b.y + 40, '#ffe066', 6);
    if (b.hp <= 0) {
      b.hp = 0;
      b.dead = true;
      b.active = false;
      this.bossBullets = [];
      this.goalOpen = true;
      this.score += 3000;
      for (let i = 0; i < 60; i++) {
        this.spark(b.x + Math.random() * b.w, b.y + Math.random() * b.h, i % 2 ? '#ff6b35' : '#ffe66d', 1);
      }
      this.banner = { text: '巫医被击败', sub: '终点旗已开启', t: 0, life: 120 };
    }
  }

  // ---------------- 死亡与复活 ----------------

  die(reason) {
    const p = this.player;
    if (p.dead || this.state !== 'play') return;
    if (this.godMode && reason !== 'water') return;
    if (this.godMode && reason === 'water') {
      p.x = Math.max(20, this.checkpointX);
      p.y = FLOOR - p.h;
      p.vx = 0;
      p.vy = 0;
      return;
    }
    p.dead = true;
    p.vy = -6;
    p.vx = 0;
    this.state = 'dying';
    this.stateT = 0;
    this.shake = 8;
    this.spark(p.x + p.w / 2, p.y + p.h / 2, '#ff4747', 18);
  }

  respawn() {
    this.hp--;
    if (this.hp < 0) {
      this.state = 'gameover';
      return;
    }
    const p = this.player;
    p.x = this.checkpointX;
    p.y = FLOOR - p.h;
    p.vx = 0;
    p.vy = 0;
    p.dead = false;
    p.invuln = 100;
    p.vital = VITAL_MAX;
    // 原作规则：死亡后失去武器、滑板与妖精
    p.weapon = null;
    p.board = false;
    p.fairy = 0;
    this.weapons = [];
    this.state = 'play';
    this.stateT = 0;
  }

  spark(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 22 + Math.random() * 24,
        color,
      });
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------------- 渲染 ----------------

  render(ctx) {
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.save();
    ctx.translate(shakeX, 0);
    this.drawSky(ctx);
    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);
    this.drawGround(ctx);
    this.drawPlatforms(ctx);
    this.drawCheckpoints(ctx);
    this.drawGoal(ctx);
    this.drawFruits(ctx);
    this.drawEggs(ctx);
    this.drawDrops(ctx);
    this.drawEnemies(ctx);
    this.drawBoss(ctx);
    this.drawProjectiles(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    ctx.restore();
    this.drawHUD(ctx);
    this.drawOverlay(ctx);
    ctx.restore();
  }

  drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#67c8f5');
    g.addColorStop(0.6, '#a8e4ff');
    g.addColorStop(1, '#f5e4a8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // 海平面
    const sea = ctx.createLinearGradient(0, 300, 0, 382);
    sea.addColorStop(0, '#2f7fb8');
    sea.addColorStop(1, '#63c4da');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 300, VIEW_W, 82);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (let i = 0; i < 24; i++) {
      const x = ((i * 83 - this.cameraX * 0.3) % 780 + 780) % 780;
      const y = 308 + (i % 4) * 16;
      ctx.fillRect(x, y, 22, 2);
    }

    // 椰树剪影（视差 0.2）
    const off = this.cameraX * 0.2;
    for (let i = -1; i < 8; i++) {
      const x = i * 240 - (off % 240);
      ctx.fillStyle = '#2b6b3c';
      ctx.fillRect(x + 40, 250, 8, 120);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x + 44, 250, 40 - k * 6, 12, (k - 1.5) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 巫医祭坛：靠近 Boss 区域时压暗环境
    if (this.boss.active && !this.boss.dead) {
      const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 460);
      v.addColorStop(0, 'rgba(40,0,40,0)');
      v.addColorStop(1, 'rgba(30,0,40,.42)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawGround(ctx) {
    ctx.fillStyle = '#d9b877';
    ctx.fillRect(0, FLOOR, this.worldWidth, VIEW_H - FLOOR);
    ctx.fillStyle = '#8fd44f';
    ctx.fillRect(0, FLOOR, this.worldWidth, 8);
    for (let x = 0; x < this.worldWidth; x += 40) {
      ctx.fillStyle = 'rgba(160,120,60,.35)';
      ctx.fillRect(x + 6, FLOOR + 18, 16, 4);
    }
    // 水沟：深水 + 岸边浪花，避免与远景海面混淆
    for (const pit of this.pits) {
      const g = ctx.createLinearGradient(0, FLOOR - 6, 0, VIEW_H);
      g.addColorStop(0, '#2a86b8');
      g.addColorStop(0.35, '#12547d');
      g.addColorStop(1, '#072c44');
      ctx.fillStyle = g;
      ctx.fillRect(pit.x, FLOOR - 6, pit.w, VIEW_H - FLOOR + 6);
      // 崖壁断面
      ctx.fillStyle = '#8a6a3c';
      ctx.fillRect(pit.x - 4, FLOOR - 6, 4, VIEW_H - FLOOR + 6);
      ctx.fillRect(pit.x + pit.w, FLOOR - 6, 4, VIEW_H - FLOOR + 6);
      // 水面浪花
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let x = pit.x; x < pit.x + pit.w; x += 16) {
        const h = 3 + Math.sin((x + this.frame * 2) * 0.09) * 2;
        ctx.fillRect(x, FLOOR - 6, 10, h);
      }
    }
  }

  drawPlatforms(ctx) {
    for (const p of this.platforms) {
      ctx.fillStyle = '#a86e35';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#c98f4e';
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let x = p.x + 8; x < p.x + p.w - 6; x += 22) ctx.fillRect(x, p.y + 7, 12, 3);
    }
  }

  drawCheckpoints(ctx) {
    for (const c of this.checkpoints) {
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(c.x + 12, c.y, 5, c.h);
      ctx.fillStyle = c.taken ? '#7dff95' : '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(c.x + 17, c.y + 4);
      ctx.lineTo(c.x + 17 + 26, c.y + 14);
      ctx.lineTo(c.x + 17, c.y + 24);
      ctx.fill();
    }
  }

  drawGoal(ctx) {
    const x = this.goalX;
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(x, FLOOR - 96, 6, 96);
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(x + 3, FLOOR - 100, 6, 0, Math.PI * 2);
    ctx.fill();
    if (this.goalOpen) {
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.moveTo(x + 6, FLOOR - 92);
      ctx.lineTo(x + 6 + 34, FLOOR - 78);
      ctx.lineTo(x + 6, FLOOR - 64);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('GOAL', x + 8, FLOOR - 74);
    } else {
      ctx.fillStyle = '#9e9e9e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('LOCKED', x - 6, FLOOR - 106);
    }
  }

  drawFruits(ctx) {
    for (const f of this.fruits) {
      if (!f.alive) continue;
      const info = FRUITS[f.kind] || FRUITS.apple;
      const y = f.y + Math.sin(f.t) * 4;
      ctx.fillStyle = info.color;
      ctx.beginPath();
      ctx.arc(f.x + 10, y + 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = info.leaf;
      ctx.fillRect(f.x + 9, y - 1, 6, 5);
    }
  }

  drawEggs(ctx) {
    for (const e of this.eggs) {
      if (!e.alive) continue;
      const x = e.x;
      const y = e.y;
      ctx.fillStyle = '#f7f1e1';
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 15, 12, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      ctx.beginPath();
      ctx.ellipse(x + 15, y + 17, 6, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      if (e.cracked > 0) {
        ctx.strokeStyle = '#7a6a52';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 6);
        ctx.lineTo(x + 14, y + 14);
        ctx.lineTo(x + 9, y + 20);
        if (e.cracked > 1) {
          ctx.moveTo(x + 14, y + 14);
          ctx.lineTo(x + 19, y + 9);
        }
        ctx.stroke();
      }
    }
  }

  drawDrops(ctx) {
    for (const d of this.drops) {
      const y = d.landed ? d.y + Math.sin(d.t * 0.1) * 3 : d.y;
      this.drawItemIcon(ctx, d.kind, d.x + 12, y + 12);
    }
  }

  drawItemIcon(ctx, kind, cx, cy) {
    if (kind === 'axe') {
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(cx - 2, cy - 4, 4, 14);
      ctx.fillStyle = '#b8c4cc';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 8);
      ctx.lineTo(cx + 8, cy - 10);
      ctx.lineTo(cx + 6, cy + 2);
      ctx.lineTo(cx - 10, cy);
      ctx.fill();
    } else if (kind === 'fire') {
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 11);
      g.addColorStop(0, '#fff6b0');
      g.addColorStop(0.5, '#ff9b26');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'milk') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 5, cy - 6, 10, 14);
      ctx.fillStyle = '#9ad8ff';
      ctx.fillRect(cx - 4, cy - 9, 8, 4);
    } else if (kind === 'fairy') {
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy - 4, 5, 3, -0.6, 0, Math.PI * 2);
      ctx.ellipse(cx + 6, cy - 4, 5, 3, 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'skateboard') {
      ctx.fillStyle = '#e7402e';
      ctx.fillRect(cx - 11, cy - 2, 22, 5);
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(cx - 6, cy + 5, 3, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.kind === 'snail') this.drawSnail(ctx, e);
      else if (e.kind === 'snake') this.drawSnake(ctx, e);
      else if (e.kind === 'frog') this.drawFrog(ctx, e);
      else this.drawBat(ctx, e);
    }
  }

  drawSnail(ctx, e) {
    ctx.fillStyle = '#8fc6e8';
    ctx.beginPath();
    ctx.ellipse(e.x + 8, e.y + 11, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a13c';
    ctx.beginPath();
    ctx.arc(e.x + 15, e.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a86a1c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.x + 15, e.y + 8, 4, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = '#5b4a33';
    ctx.fillRect(e.x + 1, e.y + 13, 5, 3);
  }

  drawSnake(ctx, e) {
    ctx.fillStyle = '#3bac4a';
    for (let i = 0; i < 4; i++) {
      const y = e.y + 9 + Math.sin(e.t * 0.12 + i) * 3;
      ctx.beginPath();
      ctx.ellipse(e.x + 5 + i * 6, y, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2b7f36';
    ctx.beginPath();
    ctx.arc(e.x + (e.dir > 0 ? 21 : 6), e.y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(e.x + (e.dir > 0 ? 23 : 4), e.y + 6, 2, 2);
  }

  drawFrog(ctx, e) {
    ctx.fillStyle = '#67b843';
    ctx.beginPath();
    ctx.ellipse(e.x + 10, e.y + 10, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(e.x + 6, e.y + 5, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 14, e.y + 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(e.x + 5, e.y + 4, 2, 2);
    ctx.fillRect(e.x + 13, e.y + 4, 2, 2);
    ctx.fillStyle = '#4a8a2c';
    ctx.fillRect(e.x + 2, e.y + 15, 6, 3);
    ctx.fillRect(e.x + 12, e.y + 15, 6, 3);
  }

  drawBat(ctx, e) {
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const flap = Math.sin(e.t * 0.35) * 5;
    ctx.fillStyle = '#5a4a7a';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 2);
    ctx.lineTo(cx - 14, cy - 6 - flap);
    ctx.lineTo(cx - 10, cy + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 2);
    ctx.lineTo(cx + 14, cy - 6 - flap);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.fill();
    ctx.fillStyle = '#ffd83d';
    ctx.fillRect(cx - 3, cy - 2, 2, 2);
    ctx.fillRect(cx + 1, cy - 2, 2, 2);
  }

  drawBoss(ctx) {
    const b = this.boss;
    if (!b || b.dead) return;
    const headColor = b.phase === 1 ? '#8a6a3a' : b.phase === 2 ? '#b0452c' : '#5a4a7a';
    const cx = b.x + b.w / 2;

    // 身体
    ctx.fillStyle = b.flash ? '#fff' : '#6b4a2b';
    ctx.fillRect(b.x + 14, b.y + 34, b.w - 28, b.h - 34);
    ctx.fillStyle = '#c8b08a';
    ctx.fillRect(b.x + 10, b.y + 46, 8, 30);
    ctx.fillRect(b.x + b.w - 18, b.y + 46, 8, 30);
    // 骨项链
    ctx.fillStyle = '#f2e6c9';
    for (let i = 0; i < 5; i++) ctx.fillRect(b.x + 18 + i * 7, b.y + 40, 5, 5);
    // 草裙
    ctx.fillStyle = '#3f6b3a';
    ctx.fillRect(b.x + 12, b.y + 62, b.w - 24, 16);

    // 头（随阶段换面具）
    ctx.fillStyle = b.flash ? '#fff' : headColor;
    ctx.beginPath();
    ctx.ellipse(cx, b.y + 24, 24, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e6c9';
    ctx.beginPath();
    ctx.moveTo(cx - 16, b.y + 18);
    ctx.lineTo(cx + 16, b.y + 18);
    ctx.lineTo(cx, b.y + 36);
    ctx.fill();
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(cx - 11, b.y + 21, 6, 5);
    ctx.fillRect(cx + 5, b.y + 21, 6, 5);
    // 羽毛
    ctx.fillStyle = b.phase === 3 ? '#ff6b35' : '#ffd166';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 8, b.y - 20);
      ctx.lineTo(cx + i * 8 + 4, b.y - 2);
      ctx.lineTo(cx + i * 8 - 4, b.y - 2);
      ctx.fill();
    }
  }

  drawProjectiles(ctx) {
    for (const w of this.weapons) {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.t * 0.35);
      this.drawItemIcon(ctx, w.kind, 0, 0);
      ctx.restore();
    }
    for (const b of this.bossBullets) {
      const g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 12);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.5, '#c060ff');
      g.addColorStop(1, 'rgba(120,40,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0 && !p.board) return;
    const img = !p.onGround
      ? SPRITES.marioWildJump
      : Math.abs(p.vx) > 0.4 && Math.floor(p.anim / 6) % 2
        ? SPRITES.marioWildWalk
        : SPRITES.marioWildStand;
    if (!img) return;

    const dx = p.x + p.w / 2 - img.width / 2;
    const dy = p.y + p.h - img.height;

    if (p.board) {
      ctx.fillStyle = '#e7402e';
      ctx.fillRect(p.x - 4, p.y + p.h - 4, p.w + 8, 6);
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y + p.h + 3, 3, 0, Math.PI * 2);
      ctx.arc(p.x + p.w - 2, p.y + p.h + 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSprite(ctx, img, dx, dy, p.facing < 0);

    if (p.fairy > 0) {
      const a = this.frame * 0.12;
      ctx.fillStyle = 'rgba(255,240,160,.95)';
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2 + Math.cos(a) * 20, p.y + 6 + Math.sin(a) * 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.weapon) this.drawItemIcon(ctx, p.weapon, p.x + p.w / 2 + p.facing * 16, p.y + 16);
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx) {
    const p = this.player;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`SCORE ${String(this.score).padStart(6, '0')}`, 14, 22);
    ctx.fillStyle = '#ffd166';
    ctx.fillText('STAGE 3', 148, 22);

    // 体力槽（水果块）
    const filled = Math.ceil(p.vital);
    for (let i = 0; i < VITAL_MAX; i++) {
      const x = 232 + i * 12;
      ctx.fillStyle = i < filled ? (p.vital < 4 ? '#ff5252' : '#8fd44f') : 'rgba(255,255,255,.18)';
      ctx.fillRect(x, 12, 9, 10);
    }

    // 生命
    ctx.fillStyle = '#fff';
    ctx.fillText('LIFE', 390, 22);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillText(`x${Math.max(0, this.hp)}`, 432, 22);

    // 武器 / 状态
    const wLabel = p.weapon === 'fire' ? 'FIRE' : p.weapon === 'axe' ? 'AXE' : 'NONE';
    ctx.fillStyle = p.weapon ? '#9efcff' : '#8b98a0';
    ctx.fillText(wLabel, 476, 22);

    const tags = [];
    if (p.board) tags.push('BOARD');
    if (p.fairy > 0) tags.push('FAIRY');
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(tags.join(' '), VIEW_W - 12, 21);
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px monospace';

    if (this.boss && this.boss.active && !this.boss.dead) {
      ctx.fillStyle = '#2a1420';
      ctx.fillRect(224, 42, 320, 12);
      ctx.fillStyle = '#c060ff';
      ctx.fillRect(226, 44, 316 * (this.boss.hp / this.boss.maxHp), 8);
      ctx.fillStyle = '#f0d6ff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('WITCH DOCTOR', 228, 68);
    }

    if (this.banner) {
      const a = Math.min(1, this.banner.t / 12) * Math.min(1, (this.banner.life - this.banner.t) / 16);
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(this.banner.text, VIEW_W / 2, 96);
      if (this.banner.sub) {
        ctx.font = '13px monospace';
        ctx.fillStyle = '#ffd166';
        ctx.fillText(this.banner.sub, VIEW_W / 2, 116);
      }
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  drawOverlay(ctx) {
    if (this.state === 'intro') {
      ctx.fillStyle = 'rgba(0,0,0,.82)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5448';
      ctx.font = 'bold 40px monospace';
      ctx.fillText('STAGE 3', VIEW_W / 2, 150);
      ctx.fillStyle = '#ffd83d';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('ADVENTURE ISLAND', VIEW_W / 2, 190);
      ctx.fillStyle = '#e8f4ff';
      ctx.font = '14px monospace';
      ctx.fillText('移动 A/D　跳跃 W（长按跳更高，无二段跳）　投掷 C', VIEW_W / 2, 240);
      ctx.fillText('体力槽持续衰减：吃水果回复，耗尽即丢命', VIEW_W / 2, 264);
      ctx.fillText('碰敌即丢命；砸蛋取石斧/火球；滑板可挡一次', VIEW_W / 2, 288);
      ctx.fillStyle = '#ffd166';
      ctx.fillText('按 C 或 W 开始冒险', VIEW_W / 2, 330);
      ctx.textAlign = 'left';
    } else if (this.state === 'cleared') {
      ctx.fillStyle = 'rgba(0,0,0,.72)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd83d';
      ctx.font = 'bold 34px monospace';
      ctx.fillText('STAGE CLEAR', VIEW_W / 2, 180);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(`剩余体力奖励 +${this.clearBonus || 0}`, VIEW_W / 2, 220);
      ctx.textAlign = 'left';
    } else if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,.78)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4949';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('GAME OVER', VIEW_W / 2, 200);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText('按 R 重新挑战冒险岛', VIEW_W / 2, 238);
      ctx.textAlign = 'left';
    } else if (this.state === 'ending') {
      ctx.fillStyle = 'rgba(4,10,8,.88)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd83d';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('ISLAND CLEARED', VIEW_W / 2, 150);
      ctx.fillStyle = '#e8f4ff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('巫医被击败，岛屿重归平静', VIEW_W / 2, 190);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`最终得分 ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 246);
      ctx.fillStyle = '#8fb3c2';
      ctx.font = '14px monospace';
      ctx.fillText(`剩余生命 ${Math.max(0, this.hp)}`, VIEW_W / 2, 276);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('按 R 从第一关重新开始', VIEW_W / 2, 322);
      ctx.textAlign = 'left';
    }
  }
}
