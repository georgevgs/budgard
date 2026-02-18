const canVibrate = (): boolean => 'vibrate' in navigator;

export const haptics = {
  // Subtle tap — form submissions, toggles
  light: (): void => {
    if (canVibrate()) navigator.vibrate(10);
  },
  // Confirm — successful save
  success: (): void => {
    if (canVibrate()) navigator.vibrate([10, 40, 10]);
  },
  // Destructive — delete actions
  warning: (): void => {
    if (canVibrate()) navigator.vibrate(25);
  },
  // Something went wrong
  error: (): void => {
    if (canVibrate()) navigator.vibrate([20, 80, 20]);
  },
};
