import type { TemplateContext, RenderResult } from "@/domains/templates";
import { VARIABLE_MAP } from "./variable-registry";

const VARIABLE_RE = /\$\{\s*([a-zA-Z0-9_.]+)\s*\}/g;

/**
 * Resolves `${namespace.path}` placeholders against a TemplateContext.
 *
 * Security note: resolution is a plain lookup in the static VARIABLE_MAP built
 * from lib/templates/variable-registry.ts — never a generic object-path walk
 * and never eval/Function. A path that isn't a registered variable (or whose
 * value is null/undefined) is left untouched in the output and reported in
 * `unresolved`, so callers can warn before sending rather than silently
 * dropping data.
 */
export function renderTemplate(body: string, ctx: TemplateContext): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];

  const text = body.replace(VARIABLE_RE, (match, path: string) => {
    const entry = VARIABLE_MAP.get(path);
    const value = entry ? entry.resolve(ctx) : null;

    if (!entry || value === null || value === undefined || value === "") {
      unresolved.push(path);
      return match;
    }

    return entry.format ? entry.format(value) : String(value);
  });

  return { text, unresolved };
}

export function renderResult(subject: string | null, body: string, ctx: TemplateContext): RenderResult {
  const bodyResult = renderTemplate(body, ctx);
  const subjectResult = subject ? renderTemplate(subject, ctx) : { text: null, unresolved: [] };

  return {
    subject: subjectResult.text,
    body: bodyResult.text,
    unresolved: [...new Set([...subjectResult.unresolved, ...bodyResult.unresolved])],
  };
}
