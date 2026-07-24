const GRAPH_CONST = {
 AREA: { left: 60, right: 25, top: 35, bottom: 25 },
 MIN_GRID_SPACING_PX: 60, MIN_GRID_SPACING_PY: 40,
 MARKER_DOT_RADIUS: 3, MARKER_SEL_DOT_RADIUS: 4, CURSOR_DOT_RADIUS: 3,
 TRACE_LIVE_LINE: 1, TRACE_STORED_LINE: 1,
 TOOLTIP_WIDTH: 220, TOOLTIP_PADDING: 7, TOOLTIP_LINE_HEIGHT: 15, TOOLTIP_OFFSET: 15,
 MARKER_DASH: [4, 4], CURSOR_DASH: [5, 5], GRID_DASH: [3, 3],
 ZOOM_IN_FACTOR: 0.95, ZOOM_OUT_FACTOR: 1.05,
 MARKER_PICKUP_RADIUS: 16
};

const CSS_COLORS = {
  '--bg': '#0a0a0f', '--plot-grid': '#444444', '--plot-border': '#666666',
  '--plot-axis-text': '#aaaaaa', '--marker-active': '#ff3333', '--marker-inactive': '#666666',
  '--marker-label': '#ffffff', '--cursor-line': 'rgba(255,255,255,0.3)',
  '--tooltip-bg': 'rgba(30,30,40,0.95)', '--tooltip-border': '#666666', '--tooltip-text': '#ffffff',
  '--overlay-bg': 'rgba(255,100,100,0.2)', '--overlay-text': '#ffffff'
};
const CSS_COLOR_VARS = Object.keys(CSS_COLORS);


