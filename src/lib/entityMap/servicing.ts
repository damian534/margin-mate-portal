import type { FlowType, LeadEntity, LeadEntityFlow } from './types';

export interface ApplicantIncome {
  entityId: string;
  name: string;
  total: number;
  byType: Record<string, number>;
}

export interface ServicingWarning {
  kind: 'dead_end' | 'cycle' | 'orphan_flow' | 'excluded';
  message: string;
}

export interface ServicingSummary {
  applicants: ApplicantIncome[];
  totalServiceable: number;
  totalTrapped: number;
  warnings: ServicingWarning[];
}

export function flowsForYear(flows: LeadEntityFlow[], fy: number): LeadEntityFlow[] {
  return flows.filter(f => f.financial_year === fy);
}

/** Aggregate income landing on applicant entities for a financial year. */
export function computeServicing(
  entities: LeadEntity[],
  flows: LeadEntityFlow[],
  fy: number,
): ServicingSummary {
  const byId = new Map(entities.map(e => [e.id, e]));
  const yearFlows = flowsForYear(flows, fy);
  const applicants = new Map<string, ApplicantIncome>();
  const warnings: ServicingWarning[] = [];
  let totalTrapped = 0;

  for (const e of entities) {
    if (e.is_applicant) {
      applicants.set(e.id, { entityId: e.id, name: e.name, total: 0, byType: {} });
    }
  }

  for (const f of yearFlows) {
    const to = byId.get(f.to_entity_id);
    const from = byId.get(f.from_entity_id);
    if (!to || !from) {
      warnings.push({ kind: 'orphan_flow', message: 'A flow points at an entity that no longer exists.' });
      continue;
    }
    if (!to.is_applicant) {
      totalTrapped += f.amount;
      continue;
    }
    if (!f.use_for_servicing) {
      warnings.push({
        kind: 'excluded',
        message: `${formatMoney(f.amount)} from ${from.name} to ${to.name} is marked as not usable for servicing.`,
      });
      continue;
    }
    const acc = applicants.get(to.id)!;
    acc.total += f.amount;
    acc.byType[f.flow_type] = (acc.byType[f.flow_type] ?? 0) + f.amount;
  }

  // Money that stops at a non-applicant entity and is never passed on
  for (const e of entities) {
    if (e.is_applicant) continue;
    const incoming = yearFlows.filter(f => f.to_entity_id === e.id);
    const outgoing = yearFlows.filter(f => f.from_entity_id === e.id);
    const inSum = sum(incoming.map(f => f.amount));
    const outSum = sum(outgoing.map(f => f.amount));
    if (inSum > 0 && outSum < inSum) {
      warnings.push({
        kind: 'dead_end',
        message: `${formatMoney(inSum - outSum)} stays in ${e.name} (not an applicant) — not usable for servicing.`,
      });
    }
  }

  for (const cycle of detectCycles(entities, yearFlows)) {
    warnings.push({ kind: 'cycle', message: `Circular distribution detected: ${cycle.join(' → ')}.` });
  }

  const list = [...applicants.values()].sort((a, b) => b.total - a.total);
  return {
    applicants: list,
    totalServiceable: sum(list.map(a => a.total)),
    totalTrapped,
    warnings,
  };
}

/** Upstream chain of entity ids feeding a target entity (breadth-first, cycle safe). */
export function traceUpstream(
  entityId: string,
  flows: LeadEntityFlow[],
  fy: number,
): { entityIds: Set<string>; flowIds: Set<string> } {
  const yearFlows = flowsForYear(flows, fy);
  const entityIds = new Set<string>([entityId]);
  const flowIds = new Set<string>();
  const queue = [entityId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const f of yearFlows) {
      if (f.to_entity_id !== current || flowIds.has(f.id)) continue;
      flowIds.add(f.id);
      if (!entityIds.has(f.from_entity_id)) {
        entityIds.add(f.from_entity_id);
        queue.push(f.from_entity_id);
      }
    }
  }
  return { entityIds, flowIds };
}

export function detectCycles(entities: LeadEntity[], flows: LeadEntityFlow[]): string[][] {
  const nameOf = new Map(entities.map(e => [e.id, e.name]));
  const adjacency = new Map<string, string[]>();
  for (const f of flows) {
    adjacency.set(f.from_entity_id, [...(adjacency.get(f.from_entity_id) ?? []), f.to_entity_id]);
  }
  const cycles: string[][] = [];
  const seenKeys = new Set<string>();
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];

  const visit = (node: string) => {
    state.set(node, 1);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (state.get(next) === 1) {
        const start = stack.indexOf(next);
        const loop = stack.slice(start).concat(next);
        const key = [...loop].sort().join('|');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          cycles.push(loop.map(id => nameOf.get(id) ?? '?'));
        }
      } else if (!state.get(next)) {
        visit(next);
      }
    }
    stack.pop();
    state.set(node, 2);
  };

  for (const e of entities) if (!state.get(e.id)) visit(e.id);
  return cycles;
}

