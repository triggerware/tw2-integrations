import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const targets = {
  "darwin-arm64": ["darwin-arm64", "triggerware"],
  "darwin-x64": ["darwin-x64", "triggerware"],
  "win32-x64": ["win32-x64", "triggerware.exe"]
};
const target = targets[`${process.platform}-${process.arch}`];
if (!target) {
  throw new Error(`Triggerware does not support ${process.platform}-${process.arch}`);
}

const root = dirname(fileURLToPath(import.meta.url));
const child = spawn(join(root, "native", ...target), process.argv.slice(2), {
  stdio: "inherit"
});
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
