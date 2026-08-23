import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';

// The way out of a screen you arrived at from somewhere. Lived in the app bar
// until the bar itself went; it is now part of the screen's own header, which
// is where the design puts every other round chrome control too.
const BackButton = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    // React Router stamps an index into history state; 0 means this entry
    // was a direct load (deep link), where "back" would leave the app.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (historyIndex && historyIndex > 0) {
      navigate(-1);

      return;
    }
    navigate('/today', { viewTransition: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={t('common.back')}
      className="tile flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4.5 w-4.5" />
    </button>
  );
};

export default BackButton;
