import { describe, expect, it } from 'vitest';
import {
  parsePriceCents as fbParsePrice,
  parseFacebookRelativeDate,
  escapeRegex as fbEscape,
} from '../../src/main/platforms/facebook/parsers';
import {
  parsePriceCents as kjParsePrice,
  parseKijijiRelativeDate,
  escapeRegex as kjEscape,
} from '../../src/main/platforms/kijiji/parsers';

describe('FB price parser', () => {
  it('parses plain dollar amounts', () => {
    expect(fbParsePrice('$120')).toBe(12_000);
    expect(fbParsePrice('CA$120')).toBe(12_000);
    expect(fbParsePrice('US$120')).toBe(12_000);
  });
  it('parses comma-separated thousands', () => {
    expect(fbParsePrice('$1,200')).toBe(120_000);
    expect(fbParsePrice('$12,345')).toBe(1_234_500);
  });
  it('parses decimals correctly', () => {
    expect(fbParsePrice('$120.50')).toBe(12_050);
    expect(fbParsePrice('$120.5')).toBe(12_050);
    expect(fbParsePrice('$120.05')).toBe(12_005);
  });
  it('returns null for empty / unparseable', () => {
    expect(fbParsePrice('')).toBeNull();
    expect(fbParsePrice(null)).toBeNull();
    expect(fbParsePrice('Free')).toBeNull();
  });
});

describe('FB relative-date parser', () => {
  const now = new Date('2026-05-16T12:00:00').getTime();
  it('handles "today"', () => {
    expect(parseFacebookRelativeDate('Listed today', now)).toBe(now);
  });
  it('handles "yesterday"', () => {
    expect(parseFacebookRelativeDate('Listed yesterday', now)).toBe(now - 86400_000);
  });
  it('handles N minutes/hours/days/weeks/months ago', () => {
    expect(parseFacebookRelativeDate('Listed 5 minutes ago', now)).toBe(now - 5 * 60_000);
    expect(parseFacebookRelativeDate('Listed 3 hours ago', now)).toBe(now - 3 * 3_600_000);
    expect(parseFacebookRelativeDate('Listed 7 days ago', now)).toBe(now - 7 * 86_400_000);
    expect(parseFacebookRelativeDate('Listed 2 weeks ago', now)).toBe(now - 2 * 7 * 86_400_000);
    expect(parseFacebookRelativeDate('Listed 1 month ago', now)).toBe(now - 30 * 86_400_000);
  });
  it('handles singular and plural', () => {
    expect(parseFacebookRelativeDate('1 hour ago', now)).toBe(now - 3_600_000);
    expect(parseFacebookRelativeDate('1 hours ago', now)).toBe(now - 3_600_000);
  });
  it('returns null for unrecognised text', () => {
    expect(parseFacebookRelativeDate('next tuesday', now)).toBeNull();
    expect(parseFacebookRelativeDate('', now)).toBeNull();
  });
});

describe('Kijiji price parser', () => {
  it('parses plain dollar amounts', () => {
    expect(kjParsePrice('$50')).toBe(5_000);
    expect(kjParsePrice('$1,500.00')).toBe(150_000);
  });
  it('returns null for unparseable text', () => {
    expect(kjParsePrice(null)).toBeNull();
    expect(kjParsePrice('Please contact')).toBeNull();
  });
});

describe('Kijiji relative-date parser', () => {
  const now = new Date('2026-05-16T12:00:00').getTime();
  it('handles "today" and "< N hours ago"', () => {
    expect(parseKijijiRelativeDate('Posted today', now)).toBe(now);
    expect(parseKijijiRelativeDate('< 5 hours ago', now)).toBe(now);
    expect(parseKijijiRelativeDate('<2 hours ago', now)).toBe(now);
  });
  it('handles "yesterday"', () => {
    expect(parseKijijiRelativeDate('Posted yesterday', now)).toBe(now - 86400_000);
  });
  it('handles hours/days/weeks ago', () => {
    expect(parseKijijiRelativeDate('Posted 6 hours ago', now)).toBe(now - 6 * 3_600_000);
    expect(parseKijijiRelativeDate('Posted 4 days ago', now)).toBe(now - 4 * 86_400_000);
    expect(parseKijijiRelativeDate('Posted 1 week ago', now)).toBe(now - 7 * 86_400_000);
  });
  it('returns null when no pattern matches', () => {
    expect(parseKijijiRelativeDate('Posted a while ago', now)).toBeNull();
  });
});

describe('escapeRegex (both platforms share the impl)', () => {
  it('escapes regex special characters', () => {
    expect(fbEscape('a.b')).toBe('a\\.b');
    expect(kjEscape('Furniture & More')).toBe('Furniture & More');
    expect(fbEscape('$100 (or best)')).toBe('\\$100 \\(or best\\)');
    expect(kjEscape('[buy & sell]')).toBe('\\[buy & sell\\]');
  });
  it('leaves normal text alone', () => {
    expect(fbEscape('Furniture')).toBe('Furniture');
  });
});
