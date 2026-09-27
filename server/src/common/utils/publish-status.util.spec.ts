import { isEffectivelyPublished } from './publish-status.util';

describe('isEffectivelyPublished', () => {
  it('is true for publishStatus "published"', () => {
    expect(
      isEffectivelyPublished({ publishStatus: 'published', publishAt: null }),
    ).toBe(true);
  });

  it('is false for a scheduled item whose publishAt is still in the future', () => {
    const future = new Date(Date.now() + 60_000);
    expect(
      isEffectivelyPublished({ publishStatus: 'scheduled', publishAt: future }),
    ).toBe(false);
  });

  it('is true for a scheduled item once publishAt has passed — no separate publish step required', () => {
    const past = new Date(Date.now() - 60_000);
    expect(
      isEffectivelyPublished({ publishStatus: 'scheduled', publishAt: past }),
    ).toBe(true);
  });

  it('is false for draft and archived items', () => {
    expect(
      isEffectivelyPublished({ publishStatus: 'draft', publishAt: null }),
    ).toBe(false);
    expect(
      isEffectivelyPublished({ publishStatus: 'archived', publishAt: null }),
    ).toBe(false);
  });
});
