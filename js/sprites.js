// 像素精灵模块：所有角色/道具图形由像素数据程序化生成，
// 避免依赖任何外部版权素材，同时保持经典 8-bit 像素风格。
import { TILE } from './config.js';

const PAL = {
  R: '#e7402e', // 马里奥红
  S: '#ffc9a3', // 肤色
  H: '#6b3a12', // 头发棕
  B: '#2b5ce6', // 背带蓝 / 板栗仔棕
  K: '#4a2b0f', // 深棕（鞋/眼睛）
  Y: '#ffd83d', // 纽扣黄
  W: '#ffffff',
  b: '#f0c060', // 板栗仔脚
  T: '#d9a05b', // 兽皮浅色（冒险岛野人装）
  t: '#8a5a2b', // 兽皮斑点
  N: '#f2e6c9', // 骨饰 / 兽牙
};

// ---------------- 像素图数据（每行必须等宽） ----------------

const MARIO_SMALL_STAND = [
  '....RRRRR.......',
  '...RRRRRRRRR....',
  '...HHHSSKS......',
  '..HSHSSKSSSSH...',
  '..HSHHSSKSSSS...',
  '..HHSSSSKKKK....',
  '....SSSSSSS.....',
  '...RRRBRRR......',
  '..RRRRBBRRRR....',
  '.RRRRBBBBRRRR...',
  '.RSRBBYYBBRSR...',
  '.SSSBBBBBBSSS...',
  '..SSBBBBBBSS....',
  '..KKK....KKK....',
];

const MARIO_SMALL_WALK = MARIO_SMALL_STAND.slice(0, 12).concat([
  '..SSBBBBBBSS....',
  '.KKK......KKK...',
]);

const MARIO_SMALL_JUMP = MARIO_SMALL_STAND.slice(0, 12).concat([
  '..SSBBBBBBSS....',
  '.KKKK....KKKK...',
]);

const MARIO_BIG_STAND = [
  '.....RRRRR......',
  '....RRRRRRRRR...',
  '....HHHSSKS.....',
  '...HSHSSKSSSSH..',
  '...HSHHSSKSSSS..',
  '...HHSSSSKKKK...',
  '.....SSSSSSS....',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '..RRRRRBBRRRRR..',
  '..RRRRBBBBRRRR..',
  '..RRRBBBBBBRRR..',
  '..RSRBBBBBBRSR..',
  '..RSSBBYYBBSSR..',
  '..SSSBBBBBBSSS..',
  '..SSBBBBBBBBSS..',
  '...BBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '...BBBB..BBBB...',
  '...BBBB..BBBB...',
  '...BBBB..BBBB...',
  '..KKKKK..KKKKK..',
  '..KKKKK..KKKKK..',
  '.KKKKK....KKKKK.',
];

const MARIO_BIG_WALK = MARIO_BIG_STAND.slice(0, 21).concat([
  '..KKKK....KKKK..',
  '.KKKK......KKKK.',
  '.KKK........KKK.',
]);

const MARIO_BIG_JUMP = MARIO_BIG_STAND.slice(0, 21).concat([
  '...KKK....KKK...',
  '...KKKK..KKKK...',
  '....KKK..KKK....',
]);

// ---------------- 冒险岛形态：野人装马里奥 ----------------
// 保留马里奥的面部与身形比例（同一 16x14 网格），只把服装换成
// 兽皮短裤 + 骨制项链 + 红色头带，保持红/肤/棕的既有配色识别度。
const MARIO_WILD_STAND = [
  '....RRRRRRR.....',
  '...RRRRRRRRRR...',
  '...HHHSSKS......',
  '..HSHSSKSSSSH...',
  '..HSHHSSKSSSS...',
  '..HHSSSSKKKK....',
  '....SSSSSSS.....',
  '...SSNNNNSS.....',
  '..SSSSSSSSSS....',
  '.SSSSSSSSSSSS...',
  '.SSTTtTTTtTSS...',
  '..TTTTTTTTTT....',
  '..TTT....TTT....',
  '..SSS....SSS....',
];

const MARIO_WILD_WALK = MARIO_WILD_STAND.slice(0, 12).concat([
  '.TTTT......TTTT.',
  '.SSS........SSS.',
]);