// Area class, render data in selected area dependfrom rypa and scale
class Area {
constructor(region) {
  this.region = region;
  this.trace = { type: 'LOGMAG', channels: ['S11', 'S21'] };
  this.view = { xMin: 0, xMax: 1000, yMin: -60, yMax: 0 };
  this.cachedPoints = this._createEmptyCache();
}

_createEmptyCache() {
  const cache = [];
  for (let i = 0; i < 5; i++) cache[i] = {};
  return cache;
}

updateBounds(totalWidth, totalHeight) {
  const { left: padLeft, right: padRight, top: padTop, bottom: padBottom } = GRAPH_CONST.AREA;
  const regionLeft = Math.round(totalWidth * this.region.leftPct);
  const regionRight = Math.round(totalWidth * this.region.rightPct);
  const regionTop = Math.round(totalHeight * this.region.topPct);
  const regionBottom = Math.round(totalHeight * this.region.bottomPct);
  const fixRight = (this.region.rightPct < 1) ? 0 : padRight; // Fix area at right
  this.bounds = {
   left: regionLeft + padLeft,
   right: regionRight - fixRight,
   top: regionTop + padTop,
   bottom: regionBottom - padBottom,
   width: (regionRight - fixRight) - (regionLeft + padLeft),
   height: (regionBottom - padBottom) - (regionTop + padTop)
  };
  this.visible = this.region.rightPct > 0;
}

setRange(start, stop) { this.view.xMin = start; this.view.xMax = stop; }

setTraceType(type) {
  const typeDef = TRACE_TYPES[type];
  if (!typeDef) { this.trace = { type: 'NONE', channels: [] }; return; }
  const available = typeDef.channels;
  const preserved = this.trace.channels.filter(ch => available.includes(ch));
  const channels = preserved.length > 0 ? preserved : available;
  this.trace = { type: type, channels };
  this.view.yMin = typeDef.bottom;
  this.view.yMax = typeDef.top;
  this.rad = (type === 'SMITH' || type === 'POLAR');
}

setChannels(channelsObj) {
  const channels = Object.keys(channelsObj).filter(k => channelsObj[k]);
  if (channels.length === 0) { this.trace.channels = []; return; }
  const typeDef = TRACE_TYPES[this.trace.type];
  if (!typeDef) return;
  const valid = channels.filter(ch => typeDef.channels.includes(ch));
  if (valid.length === 0) return;
  this.trace.channels = valid;
}

resetView(data) {
  const f = data.getSlot(0, 'S11').freqs;
  if (f && f.length > 0) this.setRange(f[0], f[f.length - 1]);
  const typeDef = TRACE_TYPES[this.trace.type];
  if (typeDef) { this.view.yMin = typeDef.bottom; this.view.yMax = typeDef.top; }
}

clampXView() { if (this.view.xMin < 0) { this.view.xMax -= this.view.xMin; this.view.xMin = 0; } }

calculatePoints(data, globalVisibility) {
  this.cachedPoints = this._createEmptyCache();
    
  for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
    if (!globalVisibility[slotIdx]) continue;
    const trace = this.trace;
    const typeDef = TRACE_TYPES[trace.type];
    if (!typeDef || !typeDef.calc) continue;

    for (const channel of trace.channels) {
      const slotData = data.getSlot(slotIdx, channel);
      if (!slotData || !slotData.freqs || slotData.freqs.length === 0) continue;

      this.cachedPoints[slotIdx][channel] = [];
      const targetArray = this.cachedPoints[slotIdx][channel];
      const { bounds, view } = this;
      const { yMin, yMax } = view;

      if (this.rad) {
        const cx = bounds.left + bounds.width / 2;
        const cy = bounds.top + bounds.height / 2;
        const R = Math.min(bounds.width, bounds.height) / 2;
        for (let i = 0; i < slotData.freqs.length; i++) {
          const freq = slotData.freqs[i], s = slotData.values[i];
          if (!s) continue;
          let x = cx + s.re * R;
          let y = cy - s.im * R;
          x = Math.max(bounds.left, Math.min(bounds.right, x));
          y = Math.max(bounds.top, Math.min(bounds.bottom, y));
          targetArray.push({ x, y, freq, value: s });
        }
      } else {
        for (let i = 0; i < slotData.freqs.length; i++) {
          const freq = slotData.freqs[i], s = slotData.values[i];
          if (!s) continue;
          const value = typeDef.calc(s, i, freq, slotData.values, slotData.freqs);
          let x = bounds.left + (freq - view.xMin) / (view.xMax - view.xMin) * bounds.width;
          let y = bounds.top + (yMax - value) / (yMax - yMin) * bounds.height;
          if (x < bounds.left) x = bounds.left; else if (x > bounds.right) x = bounds.right;
          if (y < bounds.top) y = bounds.top; else if (y > bounds.bottom) y = bounds.bottom;
          targetArray.push({ x, y, freq, value });
        }
      }
    }
  }
}

getMouseArea(x, y) {
  const { left, right, top, bottom } = this.bounds;
  const inV = y >= top && y <= bottom;
  const inH = x >= left && x <= right;
  if (x < left   && x > left   - GRAPH_CONST.AREA.left   && inV) return 'y';
  if (y > bottom && y < bottom + GRAPH_CONST.AREA.bottom && inH) return 'x';
  if (inH && inV) return 'plot';
  return null;
}

draw(ctx, graph) {
       if (this.trace.type === 'SMITH') this.drawSmithGrid(ctx, graph);
  else if (this.trace.type === 'POLAR') this.drawPolarGrid(ctx, graph);
  else this.drawGrid(ctx, graph);

  this.drawTraces(ctx, graph);
  this.drawMarkers(ctx, graph);
}

//drawLine(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
drawLine(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(Math.round(x1-0.5)+0.5, Math.round(y1-0.5)+0.5); ctx.lineTo( Math.round(x2-0.5)+0.5, Math.round(y2-0.5)+0.5); ctx.stroke(); }

