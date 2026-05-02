import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  tagSchema,
  expenseSchema,
  categorySchema,
  recurringExpenseSchema,
  budgetSchema,
  categoryBudgetSchema,
  RECEIPT_ALLOWED_TYPES,
  RECEIPT_MAX_FILE_SIZE,
} from './validations';

describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse('user@gmail.com').success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('blocks disposable email providers', () => {
    const result = emailSchema.safeParse('test@mailinator.com');
    expect(result.success).toBe(false);
  });

  it('blocks yopmail.com', () => {
    expect(emailSchema.safeParse('a@yopmail.com').success).toBe(false);
  });

  it('allows non-blocked domains', () => {
    expect(emailSchema.safeParse('user@company.io').success).toBe(true);
  });
});

describe('tagSchema', () => {
  it('accepts valid tag', () => {
    const result = tagSchema.safeParse({ name: 'Food', color: '#FF5733' });
    expect(result.success).toBe(true);
  });

  it('trims whitespace from name', () => {
    const result = tagSchema.safeParse({ name: '  Food  ', color: '#FF5733' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Food');
    }
  });

  it('rejects empty name after trimming', () => {
    const result = tagSchema.safeParse({ name: '   ', color: '#FF5733' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 50 characters', () => {
    const result = tagSchema.safeParse({
      name: 'a'.repeat(51),
      color: '#FF5733',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color format', () => {
    expect(tagSchema.safeParse({ name: 'Tag', color: 'red' }).success).toBe(
      false,
    );
    expect(tagSchema.safeParse({ name: 'Tag', color: '#GGG' }).success).toBe(
      false,
    );
  });
});

describe('expenseSchema', () => {
  const validExpense = {
    amount: '50,00',
    description: 'Groceries',
    category_id: 'cat-1',
    date: new Date('2026-01-15'),
  };

  it('accepts a valid expense', () => {
    expect(expenseSchema.safeParse(validExpense).success).toBe(true);
  });

  it('rejects empty amount', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, amount: '' }).success,
    ).toBe(false);
  });

  it('rejects zero amount', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, amount: '0' }).success,
    ).toBe(false);
  });

  it('rejects amount over 1 million', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, amount: '1.000.001' }).success,
    ).toBe(false);
  });

  it('accepts European formatted amount', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, amount: '1.234,56' }).success,
    ).toBe(true);
  });

  it('rejects empty description', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, description: '' }).success,
    ).toBe(false);
  });

  it('rejects description over 100 characters', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, description: 'a'.repeat(101) })
        .success,
    ).toBe(false);
  });

  it('accepts optional tag_id', () => {
    expect(
      expenseSchema.safeParse({ ...validExpense, tag_id: 'tag-1' }).success,
    ).toBe(true);
  });
});

describe('categorySchema', () => {
  it('accepts valid category', () => {
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#FF5733' }).success,
    ).toBe(true);
  });

  it('rejects name with invalid characters', () => {
    expect(
      categorySchema.safeParse({ name: 'Food<script>', color: '#FF5733' })
        .success,
    ).toBe(false);
  });

  it('accepts unicode characters', () => {
    expect(
      categorySchema.safeParse({ name: 'Φαγητό', color: '#FF5733' }).success,
    ).toBe(true);
  });

  it('accepts category with icon emoji', () => {
    const result = categorySchema.safeParse({
      name: 'Food',
      color: '#FF5733',
      icon: '🍔',
    });
    expect(result.success).toBe(true);
  });

  it('accepts category without icon', () => {
    const result = categorySchema.safeParse({
      name: 'Food',
      color: '#FF5733',
    });
    expect(result.success).toBe(true);
  });

  it('rejects icon longer than 4 characters', () => {
    const result = categorySchema.safeParse({
      name: 'Food',
      color: '#FF5733',
      icon: '🍔🍕🎮',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty string icon as optional', () => {
    const result = categorySchema.safeParse({
      name: 'Food',
      color: '#FF5733',
      icon: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex color format', () => {
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#GGG' }).success,
    ).toBe(false);
    expect(
      categorySchema.safeParse({ name: 'Food', color: 'red' }).success,
    ).toBe(false);
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#FFF' }).success,
    ).toBe(false);
  });

  it('accepts valid 6-digit hex colors', () => {
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#ff5733' }).success,
    ).toBe(true);
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#000000' }).success,
    ).toBe(true);
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#FFFFFF' }).success,
    ).toBe(true);
  });

  it('rejects empty name', () => {
    expect(
      categorySchema.safeParse({ name: '', color: '#FF5733' }).success,
    ).toBe(false);
  });

  it('rejects name over 50 characters', () => {
    expect(
      categorySchema.safeParse({ name: 'a'.repeat(51), color: '#FF5733' })
        .success,
    ).toBe(false);
  });
});

describe('recurringExpenseSchema', () => {
  const valid = {
    amount: '100',
    description: 'Netflix',
    category_id: 'cat-1',
    frequency: 'monthly' as const,
    start_date: new Date('2026-01-01'),
  };

  it('accepts valid recurring expense', () => {
    expect(recurringExpenseSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all frequency values', () => {
    const frequencies = [
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ] as const;
    for (const frequency of frequencies) {
      expect(
        recurringExpenseSchema.safeParse({ ...valid, frequency }).success,
      ).toBe(true);
    }
  });

  it('rejects end_date before start_date', () => {
    const result = recurringExpenseSchema.safeParse({
      ...valid,
      end_date: new Date('2025-12-01'),
    });
    expect(result.success).toBe(false);
  });

  it('accepts end_date equal to start_date', () => {
    const result = recurringExpenseSchema.safeParse({
      ...valid,
      end_date: new Date('2026-01-01'),
    });
    expect(result.success).toBe(true);
  });
});

describe('budgetSchema', () => {
  it('accepts valid budget', () => {
    expect(budgetSchema.safeParse({ amount: '5.000' }).success).toBe(true);
  });

  it('rejects zero budget', () => {
    expect(budgetSchema.safeParse({ amount: '0' }).success).toBe(false);
  });

  it('rejects amount over 10 million', () => {
    expect(budgetSchema.safeParse({ amount: '10.000.001' }).success).toBe(
      false,
    );
  });
});

describe('categoryBudgetSchema', () => {
  it('accepts a valid per-category budget', () => {
    expect(
      categoryBudgetSchema.safeParse({
        category_id: 'cat-1',
        amount: '500',
      }).success,
    ).toBe(true);
  });

  it('rejects zero amount', () => {
    expect(
      categoryBudgetSchema.safeParse({
        category_id: 'cat-1',
        amount: '0',
      }).success,
    ).toBe(false);
  });

  it('rejects empty amount', () => {
    expect(
      categoryBudgetSchema.safeParse({
        category_id: 'cat-1',
        amount: '',
      }).success,
    ).toBe(false);
  });

  it('rejects empty category_id', () => {
    expect(
      categoryBudgetSchema.safeParse({
        category_id: '',
        amount: '100',
      }).success,
    ).toBe(false);
  });

  it('rejects amount over 10 million', () => {
    expect(
      categoryBudgetSchema.safeParse({
        category_id: 'cat-1',
        amount: '10.000.001',
      }).success,
    ).toBe(false);
  });
});

describe('receipt constants', () => {
  it('allows common image types', () => {
    expect(RECEIPT_ALLOWED_TYPES).toContain('image/jpeg');
    expect(RECEIPT_ALLOWED_TYPES).toContain('image/png');
    expect(RECEIPT_ALLOWED_TYPES).toContain('image/webp');
  });

  it('has 10MB max file size', () => {
    expect(RECEIPT_MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});
