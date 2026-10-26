// 全局常量配置：尺寸、物理参数、计分规则
export const TILE = 32;                 // 瓦片边长（像素）
export const VIEW_W_TILES = 24;         // 视口宽（瓦片数）
export const VIEW_H_TILES = 14;         // 视口高（瓦片数）
export const VIEW_W = TILE * VIEW_W_TILES;  // 768
export const VIEW_H = TILE * VIEW_H_TILES;  // 448

// 物理参数（单位：像素 / 帧，60fps 固定步长）
export const GRAVITY = 0.45;
export const MAX_FALL = 10;
export const WALK_ACCEL = 0.18;
export const RUN_ACCEL = 0.28;
export const FRICTION = 0.2;
export const WALK_MAX = 2.4;
export const RUN_MAX = 4.0;
export const JUMP_SPEED = 11.2;         // 可稳定越过四格高水管
export const JUMP_CUT = -4;             // 松开跳跃键时的速度截断（可变跳高）
export const COYOTE_FRAMES = 6;         // 土狼时间
export const JUMP_BUFFER = 6;           // 跳跃预输入缓冲

export const START_TIME = 300;
export const START_LIVES = 3;

export const SCORE = {
  COIN: 200,
  STOMP: 100,
  BRICK: 50,
  MUSHROOM: 1000,
};
