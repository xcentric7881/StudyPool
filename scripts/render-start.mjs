import { spawn } from "node:child_process";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("[render-start] DATABASE_URL is not set");
  process.exit(1);
}

const schema = process.env.STUDYPOOL_DB_SCHEMA || "studypool";
const databaseUrl = new URL(baseUrl);
databaseUrl.searchParams.set("schema", schema);

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl.toString()
};

console.log(`[render-start] using PostgreSQL schema "${schema}"`);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by signal ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

try {
  await run("npx", ["prisma", "db", "push"]);
  await run("npm", ["run", "prototype:seed"]);
} catch (error) {
  console.error("[render-start] database preparation failed", error);
  process.exit(1);
}

const server = spawn("npm", ["run", "start"], { env, stdio: "inherit" });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  console.error("[render-start] failed to start web server", error);
  process.exit(1);
});

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
