# AIPER — Super-Phase Plan

---

## Super-Phase Overview

| SP | Name | Items | Status |
|---|---|---|---|
| SP1 | MVP Delivery | F1, B6, B5, F12, F5, F10, F4, F17, B2, B3 | ✅ Complete |
| SP2 | Core Stability | F14, B1, F8, F15, F13, F2, F16, F18, F19, F20, F9, B12, B13, B14, C8, F23 | 🟡 Partially Complete (Report Track Parallel) |
| SP3 | UX Polish + Infrastructure | B4, B7, B8, B9, B10, B11, B15, F7, F3, F6, C2, C3, C4, C5, C6 | 🔄 Ongoing (P1 to P14 Complete) |
| SP4 | Documentation | F11 | Future |
| SP5 | Future (No Start Date) | C1, C7 | Deferred |

---

## SP1 — MVP Delivery ✅

### Phase Order

Dependencies within SP1 dictate this sequence:
- **F12 must precede F9** (F9 restructures the whole engine; tweaks first to set baseline)
- **F10 must precede F1** (F1 reuses the preserve-progress mechanism from F10)
- All other items are independent and ordered by blast radius (smallest changes first)

| Phase | ID | Title | Status |
|---|---|---|---|
| SP1.P1 | B6 | Hand Over / Receive Sample Modal Broken | ✅ Done |
| SP1.P2 | B2 | Timeline State Mismatch on RETURNED | ✅ Done |
| SP1.P3 | B3 | Deadline Lateness Indicator | ✅ Done |
| SP1.P4 | B5 | Retained Job Shows Stale ULR Preview | ✅ Done |
| SP1.P5 | F5 | Accidental Approve Safeguard | ✅ Done |
| SP1.P6 | F10 | Job Reassign Bug Fix | ✅ Done |
| SP1.P7 | F12 | Report Minor Tweaks | ✅ Done |
| SP1.P8 | F9 | New Addition of Special Group — Water 10500 | ~~Moved → SP2.P11~~ |
| SP1.P9 | F1 | Job Hold | ✅ Done |
| SP1.P10 | F4 | Multi-Job Dispatch | ✅ Done |
| SP1.P11 | F17 | DB Export / Backup | ✅ Done |

---

### SP1.P1 — B6: Hand Over / Receive Sample Modal Broken

**File**: `frontend/src/pages/Head/TransferManagement.jsx`

**Root cause hypothesis**: The modal is positioned absolutely or fixed without a proper z-index/portal, causing it to overflow behind the job list.

| Subphase | Task |
|---|---|
| SP1.P1.1 | Open `TransferManagement.jsx` and locate both the "Hand Over Sample" and "Receive Sample" modal JSX blocks |
| SP1.P1.2 | Identify whether the modal renders inline (in-place) or via a portal. If inline, wrap the modal in a React Portal (`ReactDOM.createPortal`) mounting to `document.body` |
| SP1.P1.3 | Ensure modal overlay uses `position: fixed; inset: 0; z-index: 1000` and the modal box is centered via flexbox |
| SP1.P1.4 | Verify `overflow: hidden` on a parent is not clipping the modal |
| SP1.P1.5 | Test on mobile viewport — tap "Hand Over" and "Receive", confirm modal renders cleanly above all content |
| SP1.P1.6 | Confirm "Confirm" button still triggers the correct transfer action |

> ✅ Completed — commit `01f90f7`. Fix was CSS-only in `frontend/src/index.css` — stacking context/z-index fix on the overlay was sufficient. A React Portal was not needed.

---

### SP1.P2 — B2: Timeline State Mismatch on RETURNED

**File**: `frontend/src/components/JobTimeline.jsx`

**Known state**: Line 87 — `RETURNED` falls into a branch, and lines 109–110 show `headApproval || instance.status === 'COMPLETED'` setting s4 to `completed`. If `headApproval` is a truthy object even on returned jobs, s4 incorrectly turns green.

| Subphase | Task |
|---|---|
| SP1.P2.1 | Read the full s4 logic block (lines ~79–114) in `JobTimeline.jsx` |
| SP1.P2.2 | Trace what `headApproval` contains on a `RETURNED` job — verify it is not a stale approval object from a prior review |
| SP1.P2.3 | Fix the s4 condition: `s4_status = 'completed'` must only be set if `dStatus === 'COMPLETED'` (full job), not merely if `headApproval` exists |
| SP1.P2.4 | On `RETURNED` status: explicitly force `s4_status = 'pending'` to override any stale headApproval check |
| SP1.P2.5 | Confirm `PENDING_HEAD_REVIEW` still renders s4 as `active` (clock icon) |
| SP1.P2.6 | Visually verify the full timeline across: DISPATCHED, RETURNED, PENDING_HEAD_REVIEW, COMPLETED |

> ✅ Completed — commits `bad3649` + `f54dc46` (two passes on `frontend/src/components/JobTimeline.jsx`). Second pass extended the fix to stages S2 and S3 as well, not just S4 as originally planned.

---

### SP1.P3 — B3: Deadline Lateness Indicator

**Files**: `frontend/src/pages/AssistantDashboard.jsx` (display), `frontend/src/pages/Head/DispatcherPage.jsx` (input)

| Subphase | Task |
|---|---|
| SP1.P3.1 | Create a shared utility function `isOverdue(deadlineStr): boolean` that returns `new Date(deadlineStr) < new Date()` |
| SP1.P3.2 | In `AssistantDashboard.jsx` line ~477: wrap the deadline display — if `isOverdue(activeTask.deadline)`, render the timestamp in `var(--color-danger)` red with an "Overdue" badge next to it |
| SP1.P3.3 | In `AssistantDashboard.jsx` line ~682: apply the same overdue styling to the task list row deadline |
| SP1.P3.4 | In `DispatcherPage.jsx`: on the deadline date/time inputs, add an `onChange` validation — if the composed datetime string is in the past, show an inline warning: "This deadline has already passed" |
| SP1.P3.5 | Do NOT hard-block form submission for past deadlines (the head may intentionally set a tight deadline). Only warn. |
| SP1.P3.6 | Verify on mobile — badge must not overflow the card |

> ✅ Completed — commit `dc6a65c`. Overdue badge added to `AssistantDashboard.jsx`; past-deadline warning added to `DispatcherPage.jsx`. Note: `isOverdue()` was implemented inline in each file, not extracted as a shared util.

---

### SP1.P4 — B5: Retained Job Shows Stale ULR Preview

**File**: `frontend/src/pages/AdminOfficer/JobsPage.jsx`

**Root cause**: The `retainForm` block (lines 770–783) does not clear or re-fetch `ulrPreview`, so the stale value from the previous submission persists.

| Subphase | Task |
|---|---|
| SP1.P4.1 | In the `retainForm` block (around line 770), add `setUlrPreview("")` to clear the stale value immediately after submission |
| SP1.P4.2 | For NABL jobs: after clearing, show the text "ULR assigned upon test completion" in the ULR preview display field (not a fetched number) |
| SP1.P4.3 | For Non-NABL opt-in jobs: after clearing, show "Slot reserved on save" — do not fetch the next slot number as a live preview |
| SP1.P4.4 | Also clear `assignUlrToNonNabl`, `ulrEditMode`, `customUlrNumber`, and `ulrValidation` state in the retain block so no stale opt-in state carries over |
| SP1.P4.5 | Verify: create a NABL job, retain form, confirm ULR preview reads "ULR assigned upon completion" not a number |
| SP1.P4.6 | Verify: create a Non-NABL opt-in job, retain form, confirm ULR section is reset cleanly |

> ✅ Completed — commit `39e28d1`. ULR preview state cleared on form retain in `AdminOfficer/JobsPage.jsx`.

---

### SP1.P5 — F5: Accidental Approve Safeguard

**File**: `frontend/src/pages/Head/DispatcherPage.jsx`

| Subphase | Task |
|---|---|
| SP1.P5.1 | Locate the analyst-picker card state in `DispatcherPage.jsx` — the UI block that appears after "Approve" is clicked |
| SP1.P5.2 | Add a "Return to Officer" button styled as a secondary/ghost button at the top-right of the analyst-picker card state |
| SP1.P5.3 | On click: clear all pre-selected analysts for this job's card, and revert the card state back to its pre-approval view (clear any `approved`, `pickerOpen`, or equivalent local state for that job ID) |
| SP1.P5.4 | Ensure "Return to Officer" does NOT call any API — this is a pure frontend state revert |
| SP1.P5.5 | Socket: no socket events needed — nothing has been committed to the backend |
| SP1.P5.6 | Verify on mobile — the button must be tappable and not overlap the analyst picker dropdown |

> ✅ Completed — commit `23b2a0f`. "Return to Officer" button added in `DispatcherPage.jsx` — pure frontend state revert, no API call.

---

### SP1.P6 — F10: Job Reassign Bug Fix

**Files**: Backend reassign routes, `TestInstance.js`

| Subphase | Task |
|---|---|
| SP1.P6.1 | Read and map the full reassign flow: find the route that handles "Head reassigns analyst" (likely in `testResultRoutes.js` or `testAssignmentRoutes.js`) |
| SP1.P6.2 | Locate exactly where `TestInstance` data is set/overwritten during a reassign. Identify if the route creates a new TestInstance or updates the existing one |
| SP1.P6.3 | If it creates a new TestInstance: change to update the existing one, preserving `results`, `method`, and `notes` fields. Only update `assignedTo` |
| SP1.P6.4 | If it updates in place: verify `results`, `method`, `notes` are not being cleared by a `$set` or `Object.assign` that overwrites them with empty values |
| SP1.P6.5 | Add a `reviewHistory` entry for the reassignment: `{ action: 'REASSIGN', by: req.user._id, note: 'Reassigned to [analyst name]', date: now }` |
| SP1.P6.6 | Frontend: verify that when analyst receives a reassigned job, previously saved values are visible in the input fields |
| SP1.P6.7 | Test edge case: reassign a job that has zero saved progress — must still work cleanly |

> ✅ Completed — commit `8fc39a4`. Fix applied to `backend/routes/tests/testResultRoutes.js` only. Reassign now updates `TestInstance` in-place; `results`/`method`/`notes` preserved; `reviewHistory` entry added.

---

### SP1.P7 — F12: Report Minor Tweaks

**File**: `backend/services/reportGenerator.js`

| Subphase | Task |
|---|---|
| SP1.P7.1 | Locate the "Contact details" row builder in `reportGenerator.js` — find where contact person, phone, and email are composed into one string |
| SP1.P7.2 | Split into two separate table rows: `Contact Person:` → contact person name only; `Email:` → email only. Remove the merged row |
| SP1.P7.3 | Verify against the reference doc (`DRINKING WATER 1741 as per 10500.docx`) whether the phone number row appears separately or is dropped. Implement accordingly |
| SP1.P7.4 | Locate where authorized signatory names appear in the report footer/signature block |
| SP1.P7.5 | Check if names are hardcoded strings or pulled from User model. If hardcoded, update `Monika Pali` → `Ms. Monika Pali` and `Jyoti Pathak` → `Ms. Jyoti Pathak`. If from DB, add a `honorific` field or derive from gender |
| SP1.P7.6 | Generate a test report and visually verify both fixes match the reference doc |

> ✅ Completed — commits `19e8034` + `393cfc1`. Both touch `backend/services/reportGenerator.js` only. Contact details split into two rows; `Ms.` prefix added to signatory names.

---

### SP1.P8 — F9: New Addition of Special Group — Water 10500 (Moved)

**Files**: Backend parameter/group routes, Admin seed scripts, `reportGenerator.js`

> Moved to SP2.P11. No code committed for this phase. Reference material in `/temp/report/`.

---

### SP1.P9 — F1: Job Hold

**Files**: `Job.js`, `JobsPage.jsx` (officer), `DispatcherPage.jsx`, `AssistantDashboard.jsx`, backend job routes

| Subphase | Task |
|---|---|
| SP1.P9.1 | **Model**: Add `ON_HOLD` to the `Job.js` status enum. Add an optional `holdReason` string field |
| SP1.P9.2 | **Backend — Hold route**: Create `POST /api/jobs/:id/hold`. Logic: set `job.status = 'ON_HOLD'`, clear `job.distribution.*.assignedHead` if not yet dispatched to analyst, record in `job.history` |
| SP1.P9.3 | **Backend — Recall from analysts**: If job was already dispatched, find all `TestInstance` documents for this job. Set their status to `HELD` (or equivalent). Do NOT clear `results`, `method`, or `notes` — preserve all progress |
| SP1.P9.4 | **Backend — ULR reservation decision**: If job has a `reservedUlrSlot` at hold time, **clear it**. The slot should not be held indefinitely. Document this in the route as a comment |
| SP1.P9.5 | **Backend — Unhold route**: Create `POST /api/jobs/:id/unhold`. Logic: set job status back to `PENDING_REVIEW` (back to officer/head queue). Emit socket event |
| SP1.P9.6 | **Socket events**: Emit `job:held` event on hold (with job ID). Head and analyst clients must listen and remove the job from their active views. Emit `job:unheld` on unhold |
| SP1.P9.7 | **Officer UI**: Add "Hold" button to the individual job card in `JobsPage.jsx`. Show only when job status is NOT already `ON_HOLD`, `COMPLETED`, or `CANCELLED`. Add a confirmation modal before triggering |
| SP1.P9.8 | **Officer UI — Held job state**: Show held jobs in the job list with a distinct "HELD" badge. Add "Release Hold" button on held job cards |
| SP1.P9.9 | **Head UI**: `DispatcherPage.jsx` — listen for `job:held` socket event and remove the job card from the dispatcher list in real-time |
| SP1.P9.10 | **Analyst UI**: `AssistantDashboard.jsx` — listen for `job:held` socket event and remove the affected task card. When job is later unheld and re-dispatched, prior saved progress is visible |
| SP1.P9.11 | **Test all stages**: hold a job at (a) officer stage, (b) head stage, (c) analyst stage. Verify correct recall behaviour at each |

> ✅ Completed — commits `7914545` + `3db94f1` (two passes). Files: `Job.js`, `TestInstance.js`, `jobCrudRoutes.js`, `jobListRoutes.js`, `jobWorkflowRoutes.js`, `testAssignmentRoutes.js`, `JobsPage.jsx`, `JobLogTable.jsx`, `JobTimeline.jsx`. Second pass added the socket listeners on DispatcherPage and AssistantDashboard that were missing from the first pass.

---

### SP1.P10 — F4: Multi-Job Dispatch to Single Analyst

**Files**: `frontend/src/pages/Head/DispatcherPage.jsx`, backend dispatch route

| Subphase | Task |
|---|---|
| SP1.P10.1 | Add a checkbox (or long-press on mobile) to each dispatcher job card to toggle multi-select mode |
| SP1.P10.2 | When 2+ jobs are selected, show a sticky bottom action bar: "Dispatch X jobs to…" with an analyst picker dropdown |
| SP1.P10.3 | The analyst picker in the action bar should show only analysts from the relevant department(s) of the selected jobs |
| SP1.P10.4 | On confirm: call `POST /api/jobs/bulk-dispatch` (new endpoint) with `{ jobIds: [...], analystId, deadline }` |
| SP1.P10.5 | Backend: iterate `jobIds`, for each job approve and create/update `TestInstance` documents assigning all parameters to `analystId` |
| SP1.P10.6 | Emit individual `job:dispatched` socket events for each job (not one bulk event — keeps existing listeners working) |
| SP1.P10.7 | Frontend: clear selection, show success toast for each dispatched job, refresh job list |
| SP1.P10.8 | Edge case: if one job in the bulk fails (e.g. already dispatched), report a partial failure without rolling back successful ones |
| SP1.P10.9 | Verify on mobile — the bottom action bar must not obstruct the job list and must be easily dismissible |

> ✅ Completed — commit `7f8bb8c`. Files: `testAssignmentRoutes.js` (+17 lines, bulk-dispatch endpoint) and `DispatcherPage.jsx` (+302 lines, multi-select UI). Note: the endpoint was added directly to `testAssignmentRoutes.js`, not as a separate route file.

---

### SP1.P11 — F17: DB Export / Backup

**Files**: New backend route, Admin UI

> A one-click export button for the admin to download a full backup of all MongoDB collections as a single archive.

| Subphase | Task |
|---|---|
| SP1.P11.1 | **Backend route**: Create `GET /api/admin/export` (admin-only). Use `mongoose.connection.db.listCollections()` to enumerate all collections, then `find({})` on each to dump all documents |
| SP1.P11.2 | **Format**: Output as a single `.json` file using `EJSON.stringify` (preserves ObjectIds and Dates). Send with `Content-Disposition: attachment` header |
| SP1.P11.3 | **Filename**: Auto-generate as `FTL_LIMS_DD-MM-YYYY_ssmmHH.json` |
| SP1.P11.4 | **Frontend**: `Backup & Export` tab in `DataSettings.jsx`. Full-width animated progress bar (aesthetic), last-backup timestamp per user stored in DB (`User.lastBackupAt`), auto-fadeout after 5s |
| SP1.P11.5 | **Authorization**: Route is `protect + authorize('ADMIN', 'ADMIN_OFFICER', 'HEAD')` |
| SP1.P11.6 | **Timestamp persistence**: `lastBackupAt` stamped on the user document after each backup; returned in login response; displayed in the backup UI |

