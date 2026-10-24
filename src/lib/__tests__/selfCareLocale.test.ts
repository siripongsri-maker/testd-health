/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, it, expect } from 'vitest';
import { isSeoPath, canonicalPathFor, alternateLanguagePaths } from '../seoLocalePrefix';

describe('Self Care language indexing', () => {
  it('makes the English catalog an independently canonical public page', () => {
    expect(isSeoPath('/en/self-care')).toBe(true);
    expect(canonicalPathFor('/self-care', 'en')).toBe('/en/self-care');
  });
  it('links both language versions and defaults to Thai', () => {
    expect(alternateLanguagePaths('/self-care')).toEqual([
      { lang: 'th', path: '/th/self-care' },
      { lang: 'en', path: '/en/self-care' },
      { lang: 'x-default', path: '/th/self-care' },
    ]);
  });
});