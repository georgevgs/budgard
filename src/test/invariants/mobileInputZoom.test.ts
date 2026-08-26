import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const COMPONENTS = path.join(ROOT, 'src/components');
const EDITABLE_TAGS = new Set([
  'Input',
  'Textarea',
  'input',
  'select',
  'textarea',
]);

// iOS Safari magnifies the viewport when an editable control below 16px gains
// focus. Desktop may step compact controls back down at `sm:`; the unprefixed
// mobile size must remain at least `text-base`.
describe('mobile input sizing', () => {
  it('does not give editable controls a sub-16px mobile text class', () => {
    const offenders = componentSources(COMPONENTS).flatMap(findOffenders);

    expect(
      offenders,
      'iOS focus-zooms controls below 16px; use text-base sm:text-sm',
    ).toEqual([]);
  });
});

// --- Helpers ---

const componentSources = (dir: string): string[] => {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return componentSources(fullPath);
    }
    if (entry.name.endsWith('.tsx')) {
      return [fullPath];
    }

    return [];
  });
};

const findOffenders = (file: string): string[] => {
  const sourceText = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const offenders: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      inspectElement(node, source, file, offenders);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);

  return offenders;
};

type EditableElement = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

const inspectElement = (
  element: EditableElement,
  source: ts.SourceFile,
  file: string,
  offenders: string[],
): void => {
  const tagName = element.tagName.getText(source);
  if (!EDITABLE_TAGS.has(tagName)) {
    return;
  }
  const className = element.attributes.properties.find((attribute) => {
    return (
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText(source) === 'className'
    );
  });
  if (!className || !ts.isJsxAttribute(className) || !className.initializer) {
    return;
  }
  const classes = className.initializer.getText(source);
  if (!hasSmallMobileText(classes)) {
    return;
  }
  const line =
    source.getLineAndCharacterOfPosition(className.getStart(source)).line + 1;
  offenders.push(`${path.relative(ROOT, file)}:${line}`);
};

const hasSmallMobileText = (classes: string): boolean => {
  if (/(?:^|[\s'"`])text-(?:xs|sm)(?=$|[\s'"`])/.test(classes)) {
    return true;
  }

  const arbitrarySizes = classes.matchAll(
    /(?:^|[\s'"`])text-\[([\d.]+)(px|rem)\](?=$|[\s'"`])/g,
  );
  for (const match of arbitrarySizes) {
    const size = Number(match[1]);
    if (match[2] === 'px' && size < 16) {
      return true;
    }
    if (match[2] === 'rem' && size < 1) {
      return true;
    }
  }

  return false;
};
