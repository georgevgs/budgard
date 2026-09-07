import * as z from 'zod';

export const RECEIPT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
export const RECEIPT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const SAFE_STRING = /^[\p{L}\p{N}\s.,!?'"\-/()@#&%+:;]*$/u; // Unicode letters, numbers, common punctuation
export const AMOUNT_PATTERN = /^\d{1,3}(?:\.\d{3})*(?:,\d{0,2})?$|^\d+(?:,\d{0,2})?$/;
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * A transaction records something that happened, so it cannot be dated into
 * the future. One day of slack absorbs timezone differences between the
 * device and anything it syncs with; beyond that a future date is a mistyped
 * year, and it lands in a month whose totals and averages it then distorts.
 *
 * Evaluated per validation rather than at module load, so a session left open
 * across midnight does not keep yesterday's ceiling.
 */
export const isNotFutureDated = (date: Date): boolean => {
  const limit = new Date();
  limit.setDate(limit.getDate() + 1);
  limit.setHours(23, 59, 59, 999);

  return date <= limit;
};

// Disposable/temporary email providers blocked to prevent spam signups
export const BLOCKED_DOMAINS = [
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

export const emailSchema = z.email('validation.emailInvalid').refine(
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

// Shared by the expense form and the quick-add draft in `common/hooks`, so it
// lives with the primitives rather than in either caller's feature folder.
export const expenseDescriptionSchema = z
  .string()
  .min(1, 'validation.descriptionRequired')
  .max(100, 'validation.descriptionTooLong100')
  .regex(SAFE_STRING, 'validation.descriptionInvalid')
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, 'validation.descriptionEmpty');

export const householdInviteSchema = z.object({
  email: emailSchema,
});