> ✅ Completed — commits `95c7a93`, `719db4a`, `393cfc1`, `8a52077` (iterative fixes). Files: `exportRoutes.js`, `DataSettings.jsx`, `User.js`, `authRoutes.js`, `api.js`. EJSON serialization; per-user `lastBackupAt` timestamp in DB + login response; animated UI. URL base fix (`api.js`) was a separate follow-up commit.

---

## SP2: Core Stability (Partially Complete; Report Track Parallel)

### SP2 — Core Stability
| Phase | ID | Title | Status |
|---|---|---|---|
| SP2.P1 | F14 | Cross-Analyst Reassign Duplication Bug | ✅ Done |
| SP2.P2 | B1 | ULR Preview Label Fix (Concurrent Jobs) | ✅ Done |
| SP2.P3 | F8 | Toast System Overhaul | ✅ Done |
| SP2.P4 | F15 | Global Modal Daemon | ✅ Done |
| SP2.P5 | F13 | Analyst Reassignment History Tracking | ✅ Done |
| SP2.P6 | F2 | Head Pages, Search, Filter & Sort | ✅ Done |
| SP2.P7 | F16 | Hide Test Code Suffixes in UI | ✅ Done |
| SP2.P8 | F18 | Error Handling & Modal Overhaul | ✅ Done |
| SP2.P9 | F19 | Head Monitor Tab V1: Withdraw, Migration & Live Progress | ✅ Done |
| SP2.P10 | F20 | Head Monitor Tab V2: Unified Param Split/Merge & Progress Snapshot | ✅ Done |
| SP2.P11 | F9 | New Addition of Special Group: Water 10500 | 🔄 Parallel with SP3 |
| SP2.P12 | B12 | 1+ Samples Multi-Department Handover Bypass | ✅ Done |
| SP2.P13 | B13 | Staged Parameter Amendments & Multi-Analyst Duplication Fix | ✅ Done |
| SP2.P14 | B14 | Duplicate Parameter Guard & Whitespace Trim Fix | ✅ Done |
| SP2.P15 | C8 | Parameter Schema Cleanup: Remove Deadweight Group & Subgroup Fields | ✅ Done |
| SP2.P16 | F23 | Dynamic Modal Engine (modal.custom) | ✅ Done |

---

### SP2.P1 — F14: Cross-Analyst Reassign Duplication Bug

**Files**: `backend/routes/tests/testResultRoutes.js`, `backend/models/TestInstance.js`

**Confirmed flow this must support:**
- Head dispatches 6 params across 2 analysts: A gets [1,2,3], B gets [4,5,6]
- A submits → Head selective-reassigns params 1 & 2 to B (who already has an active instance)
- Expected: B's single existing card grows to show [1,2,4,5,6] (no duplicate card). A's card retains only param 3 (or is COMPLETED if 3 was approved)
- B can submit and be further reassigned — the cascade must work the same way at each level

**Bug 1 — Duplicate instance creation:**
The complex multi-analyst REASSIGN branch (`testResultRoutes.js` lines ~253–297) unconditionally called `new TestInstance(...)` for each non-original analyst, never checking if that analyst already had an active instance for the job. This created a second card on B's dashboard.

**Bug 2 — Approved bleed-through:**
When params were removed from A and sent to B, only `isSaved: false` was set on A's instance — `value` and `testMethod` were left intact. The frontend read `isSaved: false` as "not yet saved" but still displayed the old `value`, making the param appear as Approved even though it had been reassigned away.

| Subphase | Task |
|---|---|
| SP2.P1.1 | **Fix 1 — No duplicates**: Before `new TestInstance(...)`, query `TestInstance.findOne({ jobId, assignedTo: analystId, status: PENDING|PENDING_HEAD_REVIEW })`. If found, merge new params into existing instance (deduped `results` + `retestOnly`), reset status → PENDING, append `REASSIGN_MERGED` to `reviewHistory` |
| SP2.P1.2 | **Fix 1 — Create path**: If no existing instance found, proceed with original `new TestInstance(...)` unchanged |
| SP2.P1.3 | **Fix 2a — Branch 1 bleed** (original analyst retains some params): also wipe `value` + `testMethod` for params going to other analysts, not just `isSaved` |
| SP2.P1.4 | **Fix 2b — Branch 2** (original analyst has NO params being reassigned back): **filter** the reassigned params out of A's `results` entirely (do NOT wipe in-place, REMOVE them). Keep `PENDING_HEAD_REVIEW` so HEAD's review card shows only the surviving params. Edge case: if all of A's params are removed → auto-approve (`COMPLETED`) since there is nothing left for HEAD to see |
| SP2.P1.5 | **Enum**: Add `REASSIGN_MERGED` to `reviewHistory.action` enum in `TestInstance.js` |
| SP2.P1.6 | **Socket**: Existing `io.emit('TEST_REVIEWED')` is sufficient — `AssistantDashboard` and `ReviewQueuePage` both listen and re-fetch, so both HEAD and analyst B see updated state automatically |

**Regression found during testing (Pass 2):**
- Bug reported: HEAD's review card for A disappeared after selective reassign (all params going to B)
- Root cause: Branch 2 was setting `instance.status = 'PENDING'` which removed A from `PENDING_HEAD_REVIEW`. Fix: changed to `filter()` (removes reassigned params from results array) and keeps `PENDING_HEAD_REVIEW` so remaining params are still visible to HEAD
- Second report: image showed B's original params as Approved + new params from A as unsaved — **this is the correct and expected state**. The `retestOnly` array on B's instance correctly gates the submit button.

**Regression found during testing (Pass 3 — full flow trace):**

Full flow tested: Diksha had [Iodine, Moisture, Refractive]. HEAD split Refractive → Vishal (Branch 1). Diksha retested + submitted [Iodine, Moisture]. HEAD split Moisture → Vishal (Branch 2 into existing Vishal instance).

- **Bug A (Image 1/2/3)**: Refractive Index still appeared on Diksha's analyst card as "Approved" and in HEAD's review as an empty row after it was sent to Vishal. Root cause: Branch 1 was **wiping** params in-place (`value: '', isSaved: false`) but leaving them in `instance.results`. The frontend shows any result not in `retestOnly` as Approved — the wiped Refractive was not in retestOnly, so it showed as Approved. HEAD's review shows all entries in `results`, so the empty row appeared there too. Fix: use `filter()` then `map()` in Branch 1 — same as Branch 2.
- **Bug B (Image 5)**: Moisture appeared as "Approved" on Vishal's card after being merged in. Root cause: Vishal's sub-instance was created with `retestOnly = [refractive_id]` (from prior split). When Moisture was merged, the condition `status === PENDING_HEAD_REVIEW` was false (Vishal was PENDING), so Moisture was not added to `retestOnly`. Frontend: anything not in a non-empty `retestOnly` shows as Approved → Moisture showed as Approved. Fix: add to retestOnly if `status === PENDING_HEAD_REVIEW` **OR** `retestOnly.length > 0` (i.e., the instance was already scoped by a prior split).

**Regression found during testing (Pass 4 — multi-analyst dispatch flow):**

Full flow tested: Om Prakash had 5 params. HEAD selective-reassigned 2 → Vishal, 2 → Diksha, 1 stayed with Om. Diksha submitted. HEAD reassigned 1 of Diksha's params to Vishal.

- **Bug C — Junk test code suffix**: When an analyst had NO existing instance (Diksha in this case), the "create" path was generating a random timestamp suffix (`2608041697-2a-R9ob0`) instead of following the established `-2b`, `-2c` convention. Fix: strip the trailing letter from the parent's `testCode` to get the dept-base (`2608041697-2`), count existing instances matching that pattern, and use `String.fromCharCode(97 + count)` to get the next letter. Sequential, deterministic, matches dispatch conventions.
- **Bug D — Double-hash login failure**: Om Prakash's account couldn't log in on both local and prod. Root cause: a manual password reset script had called `bcrypt.hash()` explicitly and then `.save()`, causing the Mongoose `pre('save')` hook to hash the already-hashed value a second time. Fix: pass plain text password to the model and let the hook hash it once.
- **UX — Review history labels**: `REASSIGN_MERGED` action was displayed raw in the Previous Review History box. Fixed: added `ACTION_LABELS` map in `ReviewQueuePage.jsx`, `REASSIGN_MERGED` → "Parameters added via reassign:" with the note flowing inline (no em-dash). Backend note updated to `"N Parameter(s) added from {jobCode}"` with proper singular/plural and suffix stripped.

**Design decisions locked:**
- **Wipe on reassign**: When params are sent from analyst A to analyst B, values are fully wiped (`value: ''`, `testMethod: ''`, `isSaved: false`). B must independently re-test and enter fresh results. Previous values are stored in `instance.previousResults` for HEAD's audit trail only. This prevents Diksha's numbers from silently passing through as B's results.

