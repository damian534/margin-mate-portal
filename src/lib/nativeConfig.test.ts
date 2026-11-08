// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nativeServerConfig } from '../../native.config';

describe('native release loading', () => {
  it('does not load the development preview in a store build', () => {
    expect(nativeServerConfig(false)).toBeUndefined();
  });
  it('enables hosted preview only with explicit live reload', () => {
    expect(nativeServerConfig(true)?.url).toBe('https://f48756f9-dddd-4894-8139-f6867c449221.lovableproject.com?forceHideBadge=true');
  });
});