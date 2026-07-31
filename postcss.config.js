export default {
  plugins: {
    // Tailwind 4 ships its own PostCSS plugin and handles vendor prefixing
    // and @import internally, so autoprefixer/postcss-import are no longer
    // listed here.
    '@tailwindcss/postcss': {},
  },
};
