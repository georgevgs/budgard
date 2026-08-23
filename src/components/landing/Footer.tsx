import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BrandMark from '@/components/common/BrandMark';
import { cn } from '@/lib/utils';

type Props = {
  currentLang: string;
  onChangeLanguage: (lang: string) => void;
};

type Tx = (key: string, opts?: Record<string, unknown>) => string;

const Footer = ({ currentLang, onChangeLanguage }: Props) => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {renderBrandColumn(t)}
          {renderLinkColumn(t, 'product', ['features', 'pricing', 'faq'])}
          {renderLinkColumn(t, 'company', ['privacy', 'terms', 'contact'])}
          {renderLanguageColumn(t, currentLang, onChangeLanguage)}
        </div>
        {renderBottomBar(t)}
      </div>
    </footer>
  );
};

export default Footer;

const renderBrandColumn = (t: Tx) => (
  <div>
    <div className="flex items-center gap-2.5">
      <BrandMark className="h-7 w-7" />
      <span className="type-wordmark">
        Budgard
      </span>
    </div>
    <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[260px]">
      {t('landing.footer.tagline')}
    </p>
  </div>
);

const renderLinkColumn = (t: Tx, group: string, items: string[]) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
      {t(`landing.footer.${group}.title`)}
    </p>
    <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{renderLink(group, item, t)}</li>
      ))}
    </ul>
  </div>
);

// Product entries scroll to landing-page sections; company entries are real
// routes (/privacy, /terms, /contact).
const renderLink = (group: string, item: string, t: Tx) => {
  const label = t(`landing.footer.${group}.${item}`);

  if (group === 'product') {
    return (
      <a href={`#${item}`} className="hover:text-foreground transition-colors">
        {label}
      </a>
    );
  }

  return (
    <Link to={`/${item}`} className="hover:text-foreground transition-colors">
      {label}
    </Link>
  );
};

const renderLanguageColumn = (
  t: Tx,
  currentLang: string,
  onChangeLanguage: (lang: string) => void,
) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
      {t('landing.footer.language')}
    </p>
    <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-full border border-border/60 bg-card">
      {renderLangButton('en', 'English', currentLang, onChangeLanguage)}
      {renderLangButton('el', 'Ελληνικά', currentLang, onChangeLanguage)}
    </div>
  </div>
);

const renderLangButton = (
  code: string,
  label: string,
  currentLang: string,
  onChangeLanguage: (lang: string) => void,
) => {
  const isActive = currentLang === code;

  return (
    <button
      type="button"
      onClick={() => onChangeLanguage(code)}
      className={cn(
        'h-8 px-3 rounded-full text-xs font-medium transition-colors',
        isActive && 'bg-foreground text-background',
        !isActive && 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
};

const renderBottomBar = (t: Tx) => (
  <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
    <p>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
    <p>{t('landing.footer.builtIn')}</p>
  </div>
);
