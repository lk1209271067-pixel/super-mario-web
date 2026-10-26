// 键盘输入模块：方向、跳跃（含按下沿检测）、加速、重开
export const INPUT_KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  KeyC: 'shoot',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.jump = false;
    this.run = false;
    this.shoot = false;
    this.up = false;
    this.down = false;
    this.jumpPressed = false;   // 本帧刚按下跳跃（边沿）
    this.restartPressed = false;

    const keymap = INPUT_KEYMAP;

    addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') { this.restartPressed = true; return; }
      const k = keymap[e.code];
      if (!k) return;
      e.preventDefault();
      if (k === 'jump' && !this.jump && !e.repeat) this.jumpPressed = true;
      this[k] = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.up = true;
    });

    addEventListener('keyup', (e) => {
      const k = keymap[e.code];
      if (!k) return;
      e.preventDefault();
      this[k] = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.up = false;
    });
  }

  // 每帧末尾调用，清除边沿状态
  postUpdate() {
    this.jumpPressed = false;
    this.restartPressed = false;
  }
}
