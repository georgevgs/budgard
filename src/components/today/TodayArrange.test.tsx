import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TodayArrange from '@/components/today/TodayArrange';
import { useTodayLayout } from '@/hooks/today/useTodayLayout';
import {
  DEFAULT_VISIBLE,
  TODAY_TILES,
  readStoredLayout,
  type TodayTileId,
} from '@/lib/bentoLayout';

const ArrangeHarness = () => {
  const layout = useTodayLayout();

  return <TodayArrange layout={layout} />;
};

describe('TodayArrange', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('moves modules and announces their new position', () => {
    storeLayout(['safeToSpend', 'budgetUsed', 'monthPace']);
    renderArrange();

    fireEvent.click(getMoveControl('safeToSpend', 'moveDown'));

    expect(readStoredLayout().visible.slice(0, 2)).toEqual([
      'budgetUsed',
      'safeToSpend',
    ]);
    expect(
      screen.getByText('today.arrange.movedAnnouncement'),
    ).toBeInTheDocument();
  });

  it('keeps keyboard focus with a module when it is hidden and shown', async () => {
    storeLayout(['safeToSpend', 'budgetUsed']);
    renderArrange();

    fireEvent.click(getArrangeControl('hide-safeToSpend'));

    await waitFor(() => {
      expect(getArrangeControl('show-safeToSpend')).toHaveFocus();
    });

    fireEvent.click(getArrangeControl('show-safeToSpend'));

    await waitFor(() => {
      expect(getArrangeControl('hide-safeToSpend')).toHaveFocus();
    });
  });

  it('restores the default once, announces it, and then disables reset', () => {
    storeLayout(['insight']);
    renderArrange();
    const reset = screen.getByRole('button', {
      name: 'today.arrange.reset',
    });

    fireEvent.click(reset);

    expect(readStoredLayout().visible).toEqual(DEFAULT_VISIBLE);
    expect(
      screen.getByText('today.arrange.resetAnnouncement'),
    ).toBeInTheDocument();
    expect(reset).toBeDisabled();
  });

  it('keeps arranging in memory and explains when saving is blocked', () => {
    storeLayout(['safeToSpend', 'budgetUsed']);
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage blocked', 'QuotaExceededError');
      });
    renderArrange();

    fireEvent.click(getArrangeControl('hide-safeToSpend'));

    expect(getArrangeControl('show-safeToSpend')).toBeInTheDocument();
    expect(screen.getByText('today.arrange.sessionHint')).toBeInTheDocument();
    setItem.mockRestore();
  });

  it('reorders by dragging the dedicated grip', () => {
    storeLayout(['safeToSpend', 'budgetUsed', 'monthPace']);
    renderArrange();
    const target = getArrangeControl('hide-budgetUsed').closest<HTMLElement>(
      '[data-arrange-tile]',
    );
    if (!target) {
      throw new Error('Missing target arrange tile');
    }
    const restoreElementFromPoint = stubElementFromPoint(target);
    const handle = getDragHandle('safeToSpend');

    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 200,
    });
    expect(
      document.querySelector('[data-arrange-drag-overlay]'),
    ).toBeInTheDocument();
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: 110,
      clientY: 220,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 1,
      clientX: 110,
      clientY: 220,
    });

    expect(readStoredLayout().visible.slice(0, 2)).toEqual([
      'budgetUsed',
      'safeToSpend',
    ]);
    expect(
      screen.getByText('today.arrange.droppedAnnouncement'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-arrange-drag-overlay]'),
    ).not.toBeInTheDocument();
    expect(
      document.documentElement.style.getPropertyValue('--arrange-drag-x'),
    ).toBe('');
    restoreElementFromPoint();
  });

  it('simulates the wide and half-width home layout', () => {
    storeLayout(['safeToSpend', 'budgetUsed']);
    renderArrange();
    const first = getArrangeControl('hide-safeToSpend').closest(
      '[data-arrange-tile]',
    );
    const second = getArrangeControl('hide-budgetUsed').closest(
      '[data-arrange-tile]',
    );

    expect(first).toHaveClass('bento-wide', 'min-h-28');
    expect(second).not.toHaveClass('bento-wide');
    expect(first?.parentElement).toHaveClass('bento');
  });

  it('caps long labels at two lines without replacing accessible text', () => {
    storeLayout(['budgetUsed']);
    renderArrange();
    const tile = getArrangeControl('hide-budgetUsed').closest<HTMLElement>(
      '[data-arrange-tile]',
    );
    if (!tile) {
      throw new Error('Missing narrow arrange tile');
    }
    const label = within(tile).getByText('today.tiles.budgetUsed');

    expect(label).toHaveClass(
      'line-clamp-2',
      'overflow-hidden',
      'text-ellipsis',
    );
    expect(tile).toHaveTextContent('today.tiles.budgetUsed');

    const hiddenLabel = screen.getByText('today.tiles.safeToSpend');
    expect(hiddenLabel).toHaveClass(
      'line-clamp-2',
      'overflow-hidden',
      'text-ellipsis',
    );
    expect(hiddenLabel.closest('.today-arrange-grid')).toBeInTheDocument();
  });

  it('marks Arrange as a focused mode only while it is mounted', () => {
    const { unmount } = renderArrange();

    expect(document.body).toHaveAttribute('data-today-arranging', 'true');

    unmount();

    expect(document.body).not.toHaveAttribute('data-today-arranging');
  });
});

// --- Helpers ---

const storeLayout = (visible: TodayTileId[]) => {
  const visibleSet = new Set(visible);
  const hidden = TODAY_TILES.filter((tile) => !visibleSet.has(tile));
  localStorage.setItem('today-layout', JSON.stringify({ visible, hidden }));
};

const renderArrange = () =>
  render(
    <MemoryRouter initialEntries={['/today']}>
      <ArrangeHarness />
    </MemoryRouter>,
  );

const getArrangeControl = (id: string): HTMLButtonElement => {
  const control = document.querySelector<HTMLButtonElement>(
    `[data-arrange-control="${id}"]`,
  );
  if (!control) {
    throw new Error(`Missing arrange control: ${id}`);
  }

  return control;
};

const getMoveControl = (
  id: TodayTileId,
  action: 'moveUp' | 'moveDown',
): HTMLButtonElement => {
  const tile = getArrangeControl(`hide-${id}`).closest<HTMLElement>('.tile');
  if (!tile) {
    throw new Error(`Missing arrange tile: ${id}`);
  }

  return within(tile).getByLabelText(`today.arrange.${action}`);
};

const getDragHandle = (id: TodayTileId): HTMLButtonElement => {
  const handle = document.querySelector<HTMLButtonElement>(
    `[data-arrange-drag-handle="${id}"]`,
  );
  if (!handle) {
    throw new Error(`Missing drag handle: ${id}`);
  }

  return handle;
};

const stubElementFromPoint = (element: Element): (() => void) => {
  const original = document.elementFromPoint;
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => element),
  });

  return () => {
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: original,
    });
  };
};
