import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';

/**
 * The nav capsule gives up its right-hand slot to a floating action button via
 * a single CSS rule in index.css. Reading the selector straight out of the
 * stylesheet keeps this test honest — it can't drift from what ships.
 */
const readDockSlotSelector = (): string => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
  const rule = css.match(/(body:has\([^{]*?\)\s*\.nav-dock)\s*\{/);

  if (rule === null) {
    throw new Error('Dock action slot rule not found in src/index.css');
  }

  return rule[1].replace(/\s+/g, ' ').trim();
};

const SELECTOR = readDockSlotSelector();

const readCss = (): string =>
  readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const isSlotReserved = () => document.querySelector(SELECTOR) !== null;

const buildDom = (html: string) => {
  document.body.innerHTML = `${html}<nav class="nav-dock"></nav>`;
};

describe('dock action slot', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reserves the slot when a visible action button is on screen', () => {
    buildDom('<div><button data-dock-action></button></div>');

    expect(isSlotReserved()).toBe(true);
  });

  it('gives the capsule its full width when no action button exists', () => {
    buildDom('<div></div>');

    expect(isSlotReserved()).toBe(false);
  });

  // MainTabsLayout keeps visited tabs mounted behind `hidden` instead of
  // unmounting them, so Expenses' button is still in the DOM while the user is
  // on Recurring. Before this was handled the slot stayed reserved until a
  // full page refresh.
  it('ignores an action button parked in a hidden keep-alive tab', () => {
    buildDom('<div hidden><button data-dock-action></button></div>');

    expect(isSlotReserved()).toBe(false);
  });

  it('reserves the slot when the visible tab has one and a hidden tab also does', () => {
    buildDom(
      '<div hidden><button data-dock-action></button></div>' +
        '<div><button data-dock-action></button></div>',
    );

    expect(isSlotReserved()).toBe(true);
  });

  it('ignores an action button that is itself hidden', () => {
    buildDom('<button data-dock-action hidden></button>');

    expect(isSlotReserved()).toBe(false);
  });
});

/**
 * The auto-hide reveal rule can't be exercised in jsdom — :focus-visible is a
 * browser heuristic, not something the DOM reports. These assert the shape of
 * the rule instead, because getting it wrong fails silently on device.
 */
describe('dock auto-hide reveal rule', () => {
  it('reveals on keyboard focus only, never on pointer focus', () => {
    const css = readCss();

    // :focus-within also matches after a tap, which pinned the capsule open
    // while the action button slid away.
    expect(css).not.toMatch(/data-nav-hidden[^{]*:focus-within/);
    expect(css).toMatch(/data-nav-hidden[^{]*:focus-visible/);
  });

  it('reveals both dock halves together so they cannot desync', () => {
    const css = readCss();
    const rule = css.match(/body\[data-nav-hidden='true'\]:has\([^{]*\{/);

    expect(rule).not.toBeNull();
    expect(rule?.[0]).toContain('.nav-dock');
    expect(rule?.[0]).toContain('[data-dock-action]');
  });
});
