import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const maxRounds = Number.parseInt(process.env.RALPH_MAX_ROUNDS || "1", 10);
const commands = [
  task("typecheck", "npm.cmd run typecheck", "TypeScript error. Fix the referenced file and line first."),
  task("smoke", "npm.cmd run smoke", "End-to-end flow failed. Check /api/generate, /api/refine, or dev server availability."),
  task("build", "npm.cmd run build", "Production build failed. Check Next.js/Vercel compatibility and route config.")
];

const startedAt = new Date();
const logDir = join("logs", "ralph-loop", stamp(startedAt));

async function main() {
  await mkdir(logDir, { recursive: true });

  const report = {
    startedAt: startedAt.toISOString(),
    maxRounds,
    status: "running",
    rounds: []
  };

  for (let round = 1; round <= maxRounds; round += 1) {
    const roundResult = { round, commands: [] };
    report.rounds.push(roundResult);

    for (const item of commands) {
      const result = await runCommand(item);
      roundResult.commands.push(result);
      await writeReport(report);

      if (result.exitCode !== 0) {
        report.status = "failed";
        report.failedAt = item.name;
        report.nextAction = item.hint;
        await writeReport(report);
        printSummary(report);
        process.exit(result.exitCode || 1);
      }
    }
  }

  report.status = "passed";
  report.finishedAt = new Date().toISOString();
  await writeReport(report);
  printSummary(report);
}

function runCommand(item) {
  const started = new Date();

  return new Promise((resolve) => {
    const child = spawn(item.command, item.args, {
      shell: false,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", async (error) => {
      stderr += `${error.stack || error.message}\n`;
      const finished = new Date();
      const result = {
        name: item.name,
        command: item.displayCommand,
        exitCode: 1,
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - started.getTime(),
        hint: item.hint,
        stdoutPath: join(logDir, `${item.name}.stdout.log`),
        stderrPath: join(logDir, `${item.name}.stderr.log`)
      };
      await writeFile(result.stdoutPath, stdout, "utf8");
      await writeFile(result.stderrPath, stderr, "utf8");
      resolve(result);
    });

    child.on("close", async (exitCode) => {
      const finished = new Date();
      const result = {
        name: item.name,
        command: item.displayCommand,
        exitCode,
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - started.getTime(),
        hint: exitCode === 0 ? "" : item.hint,
        stdoutPath: join(logDir, `${item.name}.stdout.log`),
        stderrPath: join(logDir, `${item.name}.stderr.log`)
      };

      await writeFile(result.stdoutPath, stdout, "utf8");
      await writeFile(result.stderrPath, stderr, "utf8");
      resolve(result);
    });
  });
}

async function writeReport(report) {
  await writeFile(join(logDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(join(logDir, "report.md"), markdownReport(report), "utf8");
}

function markdownReport(report) {
  const lines = [
    "# Ralph Loop Report",
    "",
    `- Status: ${report.status}`,
    `- Started: ${report.startedAt}`,
    `- Max rounds: ${report.maxRounds}`,
    report.failedAt ? `- Failed at: ${report.failedAt}` : "",
    report.nextAction ? `- Next action: ${report.nextAction}` : "",
    "",
    "## Commands"
  ].filter(Boolean);

  for (const round of report.rounds) {
    lines.push("", `### Round ${round.round}`);
    for (const item of round.commands) {
      lines.push(
        `- ${item.exitCode === 0 ? "PASS" : "FAIL"} ${item.name}`,
        `  - Command: \`${item.command}\``,
        `  - Duration: ${Math.round(item.durationMs / 1000)}s`,
        `  - stdout: \`${item.stdoutPath}\``,
        `  - stderr: \`${item.stderrPath}\``
      );
      if (item.hint) lines.push(`  - Hint: ${item.hint}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function printSummary(report) {
  const message =
    report.status === "passed"
      ? `Ralph loop passed. Report: ${join(logDir, "report.md")}`
      : `Ralph loop failed at ${report.failedAt}. Next action: ${report.nextAction}. Report: ${join(logDir, "report.md")}`;
  console.log(message);
}

function stamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function task(name, displayCommand, hint) {
  if (process.platform === "win32") {
    return {
      name,
      displayCommand,
      command: "cmd.exe",
      args: ["/d", "/s", "/c", displayCommand],
      hint
    };
  }

  return {
    name,
    displayCommand,
    command: "sh",
    args: ["-lc", displayCommand],
    hint
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
