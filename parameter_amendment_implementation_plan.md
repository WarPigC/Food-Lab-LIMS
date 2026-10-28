# Detailed Implementation Plan: Staged Parameter Amendments & Sample Handover Logic

## 1. Overview & Objectives

This implementation plan provides the architectural blueprint and step-by-step technical tasks to resolve two critical lab workflow bugs:

1. **Bug 1: Parameter Modification & Multi-Analyst Duplication (SP2.P13 / B13)**:
   - Eliminates direct background injection of parameters into active analyst task queues.
   - Introduces a **Staged Parameter Amendment** lifecycle on the `Job` model (`pendingParamAmendments`).
   - Adds a dedicated **Modified Parameters Awaiting Review** card on the Head Dispatcher screen with Approve & Assign or Reject actions.
   - Provides an immediate **Red Visual Alert** on the Admin Officer's job table row (`JobLogTable.jsx`) if parameters are rejected.
   - Implements a **3-Layer Completion Safety Guard** ensuring no job can be finalized, assigned a ULR, or have a report exported while amendments are unresolved.
   - Guarantees **Zero Re-typing** for Admin Officers upon rejection by hydrating rejected parameters directly into the edit form.

2. **Bug 2: 1+ Samples Multi-Department Handover Bypass (SP2.P12 / B12)**:
   - Updates sample handover evaluation from purely `isMultiDept` to checking `sample_count <= 1`.
   - When clients provide multiple samples (`sample_count > 1`), Microbiology and Chemical receive physical samples at intake and test in parallel immediately.
   - Eliminates artificial sequential transfer bottlenecks in `sampleTransferRoutes.js`, `jobWorkflowRoutes.js`, and `DispatcherPage.jsx`.

---

## 2. Architecture & Data Schema Changes

### 2.1 Job Schema Updates ([backend/models/Job.js](file:///home/archani/Projects/AIPER/backend/models/Job.js))

Add the `pendingParamAmendments` container to `jobSchema`:

```javascript
// backend/models/Job.js
pendingParamAmendments: {
  status: {
    type: String,
    enum: ['NONE', 'PENDING_HEAD_REVIEW', 'REJECTED'],
    default: 'NONE'
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedAt: { type: Date },
  department: { type: String, enum: ['micro', 'chemical', 'both'] },
  parameters: [{
    parameterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parameter' },
    name: { type: String },
    type: { type: String, enum: ['Micro', 'Chemical'] },
    unit: { type: String },
    specification: { type: String, default: '' }
  }],
  rejectionReason: { type: String, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt: { type: Date, default: null }
}
```

Performance index:
```javascript
jobSchema.index({ 'pendingParamAmendments.status': 1 });
```

### 2.2 Sample Handover Helper ([backend/utils/handoverUtils.js](file:///home/archani/Projects/AIPER/backend/utils/handoverUtils.js))

Create a single source of truth for handover evaluation:

```javascript
// backend/utils/handoverUtils.js
function isSampleHandoverRequired(job) {
  if (!job) return false;
  const microRequired = Boolean(job.distribution?.micro?.required);
  const chemicalRequired = Boolean(job.distribution?.chemical?.required);
  const isMultiDept = microRequired && chemicalRequired;
  
  if (!isMultiDept) return false;

  // If client delivered 2 or more physical containers, both depts receive samples at intake
  const sampleCount = parseInt(job.sample?.sample_count, 10) || 1;
  return sampleCount <= 1;
}

module.exports = { isSampleHandoverRequired };
```

---

## 3. Detailed Implementation Tasks

### Phase 1: Backend Data Model & Core Utilities

