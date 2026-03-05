import { WizardStep } from './types';

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const STATES = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
];

const TITLE_OPTIONS = [
  { value: 'mr', label: 'Mr' },
  { value: 'mrs', label: 'Mrs' },
  { value: 'ms', label: 'Ms' },
  { value: 'miss', label: 'Miss' },
  { value: 'dr', label: 'Dr' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const MARITAL_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'de_facto', label: 'De Facto' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
  { value: 'widowed', label: 'Widowed' },
];

const RESIDENCY_OPTIONS = [
  { value: 'australian_citizen', label: 'Australian Citizen' },
  { value: 'permanent_resident', label: 'Permanent Resident' },
  { value: 'temporary_visa', label: 'Temporary Visa Holder' },
  { value: 'nz_citizen', label: 'NZ Citizen' },
  { value: 'other', label: 'Other' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'payg_full_time', label: 'PAYG – Full Time' },
  { value: 'payg_part_time', label: 'PAYG – Part Time' },
  { value: 'payg_casual', label: 'PAYG – Casual' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'retired', label: 'Retired' },
  { value: 'home_duties', label: 'Home Duties' },
  { value: 'not_employed', label: 'Not Employed' },
];

const LOAN_TYPE_OPTIONS = [
  { value: 'variable', label: 'Variable' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'split', label: 'Split (Variable + Fixed)' },
];

const REPAYMENT_TYPE_OPTIONS = [
  { value: 'pi', label: 'Principal & Interest' },
  { value: 'io', label: 'Interest Only' },
];

const RESIDENTIAL_STATUS_OPTIONS = [
  { value: 'owner', label: 'Owner (no mortgage)' },
  { value: 'owner_mortgage', label: 'Owner (with mortgage)' },
  { value: 'renting', label: 'Renting' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'living_with_parents', label: 'Living with Parents' },
  { value: 'other', label: 'Other' },
];

/* ─── Helper: build an investment property step ────────── */
function makeInvestmentPropertyStep(n: number): WizardStep {
  const sectionKey = `mff_ip_${n}`;
  const prevSectionKey = n === 1 ? 'mff_re_home' : `mff_ip_${n - 1}`;
  return {
    id: `investment_property_${n}`,
    title: `Real Estate Assets – Investment Property ${n}`,
    subtitle: `Details for investment property ${n}.`,
    sectionKey,
    condition: (all) => {
      if (n === 1) {
        return all.mff_re_home?.has_investment_properties === 'yes';
      }
      return all[prevSectionKey]?.has_another_property === 'yes';
    },
    fields: [
      { key: 'address', label: 'Property Address', type: 'text' },
      { key: 'estimated_value', label: 'Estimated Value', type: 'currency', half: true },
      { key: 'purchase_price', label: 'Purchase Price', type: 'currency', half: true },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', half: true },
      { key: 'property_type', label: 'Property Type', type: 'select', half: true, options: [
        { value: 'house', label: 'House' },
        { value: 'townhouse', label: 'Townhouse' },
        { value: 'apartment', label: 'Apartment / Unit' },
        { value: 'land', label: 'Vacant Land' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'other', label: 'Other' },
      ]},
      { key: 'rental_income', label: 'Rental Income (gross monthly)', type: 'currency', half: true },
      { key: 'rental_frequency', label: 'Rental Frequency', type: 'select', half: true, options: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'fortnightly', label: 'Fortnightly' },
        { value: 'monthly', label: 'Monthly' },
      ]},
      { key: 'heading_loan', label: 'Loan Details', type: 'heading' },
      { key: 'lender', label: 'Lender', type: 'text', half: true },
      { key: 'loan_balance', label: 'Loan Balance', type: 'currency', half: true },
      { key: 'loan_limit', label: 'Loan Limit', type: 'currency', half: true },
      { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
      { key: 'loan_type', label: 'Loan Type', type: 'select', half: true, options: LOAN_TYPE_OPTIONS },
      { key: 'variable_rate', label: 'Variable Rate (%)', type: 'number', half: true, placeholder: '0.00', condition: (d) => d.loan_type === 'variable' || d.loan_type === 'split' },
      { key: 'variable_balance', label: 'Variable Portion Balance', type: 'currency', half: true, condition: (d) => d.loan_type === 'split' },
      { key: 'fixed_rate', label: 'Fixed Rate (%)', type: 'number', half: true, placeholder: '0.00', condition: (d) => d.loan_type === 'fixed' || d.loan_type === 'split' },
      { key: 'fixed_balance', label: 'Fixed Portion Balance', type: 'currency', half: true, condition: (d) => d.loan_type === 'split' },
      { key: 'fixed_expiry', label: 'Fixed Rate Expiry', type: 'date', half: true, condition: (d) => d.loan_type === 'fixed' || d.loan_type === 'split' },
      { key: 'repayment_type', label: 'Repayment Type', type: 'select', half: true, options: REPAYMENT_TYPE_OPTIONS },
      ...(n < 9 ? [{ key: 'has_another_property', label: 'Do you have another investment property?', type: 'radio' as const, options: YES_NO }] : []),
    ],
  };
}

/* ─── Helper: motor vehicle step ──────────────────────── */
function makeMotorVehicleStep(n: number): WizardStep {
  const sectionKey = `mff_vehicle_${n}`;
  const prevSectionKey = n === 1 ? null : `mff_vehicle_${n - 1}`;
  return {
    id: `motor_vehicle_${n}`,
    title: `Assets – Motor Vehicle ${n}`,
    subtitle: `Details for motor vehicle ${n}.`,
    sectionKey,
    condition: (all) => {
      if (n === 1) return true; // always show vehicle 1
      return all[prevSectionKey!]?.has_another_vehicle === 'yes';
    },
    fields: [
      { key: 'has_vehicle', label: `Do you have ${n === 1 ? 'a motor vehicle' : 'another motor vehicle'}?`, type: 'radio', options: YES_NO },
      { key: 'make_model', label: 'Make / Model / Year', type: 'text', condition: (d) => d.has_vehicle === 'yes' },
      { key: 'value', label: 'Estimated Value', type: 'currency', half: true, condition: (d) => d.has_vehicle === 'yes' },
      { key: 'owned_financed', label: 'Owned or Financed?', type: 'select', half: true, condition: (d) => d.has_vehicle === 'yes', options: [
        { value: 'owned', label: 'Owned Outright' },
        { value: 'financed', label: 'Financed (Chattel Mortgage)' },
        { value: 'lease', label: 'Leased' },
        { value: 'novated', label: 'Novated Lease' },
      ]},
      { key: 'finance_lender', label: 'Finance Provider', type: 'text', half: true, condition: (d) => d.has_vehicle === 'yes' && d.owned_financed !== 'owned' },
      { key: 'finance_balance', label: 'Finance Balance', type: 'currency', half: true, condition: (d) => d.has_vehicle === 'yes' && d.owned_financed !== 'owned' },
      { key: 'finance_repayment', label: 'Monthly Repayment', type: 'currency', half: true, condition: (d) => d.has_vehicle === 'yes' && d.owned_financed !== 'owned' },
      ...(n < 3 ? [{ key: 'has_another_vehicle', label: 'Do you have another vehicle?', type: 'radio' as const, options: YES_NO, condition: (d: Record<string, any>) => d.has_vehicle === 'yes' }] : []),
    ],
  };
}

