export type FieldType =
  | 'text' | 'number' | 'email' | 'tel' | 'date'
  | 'select' | 'textarea' | 'radio' | 'currency'
  | 'checkbox' | 'button-group' | 'heading' | 'info'
  | 'repeatable' | 'address';

export interface WizardField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  half?: boolean;
  description?: string;
  /** Show this field only when condition returns true */
  condition?: (data: Record<string, any>) => boolean;
  /** For 'repeatable' type – the sub-fields in each repeated item */
  fields?: WizardField[];
  /** Label template for each item, e.g. "Investment Property" → "Investment Property 1" */
  itemLabel?: string;
  maxItems?: number;
  minItems?: number;
}

export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  sectionKey: string;          // maps to fact_find_responses.section
  fields: WizardField[];
  /** Step is only shown when this returns true. Receives ALL form data keyed by sectionKey. */
  condition?: (allData: Record<string, Record<string, any>>) => boolean;
}

export type AllFormData = Record<string, Record<string, any>>;
