// 第三关（冒险岛）关卡数据：单一关卡，长度与内容密度对齐前两关。
// 只保留冒险岛核心玩法所需的数据；不含多小关、隐藏蛋、滚石等附加内容。

export const FLOOR = 382;

// 水果：回复体力条数 + 分值（对照冒险岛原作的苹果/香蕉/番茄/胡萝卜/菠萝）
export const FRUITS = {
  apple: { bars: 1, points: 50, color: '#e7402e', leaf: '#3cb034' },
  banana: { bars: 1, points: 50, color: '#f2d13b', leaf: '#8a6a1f' },
  tomato: { bars: 2, points: 100, color: '#d4342a', leaf: '#3cb034' },
  carrot: { bars: 2, points: 100, color: '#f08a2b', leaf: '#3cb034' },
  pineapple: { bars: 3, points: 200, color: '#f0c020', leaf: '#3cb034' },
};

// 蛋内道具：只保留核心的四种 + 妖精
export const EGG_ITEMS = {
  axe: { label: '石斧' },
  fire: { label: '火球' },
  milk: { label: '牛奶' },
  fairy: { label: '妖精' },
  skateboard: { label: '滑板' },
};

export const STAGE = {
  name: '3',
  theme: 'beach',
  width: 4200,
  goalX: 4100,
  bossX: 3800,
  pits: [
    { x: 760, w: 90 },
    { x: 1480, w: 110 },
    { x: 2380, w: 120 },
    { x: 3120, w: 100 },
  ],
  platforms: [
    { x: 420, y: 300, w: 120, h: 14 },
    { x: 560, y: 244, w: 110, h: 14 },
    { x: 980, y: 300, w: 130, h: 14 },
    { x: 1140, y: 246, w: 120, h: 14 },
    { x: 1700, y: 300, w: 120, h: 14 },
    { x: 1860, y: 240, w: 130, h: 14 },
    { x: 2200, y: 296, w: 120, h: 14 },
    { x: 2600, y: 300, w: 130, h: 14 },
    { x: 2760, y: 244, w: 120, h: 14 },
    { x: 3300, y: 296, w: 130, h: 14 },
    { x: 3460, y: 240, w: 120, h: 14 },
    { x: 3620, y: 296, w: 120, h: 14 },
  ],
  enemies: [
    { kind: 'snail', x: 300, y: 366 },
    { kind: 'frog', x: 640, y: 364 },
    { kind: 'bat', x: 1150, y: 236 },
    { kind: 'snake', x: 1720, y: 362 },
    { kind: 'snail', x: 2260, y: 366 },
    { kind: 'frog', x: 2900, y: 364 },
    { kind: 'bat', x: 3180, y: 210 },
    { kind: 'snake', x: 3600, y: 362 },
  ],
  eggs: [
    { x: 470, y: 272, content: 'axe' },
    { x: 1200, y: 218, content: 'milk' },
    { x: 2280, y: 268, content: 'skateboard' },
    { x: 3360, y: 268, content: 'fire' },
    { x: 3520, y: 212, content: 'fairy' },
  ],
  fruits: [
    { x: 250, y: 326, kind: 'apple' },
    { x: 520, y: 206, kind: 'banana' },
    { x: 700, y: 326, kind: 'tomato' },
    { x: 1160, y: 212, kind: 'pineapple' },
    { x: 1750, y: 326, kind: 'carrot' },
    { x: 2240, y: 326, kind: 'apple' },
    { x: 2820, y: 326, kind: 'banana' },
    { x: 3400, y: 326, kind: 'tomato' },
  ],
  checkpoints: [1660, 2900],
};
