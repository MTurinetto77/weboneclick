import { spawn } from "node:child_process";

const port = String(process.env.PORT || "3000");
const host = process.env.HOSTNAME || "0.0.0.0";

console.log(`[start] Next.js binding to http://${host}:${port}`);

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "start", "-H", host, "-p", port],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[start] exited by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