drawGrid(ctx, graph) {
  const { left, right, top, bottom, width, height } = this.bounds;
  const { xMin, xMax, yMin, yMax } = this.view;
  const { MIN_GRID_SPACING_PX, MIN_GRID_SPACING_PY, GRID_DASH } = GRAPH_CONST;

  ctx.strokeStyle = graph.getCSSColor('--plot-border');
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);

  const xTicks = getNiceTicks(xMin, xMax, MIN_GRID_SPACING_PX, width);
  const yTicks = getNiceTicks(yMin, yMax, MIN_GRID_SPACING_PY, height);

  ctx.fillStyle = graph.getCSSColor('--plot-axis-text');
  ctx.strokeStyle = graph.getCSSColor('--plot-grid');
  ctx.lineWidth = 1;
  ctx.setLineDash(GRID_DASH);

  ctx.font = graph.getFont('axis-label');
  ctx.textAlign = 'center';
  for (const freq of xTicks.ticks) {
    const x = left + (freq - xMin) / (xMax - xMin) * width;
    this.drawLine(ctx, x, top, x, bottom);
    ctx.fillText(formatFreqValue(freq, 3), x, bottom + 15);
  }

  const trace = this.trace;
  const typeDef = TRACE_TYPES[trace.type];
  ctx.textAlign = 'right';
  for (const value of yTicks.ticks) {
    const y = top + (yMax - value) / (yMax - yMin) * height;
    this.drawLine(ctx, left, y, right, y);
    ctx.fillText(formatValue(value, typeDef), left - 5, y + 4);
  }

  if (trace) {
    const channelNames = trace.channels.join(', ');
    const label = `${channelNames} ${typeDef.name}${typeDef.suffix ? ' (' + typeDef.suffix + ')' : ''}`;
    ctx.textAlign = 'left';
    ctx.font = graph.getFont('axis');
    ctx.fillText(label, left, top - 11);
  }
  ctx.setLineDash([]);
}

drawPolarGrid(ctx, graph) {
    const { left, top, width, height } = this.bounds;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const R = Math.min(width, height) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.clip();
    ctx.strokeStyle = graph.getCSSColor('--plot-grid'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); // Горизонтальная ось
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); // Вертикальная ось
    ctx.stroke();
    [0.2, 0.4, 0.6, 0.8].forEach(mag => { ctx.beginPath(); ctx.arc(cx, cy, R * mag, 0, 2 * Math.PI); ctx.stroke(); });
    [Math.PI / 6, Math.PI / 3, -Math.PI / 6, -Math.PI / 3].forEach(angle => {
      this.drawLine(ctx, cx + R * Math.cos(angle), cy - R * Math.sin(angle), cx - R * Math.cos(angle), cy + R * Math.sin(angle));
    });
    ctx.restore();
}

