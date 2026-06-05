import { describe, it, expect } from 'vitest';
import { ISLANDS, theme } from '@gg/shared';

describe('workspace deps', () => {
  it('imports ISLANDS list from @gg/shared', () => {
    expect(ISLANDS).toContain('bias-breaker');
  });
  it('imports theme tokens from @gg/shared', () => {
    expect(theme.colors.primary).toBe('#43e97b');
  });
});