const MARIO_WILD_JUMP = MARIO_WILD_STAND.slice(0, 12).concat([
  '..TTTT..TTTT....',
  '..SSSS..SSSS....',
]);

const GOOMBA_A = [
  '.....BBBBBB.....',
  '....BBBBBBBB....',
  '...BBBBBBBBBB...',
  '..BBKBBBBBBKBB..',
  '.BBWKBBBBBBKWBB.',
  '.BWWKBBBBKWWBB..',
  '.BBBBBBBBBBBBBB.',
  'BBBBBBBBBBBBBBBB',
  'BBBBBKBBBBKBBBBB',
  'BBBBBKKKKKKBBBBB',
  '.BBBBBBBBBBBBBB.',
  '..BBBBBBBBBBBB..',
  '...bbbbbbbbbb...',
  '..bbbb....bbbb..',
  '..bbb......bbb..',
];

const GOOMBA_B = GOOMBA_A.slice(0, 13).concat([
  '....bbbbbbbb....',
  '...bbb..bbb.....',
]);

const GOOMBA_SQUASH = [
  '................',
  '................',
  '.....BBBBBB.....',
  '...BBBBBBBBBB...',
  '..BWKBBBBBKWB...',
  '.BBBBBBBBBBBBBB.',
  'bbbbbbbbbbbbbbbb',
  '.bbbbbbbbbbbbbb.',
];

const MUSHROOM = [
  '.....RRRRR......',
  '...RRRRRRRRR....',
  '..RRWWRRRWWRR...',
  '.RRWWWRRWWWRR...',
  '.RWWRRRRRWWRR...',
  '.RRRRRRRRRRRR...',
  '..RRRRRRRRRR....',
  '...SSSSSSSSS....',
  '..SSKSSSSSKSS...',
  '..SSSSSSSSSSS...',
  '..SSSSSSSSSSS...',
  '...SSSSSSSSS....',
];

// 板栗仔颜色与马里奥不同，单独调色板
const GOOMBA_PAL = { ...PAL, B: '#b06a28' };

// 问号砖的 "?" 小图（5x7）
const QUESTION_MARK = [
  '.###.',
  '#...#',
  '...##',
  '..##.',
  '..#..',
  '.....',
  '..#..',
];

// 供离线校验使用（不依赖 DOM）
export const MAPS = {
  MARIO_SMALL_STAND, MARIO_SMALL_WALK, MARIO_SMALL_JUMP,
  MARIO_BIG_STAND, MARIO_BIG_WALK, MARIO_BIG_JUMP,
  MARIO_WILD_STAND, MARIO_WILD_WALK, MARIO_WILD_JUMP,
  GOOMBA_A, GOOMBA_B, GOOMBA_SQUASH, MUSHROOM, QUESTION_MARK,
};

export function validateMaps() {
  const errors = [];
  for (const [name, rows] of Object.entries(MAPS)) {
    const w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== w) errors.push(`${name} 第${i}行宽度 ${r.length} != ${w}`);
      for (const ch of r) {
        if (ch !== '.' && ch !== '#' && !PAL[ch]) errors.push(`${name} 第${i}行未知色块 '${ch}'`);
      }
    });
  }
  return errors;
}

// ---------------- 精灵构建 ----------------

function buildCanvas(rows, palette, scale = 2) {
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) {
      throw new Error(`像素图行宽不一致: 第 ${i} 行 (${r.length} != ${w})`);
    }
  });
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = rows.length * scale;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  return c;
}

export const SPRITES = {};