/* ─── Helper: savings account step ────────────────────── */
function makeSavingsAccountStep(n: number): WizardStep {
  const sectionKey = `mff_savings_${n}`;
  const prevSectionKey = n === 1 ? null : `mff_savings_${n - 1}`;
  return {
    id: `savings_account_${n}`,
    title: `Assets – Savings Account ${n}`,
    subtitle: `Details for savings / cash account ${n}.`,
    sectionKey,
    condition: (all) => {
      if (n === 1) return true;
      return all[prevSectionKey!]?.has_another_account === 'yes';
    },
    fields: [
      { key: 'has_account', label: `Do you have ${n === 1 ? 'a savings or cash account' : 'another savings account'}?`, type: 'radio', options: YES_NO },
      { key: 'institution', label: 'Financial Institution', type: 'text', half: true, condition: (d) => d.has_account === 'yes' },
      { key: 'account_type', label: 'Account Type', type: 'select', half: true, condition: (d) => d.has_account === 'yes', options: [
        { value: 'savings', label: 'Savings' },
        { value: 'term_deposit', label: 'Term Deposit' },
        { value: 'everyday', label: 'Everyday / Transaction' },
        { value: 'offset', label: 'Offset' },
        { value: 'other', label: 'Other' },
      ]},
      { key: 'balance', label: 'Current Balance', type: 'currency', condition: (d) => d.has_account === 'yes' },
      { key: 'account_holder', label: 'Account Holder', type: 'select', half: true, condition: (d) => d.has_account === 'yes', options: [
        { value: 'applicant_1', label: 'Applicant 1' },
        { value: 'applicant_2', label: 'Applicant 2' },
        { value: 'joint', label: 'Joint' },
      ]},
      ...(n < 6 ? [{ key: 'has_another_account', label: 'Do you have another account?', type: 'radio' as const, options: YES_NO, condition: (d: Record<string, any>) => d.has_account === 'yes' }] : []),
    ],
  };
}

