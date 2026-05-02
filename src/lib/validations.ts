import * as z from 'zod';
import { parseCurrencyInput } from '@/lib/utils';

// Receipt validation constants
export const RECEIPT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
export const RECEIPT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Shared regex patterns
export const SAFE_STRING = /^[\p{L}\p{N}\s.,!?'"\-/()@#&%+:;]*$/u; // Unicode letters, numbers, common punctuation
const AMOUNT_PATTERN = /^\d{1,3}(?:\.\d{3})*(?:,\d{0,2})?$|^\d+(?:,\d{0,2})?$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// Disposable/temporary email providers blocked to prevent spam signups
const BLOCKED_DOMAINS = [
  // Popular disposable email services
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tmpmail.org',
  'tmpmail.net',
  'throwawaymail.com',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailinater.com',
  'mailinator2.com',
  'maildrop.cc',
  'getairmail.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'dispostable.com',
  'mailnesia.com',
  'mailcatch.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'trashmail.me',
  'trashmailbox.com',
  'mintemail.com',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'mytrashmail.com',
  'mt2009.com',
  'thankyou2010.com',
  'trash2009.com',
  'mt2014.com',
  'tempinbox.com',
  'tempmailaddress.com',
  'tempemailaddress.com',
  'emailondeck.com',
  'mohmal.com',
  'discard.email',
  'discardmail.com',
  'discardmail.de',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'mailexpire.com',
  'tempail.com',
  'tempr.email',
  'tempmailo.com',
  'fakemail.net',
  'throwaway.email',
  'getnada.com',
  'nada.email',
  'anonbox.net',
  'anonymbox.com',
  'fakeinbox.net',
  'emailfake.com',
  'generator.email',
  'inboxalias.com',
  'burnermail.io',
  'incognitomail.com',
  'incognitomail.net',
  'mailsac.com',
  'moakt.com',
  'moakt.ws',
  'receivemail.com',
  'tempmailer.com',
  'tempmailin.com',
  'crazymailing.com',
  'disposableemailaddresses.com',
  'emailisvalid.com',
  'emltmp.com',
  'getonemail.com',
  'getonemail.net',
  'hmamail.com',
  'mailforspam.com',
  'objectmail.com',
  'proxymail.eu',
  'rcpt.at',
  'rejectmail.com',
  'safetymail.info',
  'sogetthis.com',
  'spamavert.com',
  'spamfree24.org',
  'spamherelots.com',
  'superrito.com',
  'tagyourself.com',
  'teleworm.us',
  'tradermail.info',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
];

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .refine(
    (email) => !BLOCKED_DOMAINS.some((domain) => email.endsWith(domain)),
    {
      message: 'Please use a valid email address',
    },
  );

// Tag validation schema
export const tagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name must be less than 50 characters')
    .regex(SAFE_STRING, 'Tag name contains invalid characters')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Tag name cannot be empty'),
  color: z.string().regex(HEX_COLOR, 'Invalid color format'),
});

// Expense validation schema
export const expenseSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 1000000;
    }, 'Amount must be between 0 and 1.000.000'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(100, 'Description must be less than 100 characters')
    .regex(SAFE_STRING, 'Description contains invalid characters')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'Description cannot be empty'),
  category_id: z.string(),
  tag_id: z.string().optional(),
  date: z.date({
    required_error: 'Date is required',
  }),
});

// Category validation schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters')
    .regex(SAFE_STRING, 'Category name contains invalid characters')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'Category name cannot be empty'),
  color: z.string().regex(HEX_COLOR, 'Invalid color format'),
  icon: z.string().max(4).optional(),
  kind: z.enum(['need', 'want', 'savings'] as const).optional(),
});

// Recurring expense validation schema
export const recurringExpenseSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .regex(AMOUNT_PATTERN, 'Invalid amount format')
      .refine((val) => {
        const amount = parseCurrencyInput(val);
        return amount > 0 && amount <= 1000000;
      }, 'Amount must be between 0 and 1.000.000'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(100, 'Description must be less than 100 characters')
      .regex(SAFE_STRING, 'Description contains invalid characters')
      .transform((str) => str.trim())
      .refine((str) => str.length > 0, 'Description cannot be empty'),
    category_id: z.string(),
    frequency: z.enum([
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ] as const),
    start_date: z.date({
      required_error: 'Start date is required',
    }),
    end_date: z.date().optional(),
    linked_account_id: z.string().nullable().optional(),
  })
  .refine((data) => !data.end_date || data.end_date >= data.start_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

// Budget validation schema
export const budgetSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 10000000;
    }, 'Amount must be between 0 and 10.000.000'),
});

// Per-category budget validation schema. Empty string is treated as
// "no cap for this category" by the caller (we delete the row instead of
// inserting); this schema only validates non-empty inputs.
export const categoryBudgetSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 10000000;
    }, 'Amount must be between 0 and 10.000.000'),
});

// Expense template validation schema
export const templateSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 1000000;
    }, 'Amount must be between 0 and 1.000.000'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(100, 'Description must be less than 100 characters')
    .regex(SAFE_STRING, 'Description contains invalid characters')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'Description cannot be empty'),
  category_id: z.string().optional(),
  tag_id: z.string().optional(),
});

// Income validation schema — same shape as expense for now
export const incomeSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 1000000;
    }, 'Amount must be between 0 and 1.000.000'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(100, 'Description must be less than 100 characters')
    .regex(SAFE_STRING, 'Description contains invalid characters')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'Description cannot be empty'),
  category_id: z.string(),
  date: z.date({
    required_error: 'Date is required',
  }),
});

