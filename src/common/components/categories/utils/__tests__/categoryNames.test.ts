import { describe, expect, it } from 'vitest';
import { isCategoryNameTaken } from '@/common/components/categories/utils/categoryNames';
import { isNameConflictError, isSameName } from '@/constants/names';
import type { Category } from '@/types/Category';

const category = (id: string, name: string, type: 'expense' | 'income') =>
  ({ id, name, type }) as Category;

const SPACE = [
  category('groceries', 'Groceries', 'expense'),
  category('other', 'Other', 'expense'),
  category('salary', 'Salary', 'income'),
];

describe('category names', () => {
  it('reads names the way a person does: case and outer spaces ignored', () => {
    expect(isSameName('Food ', 'food')).toBe(true);
    expect(isSameName('Food', 'Foods')).toBe(false);
  });

  it('is taken by a category of either type, as the database key is', () => {
    expect(isCategoryNameTaken('groceries ', SPACE)).toBe(true);
    // An income source called "Other" collides with the expense category.
    expect(isCategoryNameTaken('Other', SPACE)).toBe(true);
    expect(isCategoryNameTaken('Rent', SPACE)).toBe(false);
  });

  it('lets a category keep its own name, or re-case it', () => {
    expect(isCategoryNameTaken('Groceries', SPACE, SPACE[0])).toBe(false);
    expect(isCategoryNameTaken('GROCERIES', SPACE, SPACE[0])).toBe(false);
    expect(isCategoryNameTaken('Salary', SPACE, SPACE[0])).toBe(true);
  });

  it('recognises the unique violation PostgREST returns', () => {
    expect(isNameConflictError({ code: '23505', message: 'duplicate' })).toBe(
      true,
    );
    expect(isNameConflictError({ code: '42501' })).toBe(false);
    expect(isNameConflictError(new Error('offline'))).toBe(false);
  });
});
