const fs   = require("fs");
const path = require("path");

const nm = path.join(__dirname, "..", "node_modules");

// Files that try to require('ajv/dist/compile/codegen') but fail
const filesToPatch = [
  path.join(nm, "ajv-keywords", "dist", "definitions", "typeof.js"),
  path.join(nm, "ajv-keywords", "dist", "definitions", "dynamicDefaults.js"),
];

// Patch fork-ts-checker's nested ajv-keywords _formatLimit
const formatLimit = path.join(
  nm, "fork-ts-checker-webpack-plugin", "node_modules",
  "ajv-keywords", "keywords", "_formatLimit.js"
);

// Replace typeof.js — it just needs to export a keyword definition
const typeofPatch = `
"use strict";
module.exports = function defFunc(ajv) {
  defFunc.definition = {
    keyword: "typeof",
    schemaType: "string",
    validate: function(schema, data) { return typeof data === schema; },
    errors: false,
  };
  ajv.addKeyword("typeof", defFunc.definition);
  return ajv;
};
`;

// Replace dynamicDefaults.js with a no-op
const noop = `
"use strict";
module.exports = function defFunc(ajv) { return ajv; };
`;

let patched = 0;

for (const f of filesToPatch) {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, "utf8");
    if (content.includes("ajv/dist/compile/codegen")) {
      fs.writeFileSync(f, f.includes("typeof") ? typeofPatch : noop);
      console.log("Patched:", path.relative(nm, f));
      patched++;
    }
  }
}

if (fs.existsSync(formatLimit)) {
  fs.writeFileSync(formatLimit, '"use strict";\nmodule.exports = function() { return function() {}; };\n');
  console.log("Patched: fork-ts-checker _formatLimit.js");
  patched++;
}

console.log(`Total patched: ${patched} files`);
