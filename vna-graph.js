const GRAPH_CONST = {
 AREA: { left: 55, right: 25, top: 32, bottom: 25 },
 MIN_GRID_SPACING_PX: 60, MIN_GRID_SPACING_PY: 40,
 MARKER_DOT_RADIUS: 3, MARKER_SEL_DOT_RADIUS: 4, CURSOR_DOT_RADIUS: 3, DOT_LINE: 1,
 MARKER_LINE: 1, GRID_LINE: 1, CURSOR_LINE: 1, TRACE_LIVE_LINE: 1, TRACE_STORED_LINE: 1,
 TOOLTIP_WIDTH: 220, TOOLTIP_PADDING: 7, TOOLTIP_LINE_HEIGHT: 15, TOOLTIP_OFFSET: 15,
 MARKER_DASH: [4, 4], CURSOR_DASH: [2, 2], GRID_DASH: [3, 3],
 ZOOM_FACTOR: 0.05,
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
  this.trace = { type: 'LOGMAG', typeDef: null, channels: CH_PORT1, smithFormat: 'RX' };
  this.view = { xMin: 1e6, xMax: 100e6, yMin: -60, yMax: 0 };
  this.cachedPoints = [];
  this.cachedMarkers = [];
  this.cachedMarkerLines = [];
  // Time Domain settings
  this.td = {
    enabled: false,
    dirty: true,
    mode: 'bandpass',        // 'bandpass' | 'lowpass_step' | 'lowpass_impulse'
    window: 'minimum',       // 'minimum' | 'normal' | 'maximum'
    velocityFactor: 0.66,
    xAxisMode: 'time'        // 'time' | 'distance'
  };
  this.tdCache = [];         // Кэш IFFT-результата (пока пустой)
}

updateBounds(totalWidth, totalHeight) {
  const { left: padLeft, right: padRight, top: padTop, bottom: padBottom } = GRAPH_CONST.AREA;
  const regionLeft = Math.round(totalWidth * this.region.leftPct);
  const regionRight = Math.round(totalWidth * this.region.rightPct);
  const regionTop = Math.round(totalHeight * this.region.topPct);
  const regionBottom = Math.round(totalHeight * this.region.bottomPct);
  const fixRight = (this.region.rightPct < 1) ? 0 : padRight; // Fix area at right
  const l = regionLeft + padLeft, r = regionRight - fixRight, t = regionTop + padTop, b = regionBottom - padBottom;
  this.bounds = {
   left: l,
   right: r,
   top: t,
   bottom: b,
   width: r - l,
   height: b - t,
   cx: Math.round((r + l) / 2 - 3) + 0.5,
   cy: Math.round((b + t) / 2 + 3) + 0.5,
   R:  Math.min(r - l - 10, b - t - 6) / 2,
  };
  this.visible = this.region.rightPct > 0;
}

setRange(start, stop) { this.view.xMin = start; this.view.xMax = stop; }

setTraceType(type) {
  const typeDef = TRACE_TYPES[type];
  if (!typeDef) { this.trace = {...this.trace, type: type, typeDef: null, channels: 0 }; return; }
  const valid = this.trace.channels & typeDef.valid;
  const channels = valid !== 0 ? valid : (typeDef.valid & -typeDef.valid);
  this.trace = {...this.trace, type: type, typeDef: typeDef, channels: channels};
  this.view = {...this.view, yMin: typeDef.bottom, yMax: typeDef.top, yLimit: typeDef.min };
  this.rad = typeDef.rad || 0;
  // Reset Smith format
  if (!this.rad) return;
  const m = MARKER_INFO[this.trace.smithFormat].valid & typeDef.valid;
  if (m == 0) this.setSmithFormat(typeDef.valid & CH_REFLECT ? 'RX' : 'SHUNT_RX');
}

setSmithFormat(format) {
  const info = MARKER_INFO[format];
  if (!info || !(info.valid & this.trace.channels)) format = LIN;
  this.trace.smithFormat = format;
}

setChannels(channelsObj) {
  let mask = 0;
  if (channelsObj.S11) mask |= CH_S11;
  if (channelsObj.S21) mask |= CH_S21;
  if (channelsObj.S12) mask |= CH_S12;
  if (channelsObj.S22) mask |= CH_S22;
  const { typeDef } = this.trace;
  this.trace.channels = typeDef ? mask & typeDef.valid : mask;
}

// Метод для установки TD-параметров с пометкой dirty при изменении
setTD(settings) {
  if (!settings) return;
  for (const key of ['enabled', 'mode', 'window', 'velocityFactor', 'xAxisMode']) {
    if (settings[key] !== undefined && this.td[key] !== settings[key]) {
      this.td[key] = settings[key];
      this.td.dirty = true;
    }
  }
}

