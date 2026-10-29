(() => {
  'use strict';

  const Nawi = (window.Nawi = window.Nawi || {});
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const svgEl = (name, attrs = {}, parent = null) => {
    const el = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (parent) parent.appendChild(el);
    return el;
  };

  const svgText = (content, attrs, parent) => {
    const el = svgEl('text', attrs, parent);
    el.textContent = content;
    return el;
  };

  const scaleLinear = ([d0, d1], [r0, r1]) => {
    const scale = (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
    scale.invert = (px) => d0 + ((px - r0) / (r1 - r0)) * (d1 - d0);
    return scale;
  };

  const niceStep = (span, count) => {
    const raw = span / Math.max(count, 1);
    const power = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / power;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return nice * power;
  };

  const niceDomain = (min, max, count) => {
    const step = niceStep(max - min, count);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
    return { lo, hi, ticks };
  };

  const pathFrom = (points) =>
    points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

  // Redibuja con las dimensiones reales del contenedor para que el texto conserve su tamaño.
  const observeSize = (container, draw) => {
    let frame = 0;
    let lastWidth = 0;
    const run = () => {
      const width = Math.round(container.clientWidth);
      if (!width || width === lastWidth) return;
      lastWidth = width;
      draw(width, Math.round(container.clientHeight));
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    });
    observer.observe(container);
    run();
  };

  const createTooltip = (container) => {
    const tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');
    container.appendChild(tip);

    return {
      show(rows, x, y) {
        tip.replaceChildren(
          ...rows.map(([label, value, modifier], index) => {
            const row = document.createElement('div');
            row.className = index === 0 ? 'chart-tooltip__row chart-tooltip__row--title' : 'chart-tooltip__row';
            if (modifier) {
              const swatch = document.createElement('span');
              swatch.className = `chart-tooltip__swatch chart-tooltip__swatch--${modifier}`;
              row.appendChild(swatch);
            }
            const labelEl = document.createElement('span');
            labelEl.className = 'chart-tooltip__label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'chart-tooltip__value';
            valueEl.textContent = value;
            row.append(labelEl, valueEl);
            return row;
          })
        );
        tip.hidden = false;
        const maxX = container.clientWidth - tip.offsetWidth - 4;
        const left = Math.min(Math.max(x + 12, 4), maxX);
        const top = Math.max(y - tip.offsetHeight - 10, 4);
        tip.style.transform = `translate(${left}px, ${top}px)`;
      },
      hide() {
        tip.hidden = true;
      },
    };
  };

  const createSvg = (container, labelledBy) => {
    const svg = svgEl('svg', {
      class: 'chart__svg',
      role: 'img',
      'aria-labelledby': labelledBy,
      focusable: 'false',
    });
    container.prepend(svg);
    return svg;
  };

  const lineChart = (container, options) => {
    const { categories, series, events = [], formatValue, labelledBy } = options;
    const svg = createSvg(container, labelledBy);
    const tooltip = createTooltip(container);
    const margin = { top: 22, right: 12, bottom: 26, left: 50 };
    const all = series.flatMap((s) => s.values);

    const draw = (width, height) => {
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const { lo, hi, ticks } = niceDomain(Math.min(...all), Math.max(...all), 4);
      const x = scaleLinear([0, categories.length - 1], [margin.left, margin.left + innerW]);
      const y = scaleLinear([lo, hi], [margin.top + innerH, margin.top]);

      const grid = svgEl('g', { class: 'chart__grid' }, svg);
      ticks.forEach((tick) => {
        svgEl('line', { x1: margin.left, x2: margin.left + innerW, y1: y(tick), y2: y(tick), class: 'chart__gridline' }, grid);
        svgText(formatValue(tick), { x: margin.left - 8, y: y(tick), class: 'chart__tick chart__tick--y' }, grid);
      });

      const every = innerW / categories.length < 34 ? 3 : 2;
      categories.forEach((label, i) => {
        if (i % every !== 0 && i !== categories.length - 1) return;
        svgText(label, { x: x(i), y: height - 6, class: 'chart__tick chart__tick--x' }, grid);
      });

      events.forEach(({ index, label }) => {
        const g = svgEl('g', { class: 'chart__event' }, svg);
        svgEl('line', { x1: x(index), x2: x(index), y1: margin.top - 4, y2: margin.top + innerH, class: 'chart__event-line' }, g);
        const anchor = x(index) > width * 0.6 ? 'end' : 'start';
        svgText(label, { x: x(index) + (anchor === 'end' ? -6 : 6), y: margin.top - 8, 'text-anchor': anchor, class: 'chart__annotation' }, g);
      });

      series.forEach((s) => {
        const points = s.values.map((v, i) => [x(i), y(v)]);
        svgEl('path', { d: pathFrom(points), class: `chart__line chart__line--${s.modifier}` }, svg);
        const [lx, ly] = points[points.length - 1];
        svgEl('circle', { cx: lx, cy: ly, r: 4, class: `chart__dot chart__dot--${s.modifier}` }, svg);
      });

      const crosshair = svgEl('line', { class: 'chart__crosshair', y1: margin.top, y2: margin.top + innerH, visibility: 'hidden' }, svg);
      const hoverDots = series.map((s) =>
        svgEl('circle', { r: 5, class: `chart__dot chart__dot--${s.modifier}`, visibility: 'hidden' }, svg)
      );
      const hit = svgEl('rect', { x: margin.left, y: 0, width: innerW, height, class: 'chart__hit' }, svg);

      hit.addEventListener('pointermove', (event) => {
        const rect = svg.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const i = Math.min(categories.length - 1, Math.max(0, Math.round(x.invert(px))));
        crosshair.setAttribute('x1', x(i));
        crosshair.setAttribute('x2', x(i));
        crosshair.setAttribute('visibility', 'visible');
        hoverDots.forEach((dot, k) => {
          dot.setAttribute('cx', x(i));
          dot.setAttribute('cy', y(series[k].values[i]));
          dot.setAttribute('visibility', 'visible');
        });
        tooltip.show(
          [[`Semana ${categories[i].slice(1)}`, ''], ...series.map((s) => [s.label, formatValue(s.values[i]), s.modifier])],
          x(i),
          y(Math.max(...series.map((s) => s.values[i])))
        );
      });
      hit.addEventListener('pointerleave', () => {
        crosshair.setAttribute('visibility', 'hidden');
        hoverDots.forEach((dot) => dot.setAttribute('visibility', 'hidden'));
        tooltip.hide();
      });
    };

    observeSize(container, draw);
  };

  const demandChart = (container, options) => {
    const { curve, range, floorPrice, competitorPrice, markers = [], formatPrice, formatUnits, labelledBy, onSelect } = options;
    const svg = createSvg(container, labelledBy);
    const tooltip = createTooltip(container);
    const margin = { top: 26, right: 14, bottom: 40, left: 48 };
    const maxUnits = Math.max(...curve.map((p) => p.units));
    let selected = null;
    let place = () => {};

    const draw = (width, height) => {
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const { hi, ticks } = niceDomain(0, maxUnits, 4);
      const x = scaleLinear([range.min, range.max], [margin.left, margin.left + innerW]);
      const y = scaleLinear([0, hi], [margin.top + innerH, margin.top]);

      const floorX = x(Math.max(range.min, floorPrice));
      const zone = svgEl('g', { class: 'chart__zone' }, svg);
      svgEl('rect', { x: margin.left, y: margin.top, width: floorX - margin.left, height: innerH, class: 'chart__zone-area' }, zone);
      svgText('Bajo margen piso', { x: margin.left + 6, y: margin.top + 14, class: 'chart__zone-label' }, zone);

      const grid = svgEl('g', { class: 'chart__grid' }, svg);
      ticks.forEach((tick) => {
        svgEl('line', { x1: margin.left, x2: margin.left + innerW, y1: y(tick), y2: y(tick), class: 'chart__gridline' }, grid);
        svgText(formatUnits(tick), { x: margin.left - 8, y: y(tick), class: 'chart__tick chart__tick--y' }, grid);
      });
      const xTicks = niceDomain(range.min, range.max, innerW < 320 ? 3 : 5).ticks.filter((t) => t >= range.min && t <= range.max);
      xTicks.forEach((tick) => {
        svgText(formatPrice(tick), { x: x(tick), y: margin.top + innerH + 16, class: 'chart__tick chart__tick--x' }, grid);
      });
      svgText('Precio de venta (MXN)', { x: margin.left + innerW, y: height - 4, class: 'chart__axis-title', 'text-anchor': 'end' }, grid);
      svgText('Unidades / mes', { x: margin.left - 40, y: margin.top - 12, class: 'chart__axis-title' }, grid);

      const comp = svgEl('g', { class: 'chart__reference' }, svg);
      svgEl('line', { x1: x(competitorPrice), x2: x(competitorPrice), y1: margin.top, y2: margin.top + innerH, class: 'chart__reference-line' }, comp);
      svgText('Mediana competencia', { x: x(competitorPrice) + 6, y: margin.top + 30, class: 'chart__annotation' }, comp);

      svgEl('path', { d: pathFrom(curve.map((p) => [x(p.price), y(p.units)])), class: 'chart__line chart__line--demand' }, svg);

      markers.forEach((m) => {
        const g = svgEl('g', { class: 'chart__marker' }, svg);
        svgEl('circle', { cx: x(m.price), cy: y(m.units), r: 5, class: `chart__marker-dot chart__marker-dot--${m.modifier}` }, g);
        if (m.label) svgText(m.label, { x: x(m.price), y: y(m.units) - 12, 'text-anchor': 'middle', class: 'chart__marker-label' }, g);
      });

      const guide = svgEl('g', { class: 'chart__guide', visibility: 'hidden' }, svg);
      const guideV = svgEl('line', { class: 'chart__guide-line' }, guide);
      const guideH = svgEl('line', { class: 'chart__guide-line' }, guide);
      const point = svgEl('circle', { r: 7, class: 'chart__selected' }, svg);
      point.setAttribute('visibility', 'hidden');

      place = (price, units) => {
        const px = x(price);
        const py = y(units);
        guideV.setAttribute('x1', px);
        guideV.setAttribute('x2', px);
        guideV.setAttribute('y1', py);
        guideV.setAttribute('y2', margin.top + innerH);
        guideH.setAttribute('x1', margin.left);
        guideH.setAttribute('x2', px);
        guideH.setAttribute('y1', py);
        guideH.setAttribute('y2', py);
        point.setAttribute('cx', px);
        point.setAttribute('cy', py);
        guide.setAttribute('visibility', 'visible');
        point.setAttribute('visibility', 'visible');
      };
      if (selected) place(selected.price, selected.units);

      if (onSelect) {
        const hit = svgEl('rect', { x: margin.left, y: 0, width: innerW, height, class: 'chart__hit chart__hit--clickable' }, svg);
        const priceAt = (event) => {
          const rect = svg.getBoundingClientRect();
          const raw = x.invert(event.clientX - rect.left);
          return Math.min(range.max, Math.max(range.min, range.min + Math.round((raw - range.min) / range.step) * range.step));
        };
        hit.addEventListener('pointermove', (event) => {
          const price = priceAt(event);
          const nearest = curve.reduce((a, b) => (Math.abs(b.price - price) < Math.abs(a.price - price) ? b : a));
          tooltip.show(
            [[formatPrice(price), ''], ['Unidades aprox.', formatUnits(nearest.units)], ['Clic para simular', '']],
            x(price),
            y(nearest.units)
          );
        });
        hit.addEventListener('pointerleave', () => tooltip.hide());
        hit.addEventListener('click', (event) => onSelect(priceAt(event)));
      }
    };

    observeSize(container, draw);

    return {
      select(price, units) {
        selected = { price, units };
        place(price, units);
      },
    };
  };

  Nawi.charts = { lineChart, demandChart };
})();
