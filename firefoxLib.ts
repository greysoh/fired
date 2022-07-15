import os from "https://deno.land/x/dos@v0.11.0/mod.ts";
import * as ini from "https://deno.land/x/ini@v2.1.0/mod.ts";

import { runShell } from "./osLib.ts";

export function getFirefoxDir(): string {
  if (os.platform() == "windows") {
    return os.homeDir() + "\\AppData\\Roaming\\Mozilla\\Firefox";
  } else if (os.platform() == "darwin") {
    throw "macOS is not supported";
  } else {
    return os.homeDir() + "/.mozilla/firefox";
  }
}

export async function getFirefoxProfiles(): Promise<any> {
  const firefoxDir = getFirefoxDir();
  const profiles = await Deno.readTextFile(firefoxDir + "/profiles.ini");
  const parsed = ini.parse(profiles);

  return parsed;
}

export function setFirefoxProfiles(jsonData: {}): string {
  return ini.stringify(jsonData);
}

export async function openFirefoxProfileChooser(): Promise<void> {
  if (os.platform() == "windows") {
    let file = `@echo off\n`;
    file += "cd C:\\Program Files\\Mozilla Firefox\n";
    file += "firefox.exe -P";

    await Deno.writeTextFile(os.tempDir() + "/firefox.bat", file);
    await runShell(os.tempDir() + "/firefox.bat", false);
    await Deno.remove(os.tempDir() + "/firefox.bat");
  } else if (os.platform() == "darwin") {
    throw "macOS is not supported";
  } else {
    await runShell("firefox -P", false);
  }
}
