/** Replaces `{{variable}}` tokens with values from `variables` — an
 * unmatched token is left as-is rather than silently blanked, so a missing
 * variable is obvious in the rendered output instead of just vanishing. */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) =>
    key in variables ? variables[key] : match,
  );
}
