// 入口模块：初始化画布、精灵表、输入，启动固定步长主循环。
import { Game } from './game.js';
import { Input } from './input.js';
import { initSprites } from './sprites.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // 保持像素锐利

initSprites();

const input = new Input();
const game = new Game(ctx, input);
const params = new URLSearchParams(location.search);
game.godMode = params.get('god') === '1';
if (params.get('stage') === '2') {
  game.contra = new (await import('./contra.js')).ContraStage({ godMode:game.godMode });
  game.mode = 'contra';
}
// 直接调试第三关（冒险岛）：?stage=3
if (params.get('stage') === '3') {
  game.startAdventure({ godMode: game.godMode });
}

// 固定步长（60Hz）+ 解耦渲染，保证物理手感与帧率无关
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += now - last;
  last = now;
  if (acc > 250) acc = 250; // 防止切后台后的螺旋追帧
  while (acc >= STEP) {
    game.update();
    acc -= STEP;
  }
  game.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
