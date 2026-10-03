import { brownianPaths, discreteMoments, gaussianDensity, moments, secantSlope } from './math.js';
import { escapeHtml, icon } from './icons.js';

const PALETTE = ['#c6d9a6', '#aba6d6', '#91bbbc', '#dab18e', '#c7bfad', '#93aba1'];
const format = (value, digits = 2) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const rangeControl = (name, label, min, max, step, value) => `<label class="range-control"><span>${label}<output data-output="${name}">${format(value)}</output></span><input aria-label="${label}" type="range" data-param="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;

export class ConceptLab {
  constructor(host, chapter, onPrediction, courseId = null) {
    this.host = host;
    this.chapter = chapter;
    this.onPrediction = onPrediction;
    this.courseId = courseId;
    this.params = { sigma: 0.8, mu: 0, horizon: 2, count: 24, x: 1, h: 1, rho: 0, w0: 1, w1: 1, w2: 1 };
    this.seed = 42;
    this.progress = 1;
    this.playing = false;
    this.speed = 1;
    this.comparison = false;
    this.mode = 'paths';
    this.angle = -0.55;
    this.tilt = 0.65;
    this.predicted = false;
    this.disposed = false;
    this.abort = new AbortController();
    this.mount();
  }

  mount() {
    const { lab, prediction } = this.chapter;
    let controls = '';
    if (lab.kind === 'brownian') controls = rangeControl('sigma', 'Amplitude σ', 0, 2, 0.05, 0.8) + rangeControl('mu', 'Dérive μ', -1, 1, 0.05, 0) + rangeControl('horizon', 'Horizon T', 0.5, 5, 0.5, 2) + rangeControl('count', 'Trajectoires', 4, 64, 4, 24);
    if (lab.kind === 'expectation') controls = [-2, 1, 5].map((outcome, index) => rangeControl(`w${index}`, `Poids de l’issue ${outcome}`, 0, 10, 0.25, 1)).join('');
    if (lab.kind === 'derivative') controls = rangeControl('x', 'Point x', -2, 2, 0.1, 1) + rangeControl('h', 'Écart h', 0.01, 2, 0.01, 1);
    if (lab.kind === 'surface') controls = rangeControl('rho', 'Corrélation ρ', -0.9, 0.9, 0.05, 0);
    const isTimed = lab.kind === 'brownian';
    this.host.innerHTML = `<div class="lab-heading"><div class="eyebrow"><span class="live-dot"></span> LABORATOIRE INTERACTIF</div><div class="lab-heading-row"><h2>${escapeHtml(lab.title)}</h2><button class="icon-button" data-action="focus" aria-label="Agrandir le laboratoire" title="Agrandir le laboratoire">${icon('expand')}</button></div><p>${escapeHtml(lab.description)}</p></div>
      <div class="experiment"><div class="plot-topline">${isTimed ? '<div class="segmented"><button class="selected" data-mode="paths">Trajectoires</button><button data-mode="distribution">Distribution</button></div>' : `<span class="plot-label">${{ expectation: 'Une moyenne pondérée', derivative: 'f(x) = x²', surface: 'Densité normale bivariée', custom: 'Expérience du cours' }[lab.kind]}</span>`}<span class="plot-meta">${lab.kind === 'surface' ? 'Glisser pour tourner' : isTimed ? 'Graine <span data-seed>42</span>' : 'Manipulation en direct'}</span></div>
      <div class="canvas-wrap">${lab.kind === 'custom' ? '<iframe class="custom-lab" sandbox="allow-scripts" title="Expérience interactive isolée" referrerpolicy="no-referrer"></iframe>' : `<canvas role="img" aria-label="${escapeHtml(lab.title)}"></canvas>`}</div>
      <div class="plot-legend" data-legend></div>
      <div class="playback">${isTimed ? `<button class="play-button" data-action="play">${icon('play')}<span>Lancer</span></button><button class="icon-button" data-action="reset" aria-label="Revenir au début">${icon('reset')}</button><input type="range" min="0" max="1" step="0.005" value="1" aria-label="Instant de la simulation" data-timeline><span class="time-label" data-time>2,00 s</span><button class="speed-button" data-action="speed" aria-label="Vitesse de lecture">1×</button>` : `<span class="subtle">${lab.kind === 'surface' ? 'Vue 3D · projection interactive' : lab.kind === 'custom' ? 'Contenu généré · à vérifier' : 'Modifie un paramètre pour explorer'}</span><button class="text-button" data-action="reset">${icon('reset')} Réinitialiser</button>`}</div>
      <div class="parameters">${controls}</div>
      ${isTimed ? `<div class="experiment-options"><label class="checkbox"><input type="checkbox" data-compare> Comparer avec σ × 2</label><button class="text-button" data-action="seed">Nouveaux chemins ${icon('arrow')}</button></div>` : ''}
      <div class="lab-stats" aria-live="polite" data-stats></div></div>
      <details class="prediction-card"><summary class="prediction-label">${icon('spark')} À ton avis <span>Faire une prédiction</span></summary><p>${escapeHtml(prediction.question)}</p><div class="prediction-choices">${prediction.choices.map((choice, index) => `<button data-choice="${index}">${escapeHtml(choice)}</button>`).join('')}</div><div class="prediction-result" aria-live="polite"></div><button class="free-explore text-button" data-action="free">Explorer librement ${icon('arrow')}</button></details>
      <div class="lab-footnote">${icon('eye')} Change une chose à la fois. Observe. Puis explique pourquoi.</div>`;
    this.canvas = this.host.querySelector('canvas');
    if (lab.kind === 'custom') this.mountCustom(lab.html);
    this.host.addEventListener('input', event => this.handleInput(event), { signal: this.abort.signal });
    this.host.addEventListener('click', event => this.handleClick(event), { signal: this.abort.signal });
    if (this.canvas) {
      this.context = this.canvas.getContext('2d');
      this.resizeObserver = new ResizeObserver(() => this.render());
      this.resizeObserver.observe(this.canvas.parentElement);
      let drag = null;
      this.canvas.addEventListener('pointerdown', event => {
        if (lab.kind !== 'surface') return;
        drag = { x: event.clientX, y: event.clientY };
        this.canvas.setPointerCapture(event.pointerId);
      }, { signal: this.abort.signal });
      this.canvas.addEventListener('pointermove', event => {
        if (!drag) return;
        this.angle += (event.clientX - drag.x) * 0.008;
        this.tilt = Math.min(1.3, Math.max(0.15, this.tilt + (event.clientY - drag.y) * 0.005));
        drag = { x: event.clientX, y: event.clientY };
        this.render();
      }, { signal: this.abort.signal });
      this.canvas.addEventListener('pointerup', () => { drag = null; }, { signal: this.abort.signal });
      this.canvas.addEventListener('pointercancel', () => { drag = null; }, { signal: this.abort.signal });
      if (lab.kind === 'surface') {
        this.canvas.tabIndex = 0;
        this.canvas.setAttribute('aria-label', 'Surface de densité. Utilise les flèches du clavier ou fais glisser pour tourner.');
        this.canvas.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          this.angle += event.key === 'ArrowLeft' ? -0.12 : event.key === 'ArrowRight' ? 0.12 : 0;
          this.tilt = Math.min(1.3, Math.max(0.15, this.tilt + (event.key === 'ArrowDown' ? 0.08 : event.key === 'ArrowUp' ? -0.08 : 0)));
          this.render();
        }, { signal: this.abort.signal });
      }
    }
    this.recompute();
  }

  mountCustom(html) {
    if (this.courseId) {
      this.frameUrl = `/api/courses/${encodeURIComponent(this.courseId)}/labs/${encodeURIComponent(this.chapter.id)}`;
      this.host.querySelector('iframe').src = this.frameUrl;
      return;
    }
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll('meta[http-equiv], base, iframe, frame, object, embed').forEach(element => element.remove());
    const policy = document.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'";
    document.head.prepend(policy);
    const style = document.createElement('style');
    style.textContent = 'html{color-scheme:dark}body{margin:16px;background:#151718;color:#e7e7e2;font:14px system-ui}canvas,svg{max-width:100%}';
    document.head.append(style);
    // Blob frame: opaque sandbox origin, and its own restrictive CSP.
    this.frameUrl = URL.createObjectURL(new Blob(['<!doctype html>' + document.documentElement.outerHTML], { type: 'text/html' }));
    this.host.querySelector('iframe').src = this.frameUrl;
  }

  handleInput(event) {
    const control = event.target;
    if (control.dataset.param) {
      this.params[control.dataset.param] = Number(control.value);
      this.host.querySelector(`[data-output="${control.dataset.param}"]`).textContent = format(Number(control.value), control.dataset.param === 'count' ? 0 : 2);
      this.recompute();
    }
    if (control.hasAttribute('data-timeline')) {
      this.progress = Number(control.value);
      this.render();
    }
    if (control.hasAttribute('data-compare')) {
      this.comparison = control.checked;
      this.recompute();
    }
  }

  async handleClick(event) {
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      const answer = Number(choice.dataset.choice);
      const correct = answer === this.chapter.prediction.answer;
      this.predicted = true;
      this.host.querySelectorAll('[data-choice]').forEach(button => button.classList.toggle('chosen', button === choice));
      const result = this.host.querySelector('.prediction-result');
      result.textContent = `${correct ? 'Exact. ' : 'À observer : '}${this.chapter.prediction.explanation}`;
      result.classList.toggle('correct', correct);
      await this.onPrediction(this.chapter.prediction.choices[answer]);
    }
    const mode = event.target.closest('[data-mode]');
    if (mode) {
      this.mode = mode.dataset.mode;
      this.host.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('selected', button === mode));
      this.render();
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'focus') document.querySelector('.reader').classList.toggle('lab-focus');
    if (action === 'free') {
      this.predicted = true;
      this.host.querySelector('.free-explore').textContent = 'Exploration libre activée';
    }
    if (action === 'play') {
      if (!this.predicted) {
        const card = this.host.querySelector('.prediction-card');
        card.open = true;
        card.classList.add('attention');
        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        this.host.querySelector('[data-choice]').focus({ preventScroll: true });
        return;
      }
      this.playing = !this.playing;
      if (this.playing) {
        if (this.progress >= 1) this.progress = 0;
        this.lastFrame = performance.now();
        this.frame = requestAnimationFrame(time => this.animate(time));
      }
      this.updatePlayButton();
    }
    if (action === 'speed') {
      const speeds = [0.25, 0.5, 1, 2, 4];
      this.speed = speeds[(speeds.indexOf(this.speed) + 1) % speeds.length];
      this.host.querySelector('[data-action="speed"]').textContent = `${this.speed}×`;
    }
    if (action === 'seed') { this.seed++; this.recompute(); }
    if (action === 'reset') {
      this.playing = false;
      if (this.chapter.lab.kind === 'brownian') this.progress = 0;
      else {
        Object.assign(this.params, { x: 1, h: 1, rho: 0, w0: 1, w1: 1, w2: 1 });
        this.angle = -0.55; this.tilt = 0.65;
        this.host.querySelectorAll('[data-param]').forEach(control => {
          control.value = this.params[control.dataset.param];
          this.host.querySelector(`[data-output="${control.dataset.param}"]`).textContent = format(Number(control.value));
        });
        if (this.chapter.lab.kind === 'custom') this.host.querySelector('iframe').src = this.frameUrl;
      }
      this.updatePlayButton();
      this.recompute();
    }
  }

  updatePlayButton() {
    const button = this.host.querySelector('[data-action="play"]');
    if (button) button.innerHTML = `${icon(this.playing ? 'pause' : 'play')}<span>${this.playing ? 'Pause' : this.progress === 0 ? 'Lancer' : 'Reprendre'}</span>`;
  }

  recompute() {
    if (this.chapter.lab.kind === 'brownian') {
      this.paths = brownianPaths({ ...this.params, seed: this.seed });
      this.host.querySelector('[data-seed]').textContent = this.seed;
    }
    this.render();
  }

  animate(time) {
    if (!this.playing || this.disposed) return;
    this.progress = Math.min(1, this.progress + Math.min(100, time - this.lastFrame) / 6500 * this.speed);
    this.lastFrame = time;
    this.render();
    if (this.progress >= 1) { this.playing = false; this.updatePlayButton(); }
    else this.frame = requestAnimationFrame(next => this.animate(next));
  }

  render() {
    if (!this.canvas || this.disposed) return;
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(260, bounds.width);
    this.height = Math.max(220, bounds.height);
    const scale = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * scale);
    this.canvas.height = Math.round(this.height * scale);
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.font = '11px "Segoe UI", sans-serif';
    this.context.lineJoin = 'round';
    const renderers = { brownian: () => this.drawBrownian(), expectation: () => this.drawExpectation(), derivative: () => this.drawDerivative(), surface: () => this.drawSurface() };
    renderers[this.chapter.lab.kind]?.();
  }

  axes(xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const context = this.context, left = 46, right = this.width - 26, top = 30, bottom = this.height - 40;
    const x = value => left + (value - xMin) / (xMax - xMin) * (right - left);
    const y = value => bottom - (value - yMin) / (yMax - yMin) * (bottom - top);
    context.lineWidth = 1;
    for (let index = 0; index <= 4; index++) {
      const horizontal = top + (bottom - top) * index / 4;
      const vertical = left + (right - left) * index / 4;
      context.strokeStyle = '#ffffff09';
      context.beginPath(); context.moveTo(left, horizontal); context.lineTo(right, horizontal); context.stroke();
      context.beginPath(); context.moveTo(vertical, top); context.lineTo(vertical, bottom); context.stroke();
      context.fillStyle = '#858b86'; context.textAlign = 'right';
      context.fillText(format(yMax - (yMax - yMin) * index / 4, 1), left - 12, horizontal + 4);
      context.textAlign = 'center'; context.fillText(format(xMin + (xMax - xMin) * index / 4, 1), vertical, bottom + 22);
    }
    context.fillStyle = '#9b9e96'; context.textAlign = 'left'; context.fillText(yLabel, left, 16);
    context.textAlign = 'right'; context.fillText(xLabel, right, this.height - 3);
    return { x, y, left, right, top, bottom };
  }

  line(points, color, width = 1.5, dash = []) {
    const context = this.context;
    context.strokeStyle = color; context.lineWidth = width; context.setLineDash(dash);
    context.beginPath(); points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y)); context.stroke();
    context.setLineDash([]);
  }

  stats(entries) {
    this.host.querySelector('[data-stats]').innerHTML = entries.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  legend(entries) {
    this.host.querySelector('[data-legend]').innerHTML = entries.map(([color, label]) => `<span><i style="background:${color}"></i>${escapeHtml(label)}</span>`).join('');
  }

  drawBrownian() {
    if (!this.paths) return;
    const { horizon, sigma, mu } = this.params;
    const step = Math.round(240 * this.progress), elapsed = horizon * step / 240;
    const observations = this.paths.map(path => path[step]);
    const bounds = Math.max(1, sigma * Math.sqrt(horizon) * (this.comparison ? 6 : 3), ...this.paths.flat().map(Math.abs)) + Math.abs(mu * horizon);
    if (this.mode === 'distribution') this.drawDistribution(observations, elapsed, bounds);
    else {
      const { x, y } = this.axes(0, horizon, -bounds, bounds, 'Temps t', 'Position Xₜ');
      const context = this.context;
      context.beginPath();
      for (let index = 0; index <= step; index++) {
        const t = index / 240 * horizon;
        if (!index) context.moveTo(x(t), y(mu * t + sigma * Math.sqrt(t)));
        else context.lineTo(x(t), y(mu * t + sigma * Math.sqrt(t)));
      }
      for (let index = step; index >= 0; index--) { const t = index / 240 * horizon; context.lineTo(x(t), y(mu * t - sigma * Math.sqrt(t))); }
      context.closePath(); context.fillStyle = '#c6d9a60a'; context.fill();
      this.paths.forEach((path, pathIndex) => {
        const points = path.slice(0, step + 1).map((value, index) => [x(index / 240 * horizon), y(value)]);
        this.line(points, PALETTE[pathIndex % PALETTE.length] + (pathIndex === 0 ? 'ff' : '64'), pathIndex === 0 ? 2.4 : 1);
        if (this.comparison && pathIndex < 8) this.line(path.slice(0, step + 1).map((value, index) => [x(index / 240 * horizon), y(2 * value - mu * index / 240 * horizon)]), '#dfb58b77', 1, [3, 4]);
      });
      this.line([[x(0), y(0)], [x(elapsed), y(mu * elapsed)]], '#e6e9df99', 1, [5, 5]);
      context.beginPath(); context.arc(x(elapsed), y(this.paths[0][step]), 4, 0, 2 * Math.PI); context.fillStyle = PALETTE[0]; context.fill();
    }
    this.legend([[PALETTE[0], 'Trajectoires simulées'], ['#dedfd5', 'Moyenne théorique'], ...(this.comparison ? [['#dfb58b', 'Même hasard, σ × 2']] : [])]);
    this.stats([['Espérance μt', format(mu * elapsed)], ['Variance σ²t', format(sigma ** 2 * elapsed)], ['Moyenne observée', format(moments(observations).mean)]]);
    this.host.querySelector('[data-time]').textContent = `${format(elapsed)} s`;
    this.host.querySelector('[data-timeline]').value = this.progress;
  }

  drawDistribution(observations, elapsed, bound) {
    const bins = Array(16).fill(0), width = 2 * bound / bins.length;
    observations.forEach(value => { bins[Math.max(0, Math.min(bins.length - 1, Math.floor((value + bound) / width)))]++; });
    const densities = bins.map(count => count / observations.length / width);
    const deviation = this.params.sigma * Math.sqrt(elapsed);
    const peak = deviation > 0.02 ? 1 / (Math.sqrt(2 * Math.PI) * deviation) : 0;
    const { x, y, bottom } = this.axes(-bound, bound, 0, Math.max(0.5, ...densities, peak) * 1.1, 'Position Xₜ', 'Densité');
    bins.forEach((_, index) => {
      this.context.fillStyle = '#c6d9a678';
      this.context.fillRect(x(-bound + index * width) + 2, y(densities[index]), Math.max(1, x(width) - x(0) - 4), bottom - y(densities[index]));
    });
    if (deviation > 0.02) this.line(Array.from({ length: 201 }, (_, index) => {
      const value = -bound + 2 * bound * index / 200;
      return [x(value), y(peak * Math.exp(-0.5 * ((value - this.params.mu * elapsed) / deviation) ** 2))];
    }), '#dedfd5', 1.5, [4, 4]);
  }

  drawExpectation() {
    const distribution = discreteMoments([this.params.w0, this.params.w1, this.params.w2]);
    if (!distribution) {
      this.context.fillStyle = PALETTE[0]; this.context.textAlign = 'center';
      this.context.fillText('Donne un poids positif à au moins une issue.', this.width / 2, this.height / 2);
      this.stats([['Espérance', '—'], ['Variance', '—'], ['Probabilités', 'Indéfinies']]); return;
    }
    const { x, y, bottom } = this.axes(-3, 6, 0, 1, 'Issue X', 'Probabilité');
    [-2, 1, 5].forEach((outcome, index) => {
      const height = distribution.probabilities[index];
      this.context.fillStyle = PALETTE[index] + '70';
      this.context.fillRect(x(outcome) - 22, y(height), 44, bottom - y(height));
      this.line([[x(outcome) - 22, y(height)], [x(outcome) + 22, y(height)]], PALETTE[index], 2);
      this.context.fillStyle = PALETTE[index]; this.context.textAlign = 'center';
      this.context.fillText(`${format(height * 100, 0)} %`, x(outcome), y(height) - 12);
    });
    this.line([[x(distribution.mean), y(0)], [x(distribution.mean), y(1)]], '#ebe8df', 1.5, [5, 5]);
    this.legend([[PALETTE[0], 'Poids normalisés'], ['#ebe8df', 'Centre de gravité E[X]']]);
    this.stats([['Espérance E[X]', format(distribution.mean)], ['Variance', format(distribution.variance)], ['Σ probabilités', '100 %']]);
  }

  drawDerivative() {
    const point = this.params.x, step = this.params.h;
    const { x, y, left, right, top, bottom } = this.axes(-3, 4, -1, 12, 'Position x', 'Valeur f(x)');
    this.context.save(); this.context.beginPath(); this.context.rect(left, top, right - left, bottom - top); this.context.clip();
    this.line(Array.from({ length: 160 }, (_, index) => { const value = -3 + index * 7 / 159; return [x(value), y(value ** 2)]; }), PALETTE[0], 2.5);
    const slope = secantSlope(point, step);
    this.line([[-3, point ** 2 + (-3 - point) * 2 * point], [4, point ** 2 + (4 - point) * 2 * point]].map(([a, b]) => [x(a), y(b)]), PALETTE[1], 1.6, [5, 5]);
    this.line([[-3, point ** 2 + (-3 - point) * slope], [4, point ** 2 + (4 - point) * slope]].map(([a, b]) => [x(a), y(b)]), PALETTE[3], 1.8);
    this.line([[x(point), y(point ** 2)], [x(point + step), y(point ** 2)], [x(point + step), y((point + step) ** 2)]], '#ffffff44', 1, [3, 3]);
    [point, point + step].forEach(value => { this.context.beginPath(); this.context.arc(x(value), y(value ** 2), 5, 0, Math.PI * 2); this.context.fillStyle = '#ecebe1'; this.context.fill(); });
    this.context.restore();
    this.legend([[PALETTE[0], 'f(x) = x²'], [PALETTE[3], 'Sécante'], [PALETTE[1], 'Tangente']]);
    this.stats([['Pente moyenne', format(slope)], ['Dérivée 2x', format(2 * point)], ['Écart des pentes', format(step)]]);
  }

  drawSurface() {
    const rho = this.params.rho, context = this.context;
    const scale = Math.min(this.width / 8.5, this.height / 6.2);
    const project = (x, y, z) => {
      const horizontal = x * Math.cos(this.angle) - y * Math.sin(this.angle);
      const depth = x * Math.sin(this.angle) + y * Math.cos(this.angle);
      return [this.width / 2 + horizontal * scale, this.height * 0.61 + depth * Math.sin(this.tilt) * scale - z * 10 * Math.cos(this.tilt) * scale, depth];
    };
    for (let line = -3; line <= 3; line++) {
      this.line([project(line, -3, 0), project(line, 3, 0)], '#ffffff10', 1);
      this.line([project(-3, line, 0), project(3, line, 0)], '#ffffff10', 1);
    }
    const cells = [], steps = 32;
    for (let row = 0; row < steps; row++) for (let column = 0; column < steps; column++) {
      const x = -3 + column * 6 / steps, y = -3 + row * 6 / steps, delta = 6 / steps;
      const corners = [[x, y], [x + delta, y], [x + delta, y + delta], [x, y + delta]].map(([a, b]) => project(a, b, gaussianDensity(a, b, rho)));
      cells.push({ corners, depth: corners.reduce((sum, point) => sum + point[2], 0) / 4, density: gaussianDensity(x + delta / 2, y + delta / 2, rho) });
    }
    cells.sort((a, b) => a.depth - b.depth);
    for (const cell of cells) {
      const intensity = Math.min(1, cell.density / gaussianDensity(0, 0, rho));
      context.beginPath(); cell.corners.forEach((point, index) => index ? context.lineTo(point[0], point[1]) : context.moveTo(point[0], point[1])); context.closePath();
      context.fillStyle = `hsl(${150 - intensity * 55} ${18 + intensity * 8}% ${20 + intensity * 40}%)`; context.fill();
      context.strokeStyle = '#c8dcab42'; context.lineWidth = 0.55; context.stroke();
    }
    [['x', 3.6, 0], ['y', 0, 3.6]].forEach(([label, a, b]) => { const point = project(a, b, 0); context.fillStyle = '#c8c8bf'; context.textAlign = 'center'; context.fillText(label, point[0], point[1]); });
    this.legend([[PALETTE[0], 'Hauteur = densité'], ['#aba6d6', 'Aire sous la surface = 1']]);
    this.stats([['Corrélation ρ', format(rho)], ['Densité à l’origine', format(gaussianDensity(0, 0, rho), 3)], ['Var((X + Y) / 2)', format((1 + rho) / 2)]]);
  }

  dispose() {
    this.disposed = true;
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.abort.abort();
    if (this.frameUrl) URL.revokeObjectURL(this.frameUrl);
  }
}

