import airplane from '@/assets/emoji3d/airplane.webp?no-inline';
import arrowBack from '@/assets/emoji3d/arrow-back.webp?no-inline';
import artistPalette from '@/assets/emoji3d/artist-palette.webp?no-inline';
import automobile from '@/assets/emoji3d/automobile.webp?no-inline';
import baby from '@/assets/emoji3d/baby.webp?no-inline';
import bank from '@/assets/emoji3d/bank.webp?no-inline';
import barChart from '@/assets/emoji3d/bar-chart.webp?no-inline';
import beerMug from '@/assets/emoji3d/beer-mug.webp?no-inline';
import bell from '@/assets/emoji3d/bell.webp?no-inline';
import books from '@/assets/emoji3d/books.webp?no-inline';
import briefcase from '@/assets/emoji3d/briefcase.webp?no-inline';
import broom from '@/assets/emoji3d/broom.webp?no-inline';
import bust from '@/assets/emoji3d/bust.webp?no-inline';
import busts from '@/assets/emoji3d/busts.webp?no-inline';
import cardFileBox from '@/assets/emoji3d/card-file-box.webp?no-inline';
import chartDecreasing from '@/assets/emoji3d/chart-decreasing.webp?no-inline';
import chartIncreasing from '@/assets/emoji3d/chart-increasing.webp?no-inline';
import checkMarkButton from '@/assets/emoji3d/check-mark-button.webp?no-inline';
import clapperBoard from '@/assets/emoji3d/clapper-board.webp?no-inline';
import creditCard from '@/assets/emoji3d/credit-card.webp?no-inline';
import directHit from '@/assets/emoji3d/direct-hit.webp?no-inline';
import euroBanknote from '@/assets/emoji3d/euro-banknote.webp?no-inline';
import gemStone from '@/assets/emoji3d/gem-stone.webp?no-inline';
import graduationCap from '@/assets/emoji3d/graduation-cap.webp?no-inline';
import haircut from '@/assets/emoji3d/haircut.webp?no-inline';
import hamburger from '@/assets/emoji3d/hamburger.webp?no-inline';
import hotBeverage from '@/assets/emoji3d/hot-beverage.webp?no-inline';
import house from '@/assets/emoji3d/house.webp?no-inline';
import label from '@/assets/emoji3d/label.webp?no-inline';
import laptop from '@/assets/emoji3d/laptop.webp?no-inline';
import liftingWeights from '@/assets/emoji3d/lifting-weights.webp?no-inline';
import lightBulb from '@/assets/emoji3d/light-bulb.webp?no-inline';
import mobilePhone from '@/assets/emoji3d/mobile-phone.webp?no-inline';
import moneyBag from '@/assets/emoji3d/money-bag.webp?no-inline';
import musicalNote from '@/assets/emoji3d/musical-note.webp?no-inline';
import outboxTray from '@/assets/emoji3d/outbox-tray.webp?no-inline';
import pageFacingUp from '@/assets/emoji3d/page-facing-up.webp?no-inline';
import pawPrints from '@/assets/emoji3d/paw-prints.webp?no-inline';
import pill from '@/assets/emoji3d/pill.webp?no-inline';
import pizza from '@/assets/emoji3d/pizza.webp?no-inline';
import purse from '@/assets/emoji3d/purse.webp?no-inline';
import receipt from '@/assets/emoji3d/receipt.webp?no-inline';
import redHeart from '@/assets/emoji3d/red-heart.webp?no-inline';
import shoppingCart from '@/assets/emoji3d/shopping-cart.webp?no-inline';
import sparkles from '@/assets/emoji3d/sparkles.webp?no-inline';
import spiralCalendar from '@/assets/emoji3d/spiral-calendar.webp?no-inline';
import tShirt from '@/assets/emoji3d/t-shirt.webp?no-inline';
import videoGame from '@/assets/emoji3d/video-game.webp?no-inline';
import wrappedGift from '@/assets/emoji3d/wrapped-gift.webp?no-inline';

// Each emoji the app draws, as the matching 3D object from Microsoft's Fluent
// emoji set (MIT, see assets/emoji3d/LICENSE). Categories store their emoji,
// and the rest of the app names the object it wants the same way, so one map
// serves both. An emoji outside the set falls back to a label.
export const getEmoji3dSource = (emoji: string | null | undefined): string => {
  if (undefined !== emoji && null !== emoji && emoji in SOURCES_BY_EMOJI) {
    return SOURCES_BY_EMOJI[emoji];
  } else {
    return label;
  }
};

const SOURCES_BY_EMOJI: Record<string, string> = {
  '🍔': hamburger,
  '🛒': shoppingCart,
  '🏠': house,
  '🚗': automobile,
  '🎬': clapperBoard,
  '💊': pill,
  '👕': tShirt,
  '💡': lightBulb,
  '🎮': videoGame,
  '✈️': airplane,
  '📱': mobilePhone,
  '🎓': graduationCap,
  '💇': haircut,
  '🐾': pawPrints,
  '🎁': wrappedGift,
  '☕': hotBeverage,
  '🍕': pizza,
  '🍺': beerMug,
  '🏋️': liftingWeights,
  '💼': briefcase,
  '🎵': musicalNote,
  '📚': books,
  '🧹': broom,
  '👶': baby,
  '💻': laptop,
  '↩️': arrowBack,
  '📈': chartIncreasing,
  '🎯': directHit,
  '💳': creditCard,
  '💰': moneyBag,
  '❤️': redHeart,
  '👛': purse,
  '💶': euroBanknote,
  '🏦': bank,
  '🧾': receipt,
  '🗓️': spiralCalendar,
  '📊': barChart,
  '📉': chartDecreasing,
  '✨': sparkles,
  '💎': gemStone,
  '📄': pageFacingUp,
  '🔔': bell,
  '🎨': artistPalette,
  '👥': busts,
  '👤': bust,
  '🗃️': cardFileBox,
  '📤': outboxTray,
  '✅': checkMarkButton,
  '🏷️': label,
};
