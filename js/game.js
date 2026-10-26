// 游戏主控模块：状态管理、实体调度、渲染分层、HUD。
// 渲染分层顺序（参考 Mario.js）：背景 → 地形 → 道具 → 敌人 → 玩家 → 粒子 → HUD。
import { TILE, VIEW_W, VIEW_H, START_TIME, START_LIVES, SCORE } from './config.js';
import { buildLevel1 } from './level.js';
import { Player } from './player.js';
import { Goomba } from './enemies.js';
import { Mushroom, CoinPop, BrickParticle } from './items.js';
import { Camera } from './camera.js';
import { overlap } from './physics.js';
import { ContraStage } from './contra.js';
import { AdventureStage } from './adventure.js';
import { Transition, IslandTransition } from './transition.js';
import {
  SPRITES, drawSprite, drawGround, drawBrick, drawQuestion, drawUsed, drawHard, drawCoin,
} from './sprites.js';

export class Game {
  constructor(ctx, input) {
    this.ctx = ctx;
    this.input = input;
    this.frame = 0;
    this.godMode = false;
    this.resetAll();
  }

  resetAll() {
    this.score = 0;
    this.coins = 0;
    this.lives = START_LIVES;
    this.mode = 'mario';
    this.contra = null;
    this.adventure = null;
    this.transition = null;
    this.islandTransition = null;
    this.loadLevel();
  }

  loadLevel() {
    this.level = buildLevel1();
    this.player = new Player(this.level.playerStart);
    this.enemies = this.level.goombaSpawns.map(s => new Goomba(s.tx, s.ty));
    this.items = [];
    this.particles = [];
    this.popups = [];
    this.bumps = [];          // 顶砖块弹跳动画 {tx, ty, t}
    this.camera = new Camera();
    this.time = START_TIME;
    this.timeT = 0;
    this.state = 'play';      // play | dying | respawn | clear | clearWait | gameover | win
    this.stateT = 0;
  }

  startContraStage(carry = null) {
    this.contra = new ContraStage(carry || { score: this.score, lives: this.lives, big: this.player.big, continuous: true, godMode:this.godMode });
    this.mode = 'contra';
  }

  // 第二关 → 第三关（冒险岛）：先播放进门白闪过渡
  startIslandTransition(carry) {
    this.islandTransition = new IslandTransition(carry);
    this.mode = 'island';
  }

  startAdventure(carry = null) {
    this.adventure = new AdventureStage(carry || { score: this.score, lives: this.lives, godMode: this.godMode });
    this.mode = 'adventure';
  }

  drawFlyingMario(ctx, armed) {
    const img = this.player.big ? SPRITES.marioBigJump : SPRITES.marioSmallJump;
    drawSprite(ctx, img, -img.width / 2, -img.height / 2, false);
    if (armed) { ctx.fillStyle='#222'; ctx.fillRect(10,-5,18,5); ctx.fillRect(14,-1,5,8); ctx.fillStyle='#bbc2c7'; ctx.fillRect(12,-4,14,2); }
  }

