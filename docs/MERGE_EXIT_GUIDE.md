# You still see `<<<<<<< HEAD` everywhere — do this

## Why grep lists the same file many times
Each **`<<<<<<< HEAD`** is a **separate conflict chunk** in that file. One file can have 10+ chunks → 10+ grep lines. You must fix **every** chunk (or replace the **whole file**).

## Common mistake: two different folders on Windows
- **Git Bash** `~/promptperfect` → often `C:\Users\Dell\promptperfect`
- **Cursor** may open `C:\Users\Dell\Documents\promptperfect`

Those are **two clones**. You merge in one; Cursor edits the other → conflicts never go away in the repo you commit from.

**Check in Git Bash:**

```bash
pwd
```

Use **one** folder for everything. Recommended: **`C:\Users\Dell\Documents\promptperfect`**

```bash
cd /c/Users/Dell/Documents/promptperfect
git status
```

---

## Fast path: copy clean tree from Documents → other clone

If your **MERGING** repo is `~/promptperfect` but **Cursor** has clean files under **Documents**:

```bash
# Adjust if your username/path differs
export GOOD=/c/Users/Dell/Documents/promptperfect
export BAD=~/promptperfect

cd "$BAD"

# Source files + manifests (not .git, not node_modules)
cp "$GOOD/package.json" .
cp "$GOOD/package-lock.json" .
rm -rf src
cp -r "$GOOD/src" .

npm install

# Must print nothing:
grep -r '<<<<<<<' --include='*.ts' --include='*.tsx' --include='*.css' --include='*.json' . || true
```

If `grep` finds lines, open those paths — they should be clean after the copy; if not, the copy failed.

Then:

```bash
git add -A
git diff --name-only --diff-filter=U   # expect empty
git commit -m "fix: resolve merge conflicts with main"
git push
```

---

## If `package-lock.json` is too broken to copy

From the repo root (after `package.json` has **no** `<<<<<<<`):

```bash
rm -f package-lock.json
npm install
git add package.json package-lock.json
```

---

## Nuclear: cancel the merge and start over

Only if you want to abandon this merge attempt:

```bash
git merge --abort
```

Then merge `main` again when `git status` is clean, or ask a teammate for a fresh branch.

---

## After every file is fixed

```bash
grep -r '<<<<<<<' . && echo "FIX REMAINING" || echo "OK no markers"
git add package.json package-lock.json src
git add -A
git status
git commit -m "fix: resolve merge conflicts with main"
```
