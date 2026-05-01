import { describe, it, expect } from 'vitest';
import { goalSchema } from './validations';

const baseValid = {
  name: 'Vacation fund',
  target_amount: '1000,00',
  source_type: 'net_delta' as const,
  icon: 'target',
  color: '#f97316',
};

describe('goalSchema', () => {
  it('accepts a valid net_delta goal without category/tag', () => {
    const result = goalSchema.safeParse(baseValid);

    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = goalSchema.safeParse({ ...baseValid, name: '   ' });

    expect(result.success).toBe(false);
  });

  it('rejects names over 80 characters', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      name: 'x'.repeat(81),
    });

    expect(result.success).toBe(false);
  });

  it('rejects target_amount of 0 or below', () => {
    const result = goalSchema.safeParse({ ...baseValid, target_amount: '0' });

    expect(result.success).toBe(false);
  });

  it('rejects target_amount above the cap', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      target_amount: '20.000.000',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid hex color', () => {
    const result = goalSchema.safeParse({ ...baseValid, color: 'orange' });

    expect(result.success).toBe(false);
  });

  it('requires category_id when source_type is "category"', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      source_type: 'category',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes('category_id')),
      ).toBe(true);
    }
  });

  it('accepts category source when category_id is provided', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      source_type: 'category',
      category_id: 'cat-1',
    });

    expect(result.success).toBe(true);
  });

  it('requires tag_id when source_type is "tag"', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      source_type: 'tag',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('tag_id'))).toBe(
        true,
      );
    }
  });

  it('accepts tag source when tag_id is provided', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      source_type: 'tag',
      tag_id: 'tag-1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid source_type value', () => {
    const result = goalSchema.safeParse({
      ...baseValid,
      source_type: 'random',
    });

    expect(result.success).toBe(false);
  });
});
