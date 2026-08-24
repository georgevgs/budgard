// Navigations matching any of these patterns must reach the network instead
// of falling back to the cached app shell. The reset route is listed explicitly
// because it has no file extension and is the escape hatch when that shell is
// the thing that cannot boot.
export const PWA_NAVIGATION_DENYLIST = [
  /^\/reset(?:[/?]|$)/,
  /^\/_/,
  /\/[^/?]+\.[^/]+$/,
];
