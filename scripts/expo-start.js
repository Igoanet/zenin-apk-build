#!/usr/bin/env node
/**
 * Wraps `expo start` with a pseudo-TTY so Metro gets interactive mode,
 * but automatically selects "Proceed anonymously" if the
 * "unverified app" prompt appears — no human needed.
 */
const pty = require("node-pty-prebuilt-multiarch");
const args = process.argv.slice(2);

const child = pty.spawn("pnpm", ["exec", "expo", "start", ...args], {
  name: "xterm-color",
  cols: 120,
  rows: 30,
  cwd: process.cwd(),
  env: { ...process.env, FORCE_COLOR: "1" },
});

let answered = false;

child.onData((data) => {
  process.stdout.write(data);
  // Auto-select "Proceed anonymously" (second option in the list)
  if (!answered && data.includes("Proceed anonymously")) {
    answered = true;
    setTimeout(() => {
      child.write("\x1b[B"); // down arrow
      child.write("\r");     // enter
    }, 100);
  }
});

child.onExit(({ exitCode }) => process.exit(exitCode ?? 0));

// Forward stdin so the dev server stays interactive for other commands
process.stdin.setRawMode?.(true);
process.stdin.on("data", (d) => child.write(d.toString()));
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
