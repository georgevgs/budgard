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
  .email('validation.emailInvalid')
  .refine(
    (email) => {
      const atIndex = email.lastIndexOf('@');
      if (atIndex < 0) {
        return true;
      }
      const domain = email.slice(atIndex + 1).toLowerCase();

      return !BLOCKED_DOMAINS.some(
        (blocked) => domain === blocked || domain.endsWith('.' + blocked),
      );
    },
    {
      message: 'validation.emailBlocked',
    },
  );

// Tag validation schema
export const tagSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.tagNameRequired')
    .max(50, 'validation.tagNameTooLong')
    .regex(SAFE_STRING, 'validation.tagNameInvalid')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'validation.tagNameEmpty'),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
});

// Expense validation schema
export const expenseSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 1000000;
    }, 'validation.amountMax1M'),
  description: z
    .string()
    .min(1, 'validation.descriptionRequired')
    .max(100, 'validation.descriptionTooLong100')
    .regex(SAFE_STRING, 'validation.descriptionInvalid')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'validation.descriptionEmpty'),
  category_id: z.string(),
  tag_id: z.string().optional(),
  // Additional tags beyond the primary (Pro). The form enforces the free
  // tier's single-tag limit; the expense_tags table enforces it server-side.
  extra_tag_ids: z.array(z.string()).optional(),
  date: z.date({
    error: 'validation.dateRequired',
  }),
});

// Category validation schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'validation.categoryNameRequired')
    .max(50, 'validation.categoryNameTooLong')
    .regex(SAFE_STRING, 'validation.categoryNameInvalid')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'validation.categoryNameEmpty'),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
  icon: z.string().max(4).optional(),
  kind: z.enum(['need', 'want', 'savings'] as const).optional(),
});

// Recurring expense validation schema
export const recurringExpenseSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'validation.amountRequired')
      .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
      .refine((val) => {
        const amount = parseCurrencyInput(val);

        return amount > 0 && amount <= 1000000;
      }, 'validation.amountMax1M'),
    description: z
      .string()
      .min(1, 'validation.descriptionRequired')
      .max(100, 'validation.descriptionTooLong100')
      .regex(SAFE_STRING, 'validation.descriptionInvalid')
      .transform((str) => str.trim())
      .refine((str) => str.length > 0, 'validation.descriptionEmpty'),
    category_id: z.string(),
    frequency: z.enum([
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ] as const),
    start_date: z
      .date({
        error: 'validation.startDateRequired',
      })
      .min(new Date('2000-01-01'), 'validation.startDateTooEarly'),
    end_date: z.date().optional(),
    linked_account_id: z.string().nullable().optional(),
  })
  .refine((data) => !data.end_date || data.end_date >= data.start_date, {
    message: 'validation.endDateBeforeStart',
    path: ['end_date'],
  });

// Budget validation schema
export const budgetSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 10000000;
    }, 'validation.amountMax10M'),
});

// Per-category budget validation schema. Empty string is treated as
// "no cap for this category" by the caller (we delete the row instead of
// inserting); this schema only validates non-empty inputs.
export const categoryBudgetSchema = z.object({
  category_id: z.string().min(1, 'validation.categoryRequired'),
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 10000000;
    }, 'validation.amountMax10M'),
});

// Income validation schema — same shape as expense for now
export const incomeSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 1000000;
    }, 'validation.amountMax1M'),
  description: z
    .string()
    .min(1, 'validation.descriptionRequired')
    .max(100, 'validation.descriptionTooLong100')
    .regex(SAFE_STRING, 'validation.descriptionInvalid')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'validation.descriptionEmpty'),
  category_id: z.string(),
  date: z.date({
    error: 'validation.dateRequired',
  }),
});

// Goal validation schema
export const goalSchema = z
  .object({
    name: z
      .string()
      .min(1, 'validation.nameRequired')
      .max(80, 'validation.nameTooLong80')
      .regex(SAFE_STRING, 'validation.nameInvalid')
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, 'validation.nameEmpty'),
    target_amount: z
      .string()
      .min(1, 'validation.targetRequired')
      .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
      .refine((val) => {
        const amount = parseCurrencyInput(val);

        return amount > 0 && amount <= 10000000;
      }, 'validation.targetMax10M'),
    deadline: z.date().optional(),
    source_type: z.enum(['category', 'tag', 'net_delta'] as const),
    category_id: z.string().optional(),
    tag_id: z.string().optional(),
    icon: z.string().min(1).max(40),
    color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
  })
  .refine(
    (data) => data.source_type !== 'category' || !!data.category_id,
    {
      message: 'validation.goalCategoryRequired',
      path: ['category_id'],
    },
  )
  .refine((data) => data.source_type !== 'tag' || !!data.tag_id, {
    message: 'validation.goalTagRequired',
    path: ['tag_id'],
  });

// Account validation schema
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.nameRequired')
    .max(60, 'validation.nameTooLong60')
    .regex(SAFE_STRING, 'validation.nameInvalid')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'validation.nameEmpty'),
  kind: z.enum([
    'cash',
    'bank',
    'credit_card',
    'loan',
    'investment',
    'other',
  ] as const),
  default_currency: z.string().length(3, 'validation.currencyRequired'),
  initial_balance: z
    .string()
    .min(1, 'validation.startingBalanceRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount >= 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
});

// Balance snapshot schema. balance is the new current value;
// contribution_delta is meaningful only for investment accounts
// (signed: positive = deposit, negative = withdrawal).
export const accountBalanceSchema = z.object({
  balance: z
    .string()
    .min(1, 'validation.balanceRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount >= 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  contribution_delta: z
    .string()
    .optional()
    .refine(
      (val) => !val || AMOUNT_PATTERN.test(val.replace(/^-/, '')),
      'validation.amountInvalid',
    ),
  recorded_at: z.date({
    error: 'validation.dateRequired',
  }),
  note: z
    .string()
    .max(200, 'validation.noteTooLong')
    .regex(SAFE_STRING, 'validation.noteInvalid')
    .optional(),
});

// Debt validation schema. current_balance becomes original_principal in the DB
// at create time (most users only know what they owe today, not what they
// originally borrowed).
export const debtSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.nameRequired')
    .max(80, 'validation.nameTooLong80')
    .regex(SAFE_STRING, 'validation.nameInvalid')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'validation.nameEmpty'),
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
    .min(1, 'validation.balanceRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  apr: z
    .string()
    .min(1, 'validation.aprRequired')
    .refine((val) => {
      const num = Number(val.replace(',', '.'));

      return !Number.isNaN(num) && num >= 0 && num <= 100;
    }, 'validation.aprRange'),
  minimum_payment: z
    .string()
    .min(1, 'validation.minPaymentRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount >= 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  currency: z.string().length(3, 'validation.currencyRequired'),
  payoff_target_date: z.date().optional(),
  icon: z.string().min(1).max(40),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
});

// Debt payment schema (creates an expense linked to the debt).
export const debtPaymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  date: z.date({ error: 'validation.dateRequired' }),
  description: z
    .string()
    .max(200, 'validation.descriptionTooLong200')
    .regex(SAFE_STRING, 'validation.descriptionInvalid')
    .optional(),
});

// Types
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type IncomeFormData = z.infer<typeof incomeSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type GoalFormData = z.infer<typeof goalSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;
export type AccountBalanceFormData = z.infer<typeof accountBalanceSchema>;
export type DebtFormData = z.infer<typeof debtSchema>;
export type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>;
