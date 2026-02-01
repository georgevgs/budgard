import * as z from 'zod';
import { parseCurrencyInput } from '@/lib/utils';

// Shared regex patterns
const SAFE_STRING = /^[\p{L}\p{N}\s.,!?-]*$/u; // Unicode letters, numbers, basic punctuation
const AMOUNT_PATTERN = /^\d{1,3}(?:\.\d{3})*(?:,\d{0,2})?$/;
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
});

// Recurring expense validation schema
export const recurringExpenseSchema = z.object({
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
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date().optional(),
});

// Types
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