autoScale() {
  if (!this.cachedPoints || this.cachedPoints.length === 0 || this.rad) return;
  const { height } = this.bounds;
  const { typeDef } = this.trace;
  const { xMin, xMax } = this.view;
  const { MIN_GRID_SPACING_PY } = GRAPH_CONST;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const entry of this.cachedPoints) {
    if (!entry.points || entry.points.length === 0) continue;
    for (const p of entry.points) {
      if (p.freq < xMin || p.freq > xMax || !isFinite(p.value)) continue;
      if (p.value < minY) minY = p.value;
      if (p.value > maxY) maxY = p.value;
    }
  }
  if (!isFinite(maxY)) maxY = typeDef.top;
  if (!isFinite(minY)) minY = typeDef.bottom;
  const dy = maxY - minY;
  if (dy === 0) {maxY+=1; minY-=1;}
  else {maxY+=dy*0.1; minY-=dy*0.1;}
  const { ticks } = getNiceTicks(minY, maxY, MIN_GRID_SPACING_PY, height);
  this.view.yMin = ticks[0];
  this.view.yMax = ticks[ticks.length - 1];
  if ( typeDef.min !== null && this.view.yMin < typeDef.min) this.view.yMin = typeDef.min;
  // В начале autoScale, после цикла:
//console.log(` minY=${minY}, maxY=${maxY}, type=${this.trace.type}`);
}

freqToTime(freq) {
  if (!this.td._M || !this.td._df) return 0;
  const maxTime = (this.td._M - 1) / (this.td._M * this.td._df);
  const f0 = this.td._f0, f1 = this.td._f1;
  if (f1 === f0) return 0;
  return ((freq - f0) / (f1 - f0)) * maxTime;
}

freqToDistance(freq) {
  return this.freqToTime(freq) * 299792458 * this.td.velocityFactor / 2;
}

getX(freq) {
  if (!this.td.enabled) return freq;
  return this.td.xAxisMode === 'distance' ? this.freqToDistance(freq) : this.freqToTime(freq);
}

// Форматтер для вывода текста
getXLabel(freq) {
  if (!this.td.enabled) return formatFreqValue(freq);
  return _formatPFloat(this.getX(freq), 3) + (this.td.xAxisMode === 'distance' ? 'm' : 's');
}

resetView(data) {
  const { typeDef } = this.trace;
  const f = data.getSlot(0, 'S11').freqs;
  if (f && f.length > 0) this.setRange(f[0], f[f.length - 1]);
  if (typeDef) { this.view.yMin = typeDef.bottom; this.view.yMax = typeDef.top; }
}

calculateCache(data, graph) {
  const { left, right, top, bottom, width, height, cx, cy, R } = this.bounds;
  const { xMin, xMax, yMin, yMax } = this.view;
  const { typeDef } = this.trace;
  this.cachedPoints = [];
  const channels = getChannelList(this.trace.channels);
  if (!typeDef || !typeDef.calc) return;
  for (let slot = 0; slot < graph.visibility.length; slot++) {
    if (!graph.visibility[slot]) continue;
    for (const channel of channels) {
      const slotData = data.getSlot(slot, channel, this.td);
      if (!slotData) continue;
      const points = [];
      if (this.rad) {
        for (let i = 0; i < slotData.freqs.length; i++) {
          const freq = slotData.freqs[i], s = slotData.values[i];
          if (s) points.push({x: cx + s.re * R, y: cy - s.im * R, freq, value: s });
        }
      } else {
        for (let i = 0; i < slotData.freqs.length; i++) {
          const freq = slotData.freqs[i], s = slotData.values[i];
          if (!s) continue;
          const value = typeDef.calc(s, i, freq, slotData.values, slotData.freqs);
          const x = left + (freq - xMin) / (xMax - xMin) * width;
          const y = top + (yMax - value) / (yMax - yMin) * height;
          points.push({ x, y, freq, value });
        }
      }
      this.cachedPoints.push({ slot, channel, points });
    }
  }
  this.updateMarkerPoints(graph.markers);
}

updateMarkerPoints(markers) {
  const { left, right, width } = this.bounds;
  this.cachedMarkers = [];
  this.cachedMarkerLines = [];
  if (!markers || markers.length === 0) return;
  for (const entry of this.cachedPoints) {
    const mPoints = [];
    for (let m = 0; m < markers.length; m++) {
      const interp = interpolatePoint(entry.points, markers[m].freq);
      if (!interp) continue;
      const p = this.clampPointToRect(interp, this.bounds);
      if (interp.x >= left && interp.x <= right)
        mPoints.push({ x: interp.x, y: p.y, freq: interp.freq, value: interp.value, idx: m });
    }
    if (mPoints.length > 0) { this.cachedMarkers.push({ slot: entry.slot, channel: entry.channel, points: mPoints }); }
  }
  if (!this.rad) {
    const { xMin, xMax } = this.view;
    for (let m = 0; m < markers.length; m++) {
      const x = left + (markers[m].freq - xMin) / (xMax - xMin) * width;
      if (x >= left && x <= right) this.cachedMarkerLines.push({ id: m, x });
    }
  }
}