export function initSprites() {
  SPRITES.marioSmallStand = buildCanvas(MARIO_SMALL_STAND, PAL);
  SPRITES.marioSmallWalk = buildCanvas(MARIO_SMALL_WALK, PAL);
  SPRITES.marioSmallJump = buildCanvas(MARIO_SMALL_JUMP, PAL);
  SPRITES.marioBigStand = buildCanvas(MARIO_BIG_STAND, PAL);
  SPRITES.marioBigWalk = buildCanvas(MARIO_BIG_WALK, PAL);
  SPRITES.marioBigJump = buildCanvas(MARIO_BIG_JUMP, PAL);
  SPRITES.marioWildStand = buildCanvas(MARIO_WILD_STAND, PAL);
  SPRITES.marioWildWalk = buildCanvas(MARIO_WILD_WALK, PAL);
  SPRITES.marioWildJump = buildCanvas(MARIO_WILD_JUMP, PAL);
  SPRITES.goombaA = buildCanvas(GOOMBA_A, GOOMBA_PAL);
  SPRITES.goombaB = buildCanvas(GOOMBA_B, GOOMBA_PAL);
  SPRITES.goombaSquash = buildCanvas(GOOMBA_SQUASH, GOOMBA_PAL);
  SPRITES.mushroom = buildCanvas(MUSHROOM, { ...PAL, R: '#e7402e' });
  SPRITES.questionDark = buildCanvas(QUESTION_MARK, { '#': '#983c00' }, 3);
  SPRITES.questionLight = buildCanvas(QUESTION_MARK, { '#': '#ffffff' }, 3);
}

// 绘制（可选水平翻转）
export function drawSprite(ctx, img, x, y, flip = false) {
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(x) + img.width, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
  } else {
    ctx.drawImage(img, Math.round(x), Math.round(y));
  }
  ctx.restore();
}

// ---------------- 瓦片程序化绘制 ----------------

export function drawGround(ctx, x, y) {
  ctx.fillStyle = '#c06018';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#e89b5a';
  ctx.fillRect(x, y, TILE, 5);
  ctx.fillStyle = '#7a3408';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 4 + i * 8, y + 10 + (i % 2) * 8, 3, 3);
    ctx.fillRect(x + 8 + i * 7, y + 22 - (i % 2) * 6, 3, 3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
}

export function drawBrick(ctx, x, y) {
  ctx.fillStyle = '#b45a28';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#3c1808';
  ctx.fillRect(x, y + 7, TILE, 2);
  ctx.fillRect(x, y + 15, TILE, 2);
  ctx.fillRect(x, y + 23, TILE, 2);
  ctx.fillRect(x, y + 31, TILE, 1);
  // 交错竖缝
  ctx.fillRect(x + 15, y, 2, 7);
  ctx.fillRect(x + 7, y + 9, 2, 6);
  ctx.fillRect(x + 23, y + 9, 2, 6);
  ctx.fillRect(x + 15, y + 17, 2, 6);
  ctx.fillRect(x + 7, y + 25, 2, 7);
  ctx.fillRect(x + 23, y + 25, 2, 7);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x, y, TILE, 2);
}

export function drawQuestion(ctx, x, y, frame) {
  const flash = Math.floor(frame / 24) % 2 === 0;
  ctx.fillStyle = flash ? '#f8b800' : '#e09800';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = '#983c00';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
  // 四角铆钉
  ctx.fillStyle = '#983c00';
  [[4, 4], [TILE - 7, 4], [4, TILE - 7], [TILE - 7, TILE - 7]].forEach(([dx, dy]) =>
    ctx.fillRect(x + dx, y + dy, 3, 3));
  const mark = flash ? SPRITES.questionDark : SPRITES.questionLight;
  ctx.drawImage(mark, x + 9, y + 7);
}

export function drawUsed(ctx, x, y) {
  ctx.fillStyle = '#9c5a24';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = '#5c3008';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#5c3008';
  [[4, 4], [TILE - 7, 4], [4, TILE - 7], [TILE - 7, TILE - 7]].forEach(([dx, dy]) =>
    ctx.fillRect(x + dx, y + dy, 3, 3));
}

export function drawHard(ctx, x, y) {
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#404040';
  [[4, 4], [TILE - 7, 4], [4, TILE - 7], [TILE - 7, TILE - 7]].forEach(([dx, dy]) =>
    ctx.fillRect(x + dx, y + dy, 3, 3));
}

// 金币（含旋转动画，phase 控制缩放）
export function drawCoin(ctx, cx, cy, phase) {
  const rx = Math.max(2, Math.abs(Math.cos(phase)) * 7);
  ctx.fillStyle = '#f8b800';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#983c00';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (rx > 4) {
    ctx.fillStyle = '#983c00';
    ctx.fillRect(cx - 1, cy - 5, 2, 10);
  }
}
