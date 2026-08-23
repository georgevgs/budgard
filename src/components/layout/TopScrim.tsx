// What is left of the app bar. The bento screens draw their own headers and
// scroll freely under the status bar, which is right on a device with no
// notch and unreadable on one with a clock sitting in that strip — so the
// strip itself keeps a blurred ground while the bar it used to belong to is
// gone. Exactly the safe-area inset tall: zero height in a browser tab.
const TopScrim = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background/80 backdrop-blur-xl"
    />
  );
};

export default TopScrim;
