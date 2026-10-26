import { VIEW_W, VIEW_H } from './config.js';

// 第一、二关之间的同一世界纵向镜头过渡。
export class Transition {
  constructor(carry) {
    this.carry = carry;
    this.t = 0;
    this.cameraY = 0;
    this.marioScreenY = 255;
    this.hasPistol = false;
    this.done = false;
    this.handoff = null;
  }

  update() {
    if (this.done) return;
    this.t++;
    // 先起跳抬升，再让镜头追上并持续向天空推进。
    if (this.t < 38) this.marioScreenY -= 4.3;
    else this.marioScreenY += (92 - this.marioScreenY) * .08;
    if (this.t > 18) this.cameraY -= Math.min(5.4, 1.5 + (this.t - 18) * .06);
    if (this.t === 48) this.hasPistol = true;
    if (this.t >= 132) {
      this.done = true;
      this.handoff = { ...this.carry, continuous:true, playerScreenY:92 };
    }
  }

  render(ctx, drawMario) {
    const progress = Math.min(1, Math.max(0, (-this.cameraY - 80) / 420));
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, progress < .55 ? '#398cf2' : '#071a35');
    sky.addColorStop(1, progress < .55 ? '#7ec7ff' : '#164b62');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // 第一关山地随镜头向下离场。
    const groundY = 365 - this.cameraY;
    ctx.fillStyle = '#3cb034';
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(150, groundY - 110); ctx.lineTo(310, groundY); ctx.fill();
    ctx.fillStyle = '#c06018'; ctx.fillRect(0, groundY, VIEW_W, VIEW_H - groundY + 20);

    // 上层逐渐出现第二关丛林剪影，形成一个连续空间。
    const jungleY = -310 - this.cameraY;
    ctx.fillStyle = '#173f3b';
    for (let i = -1; i < 7; i++) {
      const x = i * 150;
      ctx.beginPath(); ctx.moveTo(x, jungleY + 290); ctx.lineTo(x + 75, jungleY + 90 + (i % 2) * 45); ctx.lineTo(x + 165, jungleY + 290); ctx.fill();
    }
    ctx.fillStyle = '#4f7b32'; ctx.fillRect(0, jungleY + 350, VIEW_W, 12);
    ctx.fillStyle = '#172b1d'; ctx.fillRect(0, jungleY + 362, VIEW_W, 100);

    ctx.save();
    ctx.translate(VIEW_W * .5, this.marioScreenY);
    const bob = Math.sin(this.t * .35) * 3;
    ctx.translate(0, bob);
    ctx.rotate(Math.sin(this.t * .22) * .04);
    drawMario(ctx, this.hasPistol);
    ctx.restore();

    if (this.t > 40 && this.t < 92) {
      ctx.globalAlpha = Math.min(1, (this.t - 40) / 16) * Math.min(1, (92 - this.t) / 14);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
      ctx.fillText(this.hasPistol ? '武器装配完成' : '飞向下一战区', VIEW_W / 2, 55);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }
}

// 第二关 → 第三关：走进基地大门后的白闪过渡，落到热带岛屿。
export class IslandTransition {
  constructor(carry) {
    this.carry = carry;
    this.t = 0;
    this.done = false;
    this.handoff = null;
  }

  update() {
    if (this.done) return;
    this.t++;
    if (this.t >= 96) {
      this.done = true;
      this.handoff = { ...this.carry, continuous: false };
    }
  }

  render(ctx) {
    const t = this.t;
    ctx.fillStyle = '#02070a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // 白闪：进门瞬间整屏过曝，随后退去露出岛屿
    const flash = t < 10 ? t / 10 : Math.max(0, 1 - (t - 10) / 26);
    const skyProgress = Math.min(1, Math.max(0, (t - 20) / 46));
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#67c8f5');
    g.addColorStop(1, '#f5e4a8');
    ctx.globalAlpha = skyProgress;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;

    // 岛屿剪影自下而上出现
    if (t > 26) {
      const rise = Math.min(1, (t - 26) / 30);
      const baseY = VIEW_H - 70 + (1 - rise) * 120;
      ctx.fillStyle = '#2f7fb8';
      ctx.fillRect(0, baseY + 44, VIEW_W, 26);
      ctx.fillStyle = '#d9b877';
      ctx.beginPath();
      ctx.moveTo(0, baseY + 70);
      ctx.quadraticCurveTo(VIEW_W * 0.5, baseY + 20, VIEW_W, baseY + 70);
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.lineTo(0, VIEW_H);
      ctx.fill();
      ctx.fillStyle = '#2b6b3c';
      for (let i = 0; i < 4; i++) {
        const x = 90 + i * 190;
        ctx.fillRect(x, baseY - 26, 7, 96);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(x + 4, baseY - 26, 34 - k * 7, 10, (k - 1) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (t > 44) {
      const a = Math.min(1, (t - 44) / 14) * Math.min(1, (96 - t) / 14);
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0e2a3d';
      ctx.font = 'bold 30px monospace';
      ctx.fillText('STAGE 3', VIEW_W / 2, VIEW_H / 2 - 16);
      ctx.fillStyle = '#8a4b12';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('ADVENTURE ISLAND', VIEW_W / 2, VIEW_H / 2 + 16);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
}