  // ---------------- 事件回调 ----------------

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.popups.push({ x, y, text: '+' + n, t: 0 });
  }

  collectCoin(x, y) {
    this.coins++;
    if (this.coins >= 100) { this.coins -= 100; this.lives++; }
    this.addScore(SCORE.COIN, x, y - 10);
  }

  // 玩家头顶撞砖
  handleHeadHit(tx, ty, tile) {
    const L = this.level;
    if (tile === '?') {
      L.set(tx, ty, 'U');
      this.bump(tx, ty);
      this.items.push(new CoinPop(tx, ty));
      this.collectCoin(tx * TILE + TILE / 2, ty * TILE - 8);
    } else if (tile === 'M') {
      L.set(tx, ty, 'U');
      this.bump(tx, ty);
      this.items.push(new Mushroom(tx, ty - 1));
    } else if (tile === 'B') {
      if (this.player.big) {
        L.set(tx, ty, '.');
        this.addScore(SCORE.BRICK);
        const cx = tx * TILE, cy = ty * TILE;
        this.particles.push(
          new BrickParticle(cx, cy, -1.6, -6),
          new BrickParticle(cx + 20, cy, 1.6, -6),
          new BrickParticle(cx, cy + 16, -1.2, -3),
          new BrickParticle(cx + 20, cy + 16, 1.2, -3),
        );
      } else {
        this.bump(tx, ty);
      }
    }
  }

  bump(tx, ty) {
    this.bumps.push({ tx, ty, t: 0 });
    // 被顶起的砖块会震死站在上面的敌人（原作机制）
    const topY = ty * TILE;
    for (const e of this.enemies) {
      if (e.state === 'walk' &&
          Math.abs(e.y + e.h - topY) < 6 &&
          e.x + e.w > tx * TILE && e.x < tx * TILE + TILE) {
        e.flipKill();
        this.addScore(SCORE.STOMP, e.x, e.y);
      }
    }
  }

  killPlayer() {
    if (this.godMode) return;
    if (this.state !== 'play') return;
    this.state = 'dying';
    this.stateT = 0;
    this.player.dead = true;
    this.player.vy = -9;
  }

  reachFlag(player) {
    if (this.state !== 'play') return;
    this.state = 'clear';
    this.stateT = 0;
    player.clearSliding = true;
    player.vx = 0;
    player.x = this.level.flagTX * TILE - player.w - 2;
  }

  onSlideDone() {
    this.state = 'clearWait';
    this.stateT = 0;
    this.addScore(this.time * 10); // 剩余时间折算分数
  }

  // ---------------- 主更新 ----------------

  update() {
    this.frame++;
    if (this.mode === 'transition') {
      this.transition.update(this.input);
      if (this.transition.done) this.startContraStage(this.transition.handoff);
      this.input.postUpdate();
      return;
    }
    if (this.mode === 'island') {
      this.islandTransition.update(this.input);
      if (this.islandTransition.done) this.startAdventure(this.islandTransition.handoff);
      this.input.postUpdate();
      return;
    }
    if (this.mode === 'adventure') {
      this.adventure.godMode = this.godMode;
      this.adventure.update(this.input);
      // 通关结算界面按 R 回到第一关
      if (this.adventure.state === 'ending' && this.input.restartPressed) {
        this.resetAll();
        return;
      }
      this.input.postUpdate();
      return;
    }
    if (this.mode === 'contra') {
      this.contra.godMode = this.godMode;
      this.contra.update(this.input);
      if (this.contra.exitReady) {
        this.startIslandTransition({
          score: this.contra.score,
          lives: Math.max(1, this.contra.player.hp),
          weapon: this.contra.player.weapon,
          godMode: this.godMode,
        });
      }
      this.input.postUpdate();
      return;
    }
    const p = this.player;

    if ((this.state === 'gameover' || this.state === 'win') && this.input.restartPressed) {
      this.resetAll();
      return;
    }

    if (this.state === 'play') {
      // 计时
      if (++this.timeT >= 60) { this.timeT = 0; this.time--; if (this.time <= 0) this.killPlayer(); }

      p.update(this.input, this.level, this);

      for (const e of this.enemies) e.update(this.level, this.camera.x, VIEW_W);
      for (const it of this.items) it.update(this.level);

      // 敌人之间相撞 → 互相转向
      for (let i = 0; i < this.enemies.length; i++) {
        for (let j = i + 1; j < this.enemies.length; j++) {
          const a = this.enemies[i], b = this.enemies[j];
          if (a.state === 'walk' && b.state === 'walk' && overlap(a, b)) {
            a.dir = a.x < b.x ? -1 : 1;
            b.dir = -a.dir;
          }
        }
      }

      // 玩家 vs 敌人
      if (!p.dead) {
        for (const e of this.enemies) {
          if (e.state !== 'walk' || !overlap(p, e)) continue;
          const stomping = p.vy > 0 && (p.y + p.h) - e.y < 14;
          if (stomping) {
            e.squash();
            p.vy = this.input.jump ? -8.5 : -6; // 按住跳弹更高
            this.addScore(SCORE.STOMP, e.x, e.y - 6);
          } else if (!this.godMode) {
            p.hurt(this);
          }
        }
      }

      // 玩家 vs 道具
      for (const it of this.items) {
        if (it instanceof Mushroom && !it.remove && overlap(p, it)) {
          it.remove = true;
          p.grow(this);
        }
      }

      this.enemies = this.enemies.filter(e => !e.remove);
      this.items = this.items.filter(i => !i.remove);

      // 掉坑
      if (p.y > this.level.pixelHeight + 32) {
        this.state = 'dying';
        this.stateT = 0;
        p.dead = true;
        p.vy = 0;
      }

      this.camera.update(p, this.level.pixelWidth);
    } else if (this.state === 'dying') {
      p.update(this.input, this.level, this);
      if (++this.stateT > 140) {
        this.lives--;
        if (this.lives < 0) this.state = 'gameover';
        else this.loadLevel();
      }
    } else if (this.state === 'clear') {
      p.update(this.input, this.level, this);
    } else if (this.state === 'clearWait') {
      if (++this.stateT > 45) {
        this.transition = new Transition({ score:this.score, lives:this.lives, big:this.player.big, godMode:this.godMode });
        this.mode = 'transition';
      }
    }

    // 通用特效更新
    for (const b of this.bumps) b.t++;
    this.bumps = this.bumps.filter(b => b.t < 12);
    for (const pa of this.particles) pa.update();
    this.particles = this.particles.filter(pa => !pa.remove);
    for (const po of this.popups) po.t++;
    this.popups = this.popups.filter(po => po.t < 45);

    this.input.postUpdate();
  }

  bumpOffset(tx, ty) {
    for (const b of this.bumps) {
      if (b.tx === tx && b.ty === ty) return -8 * Math.sin(Math.PI * b.t / 12);
    }
    return 0;
  }

  // ---------------- 渲染 ----------------

  render() {
    const ctx = this.ctx;
    if (this.mode === 'transition') { this.transition.render(ctx, (c, armed) => this.drawFlyingMario(c, armed)); return; }
    if (this.mode === 'island') { this.islandTransition.render(ctx); return; }
    if (this.mode === 'adventure') { this.adventure.render(ctx); return; }
    if (this.mode === 'contra') { this.contra.render(ctx); return; }
    const camX = this.camera.x;

    // 天空
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    this.renderBackground(ctx, camX);

    ctx.save();
    ctx.translate(-Math.round(camX), 0);

    this.renderTiles(ctx, camX);
    this.renderPipes(ctx);
    this.renderFlag(ctx);

    for (const it of this.items) it.render(ctx, this.frame);
    for (const e of this.enemies) e.render(ctx, this.frame);
    this.player.render(ctx);
    for (const pa of this.particles) pa.render(ctx);

    // 分数弹字
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    for (const po of this.popups) {
      ctx.fillText(po.text, po.x, po.y - po.t * 0.8);
    }

    ctx.restore();

    this.renderHUD(ctx);
    this.renderOverlays(ctx);
  }

  renderBackground(ctx, camX) {
    // 远景山丘（0.4 视差）
    const hillOff = camX * 0.4;
    ctx.fillStyle = '#3cb034';
    for (let i = -1; i < 8; i++) {
      const bx = i * 320 - (hillOff % 320);
      const big = i % 2 === 0;
      const h = big ? 90 : 60;
      const w = big ? 130 : 90;
      ctx.beginPath();
      ctx.moveTo(bx, VIEW_H - 64);
      ctx.lineTo(bx + w / 2, VIEW_H - 64 - h);
      ctx.lineTo(bx + w, VIEW_H - 64);
      ctx.fill();
    }
    // 云朵（0.25 视差）
    const cloudOff = camX * 0.25;
    ctx.fillStyle = '#fff';
    for (let i = -1; i < 10; i++) {
      const bx = i * 210 - (cloudOff % 210);
      const by = 50 + (i % 3) * 34;
      ctx.beginPath();
      ctx.ellipse(bx, by, 22, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(bx + 18, by - 8, 18, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(bx + 38, by, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 近景灌木（0.7 视差）
    const bushOff = camX * 0.7;
    ctx.fillStyle = '#2c8c26';
    for (let i = -1; i < 10; i++) {
      const bx = i * 260 - (bushOff % 260);
      ctx.beginPath();
      ctx.ellipse(bx, VIEW_H - 60, 24, 14, 0, Math.PI, 0);
      ctx.ellipse(bx + 22, VIEW_H - 60, 18, 11, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  renderTiles(ctx, camX) {
    const L = this.level;
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(L.w - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);
    for (let ty = 0; ty < L.h; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = L.tiles[ty][tx];
        if (t === '.') continue;
        const px = tx * TILE;
        const py = ty * TILE + this.bumpOffset(tx, ty);
        // 水管占位的 'X' 由 renderPipes 统一绘制
        const inPipe = L.pipes.some(pp =>
          px >= pp.x && px < pp.x + pp.w && ty * TILE >= pp.y && ty * TILE < pp.y + pp.h);
        if (inPipe) continue;

        switch (t) {
          case 'X': drawGround(ctx, px, py); break;
          case 'B': drawBrick(ctx, px, py); break;
          case '?': case 'M': drawQuestion(ctx, px, py, this.frame + tx * 5); break;
          case 'U': drawUsed(ctx, px, py); break;
          case 'H': drawHard(ctx, px, py); break;
          case 'C': drawCoin(ctx, px + TILE / 2, py + TILE / 2, this.frame * 0.12 + tx); break;
        }
      }
    }
  }

  renderPipes(ctx) {
    for (const p of this.level.pipes) {
      // 管身
      ctx.fillStyle = '#3cb034';
      ctx.fillRect(p.x + 3, p.rimY + TILE, p.w - 6, p.h - TILE);
      ctx.fillStyle = '#8ee87a';
      ctx.fillRect(p.x + 7, p.rimY + TILE, 8, p.h - TILE);
      ctx.fillStyle = '#1c6418';
      ctx.fillRect(p.x + p.w - 12, p.rimY + TILE, 6, p.h - TILE);
      // 顶部外沿
      ctx.fillStyle = '#3cb034';
      ctx.fillRect(p.x - 2, p.rimY, p.w + 4, TILE);
      ctx.fillStyle = '#8ee87a';
      ctx.fillRect(p.x + 3, p.rimY, 9, TILE);
      ctx.fillStyle = '#1c6418';
      ctx.fillRect(p.x + p.w - 11, p.rimY, 7, TILE);
      ctx.strokeStyle = '#0c3808';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 2, p.rimY, p.w + 4, TILE);
      ctx.strokeRect(p.x + 3, p.rimY + TILE, p.w - 6, p.h - TILE);
    }
  }

  renderFlag(ctx) {
    const L = this.level;
    if (L.flagTX < 0) return;
    const fx = L.flagTX * TILE + TILE / 2;
    const topY = 2 * TILE;
    const bottomY = (L.h - 2) * TILE;
    ctx.fillStyle = '#3cb034';
    ctx.fillRect(fx - 2, topY, 5, bottomY - topY);
    ctx.beginPath();
    ctx.arc(fx, topY - 5, 7, 0, Math.PI * 2);
    ctx.fill();
    // 小旗子
    ctx.fillStyle = '#e7402e';
    ctx.beginPath();
    ctx.moveTo(fx - 2, topY + 10);
    ctx.lineTo(fx - 30, topY + 24);
    ctx.lineTo(fx - 2, topY + 38);
    ctx.fill();
  }

  renderHUD(ctx) {
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, 0, VIEW_W, 30);
    ctx.fillStyle = '#fff';
    const pad = n => String(n).padStart(6, '0');
    ctx.fillText('SCORE', 20, 20);
    ctx.fillText(pad(this.score), 80, 20);
    ctx.fillText('COINS x' + String(this.coins).padStart(2, '0'), 220, 20);
    ctx.fillText('WORLD 1-1', 380, 20);
    ctx.fillText('TIME ' + Math.max(0, this.time), 520, 20);
    ctx.fillText('LIVES x' + this.lives, 660, 20);
  }

  renderOverlays(ctx) {
    const center = (text, sub) => {
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#ffd83d';
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 30);
      ctx.textAlign = 'left';
    };
    if (this.state === 'gameover') center('GAME OVER', '按 R 键重新开始');
    else if (this.state === 'win') center('LEVEL CLEAR!', `得分 ${this.score} · 按 R 再玩一次`);
    else if (this.state === 'clearWait') {
      ctx.fillStyle = '#ffd83d';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LEVEL CLEAR!', VIEW_W / 2, 120);
      ctx.textAlign = 'left';
    } else if (this.state === 'launch') {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(.82, this.stateT / 125)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#1a2440';
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT MISSION...', VIEW_W / 2, VIEW_H / 2);
      ctx.textAlign = 'left';
    }
  }
}
