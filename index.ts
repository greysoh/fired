import {
  getFirefoxProfiles,
  getFirefoxDir,
  setFirefoxProfiles,
  openFirefoxProfileChooser,
  fixOSPath
} from "./firefoxLib.ts";
import { ask } from "./promptLib.ts";
import * as osLib from "./osLib.ts";

import { printf } from "https://deno.land/std@0.72.0/fmt/printf.ts";
import * as colors from "https://deno.land/std@0.72.0/fmt/colors.ts";

import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

import os from "https://deno.land/x/dos@v0.11.0/mod.ts";

if (os.platform() == "darwin") {
  console.log("macOS is currently not supported.");
  Deno.exit(1);
}

const version = "0.2.0";

console.log(`Fired v${version} - The all in one Firefox profile backup/restore tool.\n`);

function ok(): void {
  printf(`[${colors.bold(colors.green("OK"))}]\n`);
}

const optionSelect: number = await ask("Select an option: ", [
  {
    title: "Backup",
    returnId: 0,
  },
  {
    title: "Restore",
    returnId: 1,
  },
  {
    title: "Quit",
    returnId: 2,
  },
]);

switch (optionSelect) {
  case 0: {
    const profiles: any = await getFirefoxProfiles();
    let json: {}[] = [];

    for (const i of Object.keys(profiles)) {
      if (!profiles[i].Name) continue;
      if (profiles[i].Name == "default") continue;

      if (!profiles[i].IsRelative) continue; // Non-relative profiles are not supported

      json.push({
        title: profiles[i].Name,
        returnId: i,
      });
    }

    const profile = await ask("Select a profile: ", json);

    console.log("Please enter a new profile name: ");
    const newName: string = prompt(">") || "";

    if (newName == "") {
      console.log("You must enter a new profile name, dummy.");
      break;
    }

    profiles[profile].Name = newName;
    console.log(`\nBacking up profile '${profiles[profile].Name}'...`);

    printf("  - Closing Firefox... ");
    await osLib.killAll("firefox");
    ok();

    printf("  - Zipping profile... ");

    try {
      await Deno.mkdir(
        path.join(
          osLib.tempDir(),
          `firefox-backup-${profiles[profile].Name}-src`
        )
      );
    } catch (e) {
      await Deno.remove(
        path.join(
          osLib.tempDir(),
          `firefox-backup-${profiles[profile].Name}-src`
        ),
        { recursive: true }
      );
      await Deno.mkdir(
        path.join(
          osLib.tempDir(),
          `firefox-backup-${profiles[profile].Name}-src`
        )
      );
    }

    await osLib.zip(
      path.join(getFirefoxDir(), profiles[profile].Path),
      path.join(
        osLib.tempDir(),
        `firefox-backup-${profiles[profile].Name}-src`,
        `backup.zip`
      )
    );

    ok();
    printf(`  - Adding metadata... `);

    let metadata: any = profiles[profile];
    delete metadata.Default;

    await Deno.writeTextFile(
      path.join(
        osLib.tempDir(),
        `firefox-backup-${metadata.Name}-src`,
        "metadata.json"
      ),
      JSON.stringify(metadata)
    );

    ok();

    printf("  - Zipping backup...  ");
    await osLib.zip(
      path.join(
        osLib.tempDir(),
        `firefox-backup-${metadata.Name}-src`
      ),
      path.join(osLib.homeDir(), `firefox-backup-${metadata.Name}.zip`)
    );

    ok();
    printf("  - Cleaning up...     ");

    await Deno.remove(
      path.join(
        osLib.tempDir(),
        `firefox-backup-${metadata.Name}-src`
      ),
      { recursive: true }
    );

    ok();

    console.log("\nDone! Your backup is at:");
    console.log(
      path.join(osLib.homeDir(), `firefox-backup-${metadata.Name}.zip`)
    );
    break;
  }

  case 1: {
    const profiles: any = await getFirefoxProfiles();

    console.log("Please enter the path to the backup file: \n");
    let backupFile: string = await prompt(">") || "";
    backupFile = backupFile.replaceAll("'", "");
    backupFile = backupFile.replaceAll('"', "");

    backupFile = backupFile.trim(); // wtf?
    
    if (!existsSync(backupFile)) {
      console.error("File not found.");
      Deno.exit(1);
    }

    console.log("\nRestoring profile...");
    printf("  - Extracting files... ");

    try {
      await Deno.mkdir(
        path.join(osLib.tempDir(), `${path.basename(backupFile)}-src`)
      );
    } catch (e) {
      await Deno.remove(
        path.join(osLib.tempDir(), `${path.basename(backupFile)}-src`),
        { recursive: true }
      );
      await Deno.mkdir(
        path.join(osLib.tempDir(), `${path.basename(backupFile)}-src`)
      );
    }

    await osLib.unzip(
      backupFile,
      path.join(osLib.tempDir(), `${path.basename(backupFile)}-src`)
    );

    ok();

    printf("  - Reading metadata... ");
    const metadata = JSON.parse(
      await Deno.readTextFile(
        path.join(
          osLib.tempDir(),
          `${path.basename(backupFile)}-src`,
          "metadata.json"
        )
      )
    );
    let profilesModify = profiles;

    ok();

    printf("  - Closing Firefox...  ");

    await osLib.killAll("firefox");
    ok();

    printf("  - Restoring backup... ");

    const newPath: string = fixOSPath(metadata.Path + "-restore");

    if (existsSync(path.join(getFirefoxDir(), newPath))) {
      await Deno.remove(
        path.join(getFirefoxDir(), newPath),
        { recursive: true }
      );
    }

    await Deno.mkdir(path.join(getFirefoxDir(), newPath));

    await osLib.unzip(
      path.join(
        osLib.tempDir(),
        `${path.basename(backupFile)}-src`,
        "backup.zip"
      ),
      path.join(getFirefoxDir(), newPath)
    );

    ok();

    printf("  - Fixing metadata...  ");

    let metaName = "";
    const itemArr: number[] = [];

    for (const i of Object.keys(profiles)) {
      if (i.startsWith("Profile")) {
        if (Number.isNaN(parseInt(i.replaceAll("Profile", "")))) continue;

        if (profiles[i].Default) {
          delete profiles[i].Default;
          continue;
        }

        if (profiles[i].Name == metadata.Name) {
          delete profiles[i];
          continue;
        }

        itemArr.push(parseInt(i.replaceAll("Profile", "")));
      }
    }

    metaName = "Profile" + (Math.max(...itemArr) + 1);

    metadata.Path = fixOSPath(metadata.Path + "-restore");
    profilesModify[metaName] = metadata;

    const profilesIni = setFirefoxProfiles(profilesModify);

    ok();

    printf("  - Cleaning up...      ");

    await Deno.writeTextFile(
      path.join(getFirefoxDir(), "profiles.ini"),
      profilesIni
    );
    await Deno.remove(
      path.join(osLib.tempDir(), `${path.basename(backupFile)}-src`),
      { recursive: true }
    );

    ok();

    console.log(
      "\nDone! You should see a prompt asking you to select a profile.",
      "\nConfigure it as you please."
    );

    await openFirefoxProfileChooser();

    break;
  }

  case 2: {
    console.log("Quitting.");
    break;
  }
}

Deno.exit(0);
