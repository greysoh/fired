import os from "https://deno.land/x/dos@v0.11.0/mod.ts";

/**
 * Executes shell command and returns output.
 * @param cmd The command to run
 * @param passthrough Controls whether the command's output is printed to the console, or returned to you
 * If true, the output is returned to you. If false, the output is printed to the console.
 * @returns Command status
 */
export async function runShell(cmd: string, passthrough: boolean): Promise<{}> {
  if (passthrough) {
    const p = Deno.run({
      cmd: [cmd.split(" ")[0], cmd.split(" ").slice(1).join(" ")],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await p.output();
    const code = await p.status();

    const outStr = new TextDecoder().decode(output);
    return { output: outStr, code: code };
  } else {
    const p = Deno.run({
      cmd: [cmd.split(" ")[0], cmd.split(" ").slice(1).join(" ")],
    });

    const code = await p.status();

    return code;
  }
}

/**
 * Zips up file or directory
 * @param source The source directory/file
 * @param dest The destination zip file
 * @returns Success or failure
 */
export async function zip(source: string, dest: string): Promise<{}> {
  const platform = os.platform();

  if (platform == "windows") {
    let file = `@echo off\n`;
    file += `cd /d "${source}"\n`;
    file += `tar -a -c -f ${dest} *`;

    await Deno.writeTextFile(os.tempDir() + "/zip.bat", file);
    const run = await runShell(os.tempDir() + "/zip.bat", false);
    await Deno.remove(os.tempDir() + "/zip.bat");

    return run;
  } else {
    const run = await runShell(`zip -r "${dest}" "${source}"`, false);
    return run;
  }
}

/**
 * Unzips file and extracts to destination
 * @param source The source path to the zip file to unzip
 * @param dest The destination path to unzip the zip file to
 * @returns Success or failure
 */
export async function unzip(source: string, dest: string): Promise<{}> {
  const platform = os.platform();

  if (platform == "windows") {
    const run = await runShell(`cmd /c tar.exe -x -f ${source} -C ${dest}`, false);
    return run;
  } else {
    const run = await runShell(`unzip -o "${source}" -d "${dest}"`, false);
    return run;
  }
}

/**
 * Kills a process by the given executable name
 * @param process The process to kill
 * @returns Command status
 */
export async function killAll(process: string): Promise<{}> {
  const platform = os.platform();

  if (platform == "windows") {
    let processWin = process;

    if (!processWin.endsWith(".exe")) {
      processWin += ".exe";
    }

    const run = await runShell(`cmd /c taskkill /f /im ${processWin}`, true);
    return run;
  } else {
    const run = await runShell(
      `killall "${process.replaceAll(".exe", "")}"`,
      true
    );

    return run;
  }
}

/**
 * Fix to make TypeScript happy. Don't @ me.
 */
export function tempDir(): string {
  return os.tempDir() || "";
}

/**
 * Fix to make TypeScript happy. Don't @ me.
 */
export function homeDir(): string {
  return os.homeDir() || "";
}
