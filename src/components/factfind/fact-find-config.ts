import { FieldConfig } from './FactFindSection';

export interface SectionConfig {
  key: string;
  title: string;
  iconName: string; // lucide icon name
  fields: FieldConfig[];
}

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const FACT_FIND_SECTIONS: SectionConfig[] = [
  {
    key: 'personal_details',
    title: 'Personal Details',
    iconName: 'User',
    fields: [
      { key: 'title', label: 'Title', type: 'select', half: true, options: [
        { value: 'mr', label: 'Mr' }, { value: 'mrs', label: 'Mrs' },
        { value: 'ms', label: 'Ms' }, { value: 'dr', label: 'Dr' },
        { value: 'miss', label: 'Miss' },
      ]},
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date', half: true },
      { key: 'marital_status', label: 'Marital Status', type: 'select', half: true, options: [
        { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' },
        { value: 'de_facto', label: 'De Facto' }, { value: 'divorced', label: 'Divorced' },
        { value: 'separated', label: 'Separated' }, { value: 'widowed', label: 'Widowed' },
      ]},
      { key: 'dependants', label: 'Number of Dependants', type: 'number', half: true, placeholder: '0' },
      { key: 'dependant_ages', label: 'Ages of Dependants', type: 'text', placeholder: 'e.g. 3, 7, 12' },
      { key: 'residential_address', label: 'Residential Address', type: 'text', placeholder: 'Full address' },
      { key: 'mailing_address', label: 'Mailing Address (if different)', type: 'text', placeholder: 'Leave blank if same' },
      { key: 'years_at_address', label: 'Years at Current Address', type: 'number', half: true, placeholder: '0' },
      { key: 'residency_status', label: 'Residency Status', type: 'select', half: true, options: [
        { value: 'citizen', label: 'Australian Citizen' },
        { value: 'permanent_resident', label: 'Permanent Resident' },
        { value: 'temporary_visa', label: 'Temporary Visa' },
        { value: 'nz_citizen', label: 'NZ Citizen' },
      ]},
      { key: 'previous_address', label: 'Previous Address (if < 3 years)', type: 'text' },
    ],
  },
  {
    key: 'employment',
    title: 'Employment Details',
    iconName: 'Briefcase',
    fields: [
      { key: 'employment_status', label: 'Employment Status', type: 'select', options: [
        { value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' },
        { value: 'casual', label: 'Casual' }, { value: 'self_employed', label: 'Self Employed' },
        { value: 'contractor', label: 'Contractor' }, { value: 'retired', label: 'Retired' },
        { value: 'not_employed', label: 'Not Employed' },
      ]},
      { key: 'employer_name', label: 'Employer / Business Name', type: 'text' },
      { key: 'job_title', label: 'Job Title / Position', type: 'text', half: true },
      { key: 'industry', label: 'Industry', type: 'text', half: true },
      { key: 'years_in_role', label: 'Years in Current Role', type: 'number', half: true, placeholder: '0' },
      { key: 'years_in_industry', label: 'Years in Industry', type: 'number', half: true, placeholder: '0' },
      { key: 'probation', label: 'Currently on Probation?', type: 'radio', options: YES_NO },
      { key: 'previous_employer', label: 'Previous Employer (if < 2 years)', type: 'text' },
      { key: 'previous_role_duration', label: 'Duration at Previous Employer', type: 'text', placeholder: 'e.g. 3 years' },
      { key: 'abn', label: 'ABN (if self-employed)', type: 'text', half: true },
      { key: 'gst_registered', label: 'GST Registered?', type: 'radio', options: YES_NO },
    ],
  },
  {
    key: 'income',
    title: 'Income',
    iconName: 'DollarSign',
    fields: [
      { key: 'base_salary', label: 'Base Salary (gross annual)', type: 'currency', half: true },
      { key: 'overtime', label: 'Overtime (annual)', type: 'currency', half: true },
      { key: 'bonuses', label: 'Bonuses (annual)', type: 'currency', half: true },
      { key: 'commission_income', label: 'Commission Income (annual)', type: 'currency', half: true },
      { key: 'rental_income', label: 'Rental Income (monthly)', type: 'currency', half: true },
      { key: 'other_income', label: 'Other Income (annual)', type: 'currency', half: true },
      { key: 'other_income_source', label: 'Other Income Source', type: 'text', placeholder: 'e.g. Centrelink, dividends' },
      { key: 'partner_income', label: 'Partner Base Salary (gross annual)', type: 'currency' },
      { key: 'partner_employment_status', label: 'Partner Employment Status', type: 'select', options: [
        { value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' },
        { value: 'casual', label: 'Casual' }, { value: 'self_employed', label: 'Self Employed' },
        { value: 'not_employed', label: 'Not Employed' },
      ]},
    ],
  },
  {
    key: 'assets',
    title: 'Assets',
    iconName: 'Home',
    fields: [
      { key: 'property_1_address', label: 'Property 1 — Address', type: 'text' },
      { key: 'property_1_value', label: 'Estimated Value', type: 'currency', half: true },
      { key: 'property_1_type', label: 'Type', type: 'select', half: true, options: [
        { value: 'ppor', label: 'Owner Occupied' }, { value: 'investment', label: 'Investment' },
      ]},
      { key: 'property_2_address', label: 'Property 2 — Address (if applicable)', type: 'text' },
      { key: 'property_2_value', label: 'Estimated Value', type: 'currency', half: true },
      { key: 'property_2_type', label: 'Type', type: 'select', half: true, options: [
        { value: 'ppor', label: 'Owner Occupied' }, { value: 'investment', label: 'Investment' },
      ]},
      { key: 'savings', label: 'Savings / Cash', type: 'currency', half: true },
      { key: 'superannuation', label: 'Superannuation', type: 'currency', half: true },
      { key: 'shares', label: 'Shares / Managed Funds', type: 'currency', half: true },
      { key: 'vehicle_value', label: 'Vehicle Value', type: 'currency', half: true },
      { key: 'other_assets', label: 'Other Assets', type: 'currency', half: true },
      { key: 'other_assets_description', label: 'Other Assets Description', type: 'text', half: true },
    ],
  },
  {
    key: 'liabilities',
    title: 'Liabilities',
    iconName: 'CreditCard',
    fields: [
      { key: 'home_loan_balance', label: 'Home Loan Balance', type: 'currency', half: true },
      { key: 'home_loan_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
      { key: 'home_loan_lender', label: 'Current Lender', type: 'text', half: true },
      { key: 'home_loan_rate', label: 'Interest Rate (%)', type: 'number', half: true, placeholder: '0.00' },
      { key: 'home_loan_type', label: 'Loan Type', type: 'select', options: [
        { value: 'variable', label: 'Variable' }, { value: 'fixed', label: 'Fixed' },
        { value: 'split', label: 'Split' },
      ]},
      { key: 'investment_loan_balance', label: 'Investment Loan Balance', type: 'currency', half: true },
      { key: 'investment_loan_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
      { key: 'credit_card_1_limit', label: 'Credit Card 1 Limit', type: 'currency', half: true },
      { key: 'credit_card_1_balance', label: 'Credit Card 1 Balance', type: 'currency', half: true },
      { key: 'credit_card_2_limit', label: 'Credit Card 2 Limit', type: 'currency', half: true },
      { key: 'credit_card_2_balance', label: 'Credit Card 2 Balance', type: 'currency', half: true },
      { key: 'personal_loan_balance', label: 'Personal Loan Balance', type: 'currency', half: true },
      { key: 'personal_loan_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
      { key: 'car_loan_balance', label: 'Car Loan Balance', type: 'currency', half: true },
      { key: 'car_loan_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
      { key: 'hecs_balance', label: 'HECS/HELP Debt', type: 'currency' },
      { key: 'other_liabilities', label: 'Other Liabilities', type: 'textarea', placeholder: 'Describe any other liabilities' },
    ],
  },
  {
    key: 'expenses',
    title: 'Living Expenses',
    iconName: 'Receipt',
    fields: [
      { key: 'groceries', label: 'Groceries (monthly)', type: 'currency', half: true },
      { key: 'utilities', label: 'Utilities (monthly)', type: 'currency', half: true },
      { key: 'transport', label: 'Transport / Fuel (monthly)', type: 'currency', half: true },
      { key: 'insurance', label: 'Insurance (monthly)', type: 'currency', half: true },
      { key: 'education', label: 'Education / Childcare (monthly)', type: 'currency', half: true },
      { key: 'medical', label: 'Medical / Health (monthly)', type: 'currency', half: true },
      { key: 'entertainment', label: 'Entertainment / Dining (monthly)', type: 'currency', half: true },
      { key: 'clothing', label: 'Clothing (monthly)', type: 'currency', half: true },
      { key: 'phone_internet', label: 'Phone / Internet (monthly)', type: 'currency', half: true },
      { key: 'subscriptions', label: 'Subscriptions (monthly)', type: 'currency', half: true },
      { key: 'rent', label: 'Rent (if applicable, monthly)', type: 'currency', half: true },
      { key: 'child_support', label: 'Child Support (monthly)', type: 'currency', half: true },
      { key: 'other_expenses', label: 'Other Expenses (monthly)', type: 'currency', half: true },
      { key: 'other_expenses_description', label: 'Description', type: 'text', half: true },
    ],
  },
  {
    key: 'goals',
    title: 'Goals & Objectives',
    iconName: 'Target',
    fields: [
      { key: 'loan_purpose', label: 'Purpose of This Loan', type: 'select', options: [
        { value: 'purchase_ppor', label: 'Purchase — Owner Occupied' },
        { value: 'purchase_investment', label: 'Purchase — Investment' },
        { value: 'refinance', label: 'Refinance' },
        { value: 'construction', label: 'Construction' },
        { value: 'equity_release', label: 'Equity Release' },
        { value: 'debt_consolidation', label: 'Debt Consolidation' },
        { value: 'other', label: 'Other' },
      ]},
      { key: 'purchase_price', label: 'Target Purchase Price', type: 'currency', half: true },
      { key: 'deposit_amount', label: 'Deposit Available', type: 'currency', half: true },
      { key: 'loan_amount_sought', label: 'Loan Amount Sought', type: 'currency' },
      { key: 'preferred_repayment', label: 'Preferred Repayment Type', type: 'radio', options: [
        { value: 'principal_interest', label: 'Principal & Interest' },
        { value: 'interest_only', label: 'Interest Only' },
      ]},
      { key: 'preferred_rate', label: 'Preferred Rate Type', type: 'radio', options: [
        { value: 'variable', label: 'Variable' },
        { value: 'fixed', label: 'Fixed' },
        { value: 'split', label: 'Split' },
        { value: 'no_preference', label: 'No Preference' },
      ]},
      { key: 'preferred_term', label: 'Preferred Loan Term', type: 'select', half: true, options: [
        { value: '25', label: '25 years' }, { value: '30', label: '30 years' },
        { value: '15', label: '15 years' }, { value: '20', label: '20 years' },
      ]},
      { key: 'offset_required', label: 'Offset Account Required?', type: 'radio', options: [
        { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'no_preference', label: 'No Preference' },
      ]},
      { key: 'first_home_buyer', label: 'First Home Buyer?', type: 'radio', options: [
        { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' },
      ]},
      { key: 'settlement_timeframe', label: 'Settlement Timeframe', type: 'text', placeholder: 'e.g. 30 days, 60 days, ASAP' },
      { key: 'additional_notes', label: 'Additional Notes / Requirements', type: 'textarea', placeholder: 'Any other relevant information...' },
    ],
  },
];
