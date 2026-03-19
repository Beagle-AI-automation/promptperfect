# Finish merge after conflicts (PP-403 / PP-404 branch)

Git will not let you commit until **every** unmerged file is edited (no `<<<<<<<` markers) and **`git add`’d**.

## 1. Confirm no conflict markers left

From repo root (PowerShell):

```powershell
git diff --check
Select-String -Path package.json,package-lock.json,src\**\*.ts,src\**\*.tsx,src\**\*.css -Pattern '<<<<<<<' -SimpleMatch
```

If anything prints, open that file and delete **all** of:

- `<<<<<<< branch-name`
- `=======`
- `>>>>>>> branch-name`

## 2. `package.json` + `package-lock.json`

**Do not** hand-merge `package-lock.json`.

1. In `package.json` **devDependencies**, include **both** sides (example):

   - `jsdom`, `vitest` (tests)
   - `pg` (from `main`)
   - `typescript`: use `5.9.3` (or match `main`)
   - one line each for `tailwindcss`, `eslint-config-next`, etc.

2. Regenerate the lockfile:

   ```bash
   npm install
   ```

## 3. Source files (`both added` / `both modified`)

For each file below, keep **one** clean version that combines:

- **From your branch:** history sidebar, diff view, optimize flow, `PromptOutput` with Explanation/Diff toggle.
- **From `main`:** whatever changed (metadata, styles, API shape). If unsure, use the version on `main` and re-apply your features from a clean branch.

Files that must be resolved and staged:

- `src/app/api/optimize/route.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/ApiKeyDialog.tsx`
- `src/components/Header.tsx`
- `src/components/ModeSelector.tsx`
- `src/components/PromptInput.tsx`
- `src/components/PromptOutput.tsx`
- `src/components/ThemeToggle.tsx`
- `src/lib/prompts.ts`
- `src/lib/providers.ts`

Also stage files **only** on your branch if Git lists them as new:

```bash
git add src/components/HistoryPanel.tsx src/components/DiffView.tsx src/lib/history.ts
```

## 4. Mark everything resolved

```bash
git add package.json package-lock.json
git add src/app/api/optimize/route.ts src/app/globals.css src/app/layout.tsx src/app/page.tsx
git add src/components/ApiKeyDialog.tsx src/components/Header.tsx src/components/ModeSelector.tsx
git add src/components/PromptInput.tsx src/components/PromptOutput.tsx src/components/ThemeToggle.tsx
git add src/lib/prompts.ts src/lib/providers.ts
```

Verify **no** unmerged paths:

```bash
git diff --name-only --diff-filter=U
```

(no output = good)

```bash
git status
```

You should **not** see “Unmerged paths”.

## 5. Commit and push

```bash
git commit -m "fix: resolve merge conflicts with main"
git push origin diff-viewer-c6c34
```

## If you use the same files as this repo (Cursor)

If your working tree already matches a clean merge (no `<<<<<<<` anywhere), you only need **`npm install`** (for lockfile) and the **`git add`** lines in step 4, then commit.
