// Import rules and graph settings for dependency-cruiser.
// `npm run deps` checks the rules; `npm run deps:graph` writes docs/deps.html.
const fs = require("fs");
const path = require("path");

const SOURCE_DIRS = ["app", "components", "lib"];

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(entry.name) ? [p] : [];
  });
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const anyOf = (files) => (files.length ? `^(${files.map(escape).join("|")})$` : "^$");

// Next.js marks client and server code with directives, which dependency-cruiser
// can't see, so find those files up front.
const files = SOURCE_DIRS.flatMap(sourceFiles);
const read = (f) => fs.readFileSync(f, "utf8");
const clientFiles = files.filter((f) => /^\s*["']use client["']/.test(read(f)));
const serverOnlyFiles = files.filter((f) => /^import\s+["']server-only["']/m.test(read(f)));

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "client-imports-server-only",
      severity: "error",
      comment:
        "A 'use client' component imports a module marked server-only (database, OpenAI, auth). " +
        "Call it through a server action in app/*actions.ts instead.",
      from: { path: anyOf(clientFiles) },
      // `import type` is erased at build time, so it's fine.
      to: { path: anyOf(serverOnlyFiles), dependencyTypesNot: ["type-only"] },
    },
    {
      name: "lib-imports-ui",
      severity: "error",
      comment: "lib/ holds the shared logic; it shouldn't depend on pages or components.",
      from: { path: "^lib/" },
      to: { path: "^(app|components)/" },
    },
    {
      name: "app-code-imports-tests-or-scripts",
      severity: "error",
      comment: "App code shouldn't pull in test or sample-generator code.",
      from: { path: "^(app|components|lib)/" },
      to: { path: "^(test|scripts)/" },
    },
    {
      name: "no-circular",
      severity: "warn",
      comment: "Circular imports make load order fragile; break the loop.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Nothing imports this module. Delete it, or wire it up.",
      from: {
        orphan: true,
        pathNot: [
          // Next.js loads these by file name, not by import.
          "^app/(.*/|)(page|layout|error|loading|not-found|route|template|default)\\.tsx?$",
          "\\.d\\.ts$",
          "^(test|scripts)/",
          "\\.config\\.[cm]?[jt]s$",
          "^\\.dependency-cruiser\\.cjs$",
        ],
      },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment: "This import can't be resolved: a typo, or a package missing from package.json.",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment: "App code imports a devDependency, which won't be installed in production.",
      from: { path: "^(app|components|lib)/" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "^(\\.next|\\.venv|node_modules|public|samples|supabase)/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