export const MORTGAGE_STEPS: WizardStep[] = [
  // ═══════════════════════════════════════════════════════
  //  1. WELCOME / INTRO
  // ═══════════════════════════════════════════════════════
  {
    id: 'welcome',
    title: 'Margin Finance – Mortgage Application',
    subtitle: 'Welcome to the Margin Finance Fact Find. This form will gather the information we need to assess your lending requirements.\n\nWould you consider yourself to be a borrower or guarantor?',
    sectionKey: 'mff_welcome',
    fields: [
      {
        key: 'borrower_or_guarantor',
        label: '',
        type: 'button-group',
        options: [
          { value: 'borrower', label: 'Borrower' },
          { value: 'guarantor', label: 'Guarantor' },
        ],
      },
      {
        key: 'has_second_applicant',
        label: 'Will there be a second applicant / co-borrower?',
        type: 'button-group',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  2. MARKETING / HOW DID YOU FIND US
  // ═══════════════════════════════════════════════════════
  {
    id: 'referral',
    title: 'How did you find us?',
    subtitle: 'Let us know how you heard about Margin Finance.',
    sectionKey: 'mff_referral',
    fields: [
      {
        key: 'referral_source',
        label: 'Referral Source',
        type: 'select',
        options: [
          { value: 'google', label: 'Google Search' },
          { value: 'social_media', label: 'Social Media' },
          { value: 'friend_family', label: 'Friend / Family' },
          { value: 'real_estate_agent', label: 'Real Estate Agent' },
          { value: 'accountant', label: 'Accountant' },
          { value: 'financial_planner', label: 'Financial Planner' },
          { value: 'solicitor', label: 'Solicitor / Conveyancer' },
          { value: 'builder_developer', label: 'Builder / Developer' },
          { value: 'existing_client', label: 'Existing Client Referral' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'referral_name', label: 'Referrer Name (if applicable)', type: 'text', placeholder: 'Name of person or business who referred you' },
      { key: 'referral_details', label: 'Additional Details', type: 'text', placeholder: 'Any other info...', condition: (d) => d.referral_source === 'other' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  3. OBJECTIVES
  // ═══════════════════════════════════════════════════════
  {
    id: 'objectives',
    title: 'Your Objectives',
    subtitle: 'Tell us what you\'re looking to achieve.',
    sectionKey: 'mff_objectives',
    fields: [
      { key: 'objectives', label: 'What are your key objectives for this loan?', type: 'textarea', placeholder: 'e.g. Purchase my first home, refinance for a better rate, consolidate debt...' },
      {
        key: 'timeframe',
        label: 'Desired timeframe',
        type: 'select',
        options: [
          { value: 'asap', label: 'As soon as possible' },
          { value: '1_month', label: 'Within 1 month' },
          { value: '1_3_months', label: '1–3 months' },
          { value: '3_6_months', label: '3–6 months' },
          { value: '6_plus', label: '6+ months / Just exploring' },
        ],
      },
      {
        key: 'priorities',
        label: 'What is most important to you?',
        type: 'select',
        options: [
          { value: 'lowest_rate', label: 'Lowest interest rate' },
          { value: 'lowest_fees', label: 'Lowest fees' },
          { value: 'flexibility', label: 'Flexibility (offset, redraw, extra repayments)' },
          { value: 'speed', label: 'Speed of approval' },
          { value: 'specific_lender', label: 'Specific lender preference' },
        ],
      },
      { key: 'priority_notes', label: 'Anything else we should know about your priorities?', type: 'textarea', placeholder: 'Optional' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  4. LOAN REQUIREMENTS
  // ═══════════════════════════════════════════════════════
  {
    id: 'loan_requirements',
    title: 'Loan Requirements',
    subtitle: 'Details about the loan you need.',
    sectionKey: 'mff_loan_requirements',
    fields: [
      {
        key: 'loan_purpose',
        label: 'Purpose of Loan',
        type: 'select',
        required: true,
        options: [
          { value: 'purchase_owner_occupied', label: 'Purchase – Owner Occupied' },
          { value: 'purchase_investment', label: 'Purchase – Investment' },
          { value: 'refinance', label: 'Refinance' },
          { value: 'construction', label: 'Construction' },
          { value: 'renovation', label: 'Renovation' },
          { value: 'equity_release', label: 'Equity Release' },
          { value: 'debt_consolidation', label: 'Debt Consolidation' },
          { value: 'top_up', label: 'Top Up' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'purchase_price', label: 'Purchase Price / Property Value', type: 'currency', half: true },
      { key: 'deposit_amount', label: 'Deposit Available', type: 'currency', half: true },
      { key: 'loan_amount_sought', label: 'Loan Amount Required', type: 'currency' },
      { key: 'property_address', label: 'Property Address (if known)', type: 'text', placeholder: 'Address of property being purchased / refinanced' },
      { key: 'property_state', label: 'State', type: 'select', half: true, options: STATES },
      {
        key: 'property_type',
        label: 'Property Type',
        type: 'select',
        half: true,
        options: [
          { value: 'house', label: 'House' },
          { value: 'townhouse', label: 'Townhouse' },
          { value: 'apartment', label: 'Apartment / Unit' },
          { value: 'land', label: 'Vacant Land' },
          { value: 'rural', label: 'Rural / Acreage' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'repayment_type',
        label: 'Preferred Repayment Type',
        type: 'radio',
        options: [
          { value: 'principal_interest', label: 'Principal & Interest' },
          { value: 'interest_only', label: 'Interest Only' },
          { value: 'no_preference', label: 'No Preference' },
        ],
      },
      {
        key: 'rate_type',
        label: 'Preferred Rate Type',
        type: 'radio',
        options: [
          { value: 'variable', label: 'Variable' },
          { value: 'fixed', label: 'Fixed' },
          { value: 'split', label: 'Split' },
          { value: 'no_preference', label: 'No Preference' },
        ],
      },
      {
        key: 'loan_term',
        label: 'Preferred Loan Term',
        type: 'select',
        half: true,
        options: [
          { value: '30', label: '30 years' },
          { value: '25', label: '25 years' },
          { value: '20', label: '20 years' },
          { value: '15', label: '15 years' },
          { value: '10', label: '10 years' },
        ],
      },
      {
        key: 'offset_account',
        label: 'Offset Account Required?',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'no_preference', label: 'No Preference' },
        ],
      },
      { key: 'first_home_buyer', label: 'First Home Buyer?', type: 'radio', options: YES_NO },
      { key: 'settlement_timeframe', label: 'Settlement Timeframe', type: 'text', placeholder: 'e.g. 30 days, 60 days, ASAP' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  5. PRIMARY APPLICANT – PERSONAL DETAILS
  // ═══════════════════════════════════════════════════════
  {
    id: 'primary_personal',
    title: 'Primary Applicant – Personal Details',
    subtitle: 'Your personal details.',
    sectionKey: 'mff_primary_personal',
    fields: [
      { key: 'title', label: 'Title', type: 'select', half: true, options: TITLE_OPTIONS },
      { key: 'first_name', label: 'First Name', type: 'text', half: true, required: true },
      { key: 'middle_name', label: 'Middle Name', type: 'text', half: true },
      { key: 'last_name', label: 'Last Name', type: 'text', half: true, required: true },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date', half: true },
      { key: 'gender', label: 'Gender', type: 'select', half: true, options: GENDER_OPTIONS },
      { key: 'marital_status', label: 'Marital Status', type: 'select', half: true, options: MARITAL_OPTIONS },
      { key: 'dependants', label: 'Number of Dependants', type: 'number', half: true, placeholder: '0' },
      { key: 'dependant_ages', label: 'Ages of Dependants', type: 'text', placeholder: 'e.g. 3, 7, 12', condition: (d) => Number(d.dependants) > 0 },
      { key: 'mobile', label: 'Mobile', type: 'tel', half: true, required: true },
      { key: 'email', label: 'Email', type: 'email', half: true, required: true },
      { key: 'home_phone', label: 'Home Phone', type: 'tel', half: true },
      { key: 'work_phone', label: 'Work Phone', type: 'tel', half: true },
      { key: 'residency_status', label: 'Residency Status', type: 'select', options: RESIDENCY_OPTIONS },
      { key: 'visa_type', label: 'Visa Type / Subclass', type: 'text', condition: (d) => d.residency_status === 'temporary_visa' },
      { key: 'visa_expiry', label: 'Visa Expiry Date', type: 'date', half: true, condition: (d) => d.residency_status === 'temporary_visa' },
      { key: 'drivers_licence', label: 'Driver\'s Licence Number', type: 'text', half: true },
      { key: 'licence_state', label: 'Licence State', type: 'select', half: true, options: STATES },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  6. PRIMARY APPLICANT – ADDRESS DETAILS
  // ═══════════════════════════════════════════════════════
  {
    id: 'primary_address',
    title: 'Primary Applicant – Address Details',
    subtitle: 'Your current and previous addresses.',
    sectionKey: 'mff_primary_address',
    fields: [
      { key: 'current_address', label: 'Current Residential Address', type: 'text', required: true, placeholder: 'Full street address' },
      { key: 'current_suburb', label: 'Suburb', type: 'text', half: true },
      { key: 'current_state', label: 'State', type: 'select', half: true, options: STATES },
      { key: 'current_postcode', label: 'Postcode', type: 'text', half: true },
      { key: 'years_at_address', label: 'Years at Address', type: 'number', half: true, placeholder: '0' },
      { key: 'months_at_address', label: 'Months at Address', type: 'number', half: true, placeholder: '0' },
      { key: 'residential_status', label: 'Residential Status', type: 'select', options: RESIDENTIAL_STATUS_OPTIONS },
      { key: 'rent_amount', label: 'Rent / Board Amount (monthly)', type: 'currency', condition: (d) => d.residential_status === 'renting' || d.residential_status === 'boarding' },
      { key: 'mailing_address', label: 'Mailing Address (if different)', type: 'text', placeholder: 'Leave blank if same as above' },
      { key: 'heading_prev', label: 'Previous Address', type: 'heading', condition: (d) => Number(d.years_at_address || 0) < 3 },
      { key: 'previous_address', label: 'Previous Address', type: 'text', condition: (d) => Number(d.years_at_address || 0) < 3 },
      { key: 'previous_suburb', label: 'Suburb', type: 'text', half: true, condition: (d) => Number(d.years_at_address || 0) < 3 },
      { key: 'previous_state', label: 'State', type: 'select', half: true, options: STATES, condition: (d) => Number(d.years_at_address || 0) < 3 },
      { key: 'previous_postcode', label: 'Postcode', type: 'text', half: true, condition: (d) => Number(d.years_at_address || 0) < 3 },
      { key: 'previous_years', label: 'Years at Previous', type: 'number', half: true, placeholder: '0', condition: (d) => Number(d.years_at_address || 0) < 3 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  7. PRIMARY APPLICANT – EMPLOYMENT & INCOME
  // ═══════════════════════════════════════════════════════
  {
    id: 'primary_employment_income',
    title: 'Primary Applicant – Employment & Income',
    subtitle: 'Your current employment and income details.',
    sectionKey: 'mff_primary_employment',
    fields: [
      // ── Employment ──
      { key: 'employment_type', label: 'Employment Type', type: 'select', required: true, options: EMPLOYMENT_OPTIONS },
      // PAYG
      { key: 'heading_payg', label: 'PAYG Details', type: 'heading', condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'employer_name', label: 'Employer Name', type: 'text', condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' },
      { key: 'employer_address', label: 'Employer Address', type: 'text', condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'job_title', label: 'Job Title / Position', type: 'text', half: true, condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' },
      { key: 'industry', label: 'Industry', type: 'text', half: true, condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' || d.employment_type === 'self_employed' },
      { key: 'start_date', label: 'Start Date', type: 'date', half: true, condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' },
      { key: 'on_probation', label: 'On Probation?', type: 'radio', options: YES_NO, condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'employer_contact', label: 'Employer Contact Name', type: 'text', half: true, condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'employer_phone', label: 'Employer Phone', type: 'tel', half: true, condition: (d) => d.employment_type?.startsWith('payg') },
      // Self-employed
      { key: 'heading_se', label: 'Self-Employed Details', type: 'heading', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_name', label: 'Business Name', type: 'text', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'abn', label: 'ABN', type: 'text', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'acn', label: 'ACN', type: 'text', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_type', label: 'Business Structure', type: 'select', condition: (d) => d.employment_type === 'self_employed', options: [
        { value: 'sole_trader', label: 'Sole Trader' },
        { value: 'partnership', label: 'Partnership' },
        { value: 'company', label: 'Company' },
        { value: 'trust', label: 'Trust' },
      ]},
      { key: 'years_trading', label: 'Years Trading', type: 'number', half: true, placeholder: '0', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'gst_registered', label: 'GST Registered?', type: 'radio', options: YES_NO, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_address', label: 'Business Address', type: 'text', condition: (d) => d.employment_type === 'self_employed' },
      // Previous employment
      { key: 'heading_prev_emp', label: 'Previous Employment', type: 'heading' },
      { key: 'has_previous_employment', label: 'Less than 2 years in current role?', type: 'radio', options: YES_NO },
      { key: 'prev_employer_name', label: 'Previous Employer', type: 'text', condition: (d) => d.has_previous_employment === 'yes' },
      { key: 'prev_job_title', label: 'Previous Job Title', type: 'text', half: true, condition: (d) => d.has_previous_employment === 'yes' },
      { key: 'prev_duration', label: 'Duration at Previous', type: 'text', half: true, placeholder: 'e.g. 3 years', condition: (d) => d.has_previous_employment === 'yes' },
      // ── Income ──
      { key: 'heading_income', label: 'Income Details (gross / before tax)', type: 'heading' },
      { key: 'base_salary', label: 'Base Salary (gross annual)', type: 'currency', required: true },
      { key: 'heading_additional', label: 'Additional Income', type: 'heading' },
      { key: 'overtime', label: 'Regular Overtime (annual)', type: 'currency', half: true },
      { key: 'bonuses', label: 'Bonuses (annual)', type: 'currency', half: true },
      { key: 'commission', label: 'Commission (annual)', type: 'currency', half: true },
      { key: 'allowances', label: 'Allowances (annual)', type: 'currency', half: true },
      { key: 'rental_income', label: 'Rental Income (gross monthly)', type: 'currency', half: true },
      { key: 'government_benefits', label: 'Government Benefits (annual)', type: 'currency', half: true },
      { key: 'child_support_income', label: 'Child Support Received (annual)', type: 'currency', half: true },
      { key: 'investment_income', label: 'Investment / Dividend Income (annual)', type: 'currency', half: true },
      { key: 'other_income', label: 'Other Income (annual)', type: 'currency', half: true },
      { key: 'other_income_source', label: 'Other Income Source', type: 'text', half: true, condition: (d) => Number(d.other_income) > 0 },
      // Self-employed income
      { key: 'heading_se_income', label: 'Self-Employed Income', type: 'heading', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_revenue', label: 'Business Revenue (annual)', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_net_profit', label: 'Net Profit (annual)', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'depreciation_addback', label: 'Depreciation Add-back', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'directors_salary', label: 'Director\'s Salary (if company)', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  8. SECOND APPLICANT – PERSONAL DETAILS
  // ═══════════════════════════════════════════════════════
  {
    id: 'second_personal',
    title: 'Second Applicant – Personal Details',
    subtitle: 'Co-borrower personal details.',
    sectionKey: 'mff_second_personal',
    condition: (all) => all.mff_welcome?.has_second_applicant === 'yes',
    fields: [
      {
        key: 'relationship_to_primary',
        label: 'Relationship to Primary Applicant',
        type: 'select',
        options: [
          { value: 'spouse', label: 'Spouse' },
          { value: 'partner', label: 'Partner' },
          { value: 'parent', label: 'Parent' },
          { value: 'sibling', label: 'Sibling' },
          { value: 'friend', label: 'Friend' },
          { value: 'business_partner', label: 'Business Partner' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'title', label: 'Title', type: 'select', half: true, options: TITLE_OPTIONS },
      { key: 'first_name', label: 'First Name', type: 'text', half: true, required: true },
      { key: 'middle_name', label: 'Middle Name', type: 'text', half: true },
      { key: 'last_name', label: 'Last Name', type: 'text', half: true, required: true },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date', half: true },
      { key: 'gender', label: 'Gender', type: 'select', half: true, options: GENDER_OPTIONS },
      { key: 'marital_status', label: 'Marital Status', type: 'select', half: true, options: MARITAL_OPTIONS },
      { key: 'dependants', label: 'Number of Dependants', type: 'number', half: true, placeholder: '0' },
      { key: 'dependant_ages', label: 'Ages of Dependants', type: 'text', condition: (d) => Number(d.dependants) > 0 },
      { key: 'mobile', label: 'Mobile', type: 'tel', half: true, required: true },
      { key: 'email', label: 'Email', type: 'email', half: true, required: true },
      { key: 'home_phone', label: 'Home Phone', type: 'tel', half: true },
      { key: 'work_phone', label: 'Work Phone', type: 'tel', half: true },
      { key: 'residency_status', label: 'Residency Status', type: 'select', options: RESIDENCY_OPTIONS },
      { key: 'visa_type', label: 'Visa Type / Subclass', type: 'text', condition: (d) => d.residency_status === 'temporary_visa' },
      { key: 'visa_expiry', label: 'Visa Expiry Date', type: 'date', half: true, condition: (d) => d.residency_status === 'temporary_visa' },
      { key: 'drivers_licence', label: 'Driver\'s Licence Number', type: 'text', half: true },
      { key: 'licence_state', label: 'Licence State', type: 'select', half: true, options: STATES },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  9. SECOND APPLICANT – ADDRESS DETAILS
  // ═══════════════════════════════════════════════════════
  {
    id: 'second_address',
    title: 'Second Applicant – Address Details',
    subtitle: 'Co-borrower address details.',
    sectionKey: 'mff_second_address',
    condition: (all) => all.mff_welcome?.has_second_applicant === 'yes',
    fields: [
      { key: 'same_as_primary', label: 'Same address as primary applicant?', type: 'radio', options: YES_NO },
      { key: 'current_address', label: 'Current Residential Address', type: 'text', condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'current_suburb', label: 'Suburb', type: 'text', half: true, condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'current_state', label: 'State', type: 'select', half: true, options: STATES, condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'current_postcode', label: 'Postcode', type: 'text', half: true, condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'years_at_address', label: 'Years at Address', type: 'number', half: true, placeholder: '0', condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'months_at_address', label: 'Months at Address', type: 'number', half: true, placeholder: '0', condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'residential_status', label: 'Residential Status', type: 'select', condition: (d) => d.same_as_primary !== 'yes', options: RESIDENTIAL_STATUS_OPTIONS },
      { key: 'rent_amount', label: 'Rent / Board Amount (monthly)', type: 'currency', condition: (d) => d.same_as_primary !== 'yes' && (d.residential_status === 'renting' || d.residential_status === 'boarding') },
      { key: 'mailing_address', label: 'Mailing Address (if different)', type: 'text', placeholder: 'Leave blank if same', condition: (d) => d.same_as_primary !== 'yes' },
      { key: 'heading_prev', label: 'Previous Address', type: 'heading', condition: (d) => d.same_as_primary !== 'yes' && Number(d.years_at_address || 0) < 3 },
      { key: 'previous_address', label: 'Previous Address', type: 'text', condition: (d) => d.same_as_primary !== 'yes' && Number(d.years_at_address || 0) < 3 },
      { key: 'previous_suburb', label: 'Suburb', type: 'text', half: true, condition: (d) => d.same_as_primary !== 'yes' && Number(d.years_at_address || 0) < 3 },
      { key: 'previous_state', label: 'State', type: 'select', half: true, options: STATES, condition: (d) => d.same_as_primary !== 'yes' && Number(d.years_at_address || 0) < 3 },
      { key: 'previous_postcode', label: 'Postcode', type: 'text', half: true, condition: (d) => d.same_as_primary !== 'yes' && Number(d.years_at_address || 0) < 3 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  10. SECOND APPLICANT – EMPLOYMENT & INCOME
  // ═══════════════════════════════════════════════════════
  {
    id: 'second_employment_income',
    title: 'Second Applicant – Employment & Income',
    subtitle: 'Co-borrower employment and income details.',
    sectionKey: 'mff_second_employment',
    condition: (all) => all.mff_welcome?.has_second_applicant === 'yes',
    fields: [
      { key: 'employment_type', label: 'Employment Type', type: 'select', required: true, options: EMPLOYMENT_OPTIONS },
      { key: 'employer_name', label: 'Employer Name', type: 'text', condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' },
      { key: 'employer_address', label: 'Employer Address', type: 'text', condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'job_title', label: 'Job Title', type: 'text', half: true, condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' },
      { key: 'industry', label: 'Industry', type: 'text', half: true, condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' || d.employment_type === 'self_employed' },
      { key: 'start_date', label: 'Start Date', type: 'date', half: true, condition: (d) => d.employment_type?.startsWith('payg') || d.employment_type === 'contractor' },
      { key: 'on_probation', label: 'On Probation?', type: 'radio', options: YES_NO, condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'employer_contact', label: 'Employer Contact Name', type: 'text', half: true, condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'employer_phone', label: 'Employer Phone', type: 'tel', half: true, condition: (d) => d.employment_type?.startsWith('payg') },
      { key: 'heading_se', label: 'Self-Employed Details', type: 'heading', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_name', label: 'Business Name', type: 'text', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'abn', label: 'ABN', type: 'text', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'acn', label: 'ACN', type: 'text', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_type', label: 'Business Structure', type: 'select', condition: (d) => d.employment_type === 'self_employed', options: [
        { value: 'sole_trader', label: 'Sole Trader' },
        { value: 'partnership', label: 'Partnership' },
        { value: 'company', label: 'Company' },
        { value: 'trust', label: 'Trust' },
      ]},
      { key: 'years_trading', label: 'Years Trading', type: 'number', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'gst_registered', label: 'GST Registered?', type: 'radio', options: YES_NO, condition: (d) => d.employment_type === 'self_employed' },
      // Previous employment
      { key: 'heading_prev_emp', label: 'Previous Employment', type: 'heading' },
      { key: 'has_previous_employment', label: 'Less than 2 years in current role?', type: 'radio', options: YES_NO },
      { key: 'prev_employer_name', label: 'Previous Employer', type: 'text', condition: (d) => d.has_previous_employment === 'yes' },
      { key: 'prev_job_title', label: 'Previous Job Title', type: 'text', half: true, condition: (d) => d.has_previous_employment === 'yes' },
      { key: 'prev_duration', label: 'Duration at Previous', type: 'text', half: true, placeholder: 'e.g. 3 years', condition: (d) => d.has_previous_employment === 'yes' },
      // Income
      { key: 'heading_income', label: 'Income Details (gross / before tax)', type: 'heading' },
      { key: 'base_salary', label: 'Base Salary (gross annual)', type: 'currency', required: true },
      { key: 'overtime', label: 'Regular Overtime (annual)', type: 'currency', half: true },
      { key: 'bonuses', label: 'Bonuses (annual)', type: 'currency', half: true },
      { key: 'commission', label: 'Commission (annual)', type: 'currency', half: true },
      { key: 'allowances', label: 'Allowances (annual)', type: 'currency', half: true },
      { key: 'rental_income', label: 'Rental Income (gross monthly)', type: 'currency', half: true },
      { key: 'government_benefits', label: 'Government Benefits (annual)', type: 'currency', half: true },
      { key: 'other_income', label: 'Other Income (annual)', type: 'currency', half: true },
      { key: 'other_income_source', label: 'Other Income Source', type: 'text', half: true, condition: (d) => Number(d.other_income) > 0 },
      { key: 'heading_se_income', label: 'Self-Employed Income', type: 'heading', condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_revenue', label: 'Business Revenue (annual)', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'business_net_profit', label: 'Net Profit (annual)', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'depreciation_addback', label: 'Depreciation Add-back', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
      { key: 'directors_salary', label: 'Director\'s Salary (if company)', type: 'currency', half: true, condition: (d) => d.employment_type === 'self_employed' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  11. REAL ESTATE ASSETS – HOME
  // ═══════════════════════════════════════════════════════
  {
    id: 'real_estate_home',
    title: 'Real Estate Assets – Home',
    subtitle: 'Details about your current home (if owned).',
    sectionKey: 'mff_re_home',
    fields: [
      { key: 'owns_home', label: 'Do you currently own a home?', type: 'radio', options: YES_NO },
      { key: 'home_address', label: 'Property Address', type: 'text', condition: (d) => d.owns_home === 'yes' },
      { key: 'home_suburb', label: 'Suburb', type: 'text', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_state', label: 'State', type: 'select', half: true, options: STATES, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_postcode', label: 'Postcode', type: 'text', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_value', label: 'Estimated Value', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_purchase_price', label: 'Original Purchase Price', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_purchase_date', label: 'Purchase Date', type: 'date', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'heading_home_loan', label: 'Home Loan Details', type: 'heading', condition: (d) => d.owns_home === 'yes' },
      { key: 'home_lender', label: 'Current Lender', type: 'text', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_loan_balance', label: 'Loan Balance', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_loan_limit', label: 'Loan Limit', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_loan_repayment', label: 'Monthly Repayment', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' },
      { key: 'home_loan_type', label: 'Loan Type', type: 'select', half: true, condition: (d) => d.owns_home === 'yes', options: LOAN_TYPE_OPTIONS },
      { key: 'home_variable_rate', label: 'Variable Rate (%)', type: 'number', half: true, placeholder: '0.00', condition: (d) => d.owns_home === 'yes' && (d.home_loan_type === 'variable' || d.home_loan_type === 'split') },
      { key: 'home_variable_balance', label: 'Variable Portion Balance', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' && d.home_loan_type === 'split' },
      { key: 'home_fixed_rate', label: 'Fixed Rate (%)', type: 'number', half: true, placeholder: '0.00', condition: (d) => d.owns_home === 'yes' && (d.home_loan_type === 'fixed' || d.home_loan_type === 'split') },
      { key: 'home_fixed_balance', label: 'Fixed Portion Balance', type: 'currency', half: true, condition: (d) => d.owns_home === 'yes' && d.home_loan_type === 'split' },
      { key: 'home_fixed_expiry', label: 'Fixed Rate Expiry', type: 'date', half: true, condition: (d) => d.owns_home === 'yes' && (d.home_loan_type === 'fixed' || d.home_loan_type === 'split') },
      { key: 'home_repayment_type', label: 'Repayment Type', type: 'select', half: true, condition: (d) => d.owns_home === 'yes', options: REPAYMENT_TYPE_OPTIONS },
      { key: 'has_investment_properties', label: 'Do you own any investment properties?', type: 'radio', options: YES_NO },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  12–20. INVESTMENT PROPERTIES 1–9
  // ═══════════════════════════════════════════════════════
  ...Array.from({ length: 9 }, (_, i) => makeInvestmentPropertyStep(i + 1)),

  // ═══════════════════════════════════════════════════════
  //  21–23. MOTOR VEHICLES 1–3
  // ═══════════════════════════════════════════════════════
  ...Array.from({ length: 3 }, (_, i) => makeMotorVehicleStep(i + 1)),

  // ═══════════════════════════════════════════════════════
  //  24–29. SAVINGS ACCOUNTS 1–6
  // ═══════════════════════════════════════════════════════
  ...Array.from({ length: 6 }, (_, i) => makeSavingsAccountStep(i + 1)),

  // ═══════════════════════════════════════════════════════
  //  30. ASSETS – HOME CONTENTS, SUPER, INVESTMENTS, OTHER
  // ═══════════════════════════════════════════════════════
  {
    id: 'other_assets',
    title: 'Assets – Home Contents, Superannuation, Investments & Other',
    subtitle: 'Other assets you hold.',
    sectionKey: 'mff_other_assets',
    fields: [
      { key: 'home_contents', label: 'Home Contents Value', type: 'currency', half: true },
      { key: 'superannuation', label: 'Superannuation Balance', type: 'currency', half: true },
      { key: 'shares_investments', label: 'Shares / Managed Funds', type: 'currency', half: true },
      { key: 'crypto', label: 'Cryptocurrency', type: 'currency', half: true },
      { key: 'other_assets_value', label: 'Other Assets Value', type: 'currency', half: true },
      { key: 'other_assets_description', label: 'Other Assets Description', type: 'text' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  31. LIABILITIES – PERSONAL LOANS
  // ═══════════════════════════════════════════════════════
  {
    id: 'liabilities_personal_loans',
    title: 'Liabilities – Personal Loans',
    subtitle: 'Details of any personal loans.',
    sectionKey: 'mff_liab_personal',
    fields: [
      { key: 'has_personal_loans', label: 'Do you have any personal loans?', type: 'radio', options: YES_NO },
      {
        key: 'personal_loans',
        label: 'Personal Loans',
        type: 'repeatable',
        itemLabel: 'Personal Loan',
        maxItems: 5,
        condition: (d) => d.has_personal_loans === 'yes',
        fields: [
          { key: 'lender', label: 'Lender', type: 'text', half: true },
          { key: 'purpose', label: 'Purpose', type: 'text', half: true },
          { key: 'balance', label: 'Balance Owing', type: 'currency', half: true },
          { key: 'limit', label: 'Limit', type: 'currency', half: true },
          { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
          { key: 'rate', label: 'Interest Rate (%)', type: 'number', half: true, placeholder: '0.00' },
          { key: 'to_be_cleared', label: 'To be cleared on settlement?', type: 'radio', options: YES_NO },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  32. LIABILITIES – CREDIT CARDS & STORE CARDS
  // ═══════════════════════════════════════════════════════
  {
    id: 'liabilities_credit_cards',
    title: 'Liabilities – Credit Cards & Store Cards',
    subtitle: 'Details of any credit or store cards.',
    sectionKey: 'mff_liab_cards',
    fields: [
      { key: 'has_credit_cards', label: 'Do you have any credit or store cards?', type: 'radio', options: YES_NO },
      {
        key: 'credit_cards',
        label: 'Credit Cards',
        type: 'repeatable',
        itemLabel: 'Credit Card',
        maxItems: 5,
        condition: (d) => d.has_credit_cards === 'yes',
        fields: [
          { key: 'provider', label: 'Provider', type: 'text', half: true },
          { key: 'card_type', label: 'Card Type', type: 'text', half: true, placeholder: 'e.g. Visa, Mastercard, Amex' },
          { key: 'limit', label: 'Card Limit', type: 'currency', half: true },
          { key: 'balance', label: 'Current Balance', type: 'currency', half: true },
          { key: 'pay_in_full', label: 'Paid in full each month?', type: 'radio', options: YES_NO },
          { key: 'to_be_closed', label: 'To be closed on settlement?', type: 'radio', options: YES_NO },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  33. LIABILITIES – OTHER LOANS / INTEREST-FREE / BNPL
  // ═══════════════════════════════════════════════════════
  {
    id: 'liabilities_other',
    title: 'Liabilities – Other Loans / Interest-Free / BNPL',
    subtitle: 'Other debts including interest-free and buy-now-pay-later.',
    sectionKey: 'mff_liab_other',
    fields: [
      { key: 'has_other_loans', label: 'Do you have any other loans?', type: 'radio', options: YES_NO },
      {
        key: 'other_loans',
        label: 'Other Loans',
        type: 'repeatable',
        itemLabel: 'Other Loan',
        maxItems: 5,
        condition: (d) => d.has_other_loans === 'yes',
        fields: [
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'provider', label: 'Provider', type: 'text', half: true },
          { key: 'balance', label: 'Balance', type: 'currency', half: true },
          { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
        ],
      },
      { key: 'heading_bnpl', label: 'Buy-Now-Pay-Later / Interest-Free', type: 'heading' },
      { key: 'has_bnpl', label: 'Do you have any BNPL or interest-free products? (Afterpay, Zip, etc.)', type: 'radio', options: YES_NO },
      {
        key: 'bnpl_accounts',
        label: 'BNPL Accounts',
        type: 'repeatable',
        itemLabel: 'BNPL Account',
        maxItems: 5,
        condition: (d) => d.has_bnpl === 'yes',
        fields: [
          { key: 'provider', label: 'Provider (e.g. Afterpay, Zip)', type: 'text', half: true },
          { key: 'limit', label: 'Limit', type: 'currency', half: true },
          { key: 'balance', label: 'Current Balance', type: 'currency', half: true },
          { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  34. LIABILITIES – HECS/HELP & TAX DEBTS
  // ═══════════════════════════════════════════════════════
  {
    id: 'liabilities_hecs_tax',
    title: 'Liabilities – HECS/HELP & Tax Debts',
    subtitle: 'Government debts and study loans.',
    sectionKey: 'mff_liab_hecs',
    fields: [
      { key: 'heading_hecs', label: 'HECS / HELP Debt', type: 'heading' },
      { key: 'has_hecs', label: 'Do you have a HECS/HELP debt?', type: 'radio', options: YES_NO },
      { key: 'hecs_balance', label: 'HECS/HELP Balance', type: 'currency', condition: (d) => d.has_hecs === 'yes' },
      { key: 'heading_hecs_2', label: 'Second Applicant HECS/HELP', type: 'heading', condition: (d) => false }, // controlled by wizard condition
      { key: 'has_hecs_2', label: 'Does the second applicant have a HECS/HELP debt?', type: 'radio', options: YES_NO, condition: (d) => false },
      { key: 'hecs_balance_2', label: 'Second Applicant HECS/HELP Balance', type: 'currency', condition: (d) => false },
      { key: 'heading_tax', label: 'Tax Debts', type: 'heading' },
      { key: 'has_tax_debt', label: 'Do you have any tax debts?', type: 'radio', options: YES_NO },
      { key: 'tax_debt_amount', label: 'Tax Debt Amount', type: 'currency', condition: (d) => d.has_tax_debt === 'yes' },
      { key: 'tax_debt_arrangement', label: 'Payment arrangement in place?', type: 'radio', options: YES_NO, condition: (d) => d.has_tax_debt === 'yes' },
      { key: 'tax_debt_repayment', label: 'Monthly Repayment', type: 'currency', condition: (d) => d.has_tax_debt === 'yes' && d.tax_debt_arrangement === 'yes' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  35. EXPENSES – LIVING & HOUSEHOLD
  // ═══════════════════════════════════════════════════════
  {
    id: 'expenses_living',
    title: 'Expenses – Living & Household',
    subtitle: 'Your regular monthly essential expenses.',
    sectionKey: 'mff_expenses_living',
    fields: [
      { key: 'groceries', label: 'Groceries & Food', type: 'currency', half: true },
      { key: 'utilities', label: 'Utilities (gas, electricity, water)', type: 'currency', half: true },
      { key: 'transport', label: 'Transport / Fuel / Parking', type: 'currency', half: true },
      { key: 'insurance', label: 'Insurance (health, car, home, life)', type: 'currency', half: true },
      { key: 'education', label: 'Education / Childcare', type: 'currency', half: true },
      { key: 'medical', label: 'Medical / Health', type: 'currency', half: true },
      { key: 'phone_internet', label: 'Phone / Internet', type: 'currency', half: true },
      { key: 'clothing', label: 'Clothing', type: 'currency', half: true },
      { key: 'child_support', label: 'Child Support / Maintenance', type: 'currency', half: true },
      { key: 'council_rates', label: 'Council Rates', type: 'currency', half: true },
      { key: 'strata_body_corp', label: 'Strata / Body Corp', type: 'currency', half: true },
      { key: 'home_maintenance', label: 'Home Maintenance', type: 'currency', half: true },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  36. EXPENSES – DISCRETIONARY / LIFESTYLE
  // ═══════════════════════════════════════════════════════
  {
    id: 'expenses_discretionary',
    title: 'Expenses – Discretionary / Lifestyle',
    subtitle: 'Your monthly lifestyle and discretionary expenses.',
    sectionKey: 'mff_expenses_discretionary',
    fields: [
      { key: 'entertainment', label: 'Entertainment / Dining Out', type: 'currency', half: true },
      { key: 'subscriptions', label: 'Subscriptions / Streaming', type: 'currency', half: true },
      { key: 'recreation', label: 'Recreation / Hobbies', type: 'currency', half: true },
      { key: 'holidays', label: 'Holidays / Travel', type: 'currency', half: true },
      { key: 'personal_grooming', label: 'Personal Care / Grooming', type: 'currency', half: true },
      { key: 'gambling', label: 'Gambling', type: 'currency', half: true },
      { key: 'other_expenses', label: 'Other Expenses', type: 'currency', half: true },
      { key: 'other_expenses_description', label: 'Other Expenses Description', type: 'text', condition: (d) => Number(d.other_expenses) > 0 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  37. FUNDS
  // ═══════════════════════════════════════════════════════
  {
    id: 'funds',
    title: 'Available Funds',
    subtitle: 'Funds available for the transaction – savings, gifts, sale proceeds, other.',
    sectionKey: 'mff_funds',
    fields: [
      { key: 'genuine_savings', label: 'Genuine Savings', type: 'currency', description: 'Savings held for 3+ months' },
      { key: 'gift_funds', label: 'Gift Funds', type: 'currency', half: true },
      { key: 'gift_from', label: 'Gift From', type: 'text', half: true, condition: (d) => Number(d.gift_funds) > 0 },
      { key: 'gift_relationship', label: 'Relationship to Gifter', type: 'text', half: true, condition: (d) => Number(d.gift_funds) > 0 },
      { key: 'sale_of_property', label: 'Sale of Existing Property', type: 'currency' },
      { key: 'equity_existing', label: 'Equity from Existing Property', type: 'currency' },
      { key: 'first_home_owner_grant', label: 'First Home Owner Grant', type: 'currency' },
      { key: 'stamp_duty_concession', label: 'Stamp Duty Concession', type: 'currency' },
      { key: 'other_funds', label: 'Other Funds', type: 'currency', half: true },
      { key: 'other_funds_source', label: 'Source of Other Funds', type: 'text', half: true, condition: (d) => Number(d.other_funds) > 0 },
      { key: 'total_funds_notes', label: 'Additional Notes About Funds', type: 'textarea' },
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  38. PRIVACY, CONSENTS & DECLARATIONS
  // ═══════════════════════════════════════════════════════
  {
    id: 'privacy',
    title: 'Privacy, Consents & Declarations',
    subtitle: 'Please review and provide your consent.',
    sectionKey: 'mff_privacy',
    fields: [
      {
        key: 'privacy_info',
        label: 'We collect your personal information to assess your lending needs and recommend suitable products. Your information may be shared with lenders, insurers, and other service providers as required. We comply with the Privacy Act 1988 and the Australian Privacy Principles.',
        type: 'info',
      },
      { key: 'consent_privacy', label: 'I consent to the collection, use and disclosure of my personal information as described above.', type: 'checkbox', required: true },
      { key: 'consent_credit_check', label: 'I authorise a credit check to be conducted on my behalf.', type: 'checkbox', required: true },
      { key: 'consent_electronic_comms', label: 'I consent to receiving communications electronically.', type: 'checkbox' },
      { key: 'consent_marketing', label: 'I consent to receiving marketing communications from Margin Finance.', type: 'checkbox' },
      { key: 'consent_accuracy', label: 'I declare that all information provided in this fact find is true and accurate to the best of my knowledge.', type: 'checkbox', required: true },
      { key: 'signature_name', label: 'Full Name (as signature)', type: 'text', required: true, placeholder: 'Type your full name' },
      { key: 'signature_date', label: 'Date', type: 'date', half: true },
    ],
  },
];
