import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from '@/lib/i18n';
import SurfaceCard from '@/components/common/SurfaceCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Ελληνικά' },
];

const LanguageSection = () => {
  const { t, i18n } = useTranslation();

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.language.title')}
      </p>
      <SurfaceCard>
        <div className="p-4">
          <Select
            value={i18n.language}
            onValueChange={(lang) => void changeAppLanguage(lang)}
          >
            {/* The visible value is the language name, which is not a label —
                without this the control announces only "English, combobox". */}
            <SelectTrigger aria-label={t('settings.language.select')}>
              <SelectValue placeholder={t('settings.language.select')} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SurfaceCard>
    </section>
  );
};

export default LanguageSection;
