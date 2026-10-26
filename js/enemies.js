// 敌人模块：板栗仔（Goomba）。
// 行为：激活后向左巡逻、撞墙转向、会走出平台边缘（符合原作），
// 可被踩踏（压扁）、被顶起的砖块震死（翻转坠落）。
import { TILE } from './config.js';
import { applyGravity, collideTiles } from './physics.js';
import { SPRITES, drawSprite } from './sprites.js';

export class Goomba {
  constructor(tx, ty) {
    this.w = 28;
    this.h = 28;
    this.x = tx * TILE + 2;
    this.y = (ty + 1) * TILE - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.hitWall = false;
    this.active = false;    // 接近屏幕时才激活（原作机制）
    this.state = 'walk';    // walk | squash | flip
    this.dir = -1;          // 巡逻方向
    this.stateT = 0;
    this.walkT = 0;
    this.remove = false;
  }

  squash() {
    this.state = 'squash';
    this.stateT = 0;
    this.vx = 0;
  }

  flipKill() {
    this.state = 'flip';
    this.vy = -7;
    this.vx = 0;
  }

  update(level, camX, viewW) {
    if (this.state === 'squash') {
      this.stateT++;
      if (this.stateT > 40) this.remove = true;
      return;
    }
    if (this.state === 'flip') {
      this.vy += 0.5;
      this.y += this.vy;
      if (this.y > level.pixelHeight + 64) this.remove = true;
      return;
    }
    if (!this.active) {
      if (this.x < camX + viewW + TILE) this.active = true;
      else return;
    }
    this.vx = this.dir * 0.6;
    applyGravity(this);
    collideTiles(this, level);
    if (this.hitWall) this.dir *= -1; // 撞墙转向
    this.walkT++;
    if (this.y > level.pixelHeight + 64) this.remove = true;
  }

  render(ctx, frame) {
    if (this.state === 'squash') {
      drawSprite(ctx, SPRITES.goombaSquash, this.x - 2, this.y + this.h - 16);
      return;
    }
    if (this.state === 'flip') {
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(SPRITES.goombaA, -16, -16);
      ctx.restore();
      return;
    }
    const img = Math.floor((this.walkT + frame) / 16) % 2 === 0 ? SPRITES.goombaA : SPRITES.goombaB;
    drawSprite(ctx, img, this.x - 2, this.y + this.h - 30);
  }
}