// Recurring income validation schema — mirrors recurring expense
export const recurringIncomeSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .regex(AMOUNT_PATTERN, 'Invalid amount format')
      .refine((val) => {
        const amount = parseCurrencyInput(val);
        return amount > 0 && amount <= 1000000;
      }, 'Amount must be between 0 and 1.000.000'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(100, 'Description must be less than 100 characters')
      .regex(SAFE_STRING, 'Description contains invalid characters')
      .transform((str) => str.trim())
      .refine((str) => str.length > 0, 'Description cannot be empty'),
    category_id: z.string(),
    frequency: z.enum([
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ] as const),
    start_date: z.date({
      required_error: 'Start date is required',
    }),
    end_date: z.date().optional(),
  })
  .refine((data) => !data.end_date || data.end_date >= data.start_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

// Income category validation schema — same shape as category
export const incomeCategorySchema = categorySchema;

// Goal validation schema
export const goalSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(80, 'Name must be less than 80 characters')
      .regex(SAFE_STRING, 'Name contains invalid characters')
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, 'Name cannot be empty'),
    target_amount: z
      .string()
      .min(1, 'Target is required')
      .regex(AMOUNT_PATTERN, 'Invalid amount format')
      .refine((val) => {
        const amount = parseCurrencyInput(val);
        return amount > 0 && amount <= 10000000;
      }, 'Target must be between 0 and 10.000.000'),
    deadline: z.date().optional(),
    source_type: z.enum(['category', 'tag', 'net_delta'] as const),
    category_id: z.string().optional(),
    tag_id: z.string().optional(),
    icon: z.string().min(1).max(40),
    color: z.string().regex(HEX_COLOR, 'Invalid color format'),
  })
  .refine(
    (data) => data.source_type !== 'category' || !!data.category_id,
    {
      message: 'Pick a category to track',
      path: ['category_id'],
    },
  )
  .refine((data) => data.source_type !== 'tag' || !!data.tag_id, {
    message: 'Pick a tag to track',
    path: ['tag_id'],
  });

// Account validation schema
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(60, 'Name must be less than 60 characters')
    .regex(SAFE_STRING, 'Name contains invalid characters')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Name cannot be empty'),
  kind: z.enum([
    'cash',
    'bank',
    'credit_card',
    'loan',
    'investment',
    'other',
  ] as const),
  default_currency: z.string().length(3, 'Pick a currency'),
  initial_balance: z
    .string()
    .min(1, 'Starting balance is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount >= 0 && amount <= 100000000;
    }, 'Amount must be between 0 and 100.000.000'),
  color: z.string().regex(HEX_COLOR, 'Invalid color format'),
});

// Balance snapshot schema. balance is the new current value;
// contribution_delta is meaningful only for investment accounts
// (signed: positive = deposit, negative = withdrawal).
export const accountBalanceSchema = z.object({
  balance: z
    .string()
    .min(1, 'Balance is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount >= 0 && amount <= 100000000;
    }, 'Amount must be between 0 and 100.000.000'),
  contribution_delta: z
    .string()
    .optional()
    .refine(
      (val) => !val || AMOUNT_PATTERN.test(val.replace(/^-/, '')),
      'Invalid amount format',
    ),
  recorded_at: z.date({
    required_error: 'Date is required',
  }),
  note: z
    .string()
    .max(200, 'Note must be less than 200 characters')
    .regex(SAFE_STRING, 'Note contains invalid characters')
    .optional(),
});

// Debt validation schema. current_balance becomes original_principal in the DB
// at create time (most users only know what they owe today, not what they
// originally borrowed).
export const debtSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(80, 'Name must be less than 80 characters')
    .regex(SAFE_STRING, 'Name contains invalid characters')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Name cannot be empty'),
  kind: z.enum([
    'credit_card',
    'student_loan',
    'mortgage',
    'auto_loan',
    'personal_loan',
    'medical',
    'other',
  ] as const),
  current_balance: z
    .string()
    .min(1, 'Balance is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 100000000;
    }, 'Amount must be between 0 and 100.000.000'),
  apr: z
    .string()
    .min(1, 'APR is required')
    .refine((val) => {
      const num = Number(val.replace(',', '.'));
      return !Number.isNaN(num) && num >= 0 && num <= 100;
    }, 'APR must be between 0 and 100'),
  minimum_payment: z
    .string()
    .min(1, 'Minimum payment is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount >= 0 && amount <= 100000000;
    }, 'Amount must be between 0 and 100.000.000'),
  currency: z.string().length(3, 'Pick a currency'),
  payoff_target_date: z.date().optional(),
  icon: z.string().min(1).max(40),
  color: z.string().regex(HEX_COLOR, 'Invalid color format'),
});

// Debt payment schema (creates an expense linked to the debt).
export const debtPaymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(AMOUNT_PATTERN, 'Invalid amount format')
    .refine((val) => {
      const amount = parseCurrencyInput(val);
      return amount > 0 && amount <= 100000000;
    }, 'Amount must be between 0 and 100.000.000'),
  date: z.date({ required_error: 'Date is required' }),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .regex(SAFE_STRING, 'Description contains invalid characters')
    .optional(),
});

// Types
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type IncomeFormData = z.infer<typeof incomeSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type TagFormData = z.infer<typeof tagSchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
export type RecurringIncomeFormData = z.infer<typeof recurringIncomeSchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type CategoryBudgetFormData = z.infer<typeof categoryBudgetSchema>;
export type TemplateFormData = z.infer<typeof templateSchema>;
export type GoalFormData = z.infer<typeof goalSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;
export type AccountBalanceFormData = z.infer<typeof accountBalanceSchema>;
export type DebtFormData = z.infer<typeof debtSchema>;
export type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>;