drawSmithGrid(ctx, graph) {
  const { left, top, width, height } = this.bounds;
  const cx = left + width / 2; const cy = top + height / 2;
  const R = Math.min(width, height) / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip();
  ctx.strokeStyle = graph.getCSSColor('--plot-grid'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

  [0.2, 0.5, 1, 2, 5].forEach(y => { ctx.beginPath(); ctx.arc(cx + R * y / (y + 1), cy, R / (y + 1), 0, 2 * Math.PI); ctx.stroke(); });
  [0.2, 0.5, 1, 2, 5].forEach(x => {
     ctx.beginPath(); ctx.arc(cx + R, cy - (R / x), R / x, 0, 2 * Math.PI); ctx.stroke();
     ctx.beginPath(); ctx.arc(cx + R, cy + (R / x), R / x, 0, 2 * Math.PI); ctx.stroke();
  });
  ctx.restore();
}

drawTraces(ctx, graph) {
  const { TRACE_LIVE_LINE, TRACE_STORED_LINE } = GRAPH_CONST;
  const { left, top, width, height } = this.bounds;
  const plotRect = { left, top, width, height };

  for (let slot = 0; slot < 5; slot++) {
    if (!graph.visibility[slot]) continue;
    const trace = this.trace;
    for (const channel of trace.channels) {
      const points = this.cachedPoints[slot][channel];
      if (!points || points.length === 0) continue;
      ctx.strokeStyle = graph.getTraceColor(`m${slot}`, channel);
      ctx.lineWidth = slot === 0 ? TRACE_LIVE_LINE : TRACE_STORED_LINE;
      ctx.beginPath(); let drawing = false;
      for (let i = 0; i < points.length - 1; i++) {
        const clipped = graph.clipLineToRect(points[i], points[i + 1], plotRect);
        if (clipped) {
          if (!drawing) { ctx.moveTo(clipped.x1, clipped.y1); drawing = true; } 
          else { ctx.lineTo(clipped.x1, clipped.y1); }
          ctx.lineTo(clipped.x2, clipped.y2);
        } else { drawing = false; }
      }
      ctx.stroke();
    }
  }
}

drawMarkers(ctx, graph) {
  const { bounds, view } = this;
  const activeColor = graph.getCSSColor('--marker-active'), inactiveColor = graph.getCSSColor('--marker-inactive');
  ctx.font = graph.getFont('marker');
  for (let i = 0; i < graph.markers.length; i++) {
    const marker = graph.markers[i];
    let markerX = bounds.left + (marker.freq - view.xMin) / (view.xMax - view.xMin) * bounds.width;
    if (markerX < bounds.left || markerX > bounds.right) continue;
    const isSelected = (i === graph.selectedMarkerIndex);
    const isDragging = graph.mouse.handlerData?.area === this && graph.mouse.handlerData?.index === i;
    const isHighlighted = isSelected || isDragging;
    if (!this.rad) {
      markerX = Math.round(markerX) + 0.5;
      ctx.setLineDash(GRAPH_CONST.MARKER_DASH);
      ctx.strokeStyle = isHighlighted ? activeColor : inactiveColor;
      ctx.lineWidth = isHighlighted ? 2 : 1;
      this.drawLine(ctx, markerX, bounds.top, markerX, bounds.bottom);
      ctx.setLineDash([]);
    }
    this._drawMarkerOnTraces(ctx, graph, marker, i, activeColor, inactiveColor, isHighlighted);
  }
}

drawTextWithOutline(ctx, text, x, y, fillColor, outlineColor, lineWidth = 3) {
    ctx.lineJoin = 'round';       // Красивые углы обводки
    ctx.miterLimit = 2;
    ctx.lineWidth = lineWidth;
    
    // 1. Сначала обводка цветом фона
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(text, x, y);
    
    // 2. Затем сам текст основным цветом
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
}

_drawMarkerOnTraces(ctx, graph, marker, markerIndex, activeColor, inactiveColor, isHighlighted) {
  const markerOutline = graph.getCSSColor('--bg'), markerLabel = graph.getCSSColor('--marker-label');
  const { MARKER_DOT_RADIUS, MARKER_SEL_DOT_RADIUS } = GRAPH_CONST;
  for (let slot = 0; slot < 5; slot++) {
    if (!graph.visibility[slot]) continue;
    const trace = this.trace;
    for (const channel of trace.channels) {
      const points = this.cachedPoints[slot][channel];
      if (!points || points.length < 2) continue;
      const interp = interpolatePoint(points, marker.freq);
      if (!interp) continue;
      ctx.fillStyle = isHighlighted ? activeColor : inactiveColor;
      ctx.beginPath(); ctx.arc(interp.x, interp.y, isHighlighted ? MARKER_SEL_DOT_RADIUS : MARKER_DOT_RADIUS, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = markerLabel; ctx.lineWidth = isHighlighted ? 2 : 1; ctx.stroke();

      ctx.fillStyle = markerLabel; ctx.textAlign = 'left'; ctx.font = graph.getFont(isHighlighted ? 'amarker' : 'marker');
      const typeDef = TRACE_TYPES[trace.type];

      // Форматирование для Smith или обычных значений
      let valText = '';
      if (typeof interp.value === 'object') {
        const re = interp.value.re, im = interp.value.im;
        valText = `${re.toFixed(2)} ${im >= 0 ? '+' : '-'} j${Math.abs(im).toFixed(2)}`;
      } else {
        valText = formatValue(interp.value, typeDef);
      }
 //   ctx.fillText(`M${markerIndex + 1}: ${valText}`, interp.x + 8, interp.y + 4);
      this.drawTextWithOutline(ctx, `M${markerIndex + 1}: ${valText}`, interp.x + 8, interp.y + 4, markerLabel, markerOutline);
    }
  }
}

drawCursorInfo(ctx, graph) {
  if (this.rad) return;
  const { mouse } = graph;
  if (this.getMouseArea(mouse.x, mouse.y) !== 'plot') return false;
  const { bounds, view } = this;
  const cursorFreq = view.xMin + (mouse.x - bounds.left) / bounds.width * (view.xMax - view.xMin);

  ctx.strokeStyle = graph.getCSSColor('--cursor-line');
  ctx.lineWidth = 1;
  ctx.setLineDash(GRAPH_CONST.CURSOR_DASH);
  this.drawLine(ctx, mouse.x, bounds.top, mouse.x, bounds.bottom);
  ctx.setLineDash([]);

  const infoLines = [`Freq: ${formatFreqValue(cursorFreq)}`];
  for (let slot = 0; slot < 5; slot++) {
    if (!graph.visibility[slot]) continue;
    const trace = this.trace;
    for (const channel of trace.channels) {
      const points = this.cachedPoints[slot][channel];
      if (!points || points.length < 2) continue;

      const interp = interpolatePoint(points, cursorFreq);
      if (!interp) continue;

      ctx.fillStyle = graph.getTraceColor(`m${slot}`, channel);
      ctx.beginPath(); ctx.arc(mouse.x, interp.y, GRAPH_CONST.CURSOR_DOT_RADIUS, 0, 2 * Math.PI); ctx.fill();
      const slotName = slot === 0 ? channel: `M${slot} ${channel}`;
      const typeDef = TRACE_TYPES[this.trace.type];
      infoLines.push(`${slotName}: ${formatValue(interp.value, typeDef)}`);
    }
  }
  graph.drawTooltip(mouse.x, mouse.y, infoLines);
  return true;
}

} // Area end

class VNAGraph {
constructor(canvasId, data) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.data = data;
  this.areas = [
   new Area({ leftPct: 0.0, rightPct: 0.5, topPct: 0, bottomPct: 0.5 }),
   new Area({ leftPct: 0.5, rightPct: 1.0, topPct: 0, bottomPct: 0.5 }),
   new Area({ leftPct: 0.0, rightPct: 0.5, topPct: 0.5, bottomPct: 1 }),
   new Area({ leftPct: 0.5, rightPct: 1.0, topPct: 0.5, bottomPct: 1 })
  ];
  this.areas[0].setTraceType('LOGMAG');
  this.areas[1].setTraceType('SWR');
  this.areas[2].setTraceType('R');
  this.areas[3].setTraceType('PHASE');

  this.visibility = [true, false, false, false, false];
  this.markers = []; this.selectedMarkerIndex = -1;
  this.mouse = { x: 0, y: 0, handler: null, handlerData: null };
  this.colors = {};
  this.updateColors();
  this._themeObserver = new MutationObserver(() => this.updateColors());
  this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  this.setupEventHandlers();
  this.resize();
}

setupEventHandlers() {
  this._boundOnMouseDown = (e) => this.onMouseDown(e);
  this._boundOnMouseMove = (e) => this.onMouseMove(e);
  this._boundOnMouseUp = () => this.onMouseUp();
  this._boundOnWheel = (e) => this.onWheel(e);

  this.canvas.addEventListener('mousedown', this._boundOnMouseDown);
  this.canvas.addEventListener('wheel', this._boundOnWheel);
  window.addEventListener('mousemove', this._boundOnMouseMove);
  window.addEventListener('mouseup', this._boundOnMouseUp);
}

getFont(type) { return getComputedStyle(document.documentElement).getPropertyValue(`--font-${type}`).trim() || "400 12px/1.2 'Arial', sans-serif"; }
getCSSColor(varName, fallback) { return this.colors[varName] ?? fallback ?? CSS_COLORS[varName] ?? '#888888'; }
getTraceColor(slot, channel) { return this.getCSSColor(`--trace-${slot}-${channel.toLowerCase()}`, '#888888'); }

setRegions(regions) {
  for (let i = 0; i < this.areas.length; i++)
     this.areas[i].region = regions[i] || { leftPct: 0, rightPct: 0, topPct: 0, bottomPct: 0 };
  this.resize();
}

copySlot(from, to) {
  if (this.data.getSlot(from, 'S11').freqs.length == 0) return;
  this.data.copySlot(from, to);
  this.visibility[to] = true;
  this.redraw(true);
}

clearSlot(slot) {
  this.visibility[slot] = false;
  this.data.clearSlot(slot);
  this.redraw(true);
}

resetToRange(slot) {
  const f = this.data.getSlot(slot, 'S11').freqs;
  if (f.length === 0) return;
  for (const area of this.areas) area.setRange(f[0], f[f.length - 1]);
  this.redraw(true);
}

resetView() { for (const area of this.areas) area.resetView(this.data); this.redraw(true); }


updateColors() {
  const style = getComputedStyle(document.documentElement);
  for (const varName of CSS_COLOR_VARS) this.colors[varName] = style.getPropertyValue(varName).trim() || CSS_COLORS[varName] || '';
  for (let slot = 0; slot < 5; slot++)
    for (const ch of ['S11', 'S21', 'S12', 'S22'])
      this.colors[`--trace-m${slot}-${ch.toLowerCase()}`] = style.getPropertyValue(`--trace-m${slot}-${ch.toLowerCase()}`).trim() || '#888888';
}

drawTooltip(mouseX, mouseY, infoLines) {
  const { width, height } = this.canvas.getBoundingClientRect();
  const { ctx } = this;
  const { TOOLTIP_WIDTH, TOOLTIP_LINE_HEIGHT, TOOLTIP_PADDING, TOOLTIP_OFFSET } = GRAPH_CONST;
  const panelHeight = 2 * TOOLTIP_PADDING + infoLines.length * TOOLTIP_LINE_HEIGHT;

  let panelX = mouseX + TOOLTIP_OFFSET;
  let panelY = mouseY - panelHeight / 2;
  if (panelX + TOOLTIP_WIDTH > width) panelX = mouseX - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
  if (panelY < 5) panelY = 5;
  if (panelY + panelHeight > height) panelY = height - 5 - panelHeight;

  ctx.fillStyle = this.getCSSColor('--tooltip-bg');
  ctx.strokeStyle = this.getCSSColor('--tooltip-border');
  ctx.lineWidth = 1;
  ctx.fillRect(panelX, panelY, TOOLTIP_WIDTH, panelHeight);
  ctx.strokeRect(panelX, panelY, TOOLTIP_WIDTH, panelHeight);
  ctx.fillStyle = this.getCSSColor('--tooltip-text');
  ctx.font = this.getFont('tooltip');
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (let i = 0; i < infoLines.length; i++)
    ctx.fillText(infoLines[i], panelX + TOOLTIP_PADDING, panelY + TOOLTIP_PADDING + i * TOOLTIP_LINE_HEIGHT);
  ctx.textBaseline = 'alphabetic';
}

clipLineToRect(p1, p2, rect) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const right = rect.left + rect.width, bottom = rect.top + rect.height;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  if (!clip(-dx, p1.x - rect.left) || !clip(dx, right - p1.x) || !clip(-dy, p1.y - rect.top) || !clip(dy, bottom - p1.y)) return null;
  if (t0 > t1) return null;
  return { x1: p1.x + t0 * dx, y1: p1.y + t0 * dy, x2: p1.x + t1 * dx, y2: p1.y + t1 * dy };
}

