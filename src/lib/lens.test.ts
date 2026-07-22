import { describe, expect, it } from 'vitest';
import { lensSupportedForUserAgent } from './lens';

describe('lens browser gate', () => {
  it.each([
    [
      'macOS Safari',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    ],
    [
      'iPhone Safari',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
    ],
    [
      'iPhone Chrome',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/150.0.0.0 Mobile/15E148 Safari/604.1',
    ],
    [
      'Firefox',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0',
    ],
  ])('keeps %s on the flat path', (_browser, ua) => {
    expect(lensSupportedForUserAgent(ua)).toBe(false);
  });

  it.each([
    [
      'desktop Chrome',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    ],
    [
      'Android Chrome',
      'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    ],
  ])('enables the lens for %s', (_browser, ua) => {
    expect(lensSupportedForUserAgent(ua)).toBe(true);
  });
});
