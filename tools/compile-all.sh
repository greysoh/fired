#!/bin/bash
cd ..
deno compile --target x86_64-unknown-linux-gnu --allow-read --allow-write --allow-run --allow-env index.ts
deno compile --target x86_64-pc-windows-msvc --allow-read --allow-write --allow-run --allow-env index.ts