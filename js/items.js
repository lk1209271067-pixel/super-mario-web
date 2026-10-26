// 道具模块：蘑菇（从问号砖顶出、可拾取变大）、金币弹出特效、砖块碎屑粒子。
import { TILE } from './config.js';
import { applyGravity, collideTiles } from './physics.js';
import { SPRITES, drawSprite, drawCoin } from './sprites.js';

export class Mushroom {
  constructor(tx, ty) {
    this.w = 26;
    this.h = 26;
    this.x = tx * TILE + 3;
    this.y = ty * TILE + 4;
    this.vx = 0;
    this.vy = 0;
    this.dir = 1;
    this.onGround = false;
    this.hitWall = false;
    this.emergeT = 24;      // 顶出动画（期间不受碰撞）
    this.remove = false;
  }

  update(level) {
    if (this.emergeT > 0) {
      this.emergeT--;
      this.y -= 1;
      return;
    }
    this.vx = this.dir * 1.1;
    applyGravity(this);
    collideTiles(this, level);
    if (this.hitWall) this.dir *= -1;
    if (this.y > level.pixelHeight + 64) this.remove = true;
  }

  render(ctx) {
    drawSprite(ctx, SPRITES.mushroom, this.x - 3, this.y - 2);
  }
}

// 顶出金币的弹跳特效
export class CoinPop {
  constructor(tx, ty) {
    this.x = tx * TILE + TILE / 2;
    this.y = ty * TILE - 4;
    this.vy = -7;
    this.t = 0;
    this.remove = false;
  }

  update() {
    this.t++;
    this.vy += 0.5;
    this.y += this.vy;
    if (this.t > 26) this.remove = true;
  }

  render(ctx, frame) {
    drawCoin(ctx, this.x, this.y, frame * 0.35);
  }
}

// 砖块碎屑
export class BrickParticle {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.t = 0;
    this.remove = false;
  }

  update() {
    this.t++;
    this.vy += 0.45;
    this.x += this.vx;
    this.y += this.vy;
    if (this.t > 90) this.remove = true;
  }

  render(ctx) {
    ctx.fillStyle = '#b45a28';
    ctx.fillRect(this.x, this.y, 9, 9);
    ctx.fillStyle = '#3c1808';
    ctx.fillRect(this.x + 2, this.y + 3, 5, 2);
  }
}
