import { renderTemplate } from './render-template.util';

describe('renderTemplate', () => {
  it('substitutes a matched {{variable}} token', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'Ada' })).toBe(
      'Hello Ada!',
    );
  });

  it('substitutes multiple distinct tokens', () => {
    expect(
      renderTemplate('{{greeting}} {{name}}', { greeting: 'Hi', name: 'Ada' }),
    ).toBe('Hi Ada');
  });

  it('leaves an unmatched token as-is rather than blanking it', () => {
    expect(
      renderTemplate('Order {{orderNumber}} for {{name}}', { name: 'Ada' }),
    ).toBe('Order {{orderNumber}} for Ada');
  });

  it('tolerates extra whitespace inside the braces', () => {
    expect(renderTemplate('Hi {{ name }}', { name: 'Ada' })).toBe('Hi Ada');
  });

  it('is a no-op on a string with no tokens', () => {
    expect(renderTemplate('Plain text', { name: 'Ada' })).toBe('Plain text');
  });
});
