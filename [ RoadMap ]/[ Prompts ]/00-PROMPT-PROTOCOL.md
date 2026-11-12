# Prompt Protocol (applies to every prompt 01–14)

You are building **Dungeons Codex** with no human help. Follow this protocol exactly.

## A. Before you start
1. Read `../[ Checklist ]/CHECKLIST.md`: confirm this prompt is the **first unchecked** one and that every earlier prompt is ✅. If not, stop and run the correct prompt instead.
2. Read `../[ Plans ]/00-INDEX.md` and the Plans/Design files that this prompt's **Read first** list names. Don't work from memory.
3. Check the **Paths** block in the Checklist for the current `PROJECT_ROOT`.
4. From Prompt 02 onward: run `npm run verify` in `PROJECT_ROOT` *before* changing anything. If it's red, fix the regression first and note it in the Checklist log.
5. In the Checklist, set this prompt's status to 🟡 **In progress**, with the date.

## B. While working
- Work through the prompt's **Tasks** in order. Use the session task list (`update_plan`) to mirror the prompt's mini-checklist.
- **Never ask the human.** Resolve ambiguity with the Decision Rules in `../[ Plans ]/10-DECISIONS-LOG.md` and log the decision there.
- Keep everything in scope. New ideas go to `../[ Design ]/Ideas/IDEAS.md`.
- Long commands (data sync, e2e, build) that may take more than 2 minutes run in the background; wait for the completion notification. Don't poll.
- Don't weaken tests or criteria. Don't use `eslint-disable` or `@ts-ignore` without a written reason in a comment.
- If a tool or path problem blocks you, diagnose the root cause (use `superpowers:systematic-debugging`). Fix it, don't work around it.

## C. Verification loop (from `../[ Plans ]/08-QUALITY-STANDARDS.md`)
```
repeat
  run every command in the prompt's "Acceptance" section
  fix every failure at its root cause
  confirm every mini-checklist item with concrete evidence
  for UI work: screenshot the changed pages in dark + light at 1440 and 390 px, compare against Design, fix defects
until all green AND all confirmed
```
Only then is the prompt done. "It should work" is not evidence.

## D. Finish
1. Tick every mini-checklist item in **both** the prompt file (`- [x]`) and the Checklist's stage section.
2. Set the status to ✅ **Done** with the date. Add a **Log** entry: what was built, the acceptance command results (summary lines), decisions logged, follow-ups added to IDEAS.
3. `git add -A` from the workspace root, then `git commit` with the prompt's commit message, ending with:
   ```
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
   (Use the attribution trailer the current session's system tells you to use, if it's different.)
4. Report to the user in 3–6 lines: the stage that finished, key results, the next prompt's number and title, and any **Human-only step** that is now unblocked.

## E. If a session runs out of context mid-prompt
The Checklist shows 🟡 for this prompt. The next session must re-read this protocol and the prompt, check the prompt's `- [x]` boxes to see what's already done (verify each with evidence; don't trust the box alone), and carry on from the first unconfirmed item.
