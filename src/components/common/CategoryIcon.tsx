import { createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import Baby from 'lucide-react/dist/esm/icons/baby';
import Beer from 'lucide-react/dist/esm/icons/beer';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import BrushCleaning from 'lucide-react/dist/esm/icons/brush-cleaning';
import Car from 'lucide-react/dist/esm/icons/car';
import ChartNoAxesCombined from 'lucide-react/dist/esm/icons/chart-no-axes-combined';
import Clapperboard from 'lucide-react/dist/esm/icons/clapperboard';
import Coffee from 'lucide-react/dist/esm/icons/coffee';
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell';
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2';
import Gift from 'lucide-react/dist/esm/icons/gift';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import House from 'lucide-react/dist/esm/icons/house';
import Laptop from 'lucide-react/dist/esm/icons/laptop';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import Music from 'lucide-react/dist/esm/icons/music';
import PawPrint from 'lucide-react/dist/esm/icons/paw-print';
import Pill from 'lucide-react/dist/esm/icons/pill';
import Plane from 'lucide-react/dist/esm/icons/plane';
import Scissors from 'lucide-react/dist/esm/icons/scissors';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Utensils from 'lucide-react/dist/esm/icons/utensils';
import { cn } from '@/lib/utils';

type Props = {
  icon: string | null | undefined;
  className?: string;
};

// Categories are still stored as the user's existing emoji value, but they
// render through one coherent SVG family. This keeps old data compatible while
// avoiding platform-dependent emoji weight, alignment and colour.
const CategoryIcon = ({ icon, className }: Props) => {
  return createElement(resolveIcon(icon), {
    'aria-hidden': true,
    className: cn('h-4 w-4 shrink-0', className),
    strokeWidth: 1.8,
  });
};

export default CategoryIcon;

// --- Helpers ---

const ICONS_BY_VALUE: Record<string, LucideIcon> = {
  '🍔': Utensils,
  '🛒': ShoppingCart,
  '🏠': House,
  '🚗': Car,
  '🎬': Clapperboard,
  '💊': Pill,
  '👕': Shirt,
  '💡': Lightbulb,
  '🎮': Gamepad2,
  '✈️': Plane,
  '📱': Smartphone,
  '🎓': GraduationCap,
  '💇': Scissors,
  '🐾': PawPrint,
  '🎁': Gift,
  '☕': Coffee,
  '🍕': Utensils,
  '🍺': Beer,
  '🏋️': Dumbbell,
  '💼': Briefcase,
  '🎵': Music,
  '📚': BookOpen,
  '🧹': BrushCleaning,
  '👶': Baby,
  '💻': Laptop,
  '↩️': Undo2,
  '📈': ChartNoAxesCombined,
};

const resolveIcon = (icon: string | null | undefined): LucideIcon => {
  if (!icon) {
    return Tag;
  }

  return ICONS_BY_VALUE[icon] ?? Tag;
};
