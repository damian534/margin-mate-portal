export type EntityType =
  | 'individual'
  | 'company'
  | 'discretionary_trust'
  | 'unit_trust'
  | 'partnership'
  | 'smsf';

export type RoleType =
  | 'director'
  | 'shareholder'
  | 'beneficiary'
  | 'unit_holder'
  | 'trustee'
  | 'appointor'
  | 'partner'
  | 'employee';

export type FlowType =
  | 'trust_distribution'
  | 'dividend'
  | 'wages'
  | 'director_fee'
  | 'partnership_share'
  | 'net_profit'
  | 'retained_profit'
  | 'other';

export interface LeadEntity {
  id: string;
  lead_id: string;
  name: string;
  entity_type: EntityType;
  abn: string | null;
  acn: string | null;
  trustee_entity_id: string | null;
  is_applicant: boolean;
  fy_end: string | null;
  notes: string | null;
  position_x: number;
  position_y: number;
  sort_order: number;
}

export interface LeadEntityRole {
  id: string;
  lead_id: string;
  entity_id: string;
  person_entity_id: string | null;
  person_name: string | null;
  role: RoleType;
  percentage: number | null;
}

export interface LeadEntityFlow {
  id: string;
  lead_id: string;
  from_entity_id: string;
  to_entity_id: string;
  financial_year: number;
  amount: number;
  flow_type: FlowType;
  use_for_servicing: boolean;
  notes: string | null;
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  individual: 'Individual',
  company: 'Company (Pty Ltd)',
  discretionary_trust: 'Discretionary Trust',
  unit_trust: 'Unit Trust',
  partnership: 'Partnership',
  smsf: 'SMSF',
};

export const ROLE_LABELS: Record<RoleType, string> = {
  director: 'Director',
  shareholder: 'Shareholder',
  beneficiary: 'Beneficiary',
  unit_holder: 'Unit holder',
  trustee: 'Trustee',
  appointor: 'Appointor',
  partner: 'Partner',
  employee: 'Employee',
};

export const FLOW_LABELS: Record<FlowType, string> = {
  trust_distribution: 'Trust distribution',
  dividend: 'Dividend',
  wages: 'Wages / PAYG',
  director_fee: 'Director fee',
  partnership_share: 'Partnership share',
  net_profit: 'Net profit',
  retained_profit: 'Retained profit',
  other: 'Other',
};

/** Tailwind token classes per entity type (semantic tokens only). */
export const ENTITY_TONE: Record<EntityType, { box: string; chip: string }> = {
  individual: { box: 'border-primary/40 bg-primary/5', chip: 'bg-primary/10 text-primary' },
  company: { box: 'border-border bg-muted/40', chip: 'bg-muted text-muted-foreground' },
  discretionary_trust: { box: 'border-success/40 bg-success/5', chip: 'bg-success/10 text-success' },
  unit_trust: { box: 'border-success/40 bg-success/5', chip: 'bg-success/10 text-success' },
  partnership: { box: 'border-warning/40 bg-warning/5', chip: 'bg-warning/10 text-warning' },
  smsf: { box: 'border-destructive/30 bg-destructive/5', chip: 'bg-destructive/10 text-destructive' },
};
