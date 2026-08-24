import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BrandMark from '@/components/common/BrandMark';
import TileLabel from '@/components/bento/TileLabel';

type Props = {
  currentLang: string;
  onChangeLanguage: (lang: string) => void;
};

type Tx = (key: string, opts?: Record<string, unknown>) => string;

const Footer = ({ currentLang, onChangeLanguage }: Props) => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="landing-gutter mx-auto max-w-6xl py-14">
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
      <span className="type-wordmark">Budgard</span>
    </div>
    <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[260px]">
      {t('landing.footer.tagline')}
    </p>
  </div>
);

const renderLinkColumn = (t: Tx, group: string, items: string[]) => (
  <div>
    <TileLabel className="text-foreground">
      {t(`landing.footer.${group}.title`)}
    </TileLabel>
    <ul className="mt-4 space-y-3 text-sm text-foreground">
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
      <a href={`#${item}`} className="transition-opacity hover:opacity-65">
        {label}
      </a>
    );
  }

  return (
    <Link to={`/${item}`} className="transition-opacity hover:opacity-65">
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
    <TileLabel className="text-foreground">
      {t('landing.footer.language')}
    </TileLabel>
    <div className="segmented mt-4">
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
      data-active={isActive}
      className="segmented-item min-h-8 px-3 hover:text-foreground"
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
