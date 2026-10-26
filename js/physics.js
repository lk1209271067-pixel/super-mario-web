// 物理模块：AABB vs 瓦片网格的分轴碰撞求解。
// 参考 Mario.js 的思路——按位置索引瓦片，每个实体只检测自身周围几格，
// 配合"先移 X 再移 Y"的分轴积分，稳定且无穿透。
import { TILE, GRAVITY, MAX_FALL } from './config.js';

export function applyGravity(e) {
  e.vy += GRAVITY;
  if (e.vy > MAX_FALL) e.vy = MAX_FALL;
}

/**
 * 移动实体并与关卡瓦片求解碰撞。
 * @param e        实体（需有 x, y, w, h, vx, vy）
 * @param level    Level 实例
 * @param onHeadHit 头顶撞击实心瓦片回调 (tx, ty, tileChar)
 */
export function collideTiles(e, level, onHeadHit) {
  e.hitWall = false;

  // ---- X 轴 ----
  e.x += e.vx;
  let top = Math.floor(e.y / TILE);
  let bottom = Math.floor((e.y + e.h - 1) / TILE);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (level.isSolid(tx, ty)) {
        e.x = tx * TILE - e.w - 0.01;
        e.vx = 0;
        e.hitWall = true;
        break;
      }
    }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (level.isSolid(tx, ty)) {
        e.x = (tx + 1) * TILE + 0.01;
        e.vx = 0;
        e.hitWall = true;
        break;
      }
    }
  }

  // ---- Y 轴 ----
  e.y += e.vy;
  e.onGround = false;
  const left = Math.floor(e.x / TILE);
  const right = Math.floor((e.x + e.w - 1) / TILE);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h) / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (level.isSolid(tx, ty)) {
        e.y = ty * TILE - e.h;
        e.vy = 0;
        e.onGround = true;
        break;
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TILE);
    // 同排可能顶到多块砖，取离实体中心最近的一块（贴近原作手感）
    let hit = null;
    let bestDist = Infinity;
    const cx = e.x + e.w / 2;
    for (let tx = left; tx <= right; tx++) {
      if (level.isSolid(tx, ty)) {
        const d = Math.abs(tx * TILE + TILE / 2 - cx);
        if (d < bestDist) { bestDist = d; hit = tx; }
      }
    }
    if (hit !== null) {
      if (onHeadHit) onHeadHit(hit, ty, level.get(hit, ty));
      e.y = (ty + 1) * TILE + 0.01;
      e.vy = 0;
    }
  }
}

// 两实体 AABB 重叠检测
export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