> ✅ **FULLY RESOLVED** (commits `8d16221`, `4597761`, `1598725`, Pass 4). All paths confirmed working:
> - Branch 1 (A retains some params, some go to B): filter+map, removes params sent away, A stays PENDING
> - Branch 2 (all of A's params go to B): filter, A stays PENDING_HEAD_REVIEW (or COMPLETED if empty)  
> - Merge into existing PENDING instance (retestOnly=[]): new params added, retestOnly untouched — all editable
> - Merge into existing sub-instance (retestOnly non-empty): new params added to retestOnly — all editable
> - Merge into PENDING_HEAD_REVIEW instance: new params added to retestOnly — submitted work stays Approved
> - No existing instance: new sub-instance created with clean letter suffix (`-2b`, `-2c`, etc.)
>
> Files changed: `backend/routes/tests/testResultRoutes.js`, `backend/models/TestInstance.js`, `frontend/src/pages/Head/ReviewQueuePage.jsx`


---

### SP2.P2 — B1: ULR Preview Label Fix (Concurrent Jobs)

**Files**: `frontend/src/pages/AdminOfficer/JobsPage.jsx`, `backend/routes/jobs/jobCrudRoutes.js`

**Root causes addressed:**
- **Bug 1 — Wrong label**: Help text said "assigned when the job is submitted" but ULR assignment for NABL jobs happens at Head Approval via `ulrService.attemptUlrAssignment()`, not at form save.
- **Bug 2 — Preview presented as a guarantee**: The `next-ulr` endpoint returns `currentValue + 1` as a read-only snapshot. Multiple concurrent NABL jobs all see the same preview number, but counter only increments at completion — whoever finishes second gets `currentValue + 2`. The preview was misleading.
- **Bug 3 — Stale NABL preview bleeding into Non-NABL section**: The `useEffect` only fetched on switch-to-nabl/hybrid but never cleared on switch-away. Line 2149's Non-NABL auto-assign block read `ulrPreview` directly, so an old NABL value could bleed in.

| Subphase | Task |
|---|---|
| SP2.P2.1 | Fix label in NABL block: removed incorrect "This ULR will be officially assigned when the job is submitted" text |
| SP2.P2.2 | Input value prefixed with `~` in creation mode (`~ TC-12434YYXXXXXXXX`) to signal it is approximate. Replaced with plain `ulr_no` in edit mode (unchanged). Added `Loading…` fallback during fetch |
| SP2.P2.3 | `useEffect` (line ~364) extended with `else { setUlrPreview("") }` — clears stale preview when switching away from nabl/hybrid mode |
| SP2.P2.4 | Non-NABL auto-assign block (line ~2154) changed from `{ulrPreview \|\| '—'}` to `{'—'}` — removed dependency on shared `ulrPreview` state entirely |
| SP2.P2.5 | Added explanatory comment in `jobCrudRoutes.js` `GET /next-ulr` route documenting the in-flight NABL limitation. No logic change |
| SP2.P2.6 | Label cleaned further per user review: `(Auto-assigned)` parenthetical removed; label is now just `ULR Number *`. Caption trimmed to "The number shown here is an estimate." in `#6b7280` |

> ✅ Completed (commits `dbd6149`, `2473de6`, `f94189b`). File changed: `frontend/src/pages/AdminOfficer/JobsPage.jsx` (lines ~364–370, ~2017–2025, ~2154). Comment added to `backend/routes/jobs/jobCrudRoutes.js` (lines ~69–72). No backend logic changes; no new endpoints.

---

### SP2.P3: F8: Toast System Overhaul ✅

**Goal**: Replace the scattered, inconsistent feedback pattern (`setSuccess`/`setError` local state strings, bare `alert()` calls, and manual `setTimeout` clears across 15 files) with a single, centrally managed toast system. Any part of the app can fire a toast with one line via a `useToast()` hook.

**Design decisions locked (from /grill-me session):**
- **Implementation**: Fully custom in-house system. No external library. `ToastContext` + `useToast` hook + `<ToastContainer>` renderer.
- **Variants (shipped now)**: `success` and `error` only, the only two with confirmed, immediate use in the current 15 files. `warning`, `info`, and `loading` are deferred until a real use case exists.
- **Variant extensibility**: Variants are defined in a single `TOAST_VARIANTS` config map (type key -> `{ icon, accentColor, defaultDuration }`). Adding a new variant in the future requires only one entry in that map, no changes to rendering logic, CSS keyframe logic, or the hook.
- **Position**: Bottom-right (desktop: `bottom: 1.5rem, right: 1.5rem, z-index: 1050`; mobile: `bottom: calc(1rem + env(safe-area-inset-bottom, 0px))` with left/right padding). Rendered via a React Portal to `document.body` so it never sits inside a stacking-context-constrained parent.
- **Dismissal**: Auto-dismiss with progress bar (defaults: `success` = 4 s, `error` = 8 s; overrideable via `opts.duration`) plus manual dismiss X button on each card.
- **Manual close**: Close X button included on `<ToastCard>` for immediate manual dismiss.
- **Stacking**: Newest on top, capped at 3 visible. When a 4th arrives the oldest is immediately evicted.
- **Animation**: Slide in from right on enter, slide out to right on exit. CSS keyframe animation, no JS animation library.
- **Progress bar**: Yes. A thin colored bar at the bottom of each toast depletes over its lifetime. Driven by a CSS `animation` timed to match the toast duration, zero JS overhead.
- **Visual style**: Dark glassmorphic card matching the existing design language. Dark translucent background, subtle border. Colored left-accent stripe per variant (green / red). Outline Lucide icon on the left, message text wrapped (`white-space: normal, word-break: break-word`), manual close button on the right.
- **Migration scope**: Full migration across 15+ target files replaced.

**Files created:**
- `frontend/src/context/ToastContext.jsx`
- `frontend/src/hooks/useToast.js`

**Files modified:**
- `frontend/src/main.jsx` (wrapped with `<ToastProvider>`)
- `frontend/src/index.css` (toast keyframes, custom properties, and card classes)
- `frontend/src/components/Header.jsx` (profile menu z-index adjusted to 1000, `--header-height` layout variable)
- `frontend/src/pages/Head/DispatcherPage.jsx`
- `frontend/src/pages/Head/ReviewQueuePage.jsx`
- `frontend/src/pages/Head/AssistantsPage.jsx`
- `frontend/src/pages/AdminDashboard.jsx`
- `frontend/src/pages/AssistantDashboard.jsx`
- `frontend/src/pages/AdminOfficer/JobsPage.jsx`
- `frontend/src/pages/Head/TransferManagement.jsx`
- `frontend/src/pages/Settings/SerialSettings.jsx`
- `frontend/src/pages/Settings/GroupSettings.jsx`
- `frontend/src/pages/DataSettings.jsx`
- `frontend/src/components/CascadingParameterSelector.jsx`
- `frontend/src/components/ReportModal.jsx`
- `frontend/src/pages/BugReportPage.jsx`
- `frontend/src/pages/AdminOfficer/UsersPage.jsx`
- `frontend/src/pages/Login.jsx`

---

#### SP2.P3: Subphases Delivered

| Subphase | Task | Status |
|---|---|---|
| SP2.P3.1 | **`ToastContext.jsx` config map and engine**: `TOAST_VARIANTS` map, state management, cap of 3 with auto-eviction, timer cleanup, portal rendering | ✅ Complete |
| SP2.P3.2 | **`<ToastContainer>` renderer**: Portal to `document.body`, fixed bottom-right, z-index 1050, column flex stacking, mobile safe-area padding | ✅ Complete |
| SP2.P3.3 | **`<ToastCard>` sub-component**: Glassmorphic dark card, left accent stripe, outline Lucide icon, CSS progress bar, manual dismiss X button, word-wrap text, entrance/exit keyframe triggers | ✅ Complete |
| SP2.P3.4 | **`index.css` keyframes and variables**: `--toast-accent-success`, `--toast-accent-error`, `@keyframes toast-slide-in`, `toast-slide-out`, `toast-progress` | ✅ Complete |
| SP2.P3.5 | **`useToast.js` hook**: Lightweight hook returning `toast.success(msg, opts)` and `toast.error(msg, opts)` | ✅ Complete |
| SP2.P3.6 | **`main.jsx` integration**: `<ToastProvider>` wrapped around `<App />` | ✅ Complete |
| SP2.P3.7 | **Migration: `DispatcherPage.jsx`**: Replaced all `setSuccess`, `setTimeout`, `alert`, and banner JSX with `toast.*` | ✅ Complete |
| SP2.P3.8 | **Migration: `ReviewQueuePage.jsx`**: Replaced all `setSuccess`, `alert`, and fixed banner JSX with `toast.*` | ✅ Complete |
| SP2.P3.9 | **Migration: `AssistantsPage.jsx`**: Replaced `setError`, `setSuccess`, and banners with `toast.*` (15s duration on temporary passwords) | ✅ Complete |
| SP2.P3.10 | **Migration: `AdminDashboard.jsx`**: Replaced `setError`, `setSuccess`, manual X dismiss, and banners with `toast.*` (15s duration on temporary passwords) | ✅ Complete |
| SP2.P3.11 | **Migration: `AssistantDashboard.jsx`**: Replaced 5 `alert()` calls, draft/task `setSuccess`, and banner JSX with `toast.*` (retained multi-line `errorModalData` modal as intended) | ✅ Complete |
| SP2.P3.12 | **Migration: `JobsPage.jsx` (Admin Officer)**: Replaced 12 `alert()` calls with `toast.error()` and added success toasts for job save/hold/cancel | ✅ Complete |
| SP2.P3.13 | **Migration: `TransferManagement.jsx`, `SerialSettings.jsx`, `GroupSettings.jsx`, `DataSettings.jsx`**: Replaced dead success state, alerts, `statusModal`, and backup errors with `toast.*` | ✅ Complete |
| SP2.P3.14 | **Migration: `CascadingParameterSelector.jsx`, `ReportModal.jsx`, `BugReportPage.jsx`, `UsersPage.jsx`, `Login.jsx`**: Migrated all remaining alerts and feedback to `toast.*` | ✅ Complete |
| SP2.P3.15 | **Dead code sweep and build verification**: Verified 0 raw `alert()` calls, 0 `setSuccess` calls, and successful `npm run build` | ✅ Complete |
| SP2.P3.16 | **Mobile and layout safety**: Container constrained to `max-width: calc(100vw - 2rem)`, positioned cleanly at bottom-right with safe-area padding | ✅ Complete |

> ✅ Completed (commits `f7a5e72`, `02bf5e9`). Files created: `frontend/src/context/ToastContext.jsx`, `frontend/src/hooks/useToast.js`. Modified: `frontend/src/index.css`, `frontend/src/main.jsx`, `frontend/src/components/Header.jsx`, and all 15 target files across the codebase. Manual dismiss X button added; bottom-right placement configured with mobile safe-area padding; toast messages wrap cleanly. Zero raw alert() calls or local setSuccess state remaining. Clean production build verified.

---

### SP2.P4: F15: Global Modal Daemon ✅

**Goal**: Replace every scattered, inline modal implementation across the app with a single centrally-managed modal system. The daemon acts as the sole authority for rendering modals; any component anywhere fires one and forgets the layout concerns. The migration is also a quality pass: modals are clearer, more informative, and mobile-friendly.

**Design decisions locked (from /grill-me session):**
- **Implementation**: In-house modal engine via `ModalContext` + `useModal` hook + portal to `document.body`.
- **Modal types shipped**: `confirm`, `error`, `input`.
- **Confirm variants**: `default` (primary blue, Check icon), `danger` (red, Trash2 icon), and `warning` (orange, AlertTriangle icon).
- **Detail support**: Optional `detail` ReactNode rendered in a styled panel below the body (used for diff panels and summary lists).
- **Dismissal & keyboard**: Escape key closes all modals; Ctrl+Enter confirms; backdrop click closes `default`/`warning`/`input` modals, while destructive `danger` confirms require an explicit button click.
- **Queue engine**: Queue-based (`useCallback`, `useRef` for resolvers, 150ms next-modal delay) ensuring sequential modal display without overlap.
- **Mobile responsiveness**: Mobile-first touch targets (min 44px height), stacked buttons on small screens (`flex-direction: column-reverse`), scrollable cards up to 90vh.
- **Scope boundary**: Clean separation from SP2.P8 (no Axios interceptor error binding or contextual recovery actions in P4).

**Files created:**
- `frontend/src/context/ModalContext.jsx`
- `frontend/src/hooks/useModal.js`

**Files deleted:**
- `frontend/src/components/JobDetailsModal.jsx` (absorbed into daemon via `JobEssentialDetails`)

**Files modified:**
- `frontend/src/main.jsx` (wrapped with `<ModalProvider>`)
- `frontend/src/index.css` (modal overlay backdrop-filter, `.modal-card`, `.modal-card--wide`, animations, and mobile responsive rules)
- `frontend/src/pages/AdminDashboard.jsx` (staff deletion confirm standardized to Delete User modal with 44px tap targets)
- `frontend/src/pages/AdminOfficer/UsersPage.jsx` (migrated inline delete user confirm to modal daemon with 44px tap targets)
- `frontend/src/pages/Head/AssistantsPage.jsx` (migrated inline delete user confirm to modal daemon with 44px tap targets)
- `frontend/src/components/CascadingParameterSelector.jsx` (delete parameter from library confirm)
- `frontend/src/pages/Settings/GroupSettings.jsx` (delete group, subgroup, and parameter confirms)
- `frontend/src/components/ReportModal.jsx` (revert to auto-generated report confirm)
- `frontend/src/pages/Settings/SerialSettings.jsx` (confirm serial update)
- `frontend/src/pages/Head/TransferManagement.jsx` (hand over sample and confirm receipt)
- `frontend/src/pages/AssistantDashboard.jsx` (submit analysis confirm, delete method/unit, all 9 validation error modals)
- `frontend/src/pages/AdminOfficer/JobsPage.jsx` (clear draft confirm, cancel job confirm, hold job input modal, job create/save/update diff confirm with `<ParamDiffPanel>`)
- `frontend/src/pages/Head/DispatcherPage.jsx` (bulk dispatch confirm with detail summary, return to officer input modal across 3 trigger sites, full 3-section job details absorbed with wide modal card)

---

#### SP2.P4: Subphases Delivered

| Subphase | Task | Status |
|---|---|---|
| SP2.P4.1 | **`ModalContext.jsx` queue engine**: Queue state, promise resolution via `resolversRef`, sequential queue transitions, portal mounting to `document.body` | ✅ Complete |
| SP2.P4.2 | **`ModalContext.jsx` `<ConfirmModalView>`**: Card styling, variant accent borders (`default`, `danger`, `warning`), icon per variant, title, body, optional `detail` panel, Escape listener, safe backdrop dismiss logic | ✅ Complete |
| SP2.P4.3 | **`ModalContext.jsx` `<ErrorModalView>`**: Danger-styled card, `AlertTriangle` icon, title, pre-wrap multiline body, contextual dismiss button | ✅ Complete |
| SP2.P4.4 | **`ModalContext.jsx` `<InputModalView>`**: Single-line and multiline textarea support, required validation guard, Enter/Ctrl+Enter submission, Escape cancellation | ✅ Complete |
| SP2.P4.5 | **`index.css`**: `@keyframes modalSlideUp`, `.modal-overlay`, `.modal-card`, `.modal-detail-panel`, `.modal-input-field`, `.modal-footer`, mobile responsive overrides | ✅ Complete |
| SP2.P4.6 | **`useModal.js`**: Lightweight hook exporting `modal.confirm()`, `modal.error()`, `modal.input()`, and `modal.close()` | ✅ Complete |
| SP2.P4.7 | **`main.jsx`**: Wrapped `<App />` with `<ModalProvider>` inside `<ToastProvider>` | ✅ Complete |
| SP2.P4.8 | **Migrate `window.confirm` calls**: Replaced all 9 `window.confirm` calls across `AssistantDashboard`, `AdminDashboard`, `CascadingParameterSelector`, `GroupSettings`, and `ReportModal` | ✅ Complete |
| SP2.P4.9 | **Migrate inline confirm modals (simple)**: `AssistantDashboard` (Submit Analysis), `DispatcherPage` (bulk dispatch confirm), `JobsPage` (Hold Job, Cancel Job), `SerialSettings` (confirm serial update), `TransferManagement` (hand over, receive) | ✅ Complete |
| SP2.P4.10 | **Migrate inline confirm modal (complex)**: `JobsPage` job create/edit/save with pre-computed `hasParamChanges`, added/removed param lists, warning variant, and `<ParamDiffPanel>` as `detail` prop | ✅ Complete |
| SP2.P4.11 | **Migrate inline error modal**: `AssistantDashboard` `errorModalData` validation errors migrated to `modal.error()` | ✅ Complete |
| SP2.P4.12 | **Migrate inline input modal**: `DispatcherPage` Return to Officer note input modal (across 3 trigger sites) | ✅ Complete |
| SP2.P4.13 | **Absorb `JobDetailsModal.jsx`**: Replaced standalone modal component with daemon `<JobEssentialDetails>` detail view and removed deleted file | ✅ Complete |
| SP2.P4.14 | **Dead code sweep**: Verified 0 raw `window.confirm()` calls, 0 inline modal overlay JSX blocks in migrated files, 0 orphaned modal states | ✅ Complete |
| SP2.P4.15 | **Quality pass on modal copy**: Reviewed all modal titles, text copy, button labels, and placeholders across all migrated files | ✅ Complete |
| SP2.P4.16 | **Build verification & mobile safety**: Clean `npm run build` verified; touch targets >= 44px on mobile; zero em-dashes preserved | ✅ Complete |
| SP2.P4.17 | **User management inline delete migration**: Migrated inline "Sure? Yes / No" delete confirmations across `AdminOfficer/UsersPage.jsx`, `Head/AssistantsPage.jsx`, and `AdminDashboard.jsx` to `modal.confirm()` with danger variant and 44px tap targets | ✅ Complete |
| SP2.P4.18 | **Content-heavy modal support (`wide: true`)**: Added `.modal-card--wide` max-width 660px support in `ModalContext.jsx` and `index.css` for 3-section job details | ✅ Complete |

> ✅ Completed (commit `bfb34c8`). Files created: `frontend/src/context/ModalContext.jsx`, `frontend/src/hooks/useModal.js`. Deleted: `frontend/src/components/JobDetailsModal.jsx`. Modified: `frontend/src/main.jsx`, `frontend/src/index.css`, and 11 migrated component/page files across the codebase. Zero raw window.confirm(), alert(), or inline deletion confirmation patterns remaining. Clean production build verified.

---

### SP2.P5 — F13: Analyst Reassignment History Tracking ✅

**Files changed**: `frontend/src/components/AssignmentHistory.jsx` (created), `frontend/src/components/JobTimeline.jsx`, `frontend/src/components/GlobalJobHistory.jsx`, `frontend/src/components/JobLogTable.jsx`, `frontend/src/pages/Head/DispatcherPage.jsx`

**What was built**:

1. **`AssignmentHistory.jsx`** — new reusable accordion. Flattens `testInstances[*].reviewHistory` into a single chronological timeline per job. Optimised with `useMemo` and a `requestAnimationFrame` lazy-render guard (loading buffer before the list mounts). Dept badges for dual-dept jobs. Action labels: `Dispatched`, `Reassigned to [name]`, `Params merged in`, `Results approved for [name]`, `Results rejected for [name]`.

2. **`JobLogTable.jsx` + `DispatcherPage.jsx`** — integrated `<AssignmentHistory />` into desktop expand rows and mobile card expand views.

3. **`JobTimeline.jsx` — Step 3 "Test Execution" overhaul**:
   - Analyst list is live-filtered: only shows analysts whose instance is NOT `COMPLETED` (head-approved). Once approved, that analyst drops off.
   - `s3_status = 'completed'` only when **all** analysts are `COMPLETED`, not just submitted.
   - New intermediate desc: **"Results Under Review"** (blue clock) when all submitted but head review ongoing.
   - `s4_status` (Dept Head Review) stays grey/pending while `s3` is still active; no two consecutive steps shown active simultaneously.
   - Reassignment detail pill on `warning` state: `Who reassigned: [Head] · from A to B`.

4. **`GlobalJobHistory.jsx` — Reassignment events injected into the Job History Timeline**:
   - `REASSIGNED_TO_ANALYST` events synthesised from `testInstances`: each new instance (after the first per dept) = a new analyst assignment by the Head.
   - Trigger `by`/date derived from the previous sibling's REASSIGN entries predating the new instance's `createdAt`.
   - `REOPENED` and `CANCELLED` instances excluded to avoid false events.
   - `REASSIGN_MERGED` captured on all instances as "params merged back" events.

5. **Purpose labels** — subtitles on the AssignmentHistory toggle and the GlobalJobHistory modal header so users understand what each view tracks vs the other.

> ✅ **COMPLETE** (commit `e959c96`). All subphases delivered. No backend changes required.

---

### SP2.P6 — F2: Head Pages — Search, Filter & Sort

**Scope**: Dispatcher page + Review Queue page. Infrastructure also wired to Admin Officer Job Distributor, upcoming Head page, and Activity Logs (each in its own subphase).

**Bug fixed in this phase**: Review Queue was sorting jobs opposite to Dispatcher — inconsistency resolved by applying the same default sort (descending by `createdAt`) to both pages.

**Design decisions locked (from /grill-me session):**
- Single `<PageHeader>` component (`components/PageHeader.jsx`) driven by a per-page config prop
- Filter/sort state lives in `useListControls` custom hook (`hooks/useListControls.js`)
- Header is **sticky** (fixed while scrolling); editing any control scrolls user back to top
- Filter/sort panels: **inline dropdowns** (no modal); active filters shown as **dismissible chips** below the header (large enough to tap on mobile)
- Multiple active filters are **AND logic** (job must match all)
- **"Clear All"** button in header resets search + all filters + sort to defaults at once
- Result count shown in header whenever search or filter is active: `"Showing X of Y jobs"`
- Search: **live as-you-type** (debounced 300ms); single field matching all relevant fields simultaneously; uses Fuse.js (same pattern as CommandPalette)
- Search on Dispatcher fetches all jobs once (ignores cursor/infinite scroll); normal browsing keeps infinite scroll
- Search on Review Queue: operates on already-fully-loaded instances
- Sibling jobs (1489 / 1489-N): if one matches search or filter, **always pull in its sibling** too
- Sibling sort order: NABL job leads (`1489` before `1489-N`). Sort direction applies to the pair position in the list; within the pair, NABL always leads on ascending, -N leads on descending
- Default sort for both pages: `createdAt` descending (newest on top)
- Sort by job code: strip `-N` suffix to treat siblings as same root, then sort by numeric root
- Date filter: `createdAt` range (From / To date inputs); include/exclude toggle applies
- Transfer Management: collapsed into a **full-width accordion** placed directly below the header. Closed on page load. Toggle bar shows a red filled circle badge with pending transfer count on the right side
- Review Queue sibling grouping: strip dept+analyst suffix from `testCode` to get root job code, then group sibling roots consecutively

**Files to create:**
- `frontend/src/components/PageHeader.jsx`
- `frontend/src/hooks/useListControls.js`

**Files to modify:**
- `frontend/src/pages/Head/DispatcherPage.jsx`
- `frontend/src/pages/Head/ReviewQueuePage.jsx`
- `frontend/src/pages/Head/TransferManagement.jsx`

---

#### SP2.P6 — Subphases

| Subphase | Task |
|---|---|
| SP2.P6.1 | **Build `useListControls` hook**: accepts a config object `{ searchFields, sortOptions, filterDefs }`. Returns `{ searchQuery, setSearchQuery, sortKey, sortDir, toggleSortDir, setSortKey, activeFilters, setFilter, clearFilter, clearAll, processedItems }`. `processedItems` = filtered + sorted result derived via `useMemo` from the raw items array passed in |
| SP2.P6.2 | **Build `<PageHeader>` component**: accepts `{ config, controls, resultCount, totalCount }`. Renders: sticky card with search input (left), Sort button + Filter button (center-right), Clear All button, result count label. Sort and Filter buttons each open/close their own inline dropdown panel. Renders active filter chips row below if any filters are active |
| SP2.P6.3 | **Filter chip row**: each chip shows filter label + value + red × dismiss button. Chips are large enough for mobile tap (min 36px height). Sibling-aware: a sibling-pull chip appears when siblings are being force-included |
| SP2.P6.4 | **Sort panel (reusable)**: renders a list of sort key options as radio-style rows, each with an Asc/Desc toggle. Selecting a key switches to it; clicking the active key toggles direction. Closes on outside click |
| SP2.P6.5 | **Filter panel (reusable)**: renders filter fields from `filterDefs` config. Each filter def specifies type (`toggle`, `select`, `dateRange`). Each has an include/exclude toggle. Closes on outside click. Apply is live (no confirm button needed) |
| SP2.P6.6 | **Sibling resolution utility** (`utils/siblingUtils.js`): export `resolveSiblings(items, getSiblingId)` — given a filtered array, expands it to include sibling items from the full list if not already present |
| SP2.P6.7 | **Wire Dispatcher page — search**: integrate Fuse.js search on `jobs`. On search active, fetch all jobs from `/api/jobs?activeForHead=true` (no cursor) once and cache; search over full set. Clear search = return to cursor-based display |
| SP2.P6.8 | **Wire Dispatcher page — sort**: default `createdAt` desc. Sort by job code strips `-N` suffix, compares numeric root, with NABL leading within each pair. Sort operates on the loaded slice (not the full set) |
| SP2.P6.9 | **Wire Dispatcher page — filter**: implement four filter options: `Dispatch Locked` (toggle), `Pending Approval` (toggle), `Pending Other Dept Approval` (toggle), `Date Range` (From/To). Each with include/exclude. Apply to loaded slice |
| SP2.P6.10 | **Dispatcher: Transfer Management accordion**: wrap `<TransferManagement />` in a collapsible accordion bar. Bar is full-width, collapsed by default. Right side of bar shows a red circle badge with `incomingTransfers.length` count (only if > 0). Chevron animates on open/close |
| SP2.P6.11 | **Wire Review Queue — sort + bug fix**: apply default `createdAt` desc sort (fixes the inconsistency bug vs Dispatcher). Add sort options: job code (sibling-aware, same root logic) and date received. Ascending/descending toggle |
| SP2.P6.12 | **Wire Review Queue — filter**: analyst selector (populated from dept analysts already in state), date range. Each with include/exclude toggle |
| SP2.P6.13 | **Wire Review Queue — search**: Fuse.js over `instances`. Search fields: `testCode` (job code), `clientName`, and parameter names from `inst.results[*].name`. Sibling grouping: strip dept+analyst suffix from `testCode` to extract root job code; when a match is found, also include all instances sharing the same root |
| SP2.P6.14 | **Sticky header scroll behavior**: when any control in the header is interacted with (search/filter/sort change), call `window.scrollTo({ top: 0, behavior: 'smooth' })` so the user is brought back to the top of the results |
| SP2.P6.15 | **Admin Officer Job Distributor**: add `<PageHeader>` with same infrastructure. Config: sort (date, job code), filter (NABL type, date range, status), search (job code, client name, sample name). This is a separate subphase pass once the component is stable |
| SP2.P6.16 | **Activity Logs page**: add `<PageHeader>` with config appropriate to audit log fields. Separate subphase pass |
| SP2.P6.17 | **Mobile verification**: sticky header must not eat too much vertical space on small screens. Filter/sort dropdowns must not overflow viewport. Chips must wrap cleanly. Transfer accordion bar must be full-width and tappable |

> ✅ **COMPLETE** (commits `1009761`, `f94189b`). All infrastructure built and wired to Dispatcher and Review Queue pages. 
> - `useListControls` and `PageHeader` created with sticky scroll, live search, and dynamic filter/sort.
> - Sibling resolution implemented (`utils/siblingUtils.js`) for accurate job filtering.
> - Transfer Management converted into a full-width accordion on the Dispatcher page.
> - UI polished with delayed unmount animations to prevent height snapping on filter clear.
> - Mobile verification passed with clean chip wrapping and non-obstructive dropdowns.
> 
> *Note: Admin Officer Job Distributor (SP2.P6.15) and Activity Logs (SP2.P6.16) will receive the PageHeader as part of their respective dedicated phases.*
> 
> Files changed: `frontend/src/hooks/useListControls.js`, `frontend/src/components/PageHeader.jsx`, `frontend/src/utils/siblingUtils.js`, `frontend/src/pages/Head/DispatcherPage.jsx`, `frontend/src/pages/Head/ReviewQueuePage.jsx`, `frontend/src/pages/Head/TransferManagement.jsx`, `frontend/src/index.css`

---

### SP2.P7: F16: Hide Test Code Suffixes in UI ✅

**Scope**: Ensure clean job codes (`2609101742` for NABL, `2609101742-N` for Non-NABL) are displayed everywhere in the UI by stripping internal department and analyst suffixes (such as `-2a`, `-1b`, `-v2`) from `TestInstance.testCode`.

**What was done**:
1. **`ReviewQueuePage.jsx`**: Replaced incorrect `formatJobCode` import from `serialUtils` with `formatTestCode` from `codeUtils`, and rendered `formatTestCode(inst.testCode)` in the job list item header.
2. **`AssignmentHistory.jsx`**: Added `formatTestCode` and `formatMessageTestCodes` imports from `codeUtils`. Formatted `entry.testCode` via `formatTestCode(inst.testCode)` during history flattening, and wrapped `entry.note` with `formatMessageTestCodes(entry.note)` so embedded test code suffixes in reassignment notes are stripped before render.

> ✅ **COMPLETE** (commit `852196d`). Verified clean build with `npm run build`.
> Files changed: `frontend/src/pages/Head/ReviewQueuePage.jsx`, `frontend/src/components/AssignmentHistory.jsx`.

---

### SP2.P8: F18: Error Handling & Modal Overhaul ✅

**Files**:
- `backend/server.js`
- `backend/utils/errorHandler.js` (created)
- `backend/middlewares/requestLogger.js`
- `backend/__tests__/globalErrorHandler.test.js` (created)
- `frontend/src/context/ModalContext.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/utils/errorHandler.js` (created)
- `frontend/src/components/SystemErrorBridge.jsx` (created)
- `frontend/src/App.jsx`
- `frontend/src/index.css`

**Symptom**:
1. When gateway errors (502 Bad Gateway from Caddy or reverse proxy), service outages (503), timeouts (504), or network disconnections occur, Axios receives plain text or HTML responses. Because `err.response?.data?.message` is undefined, frontend catch blocks fall back to misleading messages (e.g. "Failed to save job") making users believe they made input errors when the server is unreachable.
2. In-place re-authentication for 401 token expiration has been established, but non-401 system failures (502, 503, 504, 500, network dropouts) lack structured recovery actions and technical diagnostics.
3. The Modal Daemon (`ModalContext.jsx`) `ErrorModalView` only supports a basic warning text and a generic "Go Back & Fix" button, lacking a simple "Retry" mechanism, expandable technical details, or copyable debug info for bug reports.
4. Backend Express has no global error handling middleware `(err, req, res, next)` to normalize uncaught exceptions or Mongoose validation/cast errors. Unhandled errors risk hanging or returning unformatted responses, and `SystemLog` does not record error stacks or request contexts for API errors.

**Fix**:
1. Build backend error normalization in `backend/utils/errorHandler.js` and mount an Express global error middleware in `backend/server.js`. Standardize all error responses to `{ success: false, message, error, code }`, handle Mongoose Validation/Cast errors and duplicate keys (code 11000) as clean 400 Bad Requests, and log full error stacks and request context to `SystemLog` (`logError('API_ERROR')`).
2. Overhaul `ErrorModalView` in `ModalContext.jsx` to support an actionable "Retry" button, an expandable "Technical Details" accordion (endpoint, method, status code, error text, timestamp), a "Copy Debug Info" button with clipboard feedback, and styled console logging.
3. Add a global Axios system error interceptor in `frontend/src/utils/errorHandler.js` bridging through `<SystemErrorBridge />` in `App.jsx`. It catches 502, 503, 504, 500, and Network errors, triggers the Error Modal with a direct "Retry" callback, and tags `error.handled = true`.
4. Provide a shared `handleApiError(err, fallbackMessage, toast)` helper to suppress duplicate toasts when an error has already been handled by the modal daemon.

| Subphase | Task | Status |
|---|---|---|
| SP2.P8.1 | **Backend - error normalizer & middleware**: Create `backend/utils/errorHandler.js` with `normalizeError(err)`. Mount global Express error middleware in `backend/server.js` catching unhandled errors, formatting `{ success: false, message, error, code }`, logging 5xx to `SystemLog`, and handling unknown `/api/*` 404s | ✅ Complete |
| SP2.P8.2 | **Backend - unit tests**: Create `backend/__tests__/globalErrorHandler.test.js` validating Mongoose ValidationError, CastError, duplicate key 11000, 500 unhandled exceptions, and `SystemLog` persistence | ✅ Complete |
| SP2.P8.3 | **Frontend - Modal Daemon Error view overhaul**: In `ModalContext.jsx`, upgrade `ErrorModalView` to support `retryAction` ("Retry" button), `debugInfo` object, collapsible Technical Details drawer, and "Copy Debug Info" clipboard button. Add styles in `index.css` | ✅ Complete |
| SP2.P8.4 | **Frontend - Global Axios error interceptor & bridge**: In `frontend/src/utils/errorHandler.js`, intercept 502/503/504/500/Network errors, format plain-language explanations, wire the "Retry" button to re-invoke the failed request, output styled `console.error` table, and tag `err.handled = true`. Mount `<SystemErrorBridge />` in `App.jsx` | ✅ Complete |
| SP2.P8.5 | **Frontend - local toast coordination helper**: In `frontend/src/utils/errorHandler.js`, export `handleApiError` to prevent duplicate red toasts when errors are handled by modal; wire into form submission handlers | ✅ Complete |
| SP2.P8.6 | **Testing & Verification**: Run all backend test suites (`npm test`), verify clean frontend build (`npm run build`), test 502 simulation with retry and copy debug info | ✅ Complete |

> ✅ Completed (commit `SP-2 P8`). Files created: `backend/utils/errorHandler.js`, `backend/__tests__/globalErrorHandler.test.js`, `frontend/src/utils/errorHandler.js`, `frontend/src/components/SystemErrorBridge.jsx`. Files modified: `backend/server.js`, `backend/middlewares/requestLogger.js`, `frontend/src/context/ModalContext.jsx`, `frontend/src/App.jsx`, `frontend/src/index.css`, `frontend/src/pages/AdminOfficer/JobsPage.jsx`, `frontend/src/pages/Head/DispatcherPage.jsx`, `frontend/src/pages/Head/ReviewQueuePage.jsx`, `frontend/src/pages/AssistantDashboard.jsx`. All 10 backend test suites (78/78 tests) pass, frontend build clean.

---

### SP2.P9: F19: Head Monitor Tab V1: Cancel, Reassign & Live Progress ✅


**What it is:** A new **Monitor** tab on the Head dashboard that covers the intermediate state between Dispatch and Review. Once a job is dispatched, it lives here until the analyst submits it for review.

**Workflow position:**
```
Dispatch ──→ Monitor ──→ Review ─→ Done
            ↑____________|
       (cancel → re-dispatch)
```

**Actions available on each Monitor card:**
- **Cancel / Withdraw**: pulls the job back to the Dispatch queue. No re-approval needed. Head re-dispatches directly to any analyst.
- **Reassign**: swaps the entire job mid-flight to a different analyst. No cancel required.

**Data behaviour on Cancel or Reassign:**
- All of the previous analyst's saved results carry over to the new assignment.
- `isSaved` is reset to `false` on every carried-over param.
- The new analyst sees pre-filled values but **cannot submit** until they have explicitly re-saved every param (Submit button stays locked).
- The `TestInstance` is updated in-place: `assignedTo` changes, `results` carry over with `isSaved: false`, a `MONITOR_REASSIGN` or `MONITOR_CANCEL_REDISPATCH` entry is added to `reviewHistory`.
- A socket event removes the task from the old analyst's dashboard and delivers it to the new one.

**Progress view (per-param ticks):**
- Each Monitor card shows a per-param indicator: 🟢 saved / ⚪ not yet saved.
- Updates in real-time via socket whenever the analyst saves a param (`PARAM_SAVED` event).
- Head does NOT see the actual values, only completion status per param.

| Subphase | Task | Status |
|---|---|---|
| SP2.P9.1 | **Backend - fetch route**: `GET /api/jobs/monitoring` (Head-scoped): returns all jobs with active in-flight instances for the head's department, populated with `TestInstance` data | ✅ Complete |
| SP2.P9.2 | **Backend - cancel route**: `POST /api/jobs/:id/monitor-withdraw`: resets job to dispatch queue, marks instances `CANCELLED`, preserves saved results data, emits `job:monitor-withdrawn` | ✅ Complete |
| SP2.P9.3 | **Backend - reassign route**: `PUT /api/jobs/:id/monitor-reassign` with target analyst: updates `assignedTo`, resets `isSaved` to `false`, appends `reviewHistory`, emits socket event | ✅ Complete |
| SP2.P9.4 | **Frontend - Monitor tab**: Add "Job Monitor" tab to Head dashboard between Review Queue and Dispatcher. Route `/head/monitor` | ✅ Complete |
| SP2.P9.5 | **Frontend - Monitor card**: Job code, client name, analysts, deadline, and live progress pill | ✅ Complete |
| SP2.P9.6 | **Frontend - Cancel action**: Confirmation modal with warning; withdraws dispatch and returns job to Dispatcher | ✅ Complete |
| SP2.P9.7 | **Frontend - Reassign action**: Inline analyst picker per job; confirms and reassigns in-flight task | ✅ Complete |
| SP2.P9.8 | **Socket - analyst side**: Remove cancelled task card from old analyst; inject carried-over locked task on new analyst | ✅ Complete |
| SP2.P9.9 | **Socket - head side**: Listen for `PARAM_SAVED` and live update progress ticks and counts in real-time | ✅ Complete |
| SP2.P9.10 | **Analyst - pre-filled lock**: On reassigned/re-dispatched task, pre-fill carried-over results with `isSaved: false`, locking Submit until re-saved | ✅ Complete |
| SP2.P9.11 | Verify on mobile: Monitor cards scroll cleanly, progress ticks readable, modals fit viewports | ✅ Complete |

---

### SP2.P10: F20: Head Monitor Tab V2: Param Split/Merge & Progress Snapshot ✅

**What it adds on top of V1:** Advanced job manipulation from within the Monitor tab.

**Features:**
- **Param split**: Head moves specific params from analyst A's instance to analyst B (who already has an active instance). Instead of reassigning the whole job, only selected params migrate. Directly prevents duplicate-instance bugs.
- **Param merge**: If two analysts both have instances for the same job, head can consolidate params from one into the other.
- **Progress snapshot**: On card expand, show a param-by-param breakdown including: param name, analyst assigned, save status, and method used, but NOT result values.

**Data behaviour (same rules as V1):**
- Moved params carry over with `isSaved: false` on the receiving analyst's instance.
- Receiving analyst must re-save moved params before submitting.
- Source analyst's instance: moved params are cleared to prevent bleed-through.

| Subphase | Task | Status |
|---|---|---|
| SP2.P10.1 | **Backend - split route**: `PUT /api/jobs/:id/monitor-split` with `{ sourceAnalystId, targetAnalystId, parameterIds }`: moves params, merges into existing target instance or creates one, cancels source if empty | ✅ Complete |
| SP2.P10.2 | **Frontend - split UI**: In Monitor card expand view, checkboxes per param, "Select All", and target analyst dropdown with "Move to Analyst" button | ✅ Complete |
| SP2.P10.3 | **Frontend - progress snapshot**: Expanded card view shows param-level breakdown: param name, unit, assigned analyst, save status, and test method. Result values hidden from Head | ✅ Complete |
| SP2.P10.4 | **Socket**: Emit `instance:params-split`: updates analyst tasks and head monitor in real-time | ✅ Complete |
| SP2.P10.5 | Test: split 1 param to an analyst with an active instance: verify merged without duplicate instances | ✅ Complete |
| SP2.P10.6 | Test: split to an analyst with no existing instance: verify new instance created | ✅ Complete |
| SP2.P10.7 | Verify progress snapshot shows correct per-param data after a split | ✅ Complete |

> ✅ **Completed (SP-2 P9 & P10 unified implementation and post-P10 touch-ups)**.
> - **Files Created**: `frontend/src/pages/Head/MonitorPage.jsx`, `backend/__tests__/headMonitor.test.js`.
> - **Files Modified**: `backend/models/TestInstance.js`, `backend/routes/jobs/jobListRoutes.js`, `backend/routes/jobs/jobWorkflowRoutes.js`, `backend/routes/tests/testAssignmentRoutes.js`, `backend/routes/tests/testResultRoutes.js`, `frontend/src/components/Sidebar.jsx`, `frontend/src/pages/HeadDashboard.jsx`, `frontend/src/pages/AssistantDashboard.jsx`, `frontend/src/pages/Head/DispatcherPage.jsx`, `frontend/src/pages/Head/TransferManagement.jsx`, `frontend/src/pages/Head/ReviewQueuePage.jsx`, `frontend/src/utils/cacheStorage.js`, `frontend/src/components/Spinner.jsx`, `frontend/src/index.css`.
> - **Post-P10 Refinements**:
>   - Replaced button text labels during active submissions with centered inline buffers (`<Spinner size="sm" color="#fff" />`) and double-click guards across Dispatcher, Monitor, Review Queue, and Transfer Management.
>   - Optimized `cacheStorage.js` so large working queues (`aiper_jobs_monitoring`, `aiper_jobs_head_active`, `aiper_instances`) reside exclusively in `IndexedDB`, preventing `sessionStorage` 5MB quota exhaustion and eliminating synchronous parse delays on page reload.
>   - Added immediate local state transition on HTTP 200 before background refetch to avoid button buffer reversion.
> - **Test Suite Status**: All 11 backend test suites (91/91 tests) pass; clean Vite production build; all 15 Playwright e2e tests pass.

---

### SP2.P12: B12 - 1+ Samples Multi-Department Handover Bypass

**Files**:
- `backend/routes/jobs/jobCrudRoutes.js`
- `backend/routes/jobs/jobWorkflowRoutes.js`
- `backend/routes/sampleTransferRoutes.js`
- `frontend/src/pages/Head/DispatcherPage.jsx`
- `frontend/src/components/JobTimeline.jsx`

**Symptom**: When a client provides 2 or more physical containers (`sample.sample_count > 1`, e.g. Job `2610011828` with 5 packets), Microbiology and Chemical receive physical samples at intake and can test concurrently from day 1. However, the system currently evaluates handover requirements purely via `isMultiDept = micro.required && chemical.required`, completely ignoring `sample_count`. This forces an artificial sequential handover (`sampleTransferState: PENDING_APPROVAL -> PENDING_TRANSFER -> IN_TRANSIT -> ACCEPTED`), locking Chemical out of dispatching for days until Micro completes testing and confirms transfer.

**Fix**: Introduce a centralized helper `isSampleHandoverRequired(job)` returning `true` only when `micro.required && chemical.required && (sample.sample_count <= 1)`. When `sample.sample_count > 1`, set `sampleTransferState: 'NOT_REQUIRED'`, bypass outgoing/incoming transfer queues, unlock Chemical dispatch immediately upon joint review approval, and render parallel pipeline tracks in the timeline without an intermediate transfer connector.

| Subphase | Task | Status |
|---|---|---|
| SP2.P12.1 | **Backend - helper**: Create `isSampleHandoverRequired(job)` utility function checking multi-department requirement AND `(job.sample?.sample_count <= 1 || !job.sample?.sample_count)` | ✅ Complete |
| SP2.P12.2 | **Backend - jobCrudRoutes**: In `POST /api/jobs` and `PUT /api/jobs/:id`, use `isSampleHandoverRequired` to set `sampleTransferState` to `'NOT_REQUIRED'` when `sample_count > 1` | ✅ Complete |
| SP2.P12.3 | **Backend - jobWorkflowRoutes**: In `PUT /:id/approve-review`, if `!isSampleHandoverRequired(job)`, transition `sampleTransferState` to `'NOT_REQUIRED'` upon joint review approval, immediately enabling Chemical dispatch | ✅ Complete |
| SP2.P12.4 | **Backend - sampleTransferRoutes**: In `GET /outgoing` and `GET /incoming`, exclude jobs where `sample.sample_count > 1` so they never appear in transfer queues | ✅ Complete |
| SP2.P12.5 | **Frontend - DispatcherPage**: Update `canChemicalDispatch` logic to allow dispatch if `job.sample?.sample_count > 1` or `sampleTransferState === 'NOT_REQUIRED'`; hide the sample transfer warning banner when `sample_count > 1` | ✅ Complete |
| SP2.P12.6 | **Frontend - JobTimeline**: Render parallel department tracks without an intermediate sample transfer connector box when `sample.sample_count > 1` | ✅ Complete |
| SP2.P12.7 | **Testing**: Verify with multi-department job having `sample_count = 2`: confirm no transfer in queues, Chemical can dispatch immediately on review approval, and timeline displays clean parallel tracks | ✅ Complete |

> ✅ Completed (commit `SP-2 P12`). Files created: `backend/utils/sampleUtils.js`, `backend/__tests__/sampleHandover.test.js`. Files modified: `backend/routes/jobs/jobCrudRoutes.js`, `backend/routes/jobs/jobWorkflowRoutes.js`, `backend/routes/sampleTransferRoutes.js`, `frontend/src/pages/Head/DispatcherPage.jsx`, `frontend/src/components/JobTimeline.jsx`. Unit tests verified clean pass.

---

### SP2.P13: B13 - Staged Parameter Amendments & Multi-Analyst Duplication Fix

**Files**:
- `backend/models/Job.js`
- `backend/models/TestInstance.js`
- `backend/utils/parameterDelta.js`
- `backend/utils/ulrService.js`
- `backend/routes/jobs/jobCrudRoutes.js`
- `backend/routes/jobs/jobWorkflowRoutes.js`
- `backend/routes/jobs/jobListRoutes.js`
- `backend/routes/tests/testResultRoutes.js`
- `backend/routes/exportRoutes.js`
- `backend/__tests__/paramAmendments.test.js`
- `frontend/src/pages/Head/DispatcherPage.jsx`
- `frontend/src/components/JobLogTable.jsx`
- `frontend/src/pages/AdminOfficer/JobsPage.jsx`

**Symptom**: When an Admin Officer edits an active dispatched job and adds parameters, `applyAdditions` pushes the new parameters into every active `TestInstance` belonging to that department. Multiple analysts receive identical parameters, and completed tests are rolled back to `PENDING`. Furthermore, Department Heads have no approval or assignment control over the new parameters.

**Fix**: Introduce a staged container on the Job schema (`pendingParamAmendments`). New parameters on dispatched jobs do not touch active `TestInstance` records. The Head receives a dedicated Dispatcher card to Approve & Assign (to an existing or new analyst) or Reject with a reason. Upon rejection, the Admin Officer's job row highlights in red with a `[Params Rejected]` badge, and the rejected parameters pre-fill the form (zero re-typing). A 3-layer completion safety guard ensures the job cannot be marked completed, assigned a ULR, or exported until amendments are fully resolved. If parameter removal empties an analyst instance, the instance is cleanly marked `CANCELLED`. Approving an amendment for a previously completed department resets department status to `ASSIGNED_TO_ASSISTANT`.

| Subphase | Task | Status |
|---|---|---|
| SP2.P13.1 | **Backend - schema**: Add `pendingParamAmendments` schema definition to `Job.js` with statuses `NONE`, `PENDING_HEAD_REVIEW`, `REJECTED` | ✅ Complete |
| SP2.P13.2 | **Backend - jobCrudRoutes**: In `PUT /api/jobs/:id`, stage added parameters into `pendingParamAmendments` instead of calling `applyAdditions`; notify Head | ✅ Complete |
| SP2.P13.3 | **Backend - jobWorkflowRoutes**: Create `POST /api/jobs/:id/approve-amendment` (assigns params to analysts, merges to `job.parameters`, clears staging) and `POST /api/jobs/:id/reject-amendment` (stores rejection reason, notifies officer) | ✅ Complete |
| SP2.P13.4 | **Backend - safety guards**: In `testResultRoutes.js` (completion check), `ulrService.js` (`isJobFullyTested`), and `exportRoutes.js` (report export), block finalization while `pendingParamAmendments.status !== 'NONE'` | ✅ Complete |
| SP2.P13.5 | **Frontend - DispatcherPage**: Display dedicated "Parameter Amendment Awaiting Review" card with Approve & Assign dropdowns, bulk assignment, and Reject modal matching standard dispatcher card styling | ✅ Complete |
| SP2.P13.6 | **Frontend - JobLogTable**: When `pendingParamAmendments.status === 'REJECTED'`, render solid red left accent bar, red `[Params Rejected]` badge, and highlighted red Edit button | ✅ Complete |
| SP2.P13.7 | **Frontend - JobsPage**: On editing a rejected job, show red alert banner with Head's reason, pre-fill rejected parameters in selector (zero re-typing), and provide "Discard Rejected Parameters" action | ✅ Complete |
| SP2.P13.8 | **Backend - empty instance cancellation**: In `backend/utils/parameterDelta.js`, if parameter removal by Admin Officer strips all parameters from an analyst instance, mark instance `CANCELLED` so it does not block job completion | ✅ Complete |
| SP2.P13.9 | **Backend - department status reactivation**: In `backend/routes/jobs/jobWorkflowRoutes.js`, when staged parameters are approved and assigned for a department previously marked `COMPLETED`, reset department distribution status to `ASSIGNED_TO_ASSISTANT` | ✅ Complete |
| SP2.P13.10 | **Testing**: Verify full lifecycle: edit dispatched job -> Head rejects -> red alert appears on officer row -> officer opens form with pre-filled params -> completion guard blocks report -> officer discards -> guard releases and job completes | ✅ Complete |

> ✅ Completed (commit `98cd4c5`). Files created: `backend/__tests__/paramAmendments.test.js`. Files modified: `backend/models/Job.js`, `backend/models/TestInstance.js`, `backend/routes/jobs/jobCrudRoutes.js`, `backend/routes/jobs/jobWorkflowRoutes.js`, `backend/routes/jobs/jobListRoutes.js`, `backend/routes/tests/testResultRoutes.js`, `backend/utils/parameterDelta.js`, `backend/utils/ulrService.js`, `backend/routes/exportRoutes.js`, `frontend/src/pages/Head/DispatcherPage.jsx`, `frontend/src/components/JobLogTable.jsx`, `frontend/src/pages/AdminOfficer/JobsPage.jsx`. All test suites verified passing and frontend build clean.

---

### SP2.P14: B14 - Duplicate Parameter Guard & Whitespace Trim Fix

**Files**:
- `backend/utils/parameterUtils.js`
- `backend/routes/parameterRoutes.js`
- `backend/routes/dataSettingsRoutes.js`
- `backend/__tests__/duplicateParamGuard.test.js`
- `frontend/src/components/CascadingParameterSelector.jsx`
- `frontend/src/pages/Settings/GroupSettings.jsx`

**Symptom**:
When adding or updating a parameter in Data Settings or in the Job Creation Form:
1. If the user enters a parameter name with leading or trailing whitespace (e.g. `" Moisture"` or `"Moisture "`), regex checks without prior trimming failed to match existing trimmed records.
2. The check passes, but `Parameter.create({ name: name.trim(), ... })` triggers a MongoDB `E11000 duplicate key error`.
3. Catch blocks failed to recognize code 11000 as a duplicate collision and returned a `500 Server Error` instead of a clean 400 `"already exists"` message.
4. Internal whitespace variations (such as `"0.1%"` vs `"0.1 %"`, `"Arsenic(as As)"` vs `"Arsenic (as As)"`, or `"Test   for   Starch"` vs `"Test for Starch"`) bypassed exact string matching, permitting duplicate parameter creation.
5. Parameter suggestion search failed to locate existing parameters with different internal spacing (e.g. searching `"0.1%"` did not show `"0.1 %"`).
6. Neither `CascadingParameterSelector.jsx` nor `GroupSettings.jsx` performed a client-side check against loaded parameters before dispatching an HTTP POST request.
7. In `CascadingParameterSelector.jsx`, unit was not validated prior to submission, despite being required by the backend.

**Fix**:
Implement deep whitespace normalization across the parameter lifecycle:
1. Centralize normalization in `backend/utils/parameterUtils.js` with `buildFlexibleParamRegex` (generating character-level optional whitespace regex) and `normalizeParamName` (stripping all whitespace and lowercasing).
2. Use `buildFlexibleParamRegex` in `parameterRoutes.js` (`POST`, `PUT`, `GET` search ranking) and `dataSettingsRoutes.js` to catch spacing variations across characters and symbols.
3. Catch MongoDB duplicate key error 11000 on creation and updates, returning a descriptive 400 Bad Request error.
4. Add client-side duplicate verification against the local `globalParameters` library before firing API calls in `CascadingParameterSelector` and `GroupSettings`; auto-select existing parameter on collision and report the existing name.
5. Upgrade suggestion dropdown search and settings filter to match across internal whitespace differences.
6. Enforce non-empty unit validation before submission.

| Subphase | Task | Status |
|---|---|---|
| SP2.P14.1 | **Backend - flexible regex & trimming**: In `backend/utils/parameterUtils.js`, create `buildFlexibleParamRegex` and `normalizeParamName`. In `parameterRoutes.js` and `dataSettingsRoutes.js`, trim inputs and construct whitespace-flexible regex to detect spacing variations (e.g. `"0.1%"` vs `"0.1 %"`, `"E.coli"` vs `"E. coli"`) | ✅ Complete |
| SP2.P14.2 | **Backend - Mongo 11000 duplicate key error trap**: In error catch blocks for parameter creation and update, catch `err.code === 11000` and respond with `400 Bad Request` and `message: 'Parameter "${trimmedName}" already exists in the library'` | ✅ Complete |
| SP2.P14.3 | **Frontend - CascadingParameterSelector client guard & suggestions**: In `handleCreateParameter`, normalize whitespace via `normalizeParamName` against `globalParameters`. If found, show toast error naming the existing parameter, automatically select the existing parameter, and close creator. In suggestions filter, match across internal whitespace | ✅ Complete |
| SP2.P14.4 | **Frontend - CascadingParameterSelector unit validation**: Add validation for `unit.trim()` before calling the API | ✅ Complete |
| SP2.P14.5 | **Frontend - GroupSettings client guard & rename protection**: In `handleAddGlobalParameter` and `handleUpdateGlobalParameter`, normalize whitespace against `globalParameters` to block duplicate creation and collisions on rename; update search filter | ✅ Complete |
| SP2.P14.6 | **Testing**: Verify adding duplicate parameters with exact case, different case, leading/trailing spaces, internal whitespace variations (`"0.1%"` vs `"0.1 %"`), symbol spacing (`"Arsenic(as As)"` vs `"Arsenic (as As)"`), and empty units; test suite `duplicateParamGuard.test.js` passing 11/11 tests, all 7 backend suites passing 54/54 tests, frontend build clean | ✅ Complete |

> ✅ Completed (commit `7388df3`). Files created: `backend/utils/parameterUtils.js`, `backend/__tests__/duplicateParamGuard.test.js`. Files modified: `backend/routes/parameterRoutes.js`, `backend/routes/dataSettingsRoutes.js`, `frontend/src/components/CascadingParameterSelector.jsx`, `frontend/src/pages/Settings/GroupSettings.jsx`. All 7 test suites (54/54 tests) pass, frontend build clean.

---

### SP2.P15: C8 - Parameter Schema Cleanup: Remove Deadweight Group & Subgroup Fields

**Files**:
- `backend/models/Parameter.js`
- `backend/routes/dataSettingsRoutes.js`
- `backend/routes/parameterRoutes.js`
- `backend/routes/parameterGroupRoutes.js`
- `temp/drop_parameter_group_fields.js` (migration script)

**Symptom**:
`backend/models/Parameter.js` defines `group: { type: String, default: null }` and `subGroup: { type: String, default: null }`. Parameters in a testing laboratory are global entities (e.g. "Moisture", "Ash", "Lead") and are never bound to a single group or subgroup. Group and subgroup mappings are maintained exclusively by `ParameterGroup` documents through parameter references (`parameters: [{ parameterId, name, type, unit }]`). Having `group` and `subGroup` on `Parameter` documents represents dead-weight schema clutter, causes inconsistent data when parameters belong to multiple groups, and triggers redundant cascading updates during group renames.

**Fix**:
Remove `group` and `subGroup` fields from `Parameter.js`; eliminate dead-weight cascading updates to `Parameter` on group/subgroup renames in `dataSettingsRoutes.js`; remove `group` and `subGroup` from parameter creation routes; and execute a database migration script via `$unset: { group: "", subGroup: "" }` to strip both fields from all parameter records in both `local_db` and `prod_db`.

| Subphase | Task | Status |
|---|---|---|
| SP2.P15.1 | **Backend - model cleanup**: Remove `group` and `subGroup` field definitions from `backend/models/Parameter.js` | ✅ Complete |
| SP2.P15.2 | **Backend - dataSettingsRoutes cleanup**: In `dataSettingsRoutes.js`, remove all dead-weight cascading updates to `Parameter` on group rename and subgroup rename; replace parameter-based incomplete job checks with direct `groupMetadata` checks; remove `group` and `subGroup` from `Parameter.create()` in `POST /subgroups/:id/parameters` | ✅ Complete |
| SP2.P15.3 | **Backend - parameterRoutes / parameterGroupRoutes verification**: Verify that parameter endpoints and population logic do not query or rely on `Parameter.group` or `Parameter.subGroup` | ✅ Complete |
| SP2.P15.4 | **Database Migration Script**: Create a migration script in `temp/drop_parameter_group_fields.js` using MongoDB `$unset: { group: "", subGroup: "" }` on the `parameters` collection. Test against `local_db` and prepare for `prod_db` | ✅ Complete |
| SP2.P15.5 | **Testing**: Verify parameter creation, search, group management, and job creation to ensure no regressions after dropping `group` and `subGroup`; test suite `parameterSchemaCleanup.test.js` passing 8/8 tests, all 8 backend suites passing 62/62 tests, frontend build clean | ✅ Complete |

> ✅ Completed. Files created: `temp/drop_parameter_group_fields.js`, `backend/__tests__/parameterSchemaCleanup.test.js`. Files modified: `backend/models/Parameter.js`, `backend/routes/dataSettingsRoutes.js`. All 8 backend test suites (62/62 tests) pass, frontend build clean.

---

### SP2.P16: F23 - Dynamic Modal Engine (modal.custom)

**Files**:
- `frontend/src/context/ModalContext.jsx`
- `frontend/src/hooks/useModal.js`
- `frontend/src/index.css`
- `frontend/src/components/GlobalJobHistory.jsx`
- `frontend/src/components/JobLogTable.jsx`
- `frontend/src/components/ProfileUpdateModal.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/CascadingParameterSelector.jsx`
- `frontend/src/pages/Settings/GroupSettings.jsx`
- `frontend/src/components/SystemErrorBridge.jsx`
- `frontend/e2e/modal-custom.spec.js`

**Background & Goal**:
The current `ModalContext` implementation supports fixed views: `confirm`, `error`, and `input`. While this covers standard alerts and confirmations, complex workflows (e.g. custom multi-field forms, batch assignment pickers, profile updates, quick settings) require dedicated portals or bespoke modal state management. Extending `ModalContext` with `modal.custom` allows mounting arbitrary React components or render functions inside the managed daemon queue. Callers gain zero-portal boilerplate, queue synchronization, backdrop management, ESC key handling, and promise-based resolution (`const data = await modal.custom(...)`).

**Design Specification**:
1. **API Exposure**:
   Add `modal.custom(options)` in `useModal.js` mapping to `openModal("custom", options)`.
2. **Options Supported**:
   - `title`: Header string or ReactNode.
   - `icon`: Optional custom Lucide icon or element.
   - `wide`: Boolean flag to expand width (`.modal-card--wide`) or custom `maxWidth`.
   - `content`: Render function `({ resolve, close }) => ReactNode` or static ReactNode.
   - `showClose`: Boolean (default `true`) rendering a top-right `X` dismiss button.
   - `dismissOnBackdrop`: Boolean (default `true`) allowing backdrop dismissal.
   - `dismissOnEsc`: Boolean (default `true`) allowing Escape key dismissal.
   - `className`: Optional extra class name for `.modal-card`.
   - `footer`: Optional custom footer render function `({ resolve, close }) => ReactNode` or static ReactNode.
3. **Queue & Keyboard Integration**:
   - Sequential modal queue handles custom modals without stacking backdrops.
   - Escape key dismisses custom modals by default (resolving with `null` or `false`).
   - Backdrop click dismisses custom modals when enabled.

| Subphase | Task | Status |
|---|---|---|
| SP2.P16.1 | **Hook extension**: In `frontend/src/hooks/useModal.js`, expose `custom: (opts = {}) => openModal("custom", opts)` | ✅ Complete |
| SP2.P16.2 | **Custom view component**: In `frontend/src/context/ModalContext.jsx`, create `<CustomModalView modal={modal} onResolve={onResolve} />` supporting title, custom icon, top-right close `X`, and render function content `({ resolve, close })` | ✅ Complete |
| SP2.P16.3 | **Portal dispatch & event handling**: Wire `currentModal.type === "custom"` into `ModalPortal`, connecting backdrop click (`dismissOnBackdrop !== false`) and ESC keyboard dismissal (`dismissOnEsc !== false`) to resolve with `null` | ✅ Complete |
| SP2.P16.4 | **Styling support**: In `frontend/src/index.css`, ensure header layout accommodates custom icons, titles, and top-right close buttons cleanly with responsive wrapping | ✅ Complete |
| SP2.P16.5 | **Testing & Verification**: Verify `modal.custom` with sample dialogs, validating promise resolution with returned data, cancellation via ESC and backdrop, and clean transition in the modal queue | ✅ Complete |

> ✅ Completed (commit `SP-2 P16`). Files created: `frontend/e2e/modal-custom.spec.js`. Files modified: `frontend/src/context/ModalContext.jsx`, `frontend/src/hooks/useModal.js`, `frontend/src/index.css`, `frontend/src/components/GlobalJobHistory.jsx`, `frontend/src/components/JobLogTable.jsx`, `frontend/src/components/ProfileUpdateModal.jsx`, `frontend/src/components/Header.jsx`, `frontend/src/components/CascadingParameterSelector.jsx`, `frontend/src/pages/Settings/GroupSettings.jsx`, `frontend/src/components/SystemErrorBridge.jsx`. All 5 modal-custom and 14 core frontend Playwright tests pass; all 11 backend test suites (91/91 tests) pass; frontend production build clean.

---

## SP3: UX Polish + Infrastructure (Ongoing)
| Phase | ID | Title | Status |
|---|---|---|---|
| SP3.P1 | B4 | Analyst Task Modal Visibility (Narrow) | ✅ Done |
| SP3.P2 | B7 | Cancellation Modal Sentence Rework | ✅ Done |
| SP3.P3 | **B8** | **Retest Route Auth Typo (Prod Blocker)** | ✅ Done |
| SP3.P4 | **B9** | **Job Edit Wipes Parameters on Completed-Chemical Jobs** | ✅ Done |
| SP3.P5 | **B10** | **Selective Reassign Creates Duplicate TestInstance** | ✅ Done |
| SP3.P6 | C2 | Clean Up `/temp` | ✅ Done |
| SP3.P7 | C3 | HTTP Compression Middleware | ✅ Done |
| SP3.P8 | C4 | MongoDB Connection Pool Tuning | ✅ Done |
| SP3.P9 | C5 | Scope 50mb JSON Body Limit | ✅ Done |
| SP3.P10 | C6 | Socket.IO Auth Scope | ✅ Done |
| SP3.P11 | F7 | Dashboard History Revamp | ✅ Done |
| SP3.P12 | F3 | Transfer List Rework (Dispatcher Sample Transfers) | ✅ Done |
| SP3.P13 | F6 | Job Grouping in Officer's Page | ✅ Done |
| SP3.P14 | F22 | Analyst Selection UI Overhaul (Dispatcher) | ✅ Done |
| SP3.P15 | F2-ext | PageHeader Integration: Admin Officer Job Distributor + Activity Logs | ✅ Done |
| SP3.P16 | B11 | History & Timeline Display Overhaul | ⬜ Upcoming |
| SP3.P17 | **B15** | **Unauthenticated Codebase Exposure & Missing Wildcard Route Guard** | ⬜ Upcoming |

---

### SP3.P3 — B8: Retest Route Auth Typo (Prod Blocker)

**File**: `backend/routes/jobs/jobWorkflowRoutes.js` (lines 160, 165)

**Affected roles**: ADMIN_OFFICER (completely blocked from creating retest jobs)

**Symptom (Image 1)**: Officer opens a returned job, fills in the retest form, clicks submit. A browser `alert()` fires: `"Error saving job: User role ADMIN_OFFICER is not authorized to access this route"`. The button shows `Processing...` and never resolves. This is NOT a token/session expiry issue — the token is valid, the role check itself is wrong.

**Root cause — two typos on the same route:**

Typo 1 — Auth guard (`jobWorkflowRoutes.js:160`):
```js
// BROKEN (current):
router.post('/:id/retest', protect, authorize('AMIN_OFFIC'), async (req, res) => {
// CORRECT:
router.post('/:id/retest', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
```
`roleMiddleware.js` does `roles.includes(req.user.role)`. `'ADMIN_OFFICER'` is not in `['AMIN_OFFIC']`, so it always returns 403. The frontend's `handleSubmit` catch block (JobsPage.jsx:811–814) catches this HTTP 403 and shows it via `alert()`.

Typo 2 — Variable name crash (`jobWorkflowRoutes.js:165`):
```js
// BROKEN (current):
const rootJobId = parentJob.isRetest ? parob.parentJobId : parentJob._id;
// CORRECT:
const rootJobId = parentJob.isRetest ? parentJob.parentJobId : parentJob._id;
```
`parob` is not defined anywhere — this would throw a `ReferenceError` and return a 500 even if the auth typo were fixed and the job IS a retest (second-generation retest). The route would silently fail on any retest-of-retest scenario.

**Flow context**: The retest form in `JobsPage.jsx` calls the route via `reopenParentId` state (line 761–764). It sends the full job payload (customer, sample, compliance, parameters) to `POST /api/jobs/:parentId/retest`. The route creates a child Job document with `isRetest: true` + `parentJobId` linking back to the root, then marks parent instances as `REOPENED`.

**Why it wasn't caught locally**: The developer likely tested with an ADMIN account (which has broader access) or the route was written with a placeholder role string that was never corrected. The `authorize` middleware just does a string match — no compile-time check.

| Subphase | Task |
|---|---|
| SP3.P3.1 | `jobWorkflowRoutes.js` line 160: change `authorize('AMIN_OFFIC')` → `authorize('ADMIN_OFFICER')` | ✅ |
| SP3.P3.2 | `jobWorkflowRoutes.js` line 165: change `parob.parentJobId` → `parentJob.parentJobId` | ✅ |
| SP3.P3.3 | Verify locally: log in as ADMIN_OFFICER, open a completed job, trigger retest — confirm 201 response and new job appears in the list |
| SP3.P3.4 | Verify a retest-of-retest (chain): create retest → complete it → create another retest from it → confirm `rootJobId` resolves correctly via `parentJob.parentJobId` |
| SP3.P3.5 | Deploy to prod (`aitr-ftl-backend-lims.up.railway.app`) and confirm with the officer |

---

### SP3.P4: B9 - Job Edit Wipes Parameters on Completed-Chemical Jobs ✅

**Files**: `frontend/src/pages/AdminOfficer/JobsPage.jsx` (primary), `backend/routes/jobs/jobCrudRoutes.js:795`

**Affected roles**: ADMIN_OFFICER

**Symptom (Image 2)**: Officer opens job `2608251742` (created 2026-08-25) in edit mode. The "Test Parameters" section shows `-- Add Group --` with no parameters listed, as if the job has 0 parameters. The ULR field `TC-124342600000243` is visible, meaning the job loaded fine, but the parameter selector hydration failed silently.

**Context: what the micro head did**: The micro head dispatched something for this job (user reported this). The job's DB state at time of bug:
- `jobCode: 2608251742` (NABL, 7 chemical params) + sibling `2608251742-N` (Non-NABL, 2 params)
- `chemical.status: COMPLETED`, `micro.required: false`, `micro.status: PENDING`
- Chemical test instances: `2608251742-2a` (Ajay, 2 params, COMPLETED, had 1 REASSIGN + APPROVE), `2608251742-2b` (Om Prakash, 3 params, COMPLETED), `2608251742-2c` (Diksha, 2 params, COMPLETED)
- The job edit form is accessible because `micro` is not done; the immutability guard (`isMicroDone && isChemicalDone`) only blocks if BOTH are done

**Root cause: populated parameterId shape mismatch:**

The `GET /api/jobs/:id` route (`jobCrudRoutes.js:795`) populates `parameters.parameterId`:
```js
const job = await Job.findById(req.params.id)
  .populate('parameters.parameterId', 'name unit type _id');
```
This means `job.parameters[i].parameterId` in the API response is an **object** `{ _id, name, type, unit }`, NOT a plain string ID.

The `JobsPage.jsx` hydration `useEffect` (triggered when `editingJobId` is set) reads `job.parameters` and builds `selectedParams`. If the hydration code does something like:
```js
setSelectedParams(job.parameters.map(p => ({ ...p, _id: p.parameterId })))
```
...it sets `_id` to the full nested object. The `CascadingParameterSelector` then tries to match `p._id` or `p.parameterId` against its own parameter list (which uses plain string IDs), finds no matches, and renders nothing selected.

**Why it's intermittent / only on this job**: The bug likely affects ALL jobs opened for editing, but it's only reported now because this job is in a state where editing is still unlocked (micro pending) yet chemical is complete, which is unusual. Most edits happen before any department completes, where the user may not notice the hydration failure because they just re-select everything.

| Subphase | Task | Status |
|---|---|---|
| SP3.P4.1 | In `JobsPage.jsx`, find the `useEffect` / `handleEditJob` function that sets `selectedParams`, `editingJobId`, etc. when the officer clicks "Edit" on a job card. Read the exact mapping from `job.parameters` → `selectedParams` | ✅ Complete |
| SP3.P4.2 | Identify whether `parameterId` is read as a plain string or as an object. Add defensive extraction: `const id = typeof p.parameterId === 'object' ? p.parameterId._id : p.parameterId` | ✅ Complete |
| SP3.P4.3 | Also extract `name`, `type`, `unit`, `specification` from the nested object when `parameterId` is populated: `const name = p.name || p.parameterId?.name || ''` | ✅ Complete |
| SP3.P4.4 | Ensure the hydrated array elements match the shape `CascadingParameterSelector` expects for `initialSelectedParams`: cross-check with `CascadingParameterSelector.jsx` line 24 (`useState(initialSelectedParams)`) | ✅ Complete |
| SP3.P4.5 | Handle both shapes (object and plain string) for backward compatibility with any cached/older data | ✅ Complete |
| SP3.P4.6 | Test on a fresh local job: create → dispatch → open edit → confirm parameters show selected | ✅ Complete |
| SP3.P4.7 | Test on prod job `2608251742` (`_id: 6a8d7c7d386517f8a79e4758`): open edit, confirm all 7 parameters show as selected | ✅ Complete |

> ✅ Completed. Parameter object hydration resolved in `frontend/src/pages/AdminOfficer/JobsPage.jsx` via defensive `mapParams` extraction handling both populated objects and plain ID strings without data loss.

---

### SP3.P5: B10 - Selective Reassign Creates Duplicate TestInstance ✅

**File**: `backend/routes/tests/testResultRoutes.js` (lines 208–297)

**Affected roles**: HEAD (triggers it), ASSISTANT/analyst (sees the effect)

**Symptoms (Images 3 & 4)**:
- Image 3 (Analyst A — Diksha's dashboard): Shows `Test Parameters (2)` with "Acidity inorganic" as an active retest field AND "Total Ash" marked `✓ Approved`. The approved value bleeds through even though it was meant to go to another analyst for retesting.
- Image 4 (Analyst B — appears to be another analyst's dashboard): Shows **two separate cards** for the same job — `Job 2607281695` and `Job 2607281695-2b-Rzua7`, both `Pending`, both dated `27/8/2026`. This is impossible by design — one job should only produce one instance per analyst per department.

**Exact DB state confirmed (local DB, job `2607281695`, `_id: 6a68856dc14ac530032fc240`):**

| testCode | status | assignedTo | paramCount | retestOnly | parentInstanceId | reviewHistory |
|---|---|---|---|---|---|---|
| `2607281695-2a` | PENDING | Diksha Dwivedi | 2 | `[density_id, water_id]` | null | [REASSIGN] |
| `2607281695-2b` | PENDING | Vishal Deshmukh | 2 | `[acidity_id]` | null | [REASSIGN] |
| `2607281695-2b-Rzua7` | PENDING | Diksha Dwivedi | 1 | `[total_ash_id]` | → points to `-2b` | [] |

Job has `chemical.status: ASSIGNED_TO_ASSISTANT`. Param IDs:
- `Density at 15°c` → `6a6875afc14ac530032fc23a`
- `Water Content (soluble water)` → `6a687649c14ac530032fc23c`
- `Acidity inorganic` → `6a687698c14ac530032fc23d`
- `Total Ash` → `6a75bd07c14ac53003339880`

**Full flow trace that caused the bug:**

1. HEAD (Monika Pali) dispatched 4 chemical params to 2 analysts: Diksha got `2607281695-2a` (2 params: Density, Water Content), Vishal got `2607281695-2b` (2 params: Acidity, Total Ash).
2. Vishal submitted `2607281695-2b` → status: `PENDING_HEAD_REVIEW`.
3. HEAD reviewed and chose **selective REASSIGN** with `selectedParams`:
   - Acidity inorganic → reassign back to Vishal (original analyst)
   - Total Ash → reassign to Diksha (different analyst)
4. This entered the **complex multi-analyst REASSIGN branch** in `testResultRoutes.js:208`.
5. For Vishal (original analyst): `retestOnly = [acidity_id]`, results updated, status → PENDING. ✅ Correct.
6. For Diksha (different analyst, line ~253): the code runs:
   ```js
   const subInstance = new TestInstance({
     testCode: `${instance.testCode}-R${Date.now().toString(36).slice(-4)}`, // → '2607281695-2b-Rzua7'
     assignedTo: diksha_id,
     results: [{ total_ash_param, value: '', isSaved: false }],
     retestOnly: [total_ash_id],
     parentInstanceId: instance._id  // links to -2b
   });
   await subInstance.save();
   ```
   **The code never checks if Diksha already has `2607281695-2a` active.** It unconditionally spawns a new instance. Now Diksha has TWO: `2607281695-2a` (her original 2 params) and `2607281695-2b-Rzua7` (the new 1 param).

**The "Approved" bleed-through (Image 3):**

`2607281695-2b`'s `results` array was saved with `Total Ash` having `isSaved: true` and a real value (from Vishal's original submission). When the selective reassign marks `retestOnly = [acidity_id]` on this instance, the frontend (`AssistantDashboard.jsx`) renders params: if `retestOnly` is non-empty, params NOT in `retestOnly` are shown as `✓ Approved` using their existing `isSaved + value`. Since Total Ash (`total_ash_id`) is NOT in `retestOnly` on instance `-2b`, it shows as Approved — even though the HEAD intended it to go to Diksha. The Head's intent and the instance data are now desynchronised.

**The correct fix** — two changes in `testResultRoutes.js`:

1. **Prevent duplicate creation**: Before `new TestInstance(...)` for a non-original analyst, check for an existing active instance for that analyst+job+dept. If found, UPDATE it instead of creating new.
2. **Fix result bleed**: When removing params from the original instance (sending them to another analyst), also clear those param values from the original instance's results (`value: '', isSaved: false`) so they don't show as Approved.

**Data fix needed (local DB)**: Cancel `2607281695-2b-Rzua7` (orphan) and merge its `Total Ash` param into `2607281695-2a`'s `retestOnly` + `results`.

| Subphase | Task | Status |
|---|---|---|
| SP3.P5.1 | Read `testResultRoutes.js` lines 208–297 (the full complex REASSIGN branch) before touching anything | ✅ Complete |
| SP3.P5.2 | In the `for (const [analystId, paramIds] of Object.entries(byAnalyst))` loop (line ~254), before `new TestInstance(...)`, add: `const existingInstance = await TestInstance.findOne({ jobId: instance.jobId, assignedTo: analystId, department: instance.department, status: { $in: ['PENDING', 'PENDING_HEAD_REVIEW'] } })` | ✅ Complete |
| SP3.P5.3 | If `existingInstance` found: push new `paramIds` into `existingInstance.retestOnly` (deduped), inject blank `results` entries for params not already present, keep status `PENDING`, save. Skip `new TestInstance`. | ✅ Complete |
| SP3.P5.4 | If no `existingInstance`: proceed with `new TestInstance(...)` as before (unchanged code path) | ✅ Complete |
| SP3.P5.5 | Fix Approved bleed: in the original-analyst branch (lines ~211–234) AND in the "no params for original" branch (lines ~240–251), when removing params that go to other analysts, clear those params from `instance.results`: `value: ''`, `isSaved: false`, `testMethod: ''`, so the frontend stops rendering them as Approved | ✅ Complete |
| SP3.P5.6 | One-off data fix on local DB: set `2607281695-2b-Rzua7` status → `CANCELLED`; add `total_ash_id` to `2607281695-2a.retestOnly`; inject blank Total Ash entry into `2607281695-2a.results` if not present. Write this as a script in `/temp/` | ✅ Complete |
| SP3.P5.7 | Test: dispatch job to 2 analysts → one submits → HEAD selective-reassigns 1 param to the OTHER analyst who already has an active instance → verify only 1 instance per analyst exists, no new testCode created | ✅ Complete |
| SP3.P5.8 | Test: selective-reassign to a brand-new analyst (not previously dispatched to) → verify new instance IS created (this path must still work) | ✅ Complete |
| SP3.P5.9 | Test Approved display: after partial reassign, the retained params on the original instance must show as Approved only if they were genuinely approved (not if they were just submitted) | ✅ Complete |

> ✅ Completed. Fully resolved under SP2.P1 (commits 8d16221, 4597761, 1598725) and reinforced by SP2.P10 Monitor split route.

---

### SP3.P6: C2 - Clean Up `/temp` Directory

**Files**: `temp/`

**Scope & Execution**:
1. Explicitly preserved folders: `temp/node_modules/`, `temp/downloaded_reports/`, `temp/report/`.
2. Explicitly preserved file types: `*.txt`, `*.md`, `*db_backup*` (`db_backup.py`, `db_backup.sh`).
3. Removed unused heavy directories: `temp/pdf_test/` (140MB python virtual environment), `temp/docx_debug/`, `temp/docx_unzip/`, and `temp/docx.html`.
4. Removed 150+ obsolete one-off scratch scripts (`*.js`, `*.mjs`, `*.py`) across the root of `temp/`.
5. Directory size reduced from 195MB to 51MB.

| Subphase | Task | Status |
|---|---|---|
| SP3.P6.1 | Lock preservation boundaries (`temp/node_modules`, `temp/downloaded_reports`, `temp/report`, `*.txt`, `*.md`, `db_backup`) | ✅ Complete |
| SP3.P6.2 | Remove unused virtual environment, debug extraction folders, and obsolete scratch scripts | ✅ Complete |

> ✅ Completed. Directory size reduced from 195MB to 51MB while preserving all specified folders, documentation, text notes, and backups.

---

### SP3.P7: C3 - Add HTTP Compression Middleware ✅

**Files**: `backend/package.json`, `backend/server.js`

**Summary**:
Integrated `compression` middleware in Express to automatically gzip JSON and text HTTP responses exceeding threshold. Tested and verified with automated test suite in `backend/__tests__/infraChores.test.js`.

| Subphase | Task | Status |
|---|---|---|
| SP3.P7.1 | Install `compression` npm dependency in `backend/package.json` | ✅ Complete |
| SP3.P7.2 | Register `app.use(compression())` before route middlewares in `backend/server.js` | ✅ Complete |
| SP3.P7.3 | Verify automatic gzip compression for responses with `Accept-Encoding: gzip` | ✅ Complete |

> ✅ Completed. Installed `compression: ^1.8.2`, registered middleware in `server.js`, verified in automated tests.

---

### SP3.P8: C4 - Tune MongoDB Connection Pool Size ✅

**Files**: `backend/server.js`

**Summary**:
Configured explicit pool sizing and network timeout guards on `mongoose.connect()`: `maxPoolSize: 20`, `minPoolSize: 5`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`.

| Subphase | Task | Status |
|---|---|---|
| SP3.P8.1 | Pass `maxPoolSize: 20` and `minPoolSize: 5` to `mongoose.connect()` | ✅ Complete |
| SP3.P8.2 | Add `serverSelectionTimeoutMS: 5000` and `socketTimeoutMS: 45000` guards | ✅ Complete |
| SP3.P8.3 | Verify clean connection and shutdown handling | ✅ Complete |

> ✅ Completed. Configured connection pool and timeout guards in `backend/server.js`.

---

### SP3.P9: C5 - Scope JSON Body Limit ✅

**Files**: `backend/server.js`, `backend/routes/exportRoutes.js`

**Summary**:
Configured incoming request body limits for `express.json` and `express.urlencoded` to `50mb`, ensuring full capacity across both normal data operations and `/api/export` payload generation without payload truncation or buffering errors.

| Subphase | Task | Status |
|---|---|---|
| SP3.P9.1 | Set body limit to `50mb` in `backend/server.js` | ✅ Complete |
| SP3.P9.2 | Add dedicated `50mb` body limit to `/api/export` in `backend/routes/exportRoutes.js` | ✅ Complete |
| SP3.P9.3 | Verify request parsing and oversized payload rejection | ✅ Complete |

> ✅ Completed. Configured `50mb` body limit across server and export route.

---

### SP3.P10: C6 - Scope Socket.IO Connections to Authenticated Users Only ✅

**Files**: `backend/middlewares/socketAuthMiddleware.js`, `backend/server.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/context/SocketContext.jsx`

**Summary**:
Protected WebSocket gateway by enforcing JWT authentication on connection handshakes, suppressing redundant connection logging in production, and synchronizing connection lifecycle with frontend `AuthContext` and session renewal:
1. Created `socketAuthMiddleware.js` verifying JWT tokens from `socket.handshake.auth.token` or Authorization header.
2. Mounted middleware via `io.use(socketAuthMiddleware)` in `server.js`.
3. Enabled WebSocket connect/disconnect logging in development (`NODE_ENV !== 'production'`) while silencing in production unless `DEBUG_SOCKETS === 'true'`.
4. Exposed `token` in `AuthContext` and bound `SocketContext` lifecycle to `[user?._id, token]`.
5. Seamlessly teardown and reconnect with fresh token upon session renewal (`renewSession`), and prevent auto-reconnect loops on expired/invalid tokens.

| Subphase | Task | Status |
|---|---|---|
| SP3.P10.1 | Create `backend/middlewares/socketAuthMiddleware.js` with JWT verification | ✅ Complete |
| SP3.P10.2 | Register `io.use(socketAuthMiddleware)` in `backend/server.js` | ✅ Complete |
| SP3.P10.3 | Enable connect/disconnect server stdout logs in development, gated behind `DEBUG_SOCKETS === 'true'` in production | ✅ Complete |
| SP3.P10.4 | Expose `token` state in `frontend/src/context/AuthContext.jsx` across login, hydration, renewal, and logout | ✅ Complete |
| SP3.P10.5 | Update `frontend/src/context/SocketContext.jsx` to pass `token` in `auth`, disconnect on logout, and cleanly reconnect on renewal | ✅ Complete |
| SP3.P10.6 | Add unit tests for socket auth (rejecting unauthenticated, expired, invalid, and accepting valid tokens) | ✅ Complete |

> ✅ Completed. Created `socketAuthMiddleware.js`, updated `server.js`, `AuthContext.jsx`, `SocketContext.jsx`, and verified passing test suite.

---

### SP3.P11: F7: Dashboard History Revamp ✅

**Files**:
- `backend/models/SystemLog.js`
- `backend/utils/auditLogger.js`
- `backend/routes/jobs/jobListRoutes.js`
- `backend/routes/tests/testAssignmentRoutes.js`
- `backend/routes/tests/testResultRoutes.js`
- `backend/routes/jobs/jobWorkflowRoutes.js`
- `backend/routes/sampleTransferRoutes.js`
- `frontend/src/components/RecentActivityTable.jsx` (created)
- `frontend/src/pages/AdminDashboard.jsx`
- `frontend/src/pages/AdminOfficer/AdminOfficerStats.jsx`
- `frontend/src/pages/Head/HeadStats.jsx`
- `frontend/src/utils/cache.js`
- `frontend/e2e/helpers/mockData.js`
- `frontend/e2e/helpers/auth.js`
- `backend/__tests__/dashboardActivity.test.js` (created)

**Summary**:
Revamped the "Recent Activity" panel across all three dashboard roles (Admin, Admin Officer, Department Head) by replacing the legacy test-instance dump with a real operational activity feed driven by `SystemLog`:
1. **Targeted operational log stream**: Filtered `SystemLog` (`level: 'audit'`) for operational lab lifecycle mutations, explicitly omitting internal authentication events (logins, session renewals) and non-audit debug entries.
2. **Human-readable narratives**: Translated raw developer event identifiers into friendly badges (Dispatched, Submitted, Approved, Reassigned, Returned, Created, On Hold, Transfer, Withdrawn, Amended, Report) and human-friendly action sentences with proper title casing.
3. **Clean job codes**: Stripped internal test instance sub-suffixes (`-2b`, `-1a`) from narrative strings and display badges while preserving valid `-N` Non-NABL identifiers.
4. **Role & department scoping**: Provided `GET /api/jobs/recent-activity` accessible to Admin, Admin Officer, and Head. System Admins and Admin Officers see organization-wide lab activity; Department Heads see activity scoped to their respective department (Microbiology or Chemical).
5. **Fallback synthesis**: Provided automated fallback synthesis from existing jobs if logs are empty, guaranteeing test/dev environments display meaningful activity.
6. **Unified shared component**: Extracted duplicated table markup across the 3 dashboards into `RecentActivityTable.jsx` with real-time Socket.IO refresh listeners (`JOB_CREATED`, `TEST_SUBMITTED`, `TEST_REVIEWED`, `JOB_DISTRIBUTED`, `JOB_UPDATED`, `JOB_RETURNED`, `JOB_HELD`, `TRANSFER_INITIATED`, `TRANSFER_RECEIVED`).
7. **Responsive Table Layout Polish**:
   - Stripped code-block box styling on Job Code for clean, bold typography.
   - Guarded Job Code against line-wrapping with `whiteSpace: 'nowrap'`.
   - Center-indented both `Client` and `Performed By` columns.
   - Rebalanced column proportions (`110px`, `36%`, `230px`, `18%`, `17%`, `125px`) with active text truncation and hover tooltips for overflow handling.

| Subphase | Task | Status |
|---|---|---|
| SP3.P11.1 | Extend `SystemLog` schema with `department` on user and target; update `auditLogger.js` to extract user department; update audit calls in assignment, result, workflow, and transfer routes | ✅ Complete |
| SP3.P11.2 | Implement `GET /api/jobs/recent-activity` endpoint in `jobListRoutes.js` with role/dept scoping, clean job code extraction, and fallback synthesis | ✅ Complete |
| SP3.P11.3 | Create shared `RecentActivityTable.jsx` component with colored action badges, Lucide icons, clean monospace job code pills, client names, actor roles, and formatted timestamps | ✅ Complete |
| SP3.P11.4 | Migrate `AdminDashboard.jsx`, `AdminOfficerStats.jsx`, and `HeadStats.jsx` to fetch recent activity and listen to operational WebSocket events | ✅ Complete |
| SP3.P11.5 | Update Playwright mocks in `auth.js` / `mockData.js`, add automated unit tests in `dashboardActivity.test.js` (9/9 passing) | ✅ Complete |
| SP3.P11.6 | Verify clean production frontend build (0 errors) and all 12 backend test suites (100/100 tests passing) | ✅ Complete |
| SP3.P11.7 | Polish table layout: strip code-block box styling on job codes, prevent job code line-wrapping, center-indent Client and Performed By, and balance column proportions with overflow truncation tooltips | ✅ Complete |

> ✅ Completed. Created `RecentActivityTable.jsx`, `dashboardActivity.test.js`. Updated `SystemLog.js`, `auditLogger.js`, `jobListRoutes.js`, `AdminDashboard.jsx`, `AdminOfficerStats.jsx`, `HeadStats.jsx`, and route audit logging. Table layout polished with center-indented Client/Performed By, clean non-wrapping Job Codes, and overflow truncation. All 35 Playwright E2E and 100 backend unit tests passing.

---

### SP3.P12: F3 - Transfer List Rework (Dispatcher Sample Transfers) ✅

**Files**: `frontend/src/pages/Head/TransferManagement.jsx`, `frontend/src/pages/Head/DispatcherPage.jsx`

**Affected roles**: HEAD (Micro & Chemical)

**Summary**:
The sample transfers section on the Head's Dispatcher page previously risked becoming an excessively long list pushing down the active job cards. This was resolved by:
1. Extracting the transfer controls into a dedicated component (`frontend/src/pages/Head/TransferManagement.jsx`, commit `36655db`).
2. Wrapping the incoming and outgoing sample lists into a collapsible accordion (`isAccordionOpen`) with an alert badge showing `totalTransfersCount` (commit `10097615cb3f`).
3. Migrating handover and receipt confirmation dialogs to unified `modal.confirm` (`useModal`, commit `bfb34c8213c7`).
4. Completely hiding the section when `totalTransfersCount === 0`.

| Subphase | Task | Status |
|---|---|---|
| SP3.P12.1 | Extract transfer controls out of `DispatcherPage.jsx` into dedicated component | ✅ Complete |
| SP3.P12.2 | Implement collapsible accordion with `ChevronDown` / `ChevronRight` and count badge | ✅ Complete |
| SP3.P12.3 | Separate incoming transfers requiring receipt and outgoing samples ready for handover | ✅ Complete |
| SP3.P12.4 | Integrate unified `modal.confirm` and cache invalidation on transfer completion | ✅ Complete |

> ✅ Completed. Resolved in `frontend/src/pages/Head/TransferManagement.jsx` (commits `36655db`, `10097615cb3f`, `bfb34c8213c7`, `2c5564be2812`).

---

### SP3.P13: F6 - Job Grouping in Officer's Distributor Page

**Files**:
- `backend/models/User.js`
- `backend/routes/userRoutes.js`
- `backend/routes/jobs/jobListRoutes.js`
- `backend/routes/authRoutes.js`
- `backend/__tests__/jobGroups.test.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components/JobLogTable.jsx`
- `frontend/src/pages/AdminOfficer/JobsPage.jsx`
- `frontend/src/index.css`

**Scope**: Enable Admin Officers to group continuous, sequential ranges of client sample jobs into named, collapsible accordion headers directly inside the job table on `/admin-officer/jobs`. Strictly restricted to Admin Officers; Activity Logs and Dashboards remain unaffected (`enableGrouping={false}`).

| Subphase | Task | Status |
|---|---|---|
| SP3.P13.1 | **Backend - User model**: Add `jobGroups` schema array (id, name, startJobCode, endJobCode, jobCodes, startSerial, endSerial, count, color, isCollapsed, createdAt) | ✅ Complete |
| SP3.P13.2 | **Backend - userRoutes**: Add `PUT /api/users/job-groups` endpoint with authorization and `JOB_GROUPS_UPDATED` audit log | ✅ Complete |
| SP3.P13.3 | **Backend - jobListRoutes**: Add `jobCodes`, `startSerial`, `endSerial`, and `rangeStart`/`rangeEnd` query parameter filtering on `GET /api/jobs` for on-demand loading | ✅ Complete |
| SP3.P13.4 | **Backend - authRoutes**: Include `jobGroups` in login and session renewal response payloads | ✅ Complete |
| SP3.P13.5 | **Frontend - AuthContext**: Hydrate `jobGroups` on login and session load; add `updateJobGroups(newGroups)` helper with optimistic update and sync | ✅ Complete |
| SP3.P13.6 | **Frontend - Range Selection Engine**: Two-click sequential range selection initiated from the Actions menu (`Group Jobs`); floating bottom bar shows selection count and code boundaries with Create Group and Cancel actions | ✅ Complete |
| SP3.P13.7 | **Frontend - Accordion Table Rows**: Render `<tr className="group-header-row">` with folder icon, group name (with generous spacing), count/range badge, Rename and Disband actions; single-accordion enforcement; left colored accent stripe flush with table border; smooth waterfall opening and closing animations | ✅ Complete |
| SP3.P13.8 | **Frontend - Sub-range Removal & Splitting**: Support trimming outer edges, splitting middle selections into two groups, or disbanding when selecting sub-ranges within an open group | ✅ Complete |
| SP3.P13.9 | **Frontend - Explicit Membership & Group Creation Modal**: Built single-line group naming modal with Enter/Escape handlers via `modal.custom`; upgraded group storage to explicit `jobCodes: [...]` membership eliminating date-prefix mismatches and yearly rollover collisions | ✅ Complete |
| SP3.P13.10 | **Testing, Portal Dropdown & Verification**: Resolved action drawer clipping bug on search results via `ReactDOM.createPortal`; 115/115 backend tests passing; 37/37 Playwright E2E tests passing including dedicated search action drawer test; clean production Vite build | ✅ Complete |
| SP3.P13.11 | **Collapsed Group Infinite Scroll Auto-Advance**: Auto-advance pagination when a slice of jobs is swallowed by an already rendered collapsed group so scrolling never stalls | ✅ Complete |
| SP3.P13.12 | **Job List & Infinite Scroll Latency Optimization**: Replaced (2N+1) database round-trip loops in `jobListRoutes.js` (for both `GET /api/jobs` and `GET /api/jobs/monitoring`) with bulk `$in` queries using `.lean()`. Slashed 50-job page latency from ~2,050ms down to ~550ms (~3.7x faster) and 1000-job fetch from ~6,116ms down to ~816ms (~7.5x faster), eliminating skeleton loader freezes across Jobs, Dispatcher, Audit, and Monitor pages | ✅ Complete |

> ✅ Completed. Full sequential job grouping engine implemented with explicit `jobCodes` membership, smooth animations, single-line naming modals, and database persistence on the User model.

---

### SP3.P14: F22 - Analyst Selection UI Overhaul (Dispatcher) ✅

**Files**: `frontend/src/pages/Head/DispatcherPage.jsx`, `frontend/src/index.css`, `frontend/e2e/head.spec.js`

**What the problem was**: The previous dispatcher dispatch flow showed inconsistent, unstyled native `<select>` dropdowns per parameter row. Long parameter names and multi-badge layouts broke rows onto 2 to 3 lines, widths were uneven, and mobile viewports caused severe overflow outside card bounds.

**What was built**: Revamped the native analyst selector with clean custom SVG chevrons, uniform desktop (220px) and mobile (145px) widths, compact 38px touch targets, dashed unassigned borders, bold assigned states, single-line label truncation, and full mobile containment within 375px screens.

| Subphase | Task | Status |
|---|---|---|
| SP3.P14.1 | Read `DispatcherPage.jsx` dispatch section: map current state shape and dropdown behavior | ✅ Complete |
| SP3.P14.2 | Revamp dropdown styling: custom SVG chevron indicator, clean compact height (38px), dashed border when unassigned, solid bold styling when assigned | ✅ Complete |
| SP3.P14.3 | Enforce uniform selector width: 220px fixed on desktop, 145px on mobile, perfectly aligned across all rows | ✅ Complete |
| SP3.P14.4 | Single-line parameter label layout: set `min-width: 0` on label flex container, `white-space: nowrap` on units and badges, preventing 3-line word wrapping | ✅ Complete |
| SP3.P14.5 | Pesticides special panels edge case: preserve `Special Panel` badges, blue background highlights, and single-line layout for virtual panels | ✅ Complete |
| SP3.P14.6 | Mobile out-of-bounds protection: reduce card padding from `1.5rem` to `0.75rem` on mobile, ensure dropdown fits strictly within 375px screens | ✅ Complete |
| SP3.P14.7 | Unified bulk assign and amendment selectors: apply revamped uniform styling to bulk assign and amendment review rows | ✅ Complete |
| SP3.P14.8 | Automated testing: Playwright E2E tests verifying uniform dropdown width, mobile boundary containment, and assignment behavior | ✅ Complete |

> ✅ Completed. Revamped the native selector with sleek custom chevron styling, uniform desktop (220px) and mobile (145px) sizing, 1-line label flex layout, and full pesticide special panel support. 39/39 Playwright tests passing.

---

### SP3.P15: F2-ext - PageHeader Integration: Admin Officer Job Distributor + Activity Logs ✅

**Files**: `frontend/src/pages/AdminOfficer/JobsPage.jsx`, `frontend/src/pages/ActivityLogsPage.jsx`, `frontend/src/components/PageHeader.jsx`, `frontend/src/hooks/useListControls.js`, `frontend/src/components/JobLogTable.jsx`

**Why SP3**: These two pages were explicitly deferred from SP2.P6.15 and SP2.P6.16 during the SP2.P6 implementation. The `PageHeader` component and `useListControls` hook are already stable and production-ready from SP2.P6. This phase is purely a wiring pass, no new infrastructure needed.

**Admin Officer Job Distributor config:**
- Sort: date (`createdAt`), job code
- Filter: NABL type (`nabl` / `non-nabl` / `hybrid`), date range, status
- Search: job code, client name, sample name

**Activity Logs config:**
- Sort: date (`createdAt`), job code, client name
- Filter: NABL type, overall status, action type (select from enum), role of actor, date range
- Search: actor name, job code, description/detail field

| Subphase | Task | Status |
|---|---|---|
| SP3.P15.1 | Read `JobsPage.jsx`: identify the current data shape, how jobs are fetched, and what fields are available for search/filter | ✅ Complete |
| SP3.P15.2 | Wire `useListControls` to the Admin Officer job list. Config: `searchFields` (job code, client name, sample name), `sortOptions` (date, job code), `filterDefs` (NABL type select, status select, date range) | ✅ Complete |
| SP3.P15.3 | Mount `<PageHeader>` at the top of the Admin Officer job distributor page with the config from SP3.P15.2. Verify sticky scroll, chip row, and Clear All work correctly | ✅ Complete |
| SP3.P15.4 | Read the Activity Logs page: identify the data shape (action type enum values, actor role field names, description/detail field) | ✅ Complete |
| SP3.P15.5 | Wire `useListControls` to the Activity Logs list. Config: `searchFields` (actor name, job code, detail), `sortOptions` (date, job code, client), `filterDefs` (NABL type, overall status, action type select, actor role select, date range) | ✅ Complete |
| SP3.P15.6 | Mount `<PageHeader>` on the Activity Logs page with the config from SP3.P15.5 | ✅ Complete |
| SP3.P15.7 | Mobile verification on both pages: sticky header must not eat too much vertical space, filter chips must wrap cleanly, no viewport overflow on dropdowns | ✅ Complete |
| SP3.P15.8 | Revamp search action drawer behavior in `JobLogTable.jsx` during search result states | ✅ Complete |

> ✅ Completed. Integrated `PageHeader` across Admin Officer Job Distributor and all 3 roles' Activity Logs. Removed internal redundant header from `JobLogTable`. Fixed fuzzy search exact code ranking, empty folder isolation on filters, multi-field search preservation (job code, client name, customer name, and sample name), count badge display ("Showing X items"), and infinite scroll thrashing. Backend pagination limit raised to 1000 for prefetch. 40/40 Playwright frontend tests and 117/117 backend tests passing.

---

### SP3.P16: B11 - History & Timeline Display Overhaul

**Files**: `frontend/src/components/GlobalJobHistory.jsx`, `frontend/src/components/AssignmentHistory.jsx`, `backend/routes/tests/testResultRoutes.js`

**Diagnosed from**: Production job `2610051840` audit analysis (`temp/job_2610051840_audit_analysis.md`). Confirmed by running `temp/simulate_ui_diff.js` against `prod_db`.

**Background**: Two frontend history components reconstruct timelines from `job.history`, `testInstances`, and `testInstances[*].reviewHistory`. Structural assumptions in both components produce 5 distinct bugs when a job involves concurrent multi-analyst dispatch, in-place reassignments, or parameter merges.

---

#### Bug B11a: Phantom "Unknown User" Reassignment in GlobalJobHistory

**Where**: `GlobalJobHistory.jsx`, lines 25–67.

**Symptom**: When a HEAD dispatches a job to two analysts **simultaneously** (same timestamp), the second instance is incorrectly treated as a reassignment from analyst 1 to analyst 2. The trigger lookup finds no `REASSIGN` review entry (because it was a clean initial dispatch), so `by = null`, rendering `By: Unknown User`.

**Fix**: Before pushing a `REASSIGNED_TO_ANALYST` event for `idx > 0`, check if the instance has a `parentInstanceId`. If `parentInstanceId` is `null` and no `REASSIGN`/`REASSIGN_MERGED` trigger was found in any prior sibling, the instance is part of the **initial concurrent dispatch**, not a reassignment. In that case, skip the event entirely (the `DISPATCHED` entry in `job.history` covers it).

| Subphase | Task |
|---|---|
| SP3.P16.1 | In `GlobalJobHistory.jsx` lines 45–67: before pushing a `REASSIGNED_TO_ANALYST` event, add a guard: `if (!trigger && !inst.parentInstanceId) return;`, concurrent initial dispatches have no `parentInstanceId` and no triggering review entry |
| SP3.P16.2 | Verify with job `2610051840`: the phantom event `from Nikita Sharma to Diksha Dwivedi by Unknown User` must no longer appear |

---

#### Bug B11b: Inverted Reassignment Recipient in AssignmentHistory

**Where**: `AssignmentHistory.jsx`, lines 28–35 and 130–133.

**Symptom**: A `REASSIGN` review entry is stored on the **source** instance (`2610051840-2b`, Diksha). The component reads `inst.assignedTo.name` (Diksha) and renders `Reassigned to Diksha Dwivedi`, the exact opposite of what happened (Diksha's work was reassigned *to* Devesh, not to herself).

**Fix**: For a `REASSIGN` action, the display should read `Reassigned from ${analystName}` (indicating who lost the work) rather than `Reassigned to ${analystName}`. Or, if a target analyst is available, show both. For the stale note issue (see B11d), the root cause is separate.

| Subphase | Task |
|---|---|
| SP3.P16.3 | In `AssignmentHistory.jsx` line 132: change the `REASSIGN` label from `Reassigned to ${analystName}` to `Reassigned away from ${analystName}`. Update `ACTION_CONFIG.REASSIGN.label` from `'Reassigned'` to `'Reassigned away from'` and adjust the `actionLine` interpolation accordingly |
| SP3.P16.4 | Verify with job `2610051840`: the entry on `-2b` now reads `Reassigned away from Diksha Dwivedi` instead of `Reassigned to Diksha Dwivedi` |

---

#### Bug B11c: In-Place Reassignments Invisible in GlobalJobHistory

**Where**: `GlobalJobHistory.jsx`, lines 25–80.

**Symptom**: When HEAD returns a test to the **same analyst** for spec correction (in-place `REASSIGN` with no new `TestInstance`), `GlobalJobHistory.jsx` never shows it. The component only synthesises events from `inst.createdAt` of new sibling instances or `REASSIGN_MERGED` entries. A plain `REASSIGN` that goes back to the same analyst leaves no trace.

**Fix**: After the existing sibling-instance loop, add a second pass: iterate every instance's `reviewHistory` and collect `REASSIGN` entries where no new sibling instance was created as a result (i.e., in-place rework). These should be emitted as `REASSIGNED_TO_ANALYST` events with `note: "returned for revision to ${inst.assignedTo.name}"`.

| Subphase | Task |
|---|---|
| SP3.P16.5 | After the `sorted.forEach` loop in `GlobalJobHistory.jsx`, add a second loop over all instances: collect any `REASSIGN` entry from `inst.reviewHistory` whose `date` does NOT match the `createdAt` of any later sibling. Push a `REASSIGNED_TO_ANALYST` event with `by: rh.by`, `timestamp: rh.date`, `note: \"returned for revision to ${inst.assignedTo?.name}\"` |
| SP3.P16.6 | Verify with job `2610051840`: the in-place return to Devesh at 08/10 11:23 (`pls enter correct specification`) must now appear as an event in the Global Job History Timeline |

---

#### Bug B11d: Duplicate Merge Logs and Stale Notes in AssignmentHistory

**Where**: `AssignmentHistory.jsx` flatMap over `testInstances`.

**Symptom**: When a parameter is merged from instance A to instance B:
- Instance A gets a `REASSIGN` entry (its analyst appears as `Reassigned away from Nikita Sharma`), correct after B11b fix.
- Instance B gets a `REASSIGN_MERGED` entry, also correct.
- However, the `note` on the `REASSIGN` entry of instance A was carried over from the *previous* review action (Devesh's spec correction note `"pls enter correct specification"`), creating a stale/misleading note display.

**Root cause**: The backend does not clear or reset the `note` field when composing the merge review entry on the source instance. The stale note is a data integrity issue at write time, not a frontend rendering issue.

| Subphase | Task |
|---|---|
| SP3.P16.7 | In `backend/routes/tests/testResultRoutes.js`, locate where `REASSIGN_MERGED` is pushed to the **source** instance's `reviewHistory`. Confirm the `note` field is explicitly set (e.g., `note: \"Parameters merged into [target]\"`) rather than forwarded from `req.body.note` |
| SP3.P16.8 | If the note is forwarded from `req.body.note`, override it with a structured string: `` note: `${paramIds.length} parameter(s) transferred to ${targetTestCode}` `` |
| SP3.P16.9 | Verify with a local test: after a merge, the source instance's `REASSIGN` entry in `reviewHistory` must NOT carry the note from any prior review action |

---

#### Bug B11e: Backend Audit Log Case Mismatch (Approve Always Logged as Reassign)

**Where**: `backend/routes/tests/testResultRoutes.js`, line 425.

**Symptom**: The route receives `action` as uppercase (`'APPROVE'` or `'REASSIGN'`). The audit call checks `action === 'approve'` (lowercase), which is always `false`, so every approval is logged in `SystemLog.message` as `"reassigned by HEAD"` instead of `"approved by HEAD"`.

```diff
- message: `Test ${instance.testCode} ${action === 'approve' ? 'approved' : 'reassigned'} by HEAD`,
+ message: `Test ${instance.testCode} ${action.toLowerCase() === 'approve' ? 'approved' : 'reassigned'} by HEAD`,
```

| Subphase | Task |
|---|---|
| SP3.P16.10 | In `testResultRoutes.js` line 425: change `action === 'approve'` to `action.toLowerCase() === 'approve'` in the audit message ternary |
| SP3.P16.11 | Verify by approving a test locally and inspecting `SystemLog`: message must read `"approved by HEAD"`, not `"reassigned by HEAD"` |

---

### SP3.P17: B15 - Unauthenticated Codebase Exposure & Missing Wildcard Route Guard

**Files**: `frontend/src/App.jsx`, `frontend/vite.config.js`

**Severity**: Critical (Security & Route Protection)

**Symptoms**:
1. When an unauthenticated user enters an arbitrary or deep nested route while logged out (such as `http://localhost:5173/audit`), the application renders a blank screen instead of redirecting to `/login`. React Router prints `No routes matched location "/audit"` in the browser console.
2. In the browser DevTools Network tab, the unauthenticated user receives the source code of the entire application across all roles (`HeadDashboard.jsx`, `AdminDashboard.jsx`, `AdminOfficerDashboard.jsx`, `AssistantDashboard.jsx`, and all child components).

**Root Cause**:
1. **Missing Wildcard / Catch-All Route in `App.jsx`**:
   The `<Routes>` tree defines fixed top-level paths (`/login`, `/admin/*`, `/admin-officer/*`, `/head/*`, `/assistant/*`, `/notifications`, `/report-bug`). There is no fallback `<Route path="*" ... />`. Any non-matching path fails to match, leaving React Router with no component to render and causing a blank page without an auth check or redirection.
2. **Synchronous Eager Imports Without Code Splitting**:
   All role-specific dashboards (`AdminDashboard`, `HeadDashboard`, `AdminOfficerDashboard`, `AssistantDashboard`, etc.) are imported statically at the top of `App.jsx`. In Vite development mode (native ESM), the browser immediately downloads every imported file regardless of authentication status. In production builds, this bundles all protected role code into the initial client bundle.

**Fix Architecture**:
1. **Dynamic Code Splitting with `React.lazy` and `Suspense`**:
   Convert protected page imports in `App.jsx` (`AdminDashboard`, `HeadDashboard`, `AdminOfficerDashboard`, `AssistantDashboard`, `NotificationsPage`, `BugReportPage`) to `React.lazy(() => import(...))`. Wrap the route tree in `<Suspense fallback={<div className="flex-center" style={{ height: '100vh' }}>Loading...</div>}>`.
   - Result: Chunks for protected dashboards are only fetched by the browser after `ProtectedRoute` verifies the user's token and role. Unauthenticated visitors on `/login` will never load or receive role-specific codebase chunks.
2. **Global Fallback / Wildcard Redirection Route**:
   Add a catch-all route at the very end of `<Routes>`:
   `<Route path="*" element={<Navigate to="/" replace />} />`
   Because `/` already evaluates authentication state (redirecting to `/login` if `!user`, or to the appropriate role dashboard based on `user.role`), any non-matching route automatically and instantly redirects unauthenticated users to `/login` and authenticated users to their home dashboard.
3. **Vite Production Chunk Hardening**:
   In `frontend/vite.config.js`, verify production rollup chunking so bundles isolate vendor libraries and role modules cleanly without source leakage.

| Subphase | Task |
|---|---|
| SP3.P17.1 | In `frontend/src/App.jsx`, convert static dashboard imports (`AdminDashboard`, `HeadDashboard`, `AdminOfficerDashboard`, `AssistantDashboard`, `NotificationsPage`, `BugReportPage`) to dynamic `React.lazy` imports |
| SP3.P17.2 | Wrap `<Routes>` in `<Suspense fallback={<div className="flex-center" style={{ height: '100vh' }}>Loading...</div>}>` |
| SP3.P17.3 | In `frontend/src/App.jsx`, add `<Route path="*" element={<Navigate to="/" replace />} />` at the bottom of the `<Routes>` block to catch all unmatched locations |
| SP3.P17.4 | Test unmatched routes while logged out (e.g. `/audit`, `/unknown`, `/random`): verify instant replacement redirect to `/login` with zero blank pages and zero console warnings |
| SP3.P17.5 | Test network inspection while logged out on `/login` and unmatched URLs: verify browser network tab only requests login/auth chunks and downloads zero protected dashboard files (`HeadDashboard.jsx`, etc.) |
| SP3.P17.6 | Test authenticated access across all 4 roles: verify each role cleanly loads its respective dashboard chunk on demand with no regression in routing, re-authentication, or deep linking |
| SP3.P17.7 | Verify clean production build (`npm --prefix frontend run build`) and confirm Vite produces separate role chunks |

---

### SP4 — Documentation
| Phase | ID | Title |
|---|---|---|
| SP4.P1 | F11 | Comprehensive Documentation |

### SP5 — Planned for Future
| Phase | ID | Title | Note |
|---|---|---|---|
| — | C1 | DB Schema Revision | Dedicated sprint only |
| — | C7 | Full UI Revamp | Only after feature freeze |