resize() {
  const { width, height } = this.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
  this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const area of this.areas) area.updateBounds(width, height);
  this.redraw(true);
}

redraw(dirty = false) {
  const { width, height } = this.canvas.getBoundingClientRect();
  this.ctx.fillStyle = this.getCSSColor('--bg');
  this.ctx.fillRect(0, 0, width, height);
  if (dirty) { for (const area of this.areas) area.calculatePoints(this.data, this.visibility); }
  for (const area of this.areas) {
    if (!area.visible) continue;
    area.draw(this.ctx, this);
    area.drawCursorInfo(this.ctx, this);
  }
}

addMarker() {
  const area = this.areas[0], liveData = this.data.getSlot(0, 'S11');
  if (!liveData || !liveData.freqs || liveData.freqs.length === 0) return;
  const fstart = area.view.xMin, fstop = area.view.xMax;
  let freq = fstart + (fstop - fstart) * (this.markers.length + 1) / 10;
  if (freq > fstop) freq = fstop;
  this.markers.push({ freq: Math.round(freq) });
  this.selectedMarkerIndex = this.markers.length - 1;
  this.redraw();
  if (typeof updateMarkerTable === 'function') updateMarkerTable();
}

changeSelectedMarker() {
  if (this.selectedMarkerIndex < 0 || this.selectedMarkerIndex >= this.markers.length) return;
  const marker = this.markers[this.selectedMarkerIndex];
  const input = prompt(`Введите частоту для маркера M${this.selectedMarkerIndex + 1}:`, formatFreqValue(marker.freq));
  if (input === null) return;
  const newFreq = +input;
  if (isNaN(newFreq) || newFreq < 0) return;
  marker.freq = Math.round(newFreq);
  this.redraw();
  if (typeof updateMarkerTable === 'function') updateMarkerTable();
}

