import { ENTITY_TYPE_LABELS, FLOW_LABELS, ROLE_LABELS, type LeadEntity, type LeadEntityFlow, type LeadEntityRole } from './types';
import { formatMoney, structuralEdges, LAYOUT, fyLabel } from './servicing';

const NODE_W = LAYOUT.nodeW;
const NODE_H = LAYOUT.nodeH;

const TONE: Record<string, { fill: string; stroke: string }> = {
  individual: { fill: '#eef4ff', stroke: '#3b82f6' },
  company: { fill: '#f5f5f4', stroke: '#9ca3af' },
  discretionary_trust: { fill: '#ecfdf5', stroke: '#16a34a' },
  unit_trust: { fill: '#ecfdf5', stroke: '#16a34a' },
  partnership: { fill: '#fffbeb', stroke: '#f59e0b' },
  smsf: { fill: '#fef2f2', stroke: '#ef4444' },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Naive width-aware wrap for node titles. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
    else { lines.push(line); line = w; }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > maxChars) lines[maxLines - 1] = last.slice(0, maxChars - 1) + '…';
  }
  return lines;
}

export function buildStructureSvg(
  entities: LeadEntity[],
  flows: LeadEntityFlow[],
  roles: LeadEntityRole[],
  opts: { title: string; financialYear: number },
): { svg: string; width: number; height: number } {
  const pos = (id: string) => {
    const e = entities.find(x => x.id === id);
    return { x: e?.position_x ?? 0, y: e?.position_y ?? 0 };
  };

  const xs = entities.map(e => e.position_x);
  const ys = entities.map(e => e.position_y);
  const minX = Math.min(...xs, 0) - 120;
  const minY = Math.min(...ys, 0) - 40;
  const maxX = Math.max(...xs, 0) + NODE_W + 220;
  const maxY = Math.max(...ys, 0) + NODE_H + 60;
  const headerH = 70;
  const legendH = 46;
  const width = Math.max(maxX - minX, 640);
  const height = maxY - minY + headerH + legendH;

  const parts: string[] = [];

  // Control (dashed) lines
  structuralEdges(roles, entities, flows).forEach((e, i) => {
    const a = pos(e.from);
    const b = pos(e.to);
    let d: string, lx: number, ly: number;
    if (b.y > a.y + NODE_H / 2) {
      const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H, x2 = b.x + NODE_W / 2, y2 = b.y - 6;
      const midY = (y1 + y2) / 2;
      d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      lx = x1 + (x2 - x1) * 0.72; ly = y1 + (y2 - y1) * 0.5;
    } else {
      const lane = Math.max(a.x, b.x) + NODE_W + 70 + i * 34;
      const sx = a.x + NODE_W, sy = a.y + NODE_H / 2, tx = b.x + NODE_W + 6, ty = b.y + NODE_H / 2;
      d = `M ${sx} ${sy} C ${lane} ${sy}, ${lane} ${ty}, ${tx} ${ty}`;
      lx = lane; ly = (sy + ty) / 2 + i * 24;
    }
    parts.push(
      `<path d="${d}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5" marker-end="url(#ctrl)"/>` +
      `<rect x="${lx - 44}" y="${ly - 9}" width="88" height="18" rx="9" fill="#ffffff" stroke="#e5e7eb"/>` +
      `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="10" fill="#6b7280">${esc(e.label)}</text>`,
    );
  });

  // Money arrows
  flows.forEach(f => {
    const a = pos(f.from_entity_id);
    const b = pos(f.to_entity_id);
    const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H, x2 = b.x + NODE_W / 2, y2 = b.y - 6;
    const midY = (y1 + y2) / 2;
    const lx = x1 + (x2 - x1) * 0.78;
    const ly = y1 + (y2 - y1) * 0.62;
    const colour = f.use_for_servicing ? '#16a34a' : '#9ca3af';
    parts.push(
      `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" fill="none" stroke="${colour}" stroke-width="2.5" marker-end="url(#money)"/>` +
      `<rect x="${lx - 78}" y="${ly - 15}" width="156" height="30" rx="15" fill="${f.use_for_servicing ? '#ecfdf5' : '#f3f4f6'}" stroke="${colour}" stroke-width="1.5"/>` +
      `<text x="${lx}" y="${ly - 2}" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">${esc(formatMoney(f.amount))}</text>` +
      `<text x="${lx}" y="${ly + 10}" text-anchor="middle" font-size="9" fill="#6b7280" letter-spacing="0.5">${esc((FLOW_LABELS[f.flow_type] ?? '').toUpperCase())}</text>`,
    );
  });

  // Nodes
  entities.forEach(en => {
    const tone = TONE[en.entity_type] ?? TONE.company;
    const trustee = en.trustee_entity_id ? entities.find(e => e.id === en.trustee_entity_id) : null;
    const lines = wrap(en.name, 24, 2);
    parts.push(`<g>`);
    parts.push(`<rect x="${en.position_x}" y="${en.position_y}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="${tone.fill}" stroke="${tone.stroke}" stroke-width="2"/>`);
    lines.forEach((l, i) => {
      parts.push(`<text x="${en.position_x + 12}" y="${en.position_y + 20 + i * 14}" font-size="13" font-weight="600" fill="#111827">${esc(l)}</text>`);
    });
    const infoY = en.position_y + 22 + lines.length * 14;
    parts.push(`<text x="${en.position_x + 12}" y="${infoY}" font-size="10" fill="#6b7280">${esc(ENTITY_TYPE_LABELS[en.entity_type])}</text>`);
    const chips: string[] = [];
    if (en.is_applicant) chips.push('On the loan');
    if (trustee) chips.push(`Trustee: ${trustee.name.length > 22 ? trustee.name.slice(0, 21) + '…' : trustee.name}`);
    chips.forEach((c, i) => {
      parts.push(`<text x="${en.position_x + 12}" y="${infoY + 14 + i * 12}" font-size="10" fill="${i === 0 && en.is_applicant ? '#1d4ed8' : '#6b7280'}">${esc(c)}</text>`);
    });
    parts.push(`</g>`);
  });

  const legendY = maxY - minY + headerH + 24;
  const legend =
    `<line x1="24" y1="${legendY - 4}" x2="52" y2="${legendY - 4}" stroke="#16a34a" stroke-width="2.5"/>` +
    `<text x="60" y="${legendY}" font-size="11" fill="#6b7280">Money paid or distributed</text>` +
    `<line x1="240" y1="${legendY - 4}" x2="268" y2="${legendY - 4}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4"/>` +
    `<text x="276" y="${legendY}" font-size="11" fill="#6b7280">Controls / is appointed to</text>` +
    `<text x="470" y="${legendY}" font-size="11" fill="#6b7280">Blue outline text = applicant on the loan</text>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Poppins, Helvetica, Arial, sans-serif">` +
    `<defs>` +
    `<marker id="money" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 z" fill="#16a34a"/></marker>` +
    `<marker id="ctrl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#94a3b8"/></marker>` +
    `</defs>` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>` +
    `<text x="24" y="34" font-size="17" font-weight="700" fill="#111827">${esc(opts.title)}</text>` +
    `<text x="24" y="52" font-size="12" fill="#6b7280">Business structure &amp; income flow · ${esc(fyLabel(opts.financialYear))}</text>` +
    `<g transform="translate(${-minX}, ${headerH - minY})">${parts.join('')}</g>` +
    legend +
    `</svg>`;

  return { svg, width, height };
}

/** Render the structure chart to a PNG and trigger a browser download. */
export async function downloadStructureChart(
  entities: LeadEntity[],
  flows: LeadEntityFlow[],
  roles: LeadEntityRole[],
  opts: { title: string; financialYear: number },
) {
  const { svg, width, height } = buildStructureSvg(entities, flows, roles, opts);
  const scale = 2;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not render chart'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const link = document.createElement('a');
  link.download = `${opts.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-structure-${opts.financialYear}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export { ROLE_LABELS };