findNearestInCache(x, y, maxRadius, cache) {
  const maxDistSq = maxRadius * maxRadius;
  let best = null;
  let minDistSq = maxDistSq;
  for (const entry of cache) {
    for (const p of entry.points) {
      const dx = x - p.x, dy = y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDistSq) continue;
      minDistSq = distSq;
      best = { point: p, slot: entry.slot, channel: entry.channel };
    }
  }
  return best;
}

getMouseArea(x, y, markers = []) {
  const { left, right, top, bottom, width, height } = this.bounds;
  const { xMin, xMax, yMin, yMax } = this.view;
  const la = left - GRAPH_CONST.AREA.left, ba = bottom + GRAPH_CONST.AREA.bottom;
  const inV = y >= top && y <= bottom;
  const inH = x >= left && x <= right;
  if (this.rad) {
    if (inH && inV && this.cachedMarkers.length > 0) {
      const nearest = this.findNearestInCache(x, y, GRAPH_CONST.MARKER_PICKUP_RADIUS, this.cachedMarkers);
      if (nearest) return { zone: 'marker', index: nearest.point.idx, cursor: 'grabbing' };
      return { zone: 'plot', cursor: 'crosshair' };
    }
    return null;
  }
  if (x < left && x > la && inV) {
    const rel = 3 * (y - top) / height;
    const min = rel > 1, max = rel < 2;
    return { zone: 'y', min: min, max: max, cursor: (min && max) ? 'grabbing' : 'ns-resize' };
  }
  if (y > bottom && y < ba && inH) {
    const rel = 3 * (x - left) / width;
    const min = rel < 2, max = rel > 1;
    return { zone: 'x', min: min, max: max, cursor: (min && max) ? 'grabbing' : 'ew-resize' };
  }
  if (inH && inV) {
    for (const line of this.cachedMarkerLines)
      if (Math.abs(x - line.x) < GRAPH_CONST.MARKER_PICKUP_RADIUS) return { zone: 'marker', index: line.id, cursor: 'grabbing' };
    return { zone: 'plot', cursor: 'crosshair' };
  }
  return null;
}

draw(ctx, graph) {
  if (this.rad) this.drawComplexGrid(ctx, graph);
  else this.drawGrid(ctx, graph);

  this.drawHeader(ctx, graph);
  this.drawTraces(ctx, graph);
  this.drawMarkers(ctx, graph);
  this.drawCursorInfo(ctx, graph);
}

//drawLine(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
drawLine(ctx, x1, y1, x2, y2) {
 const d = ctx.lineWidth / 2;
 ctx.moveTo(Math.round(x1-d)+d, Math.round(y1-d)+d);
 ctx.lineTo( Math.round(x2-d)+d, Math.round(y2-d)+d);
}

drawCircle(ctx, x, y, r) {
  const R = Math.abs(r);
  ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, 2 * Math.PI);
}

clampPointToRect(p, rect) {
  return { x: Math.max(rect.left, Math.min(rect.right, p.x)), y: Math.max(rect.top, Math.min(rect.bottom, p.y)) };
}

drawHeader(ctx, graph) {
  const { left, top } = this.bounds;
  const { typeDef, channels, smithFormat } = this.trace;
  const channelNames = getChannelList(channels).join(', ');
  const suffix = this.rad ? MARKER_INFO[smithFormat].name : typeDef.suffix;
  const label = `[${channelNames}]  ${typeDef.name}${suffix ? ' (' + suffix + ')' : ''}`;
  ctx.textAlign = 'left';
  ctx.font = graph.getFont('axis');
  ctx.fillText(label, left, top - 12);
}