removeSelectedMarker() {
  if (this.selectedMarkerIndex < 0 || this.selectedMarkerIndex >= this.markers.length) return;
  this.markers.splice(this.selectedMarkerIndex, 1);
  this.selectedMarkerIndex = this.markers.length > 0 ? Math.min(this.selectedMarkerIndex, this.markers.length - 1) : -1;
  this.redraw();
  if (typeof updateMarkerTable === 'function') updateMarkerTable();
}

selectMarker(index) {
  if (index < 0 || index >= this.markers.length) return;
  this.selectedMarkerIndex = index;
  this.redraw();
  if (typeof updateMarkerTable === 'function') updateMarkerTable();
}

getMouseCoords(e) { const rect = this.canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

onMouseDown(e) {
  const { x, y } = this.getMouseCoords(e);
  const activeArea = this.areas.find(a => a.getMouseArea(x, y) !== null);
  if (!activeArea) return;
  if (this._tryRegisterMarkerDrag(activeArea, x, y)) return;
  if (this._tryRegisterAxisDrag(activeArea, x, y)) return;
  this.mouse.handler = null;
}

_tryRegisterMarkerDrag(area, x, y) {
  if (area.getMouseArea(x, y) !== 'plot') return false;
  let minDist = GRAPH_CONST.MARKER_PICKUP_RADIUS, foundIdx = -1;
  const { bounds, view } = area;
  for (let i = 0; i < this.markers.length; i++) {
    const markerX = bounds.left + (this.markers[i].freq - view.xMin) / (view.xMax - view.xMin) * bounds.width;
    if (markerX < bounds.left || markerX > bounds.right) continue;
    const dx = Math.abs(x - markerX);
    if (dx < minDist) { minDist = dx; foundIdx = i; }
  }
  if (foundIdx != this.selectedMarkerIndex) {
    this.selectedMarkerIndex = foundIdx;
    if (typeof updateMarkerTable === 'function') updateMarkerTable();
    this.redraw();
  }
  if (foundIdx < 0) return false;
  this.mouse.handler = (action, mx, my) => this._markerDragHandler(action, area, mx, my);
  this.mouse.handlerData = { area, index: foundIdx };
  this.canvas.style.cursor = 'ew-resize';
  return true;
}

_markerDragHandler(action, area, x, y) {
  if (action === 'drag') {
    const { bounds, view } = area;
    let freq = view.xMin + (x - bounds.left) / bounds.width * (view.xMax - view.xMin);
    if (freq < view.xMin) freq = view.xMin; if (freq > view.xMax) freq = view.xMax;
    this.markers[this.mouse.handlerData.index].freq = Math.round(freq);
    if (typeof updateMarkerTable === 'function') updateMarkerTable();
    this.redraw();
  } else if (action === 'release') {
    this.mouse.handlerData = null; this.canvas.style.cursor = 'crosshair';
  }
  return true;
}

_tryRegisterAxisDrag(area, x, y) {
  const axis = area.getMouseArea(x, y);
  if (!axis || axis === 'plot') return false;
  this.mouse.handler = (action, mx, my) => this._axisDragHandler(action, area, mx, my);
  this.mouse.handlerData = { area, axis, startX: x, startY: y, viewStart: { xMin: area.view.xMin, xMax: area.view.xMax, yMin: area.view.yMin, yMax: area.view.yMax } };
  this.canvas.style.cursor = axis === 'y' ? 'ns-resize' : 'ew-resize';
  return true;
}

_axisDragHandler(action, area, x, y) {
  if (action === 'drag') {
    const { axis, startX, startY, viewStart } = this.mouse.handlerData;
    const { bounds, view } = area;
    const dx = x - startX, dy = y - startY;
    if (axis === 'x') {
      const xRange = viewStart.xMax - viewStart.xMin;
      view.xMin = viewStart.xMin - dx / bounds.width * xRange;
      view.xMax = viewStart.xMax - dx / bounds.width * xRange;
      area.clampXView();
    } else if (axis === 'y') {
      const yRange = viewStart.yMax - viewStart.yMin;
      view.yMin = viewStart.yMin + dy / bounds.height * yRange;
      view.yMax = viewStart.yMax + dy / bounds.height * yRange;
    }
    this.redraw(true);
  } else if (action === 'release') {
    this.mouse.handlerData = null; this.canvas.style.cursor = 'crosshair';
  }
  return true;
}

onMouseMove(e) {
  const { x, y } = this.getMouseCoords(e);
  this.mouse.x = x; this.mouse.y = y;
  if (this.mouse.handler) { this.mouse.handler('drag', x, y); return; }
  const { width, height } = this.canvas.getBoundingClientRect();
  if (x < 0 || y < 0 || x > width || y > height) { this.canvas.style.cursor = 'crosshair'; return; }
  let cursor = 'crosshair';
  for (const area of this.areas) {
    const axis = area.getMouseArea(x, y);
    if (axis === 'y') { cursor = 'ns-resize'; break; }
    if (axis === 'x') { cursor = 'ew-resize'; break; }
  }
  this.canvas.style.cursor = cursor;
  this.redraw(false);
}

onMouseUp() { if (this.mouse.handler) { this.mouse.handler('release', this.mouse.x, this.mouse.y); this.mouse.handler = null; } }

onWheel(e) {
  e.preventDefault();
  const { x: mx, y: my } = this.getMouseCoords(e);
  const activeArea = this.areas.find(a => a.getMouseArea(mx, my) !== null);
  if (!activeArea) return;
  const mouseArea = activeArea.getMouseArea(mx, my);
  const factor = e.deltaY > 0 ? GRAPH_CONST.ZOOM_OUT_FACTOR : GRAPH_CONST.ZOOM_IN_FACTOR;
  const { bounds, view } = activeArea;
  if (mouseArea === 'x') {
    const xRange = view.xMax - view.xMin;
    const xAt = view.xMin + (mx - bounds.left) / bounds.width * xRange;
    const nr = xRange * factor;
    const r = (xAt - view.xMin) / xRange;
    view.xMin = xAt - r * nr; view.xMax = xAt + (1 - r) * nr;
    activeArea.clampXView();
  } else if (mouseArea === 'y') {
    const yRange = view.yMax - view.yMin;
    const yAt = view.yMax - (my - bounds.top) / bounds.height * yRange;
    const nr = yRange * factor;
    const r = (view.yMax - yAt) / yRange;
    view.yMin = yAt - (1 - r) * nr; view.yMax = yAt + r * nr;
  }
  this.redraw(true);
}
}