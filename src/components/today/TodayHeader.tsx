import { useTranslation } from 'react-i18next';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import ProfileMenu from '@/components/layout/ProfileMenu';

type Props = {
  greeting: 'morning' | 'afternoon' | 'evening';
  dateLabel: string;
  isArranging: boolean;
  onArrange: () => void;
  onDone: () => void;
};

// Today's own header. There is no app bar behind it any more, so this is also
// where the account lives — the avatar is the way into Settings from the tab
// people land on.
const TodayHeader = (props: Props) => {
  const { t } = useTranslation();

  if (props.isArranging) {
    return renderArrangingHeader(props.onDone, t);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate type-title">
          {t(`today.greeting.${props.greeting}`)}
        </h1>
        <p className="mt-1 truncate text-xs leading-tight text-muted-foreground">
          {props.dateLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={props.onArrange}
          aria-label={t('today.arrange.open')}
          className="tile flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutGrid className="h-4.5 w-4.5" />
        </button>
        <ProfileMenu />
      </div>
    </div>
  );
};

export default TodayHeader;

// --- Helpers ---

type TFunc = (key: string) => string;

const renderArrangingHeader = (onDone: () => void, t: TFunc) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="type-title">{t('today.arrange.title')}</h1>
      <button
        type="button"
        onClick={onDone}
        className="flex min-h-11 shrink-0 cursor-pointer items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t('today.arrange.done')}
      </button>
    </div>
  );
};
