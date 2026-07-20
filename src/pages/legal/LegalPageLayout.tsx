import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Wallet from 'lucide-react/dist/esm/icons/wallet';

type Props = {
  title: string;
  children: ReactNode;
};

// Shared shell for the public legal pages (/privacy, /terms, /contact):
// narrow reading column, a way back home at the top, and cross-links to the
// sibling pages at the bottom.
const LegalPageLayout = ({ title, children }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight text-[15px]">
              budgard
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('legal.backHome')}
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {children}
      </main>
      <footer className="border-t border-border/60">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            {t('landing.footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <nav className="flex items-center gap-4">
            {renderFooterLink('/privacy', t('landing.footer.company.privacy'))}
            {renderFooterLink('/terms', t('landing.footer.company.terms'))}
            {renderFooterLink('/contact', t('landing.footer.company.contact'))}
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default LegalPageLayout;

// --- Helpers ---

const renderFooterLink = (to: string, label: string) => (
  <Link to={to} className="hover:text-foreground transition-colors">
    {label}
  </Link>
);
