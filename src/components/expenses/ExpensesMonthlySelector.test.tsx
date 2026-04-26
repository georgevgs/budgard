import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpensesMonthlySelector from './ExpensesMonthlySelector';

const renderSelector = (onChange = vi.fn(), month = '2026-04') => {
  render(
    <ExpensesMonthlySelector selectedMonth={month} onMonthChange={onChange} />,
  );

  return onChange;
};

describe('ExpensesMonthlySelector', () => {
  it('shifts to the previous month', () => {
    const onChange = renderSelector();

    fireEvent.click(screen.getByLabelText('navigation.previousMonth'));
    expect(onChange).toHaveBeenCalledWith('2026-03');
  });

  it('shifts to the next month', () => {
    const onChange = renderSelector();

    fireEvent.click(screen.getByLabelText('navigation.nextMonth'));
    expect(onChange).toHaveBeenCalledWith('2026-05');
  });

  it('rolls year forward at december → january', () => {
    const onChange = vi.fn();
    render(
      <ExpensesMonthlySelector
        selectedMonth="2026-12"
        onMonthChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('navigation.nextMonth'));
    expect(onChange).toHaveBeenCalledWith('2027-01');
  });

  it('changes year via the popover year arrows', () => {
    const onChange = renderSelector();

    fireEvent.click(screen.getByLabelText('navigation.selectMonth'));
    fireEvent.click(screen.getByLabelText('navigation.previousYear'));
    expect(onChange).toHaveBeenCalledWith('2025-04');

    fireEvent.click(screen.getByLabelText('navigation.nextYear'));
    expect(onChange).toHaveBeenLastCalledWith('2027-04');
  });

  it('renders 12 month buttons inside the popover', () => {
    renderSelector();

    fireEvent.click(screen.getByLabelText('navigation.selectMonth'));

    const monthButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^[A-Z][a-z]{2}$/.test(btn.textContent ?? ''));
    expect(monthButtons.length).toBeGreaterThanOrEqual(12);
  });

  it('selects a month from the popover grid', () => {
    const onChange = renderSelector();

    fireEvent.click(screen.getByLabelText('navigation.selectMonth'));

    const monthButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^[A-Z][a-z]{2}$/.test(btn.textContent ?? ''));
    fireEvent.click(monthButtons[0]);

    expect(onChange).toHaveBeenCalledWith('2026-01');
  });

  it('highlights the currently selected month in the grid', () => {
    renderSelector();

    fireEvent.click(screen.getByLabelText('navigation.selectMonth'));

    const monthButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^[A-Z][a-z]{2}$/.test(btn.textContent ?? ''));
    expect(monthButtons[3].className).toContain('bg-primary');
  });
});
