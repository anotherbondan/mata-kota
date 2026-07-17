import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const pythonArguments = process.argv.slice(2);
const packageDirectory = process.cwd();
const virtualEnvironment = process.env.VIRTUAL_ENV;
const virtualEnvironmentPython = virtualEnvironment
	? path.join(
			virtualEnvironment,
			process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
		)
	: undefined;
const localPython = path.join(
	packageDirectory,
	".venv",
	process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
);

const candidates = [
	process.env.PYTHON,
	virtualEnvironmentPython,
	localPython,
	...(process.platform === "win32" ? ["py", "python"] : ["python3", "python"]),
].filter(
	(candidate, index, values) => candidate && values.indexOf(candidate) === index
);

function runCandidate(index) {
	const command = candidates[index];

	if (!command) {
		console.error(
			"Python 3.11 or newer was not found. Create apps/ai/.venv or add python to PATH."
		);
		process.exitCode = 1;
		return;
	}

	if (path.isAbsolute(command) && !existsSync(command)) {
		runCandidate(index + 1);
		return;
	}

	const commandArguments =
		command === "py" ? ["-3", ...pythonArguments] : pythonArguments;
	const child = spawn(command, commandArguments, {
		cwd: packageDirectory,
		env: process.env,
		stdio: "inherit",
	});

	child.once("error", (error) => {
		if (error.code === "ENOENT") {
			runCandidate(index + 1);
			return;
		}

		console.error(`Unable to start ${command}: ${error.message}`);
		process.exitCode = 1;
	});
	child.once("exit", (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exitCode = code ?? 1;
	});
}

runCandidate(0);
