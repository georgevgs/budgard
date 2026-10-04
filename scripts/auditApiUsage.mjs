#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createLanguageService,
  findConfigFile,
  isIdentifier,
  isObjectLiteralExpression,
  isVariableDeclaration,
  parseJsonConfigFileContent,
  readConfigFile,
  ScriptSnapshot,
  sys,
} from 'typescript';

// Knip reports exported symbols, but service object members can remain dead
// while their object is imported. Resolve references through TS (including
// dataService spreads), counting production files separately from tests.
const root = process.cwd();
const configPath = findConfigFile(root, sys.fileExists, 'tsconfig.app.json');
const config = readConfigFile(configPath, sys.readFile);
const project = parseJsonConfigFileContent(config.config, sys, root);
const service = createLanguageService({
  getScriptFileNames: () => project.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: (file) => {
    if (!sys.fileExists(file)) {
      return undefined;
    }

    return ScriptSnapshot.fromString(readFileSync(file, 'utf8'));
  },
  getCurrentDirectory: () => root,
  getCompilationSettings: () => project.options,
  getDefaultLibFileName: () =>
    resolve('node_modules/typescript/lib/lib.esnext.full.d.ts'),
  fileExists: sys.fileExists,
  readFile: sys.readFile,
  readDirectory: sys.readDirectory,
});
const isTest = (file) =>
  /(?:\/__tests__\/|\.(?:test|spec)\.[cm]?[jt]sx?$|\/src\/test\/)/.test(file);
const unused = [];
let checked = 0;
const program = service.getProgram();
for (const source of program.getSourceFiles()) {
  if (
    !/\/src\/(?:common\/api\/|pages\/[^/]+\/)/.test(source.fileName) ||
    isTest(source.fileName)
  ) {
    continue;
  }
  const visit = (node) => {
    if (
      isVariableDeclaration(node) &&
      isIdentifier(node.name) &&
      /(?:Api|Service)$/.test(node.name.text) &&
      node.initializer &&
      isObjectLiteralExpression(node.initializer)
    ) {
      for (const member of node.initializer.properties) {
        if (!member.name || !isIdentifier(member.name)) {
          continue;
        }
        checked += 1;
        const position = member.name.getStart(source);
        const references =
          service
            .findReferences(source.fileName, position)
            ?.flatMap((group) => group.references) || [];
        const hasCaller = references.some(
          (reference) =>
            !isTest(reference.fileName) &&
            !(
              reference.fileName === source.fileName &&
              reference.textSpan.start === position
            ) &&
            !reference.isDefinition,
        );
        if (!hasCaller) {
          unused.push(
            `${source.fileName.slice(root.length + 1)}:${source.getLineAndCharacterOfPosition(position).line + 1} ${node.name.text}.${member.name.text}`,
          );
        }
      }
    }
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
}
service.dispose();
console.log(`Checked ${checked} API object members for production references.`);
if (unused.length) {
  console.error(unused.join('\n'));
  process.exitCode = 1;
}