drawGrid(ctx, graph) {
  const { left, right, top, bottom, width, height } = this.bounds;
  let { xMin, xMax, yMin, yMax } = this.view;
  const { MIN_GRID_SPACING_PX, MIN_GRID_SPACING_PY, MARKER_DASH, MARKER_LINE, GRID_LINE, GRID_DASH } = GRAPH_CONST;

  ctx.strokeStyle = graph.getCSSColor('--plot-border');
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);
  xMin = this.getX(xMin);
  xMax = this.getX(xMax);
  const xTicks = getNiceTicks(xMin, xMax, MIN_GRID_SPACING_PX, width);
  const yTicks = getNiceTicks(yMin, yMax, MIN_GRID_SPACING_PY, height);

  ctx.fillStyle = graph.getCSSColor('--plot-axis-text');
  ctx.strokeStyle = graph.getCSSColor('--plot-grid'); ctx.lineWidth = GRID_LINE;
  ctx.setLineDash(GRID_DASH);

  ctx.font = graph.getFont('axis-label');
  ctx.textAlign = 'center';
  ctx.beginPath();
  const format = this.td.enabled ? (this.td.xAxisMode === 'distance' ? '%.3Fm' : '%.3Fs') : '%.3qHz';
  for (const tick of xTicks.ticks) {
    const x = left + (tick - xMin) / (xMax - xMin) * width;
    this.drawLine(ctx, x, top, x, bottom);
    ctx.fillText(formatValue(format, tick), x, bottom + 18);
  }

  const { typeDef } = this.trace;
  ctx.textAlign = 'right';
  for (const value of yTicks.ticks) {
    const y = top + (yMax - value) / (yMax - yMin) * height;
    this.drawLine(ctx, left, y, right, y);
    ctx.fillText(formatValue(typeDef.f, value), left - 4, y + 4);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const activeColor = graph.getCSSColor('--marker-active');
  const inactiveColor = graph.getCSSColor('--marker-inactive');
  ctx.setLineDash(MARKER_DASH);
  for (const line of this.cachedMarkerLines) {
    ctx.beginPath();
    const isSelected = line.id === graph.selectedMarkerIndex;
    ctx.strokeStyle = isSelected ? activeColor : inactiveColor; ctx.lineWidth = MARKER_LINE;
    this.drawLine(ctx, line.x, top, line.x, bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

drawComplexShape(ctx, shape) {
  const { cx, cy, R } = this.bounds;
  if (shape.r) this.drawCircle(ctx, cx + shape.cx * R, cy - shape.cy * R, shape.r * R);
  else this.drawLine(ctx, cx + shape.x1 * R, cy - shape.y1 * R, cx + shape.x2 * R, cy - shape.y2 * R);
}

drawComplexLabel(ctx, val, pos) {
  const { cx, cy, R } = this.bounds;
  ctx.textAlign = (pos.nx >= 0) ? 'left' : 'right';
  ctx.textBaseline = (pos.ny >= 0) ? 'bottom' : 'top';
  ctx.fillText(formatValue('%.3F', val), cx + pos.nx * R, cy - pos.ny * R);
}

drawComplexGrid(ctx, graph) {
  const { MARKER_DASH, MARKER_LINE, GRID_LINE } = GRAPH_CONST;
  const { cx, cy, R } = this.bounds;
  const info = MARKER_INFO[this.trace.smithFormat] || MARKER_INFO.RX;
  const params = info.params;

  ctx.strokeStyle = graph.getCSSColor('--plot-grid');
  ctx.lineWidth = GRID_LINE;

  ctx.beginPath(); this.drawCircle(ctx, cx, cy, R); ctx.stroke();
  if (!params) return;

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip();

  ctx.beginPath();
  for (const val of params.gridRe) this.drawComplexShape(ctx, params.reCircle(val));
  for (const val of params.gridIm) this.drawComplexShape(ctx, params.imCircle(val));
  ctx.stroke();

  const activeColor = graph.getCSSColor('--marker-active');
  const inactiveColor = graph.getCSSColor('--marker-inactive');
  ctx.setLineDash(MARKER_DASH);
  for (const marker of this.cachedMarkers) {
    for (const m of marker.points) {
      ctx.beginPath();
      ctx.strokeStyle = (m.idx === graph.selectedMarkerIndex) ? activeColor : inactiveColor;
      ctx.lineWidth = MARKER_LINE;
      this.drawComplexShape(ctx, params.reCircle(info.calcRe(m.value)));
      this.drawComplexShape(ctx, params.imCircle(info.calcIm(m.value)));
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  ctx.fillStyle = graph.getCSSColor('--plot-axis-text');
  ctx.font = graph.getFont('axis-label');
  for (const val of params.gridRe) this.drawComplexLabel(ctx, val, params.reLabel(val));
  for (const val of params.gridIm) this.drawComplexLabel(ctx, val, params.imLabel(val));
  if (params.edgeLabels) for (const l of params.edgeLabels) this.drawComplexLabel(ctx, l.val, l);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * Рисует сегмент между двумя точками как дугу в полярных координатах
 * относительно центра (cx, cy). Если угловая разница мала — рисует прямую.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx, cy       - центр полярной системы (центр диаграммы)
 * @param {number} x1, y1       - предыдущая точка (пиксели)
 * @param {number} x2, y2       - текущая точка (пиксели)
 * @param {number} maxAngleStep - макс. угловой шаг, рад (0.1–0.2 — оптимально)
 */
drawPolarSegment(ctx, x1, y1, x2, y2, maxAngleStep = 0.15) {
  const { cx, cy, R } = this.bounds;
    const dx1 = x1 - cx, dy1 = y1 - cy;
    const dx2 = x2 - cx, dy2 = y2 - cy;
    const r1 = Math.hypot(dx1, dy1);
    const r2 = Math.hypot(dx2, dy2);

    // Точки вблизи центра или совпадающие — рисуем прямую
    if (r1 < 1e-6 || r2 < 1e-6) {
        ctx.lineTo(x2, y2);
        return;
    }

    const a1 = Math.atan2(dy1, dx1);
    const a2 = Math.atan2(dy2, dx2);

    // Кратчайший путь по углу (unwrap на ±π)
    let da = a2 - a1;
    if (da >  Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;

    // Малый угол — прямая (не плодим лишние точки)
    if (Math.abs(da) < maxAngleStep) {
        ctx.lineTo(x2, y2);
        return;
    }

    // Разбиваем на дугу: линейная интерполяция радиуса и угла
    const steps = Math.ceil(Math.abs(da) / maxAngleStep);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const r = r1 + t * (r2 - r1);
        const a = a1 + t * da;
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
}

clipLineToRect(p1, p2, rect) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } 
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  if (!clip(-dx, p1.x - rect.left) || !clip(dx, rect.right - p1.x) || 
      !clip(-dy, p1.y - rect.top) || !clip(dy, rect.bottom - p1.y)) {
    return null;
  }
  if (t0 > t1) return null;
  // Точные координаты пересечения с границей
  let x1 = p1.x + t0 * dx, y1 = p1.y + t0 * dy;
  let x2 = p1.x + t1 * dx, y2 = p1.y + t1 * dy;
  return { x1, y1, x2, y2 };
}

drawTraces(ctx, graph) {
  const { TRACE_LIVE_LINE, TRACE_STORED_LINE } = GRAPH_CONST;
  const { bounds } = this;
  ctx.save();
  ctx.beginPath(); ctx.rect(bounds.left, bounds.top, bounds.width, bounds.height); ctx.clip();
  for (const entry of this.cachedPoints) {
    const points = entry.points;
    if (points.length < 2) continue;
    ctx.strokeStyle = graph.getTraceColor(`m${entry.slot}`, entry.channel);
    ctx.lineWidth = entry.slot === 0 ? TRACE_LIVE_LINE : TRACE_STORED_LINE;
    ctx.beginPath();
    let prev = this.clampPointToRect(points[0], bounds);
    ctx.moveTo(prev.x, prev.y);
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const clipped = this.clipLineToRect(points[i-1], p, bounds);
      const next = clipped ? { x: clipped.x2, y: clipped.y2 } : this.clampPointToRect(p, bounds);
      ctx.lineTo(next.x, next.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

drawTextWithOutline(ctx, text, x, y, fillColor, outlineColor, lineWidth = 3) {
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = outlineColor;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

drawMarkers(ctx, graph) {
  const { bounds, rad, trace, view } = this;
  const { left, right, top, bottom } = bounds;
  const { typeDef, smithFormat } = trace;
  const { xMin, xMax } = view;
  const activeColor = graph.getCSSColor('--marker-active');
  const inactiveColor = graph.getCSSColor('--marker-inactive');
  const markerLabel = graph.getCSSColor('--marker-label');
  const markerOutline = graph.getCSSColor('--bg');
  const { MARKER_DOT_RADIUS, MARKER_SEL_DOT_RADIUS, DOT_LINE } = GRAPH_CONST;

  for (const marker of this.cachedMarkers) {
    for (const m of marker.points) {
      const isSelected = m.idx === graph.selectedMarkerIndex;
      ctx.strokeStyle = markerLabel;
      ctx.fillStyle = isSelected ? activeColor : inactiveColor;
      ctx.lineWidth = isSelected ? 1 + DOT_LINE : DOT_LINE;
      ctx.beginPath();
      ctx.arc(m.x, m.y, isSelected ? MARKER_SEL_DOT_RADIUS : MARKER_DOT_RADIUS, 0, 2 * Math.PI); ctx.fill();
      ctx.stroke();
      const valText = rad ? formatSmithValue(smithFormat, m.freq, m.value) : formatValue(typeDef.f, m.value);
      const isNearRight = m.x + 70 > right;
      ctx.textAlign = isNearRight ? 'right' : 'left';
      ctx.fillStyle = markerLabel;
      ctx.font = graph.getFont(isSelected ? 'amarker' : 'marker');
      this.drawTextWithOutline(ctx, `M${m.idx + 1}: ${valText}`, m.x + (isNearRight ? -8 : 8), m.y + 4, markerLabel, markerOutline);
    }
  }
}

drawTooltip(ctx, graph, x, y, infoLines) {
  const { right, bottom, top } = this.bounds;
  const { TOOLTIP_WIDTH, TOOLTIP_LINE_HEIGHT, TOOLTIP_PADDING, TOOLTIP_OFFSET } = GRAPH_CONST;
  const panelHeight = 2 * TOOLTIP_PADDING + infoLines.length * TOOLTIP_LINE_HEIGHT;

  let panelX = x + TOOLTIP_OFFSET;
  let panelY = y - panelHeight / 2;
  if (panelX + TOOLTIP_WIDTH > right) panelX = x - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
  if (panelY < top) panelY = top;
  if (panelY + panelHeight > bottom) panelY = bottom - panelHeight;

  ctx.fillStyle = graph.getCSSColor('--tooltip-bg');
  ctx.strokeStyle = graph.getCSSColor('--tooltip-border');
  ctx.lineWidth = 1;
  ctx.fillRect(panelX, panelY, TOOLTIP_WIDTH, panelHeight);
  ctx.strokeRect(panelX, panelY, TOOLTIP_WIDTH, panelHeight);
  ctx.fillStyle = graph.getCSSColor('--tooltip-text');
  ctx.font = graph.getFont('tooltip');
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (let i = 0; i < infoLines.length; i++)
    ctx.fillText(infoLines[i], panelX + TOOLTIP_PADDING, panelY + TOOLTIP_PADDING + i * TOOLTIP_LINE_HEIGHT);
  ctx.textBaseline = 'alphabetic';
}

drawCursorInfo(ctx, graph) {
  const { mouse } = graph;
  const { left, top, right, bottom, width, height, cx, cy, R } = this.bounds;
  const { typeDef, smithFormat } = this.trace;
  const { MARKER_PICKUP_RADIUS, CURSOR_DASH, CURSOR_DOT_RADIUS, DOT_LINE, CURSOR_LINE} = GRAPH_CONST;
  if (mouse.x < left || mouse.x > right || mouse.y > bottom || mouse.y < top) return;
  const format = this.td.enabled ? (this.td.xAxisMode === 'distance' ? 'Distance: %.3Fm' : 'Time: %.3Fs') : 'Freq: %qHz';

  if (this.rad) {
    const nearest = this.findNearestInCache(mouse.x, mouse.y, GRAPH_CONST.MARKER_PICKUP_RADIUS, this.cachedPoints);
    if (!nearest) return;
    const { point, slot, channel } = nearest;
    const info = MARKER_INFO[smithFormat] || MARKER_INFO.RX;
    const params = info.params;

    if (params) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip();
      ctx.strokeStyle = graph.getCSSColor('--cursor-line');
      ctx.lineWidth = CURSOR_LINE;
      ctx.setLineDash(CURSOR_DASH);
      ctx.beginPath();
      const re = info.calcRe(point.value), im = info.calcIm(point.value);
      this.drawComplexShape(ctx, params.reCircle(info.calcRe(point.value)));
      this.drawComplexShape(ctx, params.imCircle(info.calcIm(point.value)));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

//      ctx.fillStyle = graph.getCSSColor('--tooltip-text');
//      ctx.font = graph.getFont('axis-label');
//      this.drawComplexLabel(ctx, re, params.reLabel(re));
//      this.drawComplexLabel(ctx, im, params.imLabel(im));
    }

    ctx.strokeStyle = graph.getCSSColor('--bg'); 
    ctx.lineWidth = DOT_LINE;
    ctx.fillStyle = graph.getTraceColor(`m${slot}`, channel);
    ctx.beginPath(); ctx.arc(point.x, point.y, CURSOR_DOT_RADIUS, 0, 2 * Math.PI); ctx.fill();
    ctx.stroke();

    const infoLines = [formatValue(format, this.getX(point.freq))];
    const slotName = slot === 0 ? channel : `M${slot} ${channel}`;
    const valText = formatSmithValue(smithFormat, point.freq, point.value);
    infoLines.push(`${slotName}: ${valText}`);
    this.drawTooltip(ctx, graph, mouse.x, mouse.y, infoLines);
  } else {
    const { view } = this;
    const cursorFreq = view.xMin + (mouse.x - left) / width * (view.xMax - view.xMin);
    ctx.strokeStyle = graph.getCSSColor('--cursor-line'); ctx.lineWidth = CURSOR_LINE;
    ctx.setLineDash(CURSOR_DASH);
    ctx.beginPath(); this.drawLine(ctx, mouse.x, top, mouse.x, bottom); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = graph.getCSSColor('--bg'); ctx.lineWidth = DOT_LINE;
    const infoLines = [formatValue(format, this.getX(cursorFreq))];
    for (const entry of this.cachedPoints) {
      const interp = interpolatePoint(entry.points, cursorFreq);
      if (!interp) continue;
      if (interp.y <= bottom && interp.y >= top) {
        ctx.fillStyle = graph.getTraceColor(`m${entry.slot}`, entry.channel);
        ctx.beginPath(); ctx.arc(mouse.x, interp.y, CURSOR_DOT_RADIUS, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
      const slotName = entry.slot === 0 ? entry.channel : `M${entry.slot} ${entry.channel}`;
      const valText = formatValue(typeDef.f, interp.value);
      infoLines.push(`${slotName}: ${valText}`);
    }
    this.drawTooltip(ctx, graph, mouse.x, mouse.y, infoLines);
  }
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
  this._boundOnMouseLeave = () => this.onMouseLeave();
  this._boundOnMouseUp = () => this.onMouseUp();
  this._boundOnWheel = (e) => this.onWheel(e);
  this._boundOnTouchStart = (e) => this.onTouchStart(e);
  this._boundOnTouchMove = (e) => this.onTouchMove(e);
  this._boundOnTouchEnd = (e) => this.onTouchEnd(e);

  this.canvas.addEventListener('mousedown', this._boundOnMouseDown);
  this.canvas.addEventListener('wheel', this._boundOnWheel, { passive: false });

  this.canvas.addEventListener('touchstart', this._boundOnTouchStart, { passive: false });
  this.canvas.addEventListener('touchmove', this._boundOnTouchMove, { passive: false });
  this.canvas.addEventListener('touchend', this._boundOnTouchEnd);
  this.canvas.addEventListener('touchcancel', this._boundOnTouchEnd);

  this.canvas.addEventListener('mouseleave', this._boundOnMouseLeave);
  window.addEventListener('mousemove', this._boundOnMouseMove);
  window.addEventListener('mouseup', this._boundOnMouseUp);
}

updateColors() {
  const style = getComputedStyle(document.documentElement);
  for (const varName of CSS_COLOR_VARS) this.colors[varName] = style.getPropertyValue(varName).trim() || CSS_COLORS[varName] || '';
  for (let slot = 0; slot < 5; slot++)
    for (const ch of ['S11', 'S21', 'S12', 'S22'])
      this.colors[`--trace-m${slot}-${ch}`] = style.getPropertyValue(`--trace-m${slot}-${ch.toLowerCase()}`).trim() || '#888888';
}

getFont(type) { return getComputedStyle(document.documentElement).getPropertyValue(`--font-${type}`).trim() || "400 12px/1.2 'Arial', sans-serif"; }
getCSSColor(varName, fallback) { return this.colors[varName] ?? fallback ?? CSS_COLORS[varName] ?? '#888888'; }
getTraceColor(slot, channel) { return this.getCSSColor(`--trace-${slot}-${channel}`, '#888888'); }

setRegions(regions) {
  this.areas.forEach((area, i) => { area.region = regions[i] || { leftPct: 0, rightPct: 0, topPct: 0, bottomPct: 0 }; });
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

setRange(start, stop) {
  for (const area of this.areas) area.setRange(start, stop);
  this.redraw(true);
  updateFreqInputs();
}

resetToRange(slot) {
  const f = this.data.getSlot(slot, 'S11').freqs;
  if (f.length === 0) return;
  this.setRange(f[0], f[f.length - 1]);
}

resetView() { for (const area of this.areas) area.resetView(this.data); this.redraw(true); }

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
  for (const area of this.areas) {
    if (!area.visible) continue;
    if (dirty) area.calculateCache(this.data, this);
    area.draw(this.ctx, this);
  }
}

updateMarkers() {
  for (const area of this.areas) area.updateMarkerPoints(this.markers);
  updateMarkerTable();
  this.redraw();
}

addMarker() {
  const area = this.areas[0];
  if (!area) return;
  const { xMin, xMax } = area.view;
  let freq = xMin + (xMax - xMin) * (this.markers.length + 1) / 10;
  if (freq > xMax) freq = xMax;
  this.markers.push({ freq: Math.round(freq) });
  this.selectMarker(this.markers.length - 1);
}

setMarkerFreq(idx, freq) {
  if (idx < 0 || idx >= this.markers.length || isNaN(freq) || freq < 0) return;
  this.markers[idx].freq = Math.round(freq);
  this.updateMarkers();
}

removeSelectedMarker() {
  if (this.selectedMarkerIndex < 0 || this.selectedMarkerIndex >= this.markers.length) return;
  this.markers.splice(this.selectedMarkerIndex, 1);
  this.selectedMarkerIndex = this.markers.length > 0 ? Math.min(this.selectedMarkerIndex, this.markers.length - 1) : -1;
  this.updateMarkers();
}

selectMarker(index) {
  if (this.selectedMarkerIndex === index) return;
  this.selectedMarkerIndex = index;
  this.updateMarkers();
}

_tryRegisterDrag(area, info, x, y) {
  this.selectMarker(info.zone === 'marker' ? info.index : -1);
  if (info.zone === 'marker') {
    this.mouse.handler = (action, mx, my) => this._markerDragHandler(action, area, mx, my);
    this.mouse.handlerData = { area, index: info.index };
    this.canvas.style.cursor = info.cursor;
    return true;
  } else if (info.zone === 'x' || info.zone === 'y') {
    this.mouse.handler = (action, mx, my) => this._axisDragHandler(action, area, mx, my);
    this.mouse.handlerData = { area, info, lastX: x, lastY: y};
    this.canvas.style.cursor = info.cursor;
    return true;
  }
  return false;
}

_markerDragHandler(action, area, x, y) {
  if (action === 'drag') {
    if (area.rad) {
      const nearest = area.findNearestInCache(x, y, Infinity, area.cachedPoints);
      if (nearest) this.setMarkerFreq(this.mouse.handlerData.index, nearest.point.freq);
    } else {
      const { bounds, view } = area;
      let freq = view.xMin + (x - bounds.left) / bounds.width * (view.xMax - view.xMin);
      if (freq < view.xMin) freq = view.xMin; if (freq > view.xMax) freq = view.xMax;
      this.setMarkerFreq(this.mouse.handlerData.index, freq);
    }
  }
  return true;
}

applyAxisDelta(area, info, delta) {
  if (!area || !info.zone) return;
  const { view } = area;
  if (info.zone === 'x') {
    if (info.min && view.xMin < delta) { delta = view.xMin;}
    if (info.min) view.xMin -= delta;
    if (info.max) view.xMax -= delta;
  } else if (info.zone === 'y') {
    if (info.min && view.yLimit != null && view.yMin < delta + view.yLimit) { delta = view.yMin - view.yLimit;}
    if (info.min) view.yMin -= delta;
    if (info.max) view.yMax -= delta;
  }
  this.redraw(true);
}

_axisDragHandler(action, area, x, y) {
  if (action === 'drag') {
    const { info, lastX, lastY } = this.mouse.handlerData;
    const { bounds, view } = area;
    const delta = info.zone === 'x' ? (x - lastX) * (view.xMax - view.xMin) / bounds.width : (lastY - y) * (view.yMax - view.yMin) / bounds.height;
    this.applyAxisDelta(area, info, delta);
    this.mouse.handlerData.lastX = x;
    this.mouse.handlerData.lastY = y;
  }
}

// Mouse and touch handlers
getMouseCoords(e) { const rect = this.canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
onMouseUp() { if (this.mouse.handler) { this.mouse.handler('release', this.mouse.x, this.mouse.y); this.mouse.handler = null; } }
onMouseDown(e) {
  const { x, y } = this.getMouseCoords(e);
  this.mouse.handler = null;
  for (const area of this.areas) {
    const info = area.getMouseArea(x, y, this.markers);
    if (info && this._tryRegisterDrag(area, info, x, y)) return;
  }
}

onMouseMove(e) {
  const { x, y } = this.getMouseCoords(e);
  this.mouse.x = x; this.mouse.y = y;
  if (this.mouse.handler) { this.mouse.handler('drag', x, y); return; }
  const { width, height } = this.canvas.getBoundingClientRect();
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  let cursor = 'crosshair';
  for (const area of this.areas) {
    const info = area.getMouseArea(x, y, this.markers);
    if (info) { cursor = info.cursor; break; }
  }
  this.redraw(false);
  this.canvas.style.cursor = cursor;
}

onMouseLeave() {
  if (this.mouse.handler) return;
  this.mouse.x = -1; this.mouse.y = -1;
  this.redraw();
}

onWheel(e) {
  e.preventDefault();
  const { x, y } = this.getMouseCoords(e);
  for (const area of this.areas) {
    const info = area.getMouseArea(x, y);
    if (!info || info.zone === 'plot') continue;
    const range = info.zone === 'x' ? area.view.xMax - area.view.xMin : area.view.yMax - area.view.yMin;
    const delta = range * GRAPH_CONST.ZOOM_FACTOR;
    this.applyAxisDelta(area, info, e.deltaY > 0 ? delta : -delta);
  }
}

// Touch handlers emulate mouse
touchToMouse(e) {
  e.preventDefault();
  if (e.touches.length !== 1) return null;
  return e.touches[0];
}

onTouchStart(e) {
  const t = this.touchToMouse(e);
  if (t) this.onMouseDown(t);
}

onTouchMove(e) {
  const t = this.touchToMouse(e);
  if (t) this.onMouseMove(t);
}

onTouchEnd(e) {
  e.preventDefault();
  this.onMouseUp();
  this.onMouseMove({ clientX: -1, clientY: -1});
  this.redraw();
}

}