export interface StructuralEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

const CONTROL_ROLES: RoleType[] = ['director', 'shareholder', 'trustee', 'appointor', 'partner', 'employee'];

/**
 * Control/ownership relationships drawn as dashed lines.
 * Control always points downward: person -> company -> trust.
 * Beneficiary style roles are rendered only when no money flow already shows the link.
 */
export function structuralEdges(roles: LeadEntityRole[], entities: LeadEntity[], flows: LeadEntityFlow[]): StructuralEdge[] {
  const ids = new Set(entities.map(e => e.id));
  const moneyPairs = new Set(flows.map(f => `${f.from_entity_id}->${f.to_entity_id}`));
  const out: StructuralEdge[] = [];
  for (const r of roles) {
    if (!r.person_entity_id || !ids.has(r.person_entity_id) || !ids.has(r.entity_id)) continue;
    const isControl = CONTROL_ROLES.includes(r.role);
    const from = isControl ? r.person_entity_id : r.entity_id;
    const to = isControl ? r.entity_id : r.person_entity_id;
    if (from === to) continue;
    if (!isControl && moneyPairs.has(`${from}->${to}`)) continue;
    out.push({ id: r.id, from, to, label: ROLE_LABELS[r.role] ?? r.role });
  }
  return out;
}

export const LAYOUT = { nodeW: 210, nodeH: 84, gapX: 46, gapY: 116, padding: 48 };

/**
 * Layered layout: whoever controls or pays sits above whoever receives.
 * Rows are centred so the structure reads top-to-bottom like an org chart.
 */
export function autoLayout(
  entities: LeadEntity[],
  flows: LeadEntityFlow[],
  roles: LeadEntityRole[] = [],
) {
  const edges: { from: string; to: string }[] = [
    ...flows.map(f => ({ from: f.from_entity_id, to: f.to_entity_id })),
    ...structuralEdges(roles, entities, flows).map(e => ({ from: e.from, to: e.to })),
  ];

  const incoming = new Map<string, string[]>();
  for (const e of edges) incoming.set(e.to, [...(incoming.get(e.to) ?? []), e.from]);

  const depth = new Map<string, number>();
  const resolve = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const parents = (incoming.get(id) ?? []).filter(p => p !== id);
    const value = parents.length ? Math.max(...parents.map(p => resolve(p, seen))) + 1 : 0;
    depth.set(id, value);
    return value;
  };
  entities.forEach(e => resolve(e.id, new Set()));

  const rows = new Map<number, LeadEntity[]>();
  for (const e of entities) {
    const d = depth.get(e.id) ?? 0;
    rows.set(d, [...(rows.get(d) ?? []), e]);
  }

  const { nodeW, gapX, gapY, nodeH, padding } = LAYOUT;
  const widest = Math.max(...[...rows.values()].map(r => r.length), 1);
  const canvasW = widest * (nodeW + gapX) - gapX;
  const positions: Record<string, { x: number; y: number }> = {};

  // Order each row by the average x of its parents so lines cross as little as possible.
  [...rows.keys()].sort((a, b) => a - b).forEach(d => {
    const row = (rows.get(d) ?? []).slice().sort((a, b) => {
      const px = (id: string) => {
        const parents = (incoming.get(id) ?? []).map(p => positions[p]?.x).filter(v => v !== undefined) as number[];
        return parents.length ? sum(parents) / parents.length : Number.MAX_SAFE_INTEGER;
      };
      return px(a.id) - px(b.id);
    });
    const rowW = row.length * (nodeW + gapX) - gapX;
    const startX = padding + (canvasW - rowW) / 2;
    row.forEach((e, i) => {
      positions[e.id] = { x: Math.round(startX + i * (nodeW + gapX)), y: padding + d * (nodeH + gapY) };
    });
  });
  return positions;
}


export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export const FLOW_TYPE_ORDER: FlowType[] = [
  'trust_distribution', 'dividend', 'wages', 'director_fee',
  'partnership_share', 'net_profit', 'retained_profit', 'other',
];

/** Australian FY label for a FY end year (2026 => "FY 2025/26"). */
export function fyLabel(fy: number): string {
  return `FY ${fy - 1}/${String(fy).slice(2)}`;
}

export function currentFinancialYear(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}
