# Prompt History Ledger: Compty ATE Yield Optimization Platform

This ledger tracks all prompts used to build, modify, and refactor the codebase. Each entry maps the AI prompt directly to the affected files, commit references, and verification status.

---

## How to use this Ledger

When using an AI coding assistant (like Cursor, Claude, or ChatGPT) to write or modify code:
1. Copy the **System Instruction: Ledger Auto-Update** prompt from the bottom of this file.
2. Provide it to your AI assistant.
3. The AI assistant will write/edit the code, test it, and then automatically append a new entry to the [Change Log Table](#change-log-table) below.

---

## Change Log Table

| Date | Feature / Task | Files Affected | Verification Command | Prompt Details (Click to Expand) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-06-09` | **Core Setup & Initial Architecture** | Multiple (NestJS, Next.js, FastAPI, Streamlit, Docker) | `docker-compose up -d` | <details><summary>View Prompt</summary><pre>Initialize the ATE Intelligence v2 wafer optimization dashboard platform with backend, frontend, database docker containers, and Electron wrapper setup.</pre></details> | `Implemented` (Commit `7c42ae7`) |
| `2026-06-09` | **Electron Packaging & Configs** | `package.json`, `electron-builder.yml`, `electron-builder.config.js` | `npm run dist` | <details><summary>View Prompt</summary><pre>Configure Electron builder packaging with nsis target installer, portable targets, and code-signing bypass.</pre></details> | `Implemented` (Commits `5ed7ff1`, `71941aa`) |
| `2026-06-09` | **Packaged App Env & Spawning Support** | `electron/main.ts`, `backend/src/main.ts` | Local Run | <details><summary>View Prompt</summary><pre>Configure packaged application support to load external .env file next to application executable and spawn backend/frontend processes using process.execPath with ELECTRON_RUN_AS_NODE to support machines without global Node.</pre></details> | `Implemented` (Commits `8b7c526`, `5b94086`) |
| `2026-06-09` | **ASAR Packaging Fixes** | `electron/main.ts` | Packaged App Run | <details><summary>View Prompt</summary><pre>Change asar packaging config to true and fix child process spawning issues inside Electron by using fork() to resolve internal modules within the ASAR archive.</pre></details> | `Implemented` (Commits `248fe05`, `9330cf5`) |
| `2026-06-09` | **AI Wafer Segmentation & Models** | `ai wafer dashbooad/*`, `ai model/*` | `python train_unet.py` | <details><summary>View Prompt</summary><pre>Add AI wafer defect classification and U-Net guided segmentation models (U-Net, PyTorch training, Grad-CAM, validation scripts) to the repository.</pre></details> | `Implemented` (Commit `441f38d`) |
| `2026-06-09` | **STIL Log Parsing & Networking** | `backend/src/ate-dft/*`, `frontend/src/*` | `npm run build` | <details><summary>View Prompt</summary><pre>Implement real data parsing for uploaded ATE/STIL logs and integrate network configurations into frontend yield analysis widgets.</pre></details> | `Implemented` (Commit `3aa9e83`) |
| `2026-06-09` | **Traceability Matrix & Guides** | `prompts_guide.md` | Manual Verification | <details><summary>View Prompt</summary><pre>Create a structured prompt guide including Master blueprint and a Traceability Matrix mapping functional requirements to codebase components.</pre></details> | `Completed` |
| `2026-06-09` | **Prompt Ledger Integration** | `prompt_history_ledger.md` | Git Log Mapping | <details><summary>View Prompt</summary><pre>Create an in-app ledger to log what prompts were added or modified in the code, pre-populating it with all past development prompts.</pre></details> | `Completed` |
| `2026-06-09` | **Verification Test & Ledger Demonstration** | None (Audit Test Run) | `npm run test` (in backend) | <details><summary>View Details</summary><pre><b>Prompt:</b>\ncan i test it\n\n<b>Tools/Commands Used:</b>\nrun_command (npm run test), replace_file_content (prompt_history_ledger.md)\n\n<b>Dependencies Installed:</b>\nNone\n\n<b>Env & Config Changes:</b>\nNone</pre></details> | `Verified` |

| `2026-06-09` | **Ledger Auto-Update Script** | `scripts/log_prompt.js` | `node scripts/log_prompt.js` | <details><summary>View Details</summary><pre><b>Prompt:</b><br>Build a script to automate logging to the CSV and MD ledgers<br><br><b>Tools/Commands Used:</b><br>write_to_file<br><br><b>Dependencies Installed:</b><br>None<br><br><b>Env & Config Changes:</b><br>None</pre></details> | `Verified` |

| `2026-06-16` | **Fix Next.js Build Prerender and Type Errors** | `frontend/src/app/api/wafer-ai/predict/route.ts, frontend/src/app/dashboard/pattern-analysis/page.tsx, .gitignore` | `npm run build:frontend` | <details><summary>View Details</summary><pre><b>Prompt:</b><br>https://github.com/suban-godugu/ATE-Intelligence-v.2.git check the and push all thig for this github<br><br><b>Tools/Commands Used:</b><br>replace_file_content, multi_replace_file_content, run_command<br><br><b>Dependencies Installed:</b><br>None<br><br><b>Env & Config Changes:</b><br>None</pre></details> | `Verified` |

---

## System Instruction: Ledger Auto-Update

> [!IMPORTANT]
> Copy the markdown block below and paste it to your AI assistant whenever you start a new task.

```markdown
You are an AI developer working on this codebase. We maintain an audit ledger of all AI prompts and code modifications in `prompt_history_ledger.md` (for markdown view) and `prompt_history_ledger.csv` (for spreadsheet view).

Once you have completed writing, refactoring, or debugging code for the task I give you:
1. Run any verification tests or check the compilation to ensure everything works.
2. Automate the ledger update by running the following command in the workspace root:
   ```bash
   node scripts/log_prompt.js --feature="[Feature Name]" --files="[List of files, e.g., src/main.ts]" --cmd="[Verification command run]" --prompt="[The exact prompt you responded to]" --tools="[e.g., file_edit, run_command]" --deps="[List of new dependencies added, or None]" --env="[Environment variables changed, or None]" --status="[Verified / Implemented]"
   ```
Do not edit prompt_history_ledger.md or prompt_history_ledger.csv manually; use the script to automatically keep them updated and in sync.
```
