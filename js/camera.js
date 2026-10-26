// 镜头模块：带死区的双向跟随镜头。
import { VIEW_W } from './config.js';

export class Camera {
  constructor() {
    this.x = 0;
  }

  reset() { this.x = 0; }

  update(player, levelPixelWidth) {
    const playerCenter = player.x + player.w / 2;
    const screenX = playerCenter - this.x;
    const leftEdge = VIEW_W * 0.25;
    const rightEdge = VIEW_W * 0.42;
    if (screenX < leftEdge) this.x = playerCenter - leftEdge;
    else if (screenX > rightEdge) this.x = playerCenter - rightEdge;
    const maxX = Math.max(0, levelPixelWidth - VIEW_W);
    if (this.x > maxX) this.x = maxX;
    if (this.x < 0) this.x = 0;
  }
}