#### Task 1.1: Schema Update
* **File**: [backend/models/Job.js](file:///home/archani/Projects/AIPER/backend/models/Job.js)
* **Changes**: Add `pendingParamAmendments` schema definition and index.

#### Task 1.2: Refactor Parameter Delta Engine
* **File**: [backend/utils/parameterDelta.js](file:///home/archani/Projects/AIPER/backend/utils/parameterDelta.js)
* **Changes**:
  * Deprecate the automatic `applyAdditions()` injection into active `TestInstance` records.
  * Separate `computeDelta()` logic:
    * Keep `applyRemovals()` for parameters explicitly deleted by the officer.
    * Route added parameters to the staging container rather than mutating analyst workorders directly.

#### Task 1.3: Centralize Handover Logic
* **File**: [backend/utils/handoverUtils.js](file:///home/archani/Projects/AIPER/backend/utils/handoverUtils.js)
* **Changes**: Create and export `isSampleHandoverRequired(job)`.

---

### Phase 2: Backend API Routes & Staging Lifecycle

#### Task 2.1: Staging on Job Edit
* **File**: [backend/routes/jobs/jobCrudRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/jobs/jobCrudRoutes.js)
* **Route**: `PUT /api/jobs/:id`
* **Changes**:
  * When an Admin Officer submits edits for a dispatched job (`job.distribution[dept].status` in `['ASSIGNED_TO_ASSISTANT', 'COMPLETED', 'PENDING_HEAD_REVIEW']`):
    * Calculate added parameters via `computeDelta`.
    * If new parameters exist:
      * Do not inject into `job.parameters` or `TestInstance.results`.
      * Store them in `job.pendingParamAmendments` with:
        * `status: 'PENDING_HEAD_REVIEW'`
        * `parameters: paramDelta.added`
        * `requestedBy: req.user._id`
        * `requestedAt: new Date()`
        * `department: targetDept`
      * Notify the relevant Department Head (`PARAM_AMENDMENT_REQUESTED`).
      * Append `PARAM_AMENDMENT_REQUESTED` to `job.history`.
  * If the Admin Officer is removing previously rejected parameters or saving a clean state, reset `job.pendingParamAmendments.status = 'NONE'`.

#### Task 2.2: Head Approve & Dispatch Staged Parameters
* **File**: [backend/routes/jobs/jobWorkflowRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/jobs/jobWorkflowRoutes.js)
* **Route**: `POST /api/jobs/:id/approve-amendment` (HEAD only)
* **Payload**: `{ assignments: [{ parameterId, assignedTo }] }`
* **Changes**:
  * Validate that `job.pendingParamAmendments.status === 'PENDING_HEAD_REVIEW'`.
  * For each assignment:
    * If `assignedTo` is an existing analyst with an active `TestInstance`: append to their `results` array with `isSaved: false`.
    * If `assignedTo` is a new analyst: spawn a clean sub-instance (e.g. `-2b` or `-2c`) containing these parameters.
  * Formally merge the approved parameters into `job.parameters`.
  * Reset `job.pendingParamAmendments.status = 'NONE'`.
  * Record `PARAM_AMENDMENT_APPROVED` in `job.history` and `SystemLog`.
  * Emit socket event `JOB_UPDATED`.

#### Task 2.3: Head Reject Staged Parameters
* **File**: [backend/routes/jobs/jobWorkflowRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/jobs/jobWorkflowRoutes.js)
* **Route**: `POST /api/jobs/:id/reject-amendment` (HEAD only)
* **Payload**: `{ rejectionReason: string }`
* **Changes**:
  * Validate that `rejectionReason` is provided.
  * Update `job.pendingParamAmendments`:
    * `status = 'REJECTED'`
    * `rejectionReason = req.body.rejectionReason`
    * `rejectedBy = req.user._id`
    * `rejectedAt = new Date()`
  * Keep job status `ACTIVE`; ongoing analyst tests continue running without interruption.
  * Append `PARAM_AMENDMENT_REJECTED` to `job.history`.
  * Notify Admin Officers with the reason (`ACTION_REQUIRED`).
  * Emit socket event `JOB_UPDATED`.

---

### Phase 3: The 3-Layer Completion Safety Guard

#### Task 3.1: Gate 1 - Department Completion Lock
* **File**: [backend/routes/tests/testResultRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/tests/testResultRoutes.js)
* **Location**: Line 122 (`HEAD APPROVE` handler).
* **Guard**:
  ```javascript
  const hasUnresolvedAmendments = job.pendingParamAmendments 
    && job.pendingParamAmendments.status !== 'NONE';

  if (hasUnresolvedAmendments) {
    // Save the approved instance, but refuse to transition job.distribution to COMPLETED
    await instance.save();
    return res.json({
      message: "Test approved. Note: Job distribution cannot be marked COMPLETED while parameter amendments are unresolved.",
      instance
    });
  }
  ```

#### Task 3.2: Gate 2 - ULR Assignment Guard
* **File**: [backend/utils/ulrService.js](file:///home/archani/Projects/AIPER/backend/utils/ulrService.js)
* **Location**: Inside `isJobFullyTested(job)`.
* **Guard**:
  ```javascript
  function isJobFullyTested(job) {
    if (job.pendingParamAmendments && job.pendingParamAmendments.status !== 'NONE') {
      return false; // Blocks ULR reservation and assignment
    }
    const microOk = !job.distribution?.micro?.required || job.distribution.micro.status === 'COMPLETED';
    const chemOk = !job.distribution?.chemical?.required || job.distribution.chemical.status === 'COMPLETED';
    return microOk && chemOk;
  }
  ```

#### Task 3.3: Gate 3 - Report Export Guard
* **File**: [backend/routes/exportRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/exportRoutes.js)
* **Location**: Report download and custom report generation endpoints.
* **Guard**:
  ```javascript
  if (job.pendingParamAmendments && job.pendingParamAmendments.status !== 'NONE') {
    return res.status(400).json({
      message: "Cannot generate or export test report: parameter modifications are pending resolution."
    });
  }
  ```

---

### Phase 4: Head Dispatcher Experience

#### Task 4.1: Query Inclusion for Pending Amendments
* **File**: [backend/routes/jobs/jobListRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/jobs/jobListRoutes.js)
* **Location**: Lines 137-147 (`activeForHead=true` filter).
* **Changes**: Ensure jobs with `'pendingParamAmendments.status': 'PENDING_HEAD_REVIEW'` for the head's department match the query even if `distribution[dept].status === 'ASSIGNED_TO_ASSISTANT'`.

#### Task 4.2: Dispatcher Card Component
* **File**: [frontend/src/pages/Head/DispatcherPage.jsx](file:///home/archani/Projects/AIPER/frontend/src/pages/Head/DispatcherPage.jsx)
* **UI Features**:
  * Render a distinct section header or card badge: `Parameter Amendment Awaiting Review` (amber accent).
  * Display parameter table: Name, Unit, Specification, and Requested By (Admin Officer name + timestamp).
  * Action Buttons:
    * **Approve & Dispatch**: Expands analyst dropdowns for each new parameter.
    * **Reject**: Opens modal with required text area for `rejectionReason`.

---

### Phase 5: Admin Officer Visual Alert & Form Hydration

#### Task 5.1: Red Visual Alert on Job Table Row
* **File**: [frontend/src/components/JobLogTable.jsx](file:///home/archani/Projects/AIPER/frontend/src/components/JobLogTable.jsx)
* **Location**: Lines 330-410 (Desktop row) and lines 640-720 (Mobile card).
* **Styling & Elements when `job.pendingParamAmendments?.status === 'REJECTED'`**:
  * **Left Accent Bar**: `borderLeft: "4px solid #EF4444"`
  * **Row Background Tint**: `backgroundColor: "rgba(239, 68, 68, 0.05)"`
  * **Status Badge**:
    ```jsx
    <span style={{
      backgroundColor: "#EF4444",
      color: "white",
      padding: "0.25rem 0.6rem",
      borderRadius: "9999px",
      fontSize: "0.75rem",
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem"
    }} title={`Rejected by Head: ${job.pendingParamAmendments?.rejectionReason || 'Review needed'}`}>
      <AlertTriangle size={12} /> Params Rejected
    </span>
    ```
  * **Edit Button Highlight**:
    ```jsx
    style={{
      background: "rgba(239, 68, 68, 0.18)",
      border: "1px solid #EF4444",
      color: "#EF4444",
      padding: "0.2rem 0.4rem",
      borderRadius: "4px"
    }}
    ```
    Title: `"Resolve Rejected Parameters"`

#### Task 5.2: Form Hydration on Rejection (Zero Re-typing)
* **File**: [frontend/src/pages/AdminOfficer/JobsPage.jsx](file:///home/archani/Projects/AIPER/frontend/src/pages/AdminOfficer/JobsPage.jsx)
* **Location**: Inside `handleEditJob()` and form rendering.
* **Changes**:
  * If `job.pendingParamAmendments?.status === 'REJECTED'`:
    * Render a top alert banner:
      *"Department Head rejected parameter modification. Reason: [rejectionReason]"*
    * **Pre-fill `selectedParams`** with existing parameters PLUS the rejected parameters from `job.pendingParamAmendments.parameters`.
    * Provide a single-click button: **"Discard Rejected Parameters"** (clears them from state and sets status back to `'NONE'`).
    * If officer adjusts specifications or changes parameters, saving calls `PUT /api/jobs/:id` which re-submits cleanly.

---

### Phase 6: Multi-Department Sample Handover Bypass (Bug 2)

#### Task 6.1: Creation and Edit Transfer Initialization
* **File**: [backend/routes/jobs/jobCrudRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/jobs/jobCrudRoutes.js)
* **Changes**: Replace hardcoded `dist.micro.required && dist.chemical.required` with `isSampleHandoverRequired(job)`:
  ```javascript
  sampleTransferState: isSampleHandoverRequired(job) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED'
  ```

#### Task 6.2: Joint Review Unlock
* **File**: [backend/routes/jobs/jobWorkflowRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/jobs/jobWorkflowRoutes.js)
* **Location**: Lines 30-66 (`approve-review` route).
* **Changes**:
  ```javascript
  if (isSampleHandoverRequired(job)) {
    job.sampleTransferState = 'PENDING_TRANSFER';
  } else {
    job.sampleTransferState = 'NOT_REQUIRED';
  }
  ```

#### Task 6.3: Filter Transfer Queues
* **File**: [backend/routes/sampleTransferRoutes.js](file:///home/archani/Projects/AIPER/backend/routes/sampleTransferRoutes.js)
* **Changes**:
  * In `GET /outgoing`: Exclude jobs where `sample.sample_count > 1`.
  * In `GET /incoming`: Exclude jobs where `sample.sample_count > 1`.

#### Task 6.4: Frontend Dispatcher Gate
* **File**: [frontend/src/pages/Head/DispatcherPage.jsx](file:///home/archani/Projects/AIPER/frontend/src/pages/Head/DispatcherPage.jsx)
* **Location**: Lines 746-755.
* **Changes**:
  ```javascript
  let canChemicalDispatch = true;
  if (iAmChemical && isMultiDept && (parseInt(job.sample?.sample_count, 10) <= 1)) {
    if (["PENDING_APPROVAL", "PENDING_TRANSFER", "IN_TRANSIT"].includes(transferState)) {
      canChemicalDispatch = false;
    }
  }
  ```
  Suppress the transfer waiting banner when `sample.sample_count > 1`.

#### Task 6.5: Frontend Timeline Track
* **File**: [frontend/src/components/JobTimeline.jsx](file:///home/archani/Projects/AIPER/frontend/src/components/JobTimeline.jsx)
* **Changes**: Only render the intermediate sample transfer box when `isSampleHandoverRequired(job)` is true.

---

## 4. Verification & Testing Checklist

| Step | Test Case | Expected Result |
|---|---|---|
| **T1** | Admin Officer edits dispatched job and adds 2 chemical parameters | Active analyst test instances are untouched; parameters appear in `pendingParamAmendments` with status `PENDING_HEAD_REVIEW` |
| **T2** | Chemical Head opens Dispatcher | Job appears with amber "Parameter Amendment" card listing the 2 new parameters |
| **T3** | Head assigns Param 1 to existing Analyst A and Param 2 to new Analyst B | Param 1 appends to Analyst A's task; sub-instance `-2b` spawns for Analyst B; `pendingParamAmendments` clears to `NONE` |
| **T4** | Head rejects parameter amendment with note *"Reagents unavailable"* | Job status remains `ACTIVE`; existing analysts continue testing; `pendingParamAmendments.status` moves to `REJECTED` |
| **T5** | Admin Officer views Job Log table | The rejected job's row shows a solid red left border, red `[Params Rejected]` badge, and red-highlighted Edit icon |
| **T6** | Admin Officer clicks Edit on the rejected job | Form opens with red alert banner showing Head's reason; rejected parameters are pre-filled in selector (no re-typing needed) |
| **T7** | Analysts complete all active tests while amendment is `REJECTED` | Completion gate triggers: Head can approve test, but job distribution status cannot mark `COMPLETED`; ULR is blocked; report download returns 400 |
| **T8** | Officer clicks "Discard Rejected Parameters" and saves | `pendingParamAmendments` resets to `NONE`; completion gate unlocks; ULR and reports generate normally |
| **T9** | Create multi-department job with `sample_count: 2` | `sampleTransferState` initializes to `NOT_REQUIRED`; both Micro and Chemical can dispatch immediately upon review approval |
| **T10** | Check Transfer Management queues | Job does not appear in Micro outgoing transfers or Chemical incoming transfers |
