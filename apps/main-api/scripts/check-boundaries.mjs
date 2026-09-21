import { parse } from "@babel/parser";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve("src");
const infrastructure = new Set([
  "authentication",
  "configuration",
  "database",
  "graphql",
  "health",
]);
let failures = 0;
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      check(file);
      continue;
    }
    if (!file.endsWith(".ts")) continue;
    const relative = path.relative(root, file);
    const owner = relative.split(path.sep)[0];
    const source = parse(readFileSync(file, "utf8"), {
      sourceType: "module",
      plugins: ["typescript", "decorators-legacy"],
    });
    function visit(node) {
      if (!node || typeof node !== "object") return;
      const specifier = [
        "ImportDeclaration",
        "ExportNamedDeclaration",
        "ExportAllDeclaration",
      ].includes(node.type)
        ? node.source
        : node.type === "CallExpression" &&
            (node.callee?.type === "Import" || node.callee?.name === "require")
          ? node.arguments[0]
          : node.type === "TSImportType"
            ? node.argument
            : undefined;
      if (
        specifier?.type === "StringLiteral" &&
        specifier.value.startsWith(".")
      ) {
        const target = path
          .relative(root, path.resolve(path.dirname(file), specifier.value))
          .split(path.sep);
        if (target.at(-1) === "index.js") target.pop();
        const crossBoundary = target[0] !== owner;
        if (
          crossBoundary &&
          (target.length > 1 ||
            (infrastructure.has(owner) && !infrastructure.has(target[0])))
        ) {
          console.error(
            `${relative}: forbidden cross-vertical import ${specifier.value}; use its public index`,
          );
          failures++;
        }
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    }
    visit(source);
  }
}
check(root);
if (failures) process.exit(1);
console.log("Vertical boundaries passed");
