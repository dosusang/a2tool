import { ARENA_RADIUS, ORB_TRAVEL_TIME, PREP_DURATION } from '../constants.js';
import { angleForIndex, formatSeconds } from '../utils.js';

const minimapImage = new Image();
minimapImage.src = new URL('../../../map.png', import.meta.url).href;

export function createUI(root, callbacks) {
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <h1>Orb Mechanic Simulator</h1>
    <div class="stat-row"><span>当前视角</span><strong data-role="selected-id">1</strong></div>
    <div class="stat-row"><span>机制状态</span><strong data-role="phase">待命</strong></div>
    <div class="stat-row"><span>下一顺位</span><strong data-role="next-orb">1</strong></div>
    <div class="stat-row"><span>阶段计时</span><strong data-role="time-left">4.0s</strong></div>
    <div class="stat-row"><span>Buff</span><strong data-role="buff" class="status-good">无</strong></div>
    <div class="health-bar"><div class="health-bar-fill" data-role="health-fill"></div></div>
    <div class="stat-row"><span>生命值</span><strong data-role="hp">100 / 100</strong></div>
    <p data-role="message">等待开始</p>
  `;

  const spotlight = document.createElement('div');
  spotlight.className = 'spotlight-banner';
  spotlight.hidden = true;
  spotlight.innerHTML = `
    <span class="spotlight-label">当前吃球</span>
    <strong data-role="spotlight-value">1号</strong>
  `;

  const minimapPanel = document.createElement('div');
  minimapPanel.className = 'minimap-panel';
  minimapPanel.innerHTML = `
    <canvas class="minimap-canvas" width="280" height="280" data-role="minimap"></canvas>
  `;

  const startPanel = document.createElement('div');
  startPanel.className = 'start-panel';
  startPanel.innerHTML = `
    <h2>模式选择</h2>
    <p data-role="mode-desc"></p>
    <div class="button-row">
      <button class="secondary-button" data-role="mode-player">玩家练习</button>
      <button class="secondary-button" data-role="mode-debug">8 AI 演示</button>
    </div>
    <div class="control-group">
      <label class="slider-label" for="reaction-min">AI 最小反应时间 <strong data-role="reaction-min-label">0.10s</strong></label>
      <input id="reaction-min" data-role="reaction-min" type="range" min="0.10" max="0.60" step="0.01" value="0.10" />
    </div>
    <div class="control-group">
      <label class="slider-label" for="reaction-max">AI 最大反应时间 <strong data-role="reaction-max-label">0.60s</strong></label>
      <input id="reaction-max" data-role="reaction-max" type="range" min="0.10" max="0.60" step="0.01" value="0.60" />
    </div>
    <label class="toggle-row">
      <input type="checkbox" data-role="hint-toggle" checked />
      <span>显示小地图 1-8 号点位提醒</span>
    </label>
    <div class="number-grid" data-role="number-grid"></div>
    <div class="button-row">
      <button class="primary-button" data-role="start-button">开始</button>
    </div>
    <p data-role="hint-line"></p>
  `;

  const resultPanel = document.createElement('div');
  resultPanel.className = 'result-panel';
  resultPanel.hidden = true;
  resultPanel.innerHTML = `
    <h2 data-role="result-title">挑战失败</h2>
    <p data-role="result-detail"></p>
    <div class="button-row">
      <button class="primary-button" data-role="retry-button">重新开始</button>
      <button class="secondary-button" data-role="back-button">返回设置</button>
    </div>
  `;

  const tipsPanel = document.createElement('div');
  tipsPanel.className = 'tips-panel';
  tipsPanel.innerHTML = `
    <h3>AION2 侵蚀圣域 1B 吃球机制模拟器</h3>
    <div class="tip-line">核心规则：记住你的编号，机制开始时跑到你对应的扇区，轮到你吃球且球是紫色时尽快吃掉球</div>
    <div class="tip-line">惩罚1：吃1个红球全队扣80%血</div>
    <div class="tip-line">惩罚2：任意一个球到达边缘则团灭</div>
  `;

  const mobileBlocker = document.createElement('div');
  mobileBlocker.className = 'mobile-blocker';
  mobileBlocker.innerHTML = `
    <div class="mobile-blocker-card">
      <strong>请用 PC 打开网页</strong>
      <span>当前版本仅适配键鼠操作。为了保证视角、移动和机制练习体验，请在电脑浏览器中打开。</span>
    </div>
  `;

  root.append(hud, spotlight, minimapPanel, startPanel, resultPanel, tipsPanel, mobileBlocker);

  const numberGrid = startPanel.querySelector('[data-role="number-grid"]');
  for (let i = 1; i <= 8; i += 1) {
    const button = document.createElement('button');
    button.className = 'number-button';
    button.textContent = `${i}`;
    button.addEventListener('click', () => callbacks.onSelect(i));
    numberGrid.append(button);
  }

  const reactionMin = startPanel.querySelector('[data-role="reaction-min"]');
  const reactionMax = startPanel.querySelector('[data-role="reaction-max"]');
  const hintToggle = startPanel.querySelector('[data-role="hint-toggle"]');

  reactionMin.addEventListener('input', () => callbacks.onSetReactionRange(Number(reactionMin.value), null));
  reactionMax.addEventListener('input', () => callbacks.onSetReactionRange(null, Number(reactionMax.value)));
  hintToggle.addEventListener('change', () => callbacks.onSetMinimapHints(hintToggle.checked));

  startPanel.querySelector('[data-role="mode-player"]').addEventListener('click', () => callbacks.onSetMode(false));
  startPanel.querySelector('[data-role="mode-debug"]').addEventListener('click', () => callbacks.onSetMode(true));
  startPanel.querySelector('[data-role="start-button"]').addEventListener('click', callbacks.onStart);
  resultPanel.querySelector('[data-role="retry-button"]').addEventListener('click', callbacks.onRetry);
  resultPanel.querySelector('[data-role="back-button"]').addEventListener('click', callbacks.onBackToSetup);

  return {
    hud,
    spotlight,
    startPanel,
    resultPanel,
    minimap: minimapPanel.querySelector('[data-role="minimap"]'),
    numberButtons: [...numberGrid.querySelectorAll('.number-button')],
    fields: {
      selectedId: hud.querySelector('[data-role="selected-id"]'),
      phase: hud.querySelector('[data-role="phase"]'),
      nextOrb: hud.querySelector('[data-role="next-orb"]'),
      timeLeft: hud.querySelector('[data-role="time-left"]'),
      buff: hud.querySelector('[data-role="buff"]'),
      hp: hud.querySelector('[data-role="hp"]'),
      healthFill: hud.querySelector('[data-role="health-fill"]'),
      message: hud.querySelector('[data-role="message"]'),
      resultTitle: resultPanel.querySelector('[data-role="result-title"]'),
      resultDetail: resultPanel.querySelector('[data-role="result-detail"]'),
      modeDesc: startPanel.querySelector('[data-role="mode-desc"]'),
      hintLine: startPanel.querySelector('[data-role="hint-line"]'),
      modePlayer: startPanel.querySelector('[data-role="mode-player"]'),
      modeDebug: startPanel.querySelector('[data-role="mode-debug"]'),
      reactionMin,
      reactionMax,
      hintToggle,
      reactionMinLabel: startPanel.querySelector('[data-role="reaction-min-label"]'),
      reactionMaxLabel: startPanel.querySelector('[data-role="reaction-max-label"]'),
      spotlightValue: spotlight.querySelector('[data-role="spotlight-value"]'),
    },
    render(state, localPlayer, viewDirection, bossPosition) {
      this.numberButtons.forEach((button, idx) => {
        const active = idx + 1 === state.selectedPlayerId;
        button.classList.toggle('active', active);
        button.disabled = state.debugAutoplayAll;
      });

      this.fields.modePlayer.classList.toggle('active', !state.debugAutoplayAll);
      this.fields.modeDebug.classList.toggle('active', state.debugAutoplayAll);
      this.fields.reactionMin.value = state.aiReactionMin.toFixed(2);
      this.fields.reactionMax.value = state.aiReactionMax.toFixed(2);
      this.fields.hintToggle.checked = state.showMinimapHints;
      this.fields.reactionMinLabel.textContent = `${state.aiReactionMin.toFixed(2)}s`;
      this.fields.reactionMaxLabel.textContent = `${state.aiReactionMax.toFixed(2)}s`;

      this.fields.modeDesc.textContent = state.debugAutoplayAll
        ? '8 AI 演示模式：自动跑完整套机制，方便你观察正确处理。'
        : '玩家练习模式：选择你的编号，自己跑位并处理球。';
      this.fields.hintLine.textContent = state.debugAutoplayAll
        ? '演示模式结束后可点击“重新开始”继续下一轮。'
        : '玩家模式支持空格快速重开，也可以点按钮重新开始。';

      this.fields.selectedId.textContent = state.debugAutoplayAll ? 'AI-1' : `${state.selectedPlayerId}`;
      this.fields.phase.textContent = phaseLabel(state.phase, state.time);
      this.fields.nextOrb.textContent = `${Math.min(state.nextRequiredOrb, 8)}`;
      this.fields.timeLeft.textContent = currentTimerLabel(state);
      this.fields.hp.textContent = `${Math.max(0, Math.round(localPlayer.hp))} / 100`;
      this.fields.message.textContent = state.message;

      const hpPct = Math.max(0, localPlayer.hp) / 100;
      this.fields.healthFill.style.width = `${hpPct * 100}%`;
      this.fields.healthFill.classList.toggle('low', hpPct <= 0.3);

      if (!localPlayer.alive) {
        this.fields.buff.textContent = '阵亡';
        this.fields.buff.className = 'status-bad';
      } else if (localPlayer.buffTimer > 0) {
        this.fields.buff.textContent = `剩余 ${formatSeconds(localPlayer.buffTimer)}`;
        this.fields.buff.className = 'status-buff';
      } else {
        this.fields.buff.textContent = '无';
        this.fields.buff.className = 'status-good';
      }

      const showSpotlight = state.phase === 'running' && state.time >= PREP_DURATION && state.nextRequiredOrb <= 8;
      this.spotlight.hidden = !showSpotlight;
      this.fields.spotlightValue.textContent = `${Math.min(state.nextRequiredOrb, 8)}号`;

      this.startPanel.hidden = state.phase !== 'idle';
      this.resultPanel.hidden = !(state.phase === 'success' || state.phase === 'failure');

      if (state.result) {
        this.fields.resultTitle.textContent = state.result.title;
        this.fields.resultDetail.textContent = state.result.detail;
      }

      drawMinimap(this.minimap, state.players, localPlayer, viewDirection, state.showMinimapHints, bossPosition);
    },
  };
}

function phaseLabel(phase, time) {
  if (phase === 'running' && time < PREP_DURATION) {
    return '跑位中';
  }
  switch (phase) {
    case 'idle':
      return '待命';
    case 'running':
      return '放球中';
    case 'success':
      return '成功';
    case 'failure':
      return '失败';
    default:
      return phase;
  }
}

function currentTimerLabel(state) {
  if (state.phase !== 'running') {
    return formatSeconds(PREP_DURATION);
  }
  if (state.time < PREP_DURATION) {
    return formatSeconds(PREP_DURATION - state.time);
  }
  return formatSeconds(ORB_TRAVEL_TIME - (state.time - PREP_DURATION));
}

function drawMinimap(canvas, players, localPlayer, viewDirection, showHints, bossPosition) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = size * 0.43;
  const playfieldRadius = radius * 0.56;
  const scale = playfieldRadius / ARENA_RADIUS;

  ctx.clearRect(0, 0, size, size);
  drawMinimapBackdrop(ctx, size, center, radius);

  if (showHints) {
    drawHintMarkers(ctx, center, playfieldRadius);
  }

  if (bossPosition) {
    drawBossMarker(ctx, center + bossPosition.x * scale, center + bossPosition.z * scale, 7.5);
  }

  players.forEach((player) => {
    const x = center + player.position.x * scale;
    const y = center + player.position.z * scale;
    ctx.fillStyle = player.id === localPlayer.id ? '#485cff' : '#9fdff0';
    ctx.beginPath();
    ctx.arc(x, y, player.id === localPlayer.id ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const px = center + localPlayer.position.x * scale;
  const py = center + localPlayer.position.z * scale;
  if (viewDirection && viewDirection.lengthSq() > 0.0001) {
    const viewAngle = Math.atan2(viewDirection.z, viewDirection.x);
    const fov = (80 * Math.PI) / 180;
    const viewRadius = 88;
    const gradient = ctx.createRadialGradient(px, py, 8, px, py, viewRadius);
    gradient.addColorStop(0, 'rgba(255, 244, 152, 0.42)');
    gradient.addColorStop(0.58, 'rgba(255, 213, 79, 0.24)');
    gradient.addColorStop(1, 'rgba(255, 193, 7, 0.06)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, viewRadius, viewAngle - fov / 2, viewAngle + fov / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBossMarker(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(-size * 0.9, -size * 0.7);
  ctx.lineTo(size * 0.9, -size * 0.7);
  ctx.closePath();
  ctx.fillStyle = '#5b4a18';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, size * 0.58);
  ctx.lineTo(-size * 0.56, -size * 0.32);
  ctx.lineTo(size * 0.56, -size * 0.32);
  ctx.closePath();
  ctx.fillStyle = '#f0b93d';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 238, 188, 0.9)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();
}

function drawMinimapBackdrop(ctx, size, center, radius) {
  ctx.fillStyle = '#0b120f';
  ctx.fillRect(0, 0, size, size);

  if (minimapImage.complete && minimapImage.naturalWidth > 0) {
    const scale = Math.min(size / minimapImage.naturalWidth, size / minimapImage.naturalHeight);
    const drawWidth = minimapImage.naturalWidth * scale;
    const drawHeight = minimapImage.naturalHeight * scale;
    const offsetX = (size - drawWidth) * 0.5;
    const offsetY = (size - drawHeight) * 0.5;
    ctx.drawImage(minimapImage, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    ctx.fillStyle = '#223538';
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(34, 59, 63, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.98, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHintMarkers(ctx, center, playfieldRadius) {
  const markerRadius = playfieldRadius * 0.94;
  ctx.font = 'bold 12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let idx = 0; idx < 8; idx += 1) {
    const angle = angleForIndex(idx);
    const x = center + Math.cos(angle) * markerRadius;
    const y = center + Math.sin(angle) * markerRadius;

    ctx.fillStyle = 'rgba(12, 22, 36, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 226, 122, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffe99a';
    ctx.fillText(String(idx + 1), x, y + 0.5);
  }
}
