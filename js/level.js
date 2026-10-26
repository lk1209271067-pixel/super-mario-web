// 关卡模块：瓦片地图数据 + 建造器。
// 采用"函数调用式"建图（参考 tylerreichle/mario_js 的 MapBuilder 思路），
// 比手写超长字符串更安全、更易扩展新关卡。
import { TILE, VIEW_H_TILES } from './config.js';

// 瓦片图例：
//  '.' 空    'X' 地面   'B' 砖块(大马里奥可顶破)
//  '?' 问号砖(金币)      'M' 问号砖(蘑菇)
//  'U' 已用的问号砖      'H' 硬块(不可破坏)
//  'C' 金币(可收集)      水管与旗杆作为独立实体记录
const SOLID = new Set(['X', 'B', 'H', 'U', '?', 'M']);

export class Level {
  constructor(widthTiles, heightTiles = VIEW_H_TILES) {
    this.w = widthTiles;
    this.h = heightTiles;
    this.tiles = Array.from({ length: heightTiles }, () => Array(widthTiles).fill('.'));
    this.pipes = [];        // {x, y, w, h} 像素矩形，用于单独绘制
    this.goombaSpawns = []; // {tx, ty}
    this.flagTX = -1;       // 旗杆所在列
    this.playerStart = { x: 2 * TILE, y: 9 * TILE };
  }

  set(tx, ty, c) {
    if (tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) this.tiles[ty][tx] = c;
  }

  get(tx, ty) {
    if (ty < 0 || ty >= this.h) return '.';
    if (tx < 0 || tx >= this.w) return 'X'; // 关卡左右边界视为墙
    return this.tiles[ty][tx];
  }

  isSolid(tx, ty) {
    return SOLID.has(this.get(tx, ty));
  }

  fill(tx, ty, w, h, c) {
    for (let y = ty; y < ty + h; y++)
      for (let x = tx; x < tx + w; x++) this.set(x, y, c);
  }

  // 水管：顶部一行 + 下方管身，占 2 列
  pipe(tx, topRow, heightRows) {
    for (let y = topRow; y < topRow + heightRows; y++) {
      this.set(tx, y, 'X');
      this.set(tx + 1, y, 'X');
    }
    this.pipes.push({ x: tx * TILE, y: topRow * TILE, w: 2 * TILE, h: heightRows * TILE, rimY: topRow * TILE });
  }

  // 楼梯：从 tx 开始 count 级，dir=1 向上 / -1 向下
  stairs(tx, count, dir, maxH) {
    for (let i = 0; i < count; i++) {
      const h = dir === 1 ? i + 1 : maxH - i;
      this.fill(tx + i, this.h - 2 - h + 1, 1, h, 'H');
    }
  }

  coinRow(tx, ty, n) {
    for (let i = 0; i < n; i++) this.set(tx + i, ty, 'C');
  }

  goomba(tx) {
    this.goombaSpawns.push({ tx, ty: this.h - 3 });
  }

  flag(tx) {
    this.flagTX = tx;
  }

  get pixelWidth() { return this.w * TILE; }
  get pixelHeight() { return this.h * TILE; }
}

// ---------------- 关卡 1-1（致敬经典布局，手工重建） ----------------
export function buildLevel1() {
  const L = new Level(212);

  // 地面分段（留三个坑）
  L.fill(0, 12, 69, 2, 'X');
  L.fill(71, 12, 15, 2, 'X');
  L.fill(89, 12, 29, 2, 'X');
  L.fill(120, 12, 92, 2, 'X');

  // 开场问号与砖块组
  L.set(16, 9, '?');
  L.set(20, 9, 'B'); L.set(21, 9, '?'); L.set(22, 9, 'B'); L.set(23, 9, 'M'); L.set(24, 9, 'B');
  L.set(22, 5, '?');

  // 四根高度递增的水管
  L.pipe(28, 10, 2);
  L.pipe(36, 9, 3);
  L.pipe(46, 8, 4);
  L.pipe(57, 8, 4);

  // 第一段坑后的金币弧线
  L.set(69, 9, 'C'); L.set(70, 9, 'C');

  // 中段砖块组 + 金币
  L.coinRow(73, 8, 3);
  L.set(77, 9, '?');
  L.set(78, 9, 'B'); L.set(79, 9, 'M'); L.set(80, 9, 'B');
  L.set(79, 5, '?');

  // 第二段坑上的金币
  L.coinRow(86, 8, 3);

  // 砖块长廊 + 下方金币（第 7 行可从地面正常顶到）
  for (let i = 94; i <= 99; i++) L.set(i, 7, 'B');
  L.set(97, 7, '?');
  L.coinRow(94, 9, 6);

  // 双楼梯（经典 1-1 风格）
  L.stairs(105, 4, 1, 4);
  L.stairs(111, 4, -1, 4);

  // 第三段坑后的砖块 + 问号
  L.set(124, 9, 'B'); L.set(125, 9, '?'); L.set(126, 9, 'B');
  L.set(125, 5, '?');
  L.coinRow(129, 8, 4);

  // 终点大楼梯
  L.stairs(134, 8, 1, 8);

  // 旗杆与终点城堡
  L.flag(150);
  L.fill(160, 8, 6, 4, 'H');   // 城堡主体
  L.fill(161, 7, 4, 1, 'H');   // 城垛
  L.fill(161, 6, 1, 1, 'H'); L.fill(164, 6, 1, 1, 'H');

  // 板栗仔分布
  [22, 40, 50, 78, 82, 96, 99, 124, 127, 144, 146].forEach(x => L.goomba(x));

  L.playerStart = { x: 2.5 * TILE, y: 10 * TILE };
  return L;
}
