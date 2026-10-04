import { readFileSync } from 'node:fs';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

// Execute the deployed entry point with fake runtime imports. Deno's npm:
// specifiers cannot be loaded by Vitest, but replacing only imports keeps the
// request handler, its guards and its query ordering under the test.
export const loadEdgeHandler = (
  name: string,
  bindings: Record<string, unknown>,
): ((request: Request) => Promise<Response>) => {
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  const withoutImports = source.replace(/^import[\s\S]*?;\s*$/gm, '');
  const javascript = transpileModule(withoutImports, {
    compilerOptions: {
      target: ScriptTarget.ES2022,
      module: ModuleKind.CommonJS,
    },
  }).outputText;
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const runtime = {
    env: { get: () => 'test-runtime-value' },
    serve: (callback: (request: Request) => Promise<Response>) => {
      handler = callback;
    },
  };
  const values = { ...bindings, Deno: runtime };
  new Function(...Object.keys(values), javascript)(...Object.values(values));
  if (!handler) {
    throw new Error(`No request handler registered by ${name}`);
  }

  return handler;
};
