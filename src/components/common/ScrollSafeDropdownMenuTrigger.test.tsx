import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScrollSafeDropdownMenuTrigger from '@/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const MenuHarness = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <ScrollSafeDropdownMenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        Open menu
      </ScrollSafeDropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Menu action</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

describe('ScrollSafeDropdownMenuTrigger', () => {
  it('waits for touch release before opening', () => {
    render(<MenuHarness />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.pointerDown(trigger, touchPointer({ clientX: 10, clientY: 10 }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.pointerUp(trigger, touchPointer({ clientX: 10, clientY: 10 }));
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not open when a touch becomes a scroll', () => {
    render(<MenuHarness />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.pointerDown(trigger, touchPointer({ clientX: 10, clientY: 10 }));
    fireEvent.pointerMove(trigger, touchPointer({ clientX: 11, clientY: 36 }));
    fireEvent.pointerUp(trigger, touchPointer({ clientX: 11, clientY: 36 }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not open after the browser cancels a touch for scrolling', () => {
    render(<MenuHarness />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.pointerDown(trigger, touchPointer({ clientX: 10, clientY: 10 }));
    fireEvent.pointerCancel(
      trigger,
      touchPointer({ clientX: 10, clientY: 10 }),
    );
    fireEvent.pointerUp(trigger, touchPointer({ clientX: 10, clientY: 10 }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the existing mouse activation behavior', () => {
    render(<MenuHarness />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
      pointerId: 1,
      pointerType: 'mouse',
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

// --- Helpers ---

type PointerCoordinates = {
  clientX: number;
  clientY: number;
};

const touchPointer = ({ clientX, clientY }: PointerCoordinates) => ({
  button: 0,
  clientX,
  clientY,
  ctrlKey: false,
  pointerId: 7,
  pointerType: 'touch',
});
