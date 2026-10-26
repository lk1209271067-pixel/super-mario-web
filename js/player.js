// 玩家模块：马里奥的移动、跳跃手感（加速度/摩擦/土狼时间/预输入/可变跳高）、
// 受伤与成长、金币拾取、动画状态机。
import {
  TILE, WALK_ACCEL, RUN_ACCEL, FRICTION, WALK_MAX, RUN_MAX,
  JUMP_SPEED, JUMP_CUT, COYOTE_FRAMES, JUMP_BUFFER, SCORE,
} from './config.js';
import { applyGravity, collideTiles } from './physics.js';
import { SPRITES, drawSprite } from './sprites.js';

const SMALL_H = 27;
const BIG_H = 46;
const W = 20;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.w = W;
    this.h = SMALL_H;
    this.vx = 0;
    this.vy = 0;
    this.big = false;
    this.facing = 1;
    this.onGround = false;
    this.hitWall = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.invincible = 0;   // 受伤无敌帧
    this.walkT = 0;        // 走路动画计时
    this.dead = false;
    this.clearSliding = false; // 过关滑旗杆
  }

  get spriteH() { return this.big ? 48 : 28; }

  hurt(game) {
    if (this.invincible > 0 || this.dead) return;
    if (this.big) {
      this.big = false;
      this.y += BIG_H - SMALL_H;
      this.h = SMALL_H;
      this.invincible = 120;
    } else {
      game.killPlayer();
    }
  }

  grow(game) {
    if (this.big) { game.addScore(SCORE.MUSHROOM, this.x, this.y); return; }
    this.big = true;
    this.y -= BIG_H - SMALL_H;
    this.h = BIG_H;
    game.addScore(SCORE.MUSHROOM, this.x, this.y);
  }

  update(input, level, game) {
    if (this.dead) {
      // 死亡动画：向上弹起后坠落
      this.vy += 0.4;
      this.y += this.vy;
      return;
    }
    if (this.clearSliding) {
      // 滑旗杆
      this.y += 3;
      const floor = (level.h - 2) * TILE - this.h;
      if (this.y >= floor) { this.y = floor; game.onSlideDone(); }
      return;
    }

    // ---- 水平移动：加速度 + 摩擦 + 刹车 ----
    const accel = input.run ? RUN_ACCEL : WALK_ACCEL;
    const maxSpd = input.run ? RUN_MAX : WALK_MAX;
    if (input.left && !input.right) {
      this.vx -= accel;
      this.facing = -1;
    } else if (input.right && !input.left) {
      this.vx += accel;
      this.facing = 1;
    } else {
      const f = this.onGround ? FRICTION : FRICTION * 0.4;
      if (Math.abs(this.vx) <= f) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * f;
    }
    if (this.vx > maxSpd) this.vx = maxSpd;
    if (this.vx < -maxSpd) this.vx = -maxSpd;

    // ---- 跳跃：缓冲 + 土狼时间 + 可变跳高 ----
    if (input.jumpPressed) this.jumpBuf = JUMP_BUFFER;
    else if (this.jumpBuf > 0) this.jumpBuf--;

    if (this.onGround) this.coyote = COYOTE_FRAMES;
    else if (this.coyote > 0) this.coyote--;

    if (this.jumpBuf > 0 && this.coyote > 0) {
      // 助跑越快跳得越高（经典手感）
      this.vy = -(JUMP_SPEED + Math.min(Math.abs(this.vx), 3) * 0.28);
      this.jumpBuf = 0;
      this.coyote = 0;
    }
    if (!input.jump && this.vy < JUMP_CUT) this.vy = JUMP_CUT;

    applyGravity(this);
    collideTiles(this, level, (tx, ty, tile) => game.handleHeadHit(tx, ty, tile));


    // ---- 金币瓦片拾取 ----
    const l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 1) / TILE);
    const t = Math.floor(this.y / TILE), b = Math.floor((this.y + this.h - 1) / TILE);
    for (let ty = t; ty <= b; ty++) {
      for (let tx = l; tx <= r; tx++) {
        if (level.get(tx, ty) === 'C') {
          level.set(tx, ty, '.');
          game.collectCoin(tx * TILE + TILE / 2, ty * TILE);
        }
      }
    }

    // ---- 旗杆检测 ----
    if (level.flagTX > 0 && this.x + this.w >= level.flagTX * TILE + 8) {
      game.reachFlag(this);
    }

    // ---- 动画 ----
    if (this.invincible > 0) this.invincible--;
    if (this.onGround && Math.abs(this.vx) > 0.3) this.walkT += Math.abs(this.vx) * 0.6;
    else if (this.onGround) this.walkT = 0;
  }

  currentSprite() {
    const set = this.big ? 'marioBig' : 'marioSmall';
    if (!this.onGround) return SPRITES[set + 'Jump'];
    if (Math.abs(this.vx) > 0.3) {
      return Math.floor(this.walkT / 8) % 2 === 0 ? SPRITES[set + 'Walk'] : SPRITES[set + 'Stand'];
    }
    return SPRITES[set + 'Stand'];
  }

  render(ctx) {
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return; // 闪烁
    const img = this.currentSprite();
    // 精灵以碰撞盒底部为锚点，水平居中
    const dx = this.x + this.w / 2 - img.width / 2;
    const dy = this.y + this.h - img.height;
    drawSprite(ctx, img, dx, dy, this.facing < 0);
  }
}
