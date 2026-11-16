import React from 'react';
import { 
  Clock, PlusCircle, CheckCircle, RotateCcw, Edit, RefreshCw, 
  PauseCircle, PlayCircle, FileText, Award, AlertTriangle, ShieldCheck, ArrowRightLeft 
} from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';

const ACTION_LABELS = {
  CREATED: 'Created',
  REVIEW_APPROVED: 'Review Approved',
  DISPATCHED: 'Dispatched',
  RETURNED_TO_OFFICER: 'Returned to Officer',
  RESUBMITTED: 'Resubmitted',
  RETEST_REQUESTED: 'Retest Requested',
  UPDATED: 'Job Updated',
  HELD: 'Job Placed on Hold',
  HOLD_RELEASED: 'Hold Released',
  CANCELLED: 'Job Cancelled',
  AMENDMENT_SUBMITTED: 'Amendment Submitted',
  AMENDMENT_APPROVED: 'Amendment Approved',
  AMENDMENT_REJECTED: 'Amendment Rejected',
  REPORT_UPLOADED: 'Report Uploaded',
  REPORT_REVERTED: 'Report Reverted',
  ULR_ASSIGNED: 'ULR Assigned',
  REASSIGNED_TO_ANALYST: 'Analyst Reassignment',
  COMPLETED: 'Completed',
};

export function JobHistoryTimelineContent({ history, job }) {
  // Support passing either full job object or just history array
  const baseHistory = job?.history || history || [];
  
  const reassignEvents = [];
  if (job?.testInstances && job.testInstances.length > 0) {
    // 1. Synthesize DISPATCHED event if not explicitly present in job.history
    const hasDispatchedInHistory = baseHistory.some(h => h.action === 'DISPATCHED');
    const initialDispatches = job.testInstances.filter(i => !i.parentInstanceId && i.status !== 'REOPENED');
    if (!hasDispatchedInHistory && initialDispatches.length > 0) {
      const earliest = initialDispatches.reduce((min, i) => new Date(i.createdAt) < new Date(min.createdAt) ? i : min, initialDispatches[0]);
      const analystNames = [...new Set(initialDispatches.map(i => i.assignedTo?.name).filter(Boolean))];
      const note = analystNames.length > 0
        ? `Dispatched to ${analystNames.join(', ')}`
        : 'Job dispatched to analysts';
      reassignEvents.push({
        action: 'DISPATCHED',
        timestamp: earliest.createdAt,
        by: earliest.createdBy || null,
        note,
      });
    }

    const instancesByDept = {};
    job.testInstances.forEach(inst => {
      // Skip reopened; they are not head-reassign targets
      if (inst.status === 'REOPENED') return;
      const dept = (inst.department || inst.createdBy?.department || inst.assignedTo?.department || '').toLowerCase();
      if (!dept) return;
      if (!instancesByDept[dept]) instancesByDept[dept] = [];
      instancesByDept[dept].push(inst);
    });

    Object.keys(instancesByDept).forEach(dept => {
      // Sort oldest-first
      const sorted = [...instancesByDept[dept]].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      sorted.forEach((inst, idx) => {
        const toAnalyst = inst.assignedTo?.name || 'Analyst';
        const instCreatedAt = new Date(inst.createdAt);

        if (idx === 0) {
          // First instance = initial dispatch.
          // Still capture REASSIGN_MERGED on this instance (params sent back here)
          (inst.reviewHistory || [])
            .filter(rh => rh.action === 'REASSIGN_MERGED')
            .forEach(rh => {
              reassignEvents.push({
                action: 'REASSIGNED_TO_ANALYST',
                timestamp: rh.date,
                by: rh.by,
                note: `params merged back to ${toAnalyst}`,
              });
            });
          return;
        }

        // Each subsequent instance: check if it was triggered by a reassignment
        let trigger = null;
        for (let p = idx - 1; p >= 0; p--) {
          const candidate = (sorted[p].reviewHistory || [])
            .filter(rh => ['REASSIGN', 'REASSIGN_MERGED', 'MONITOR_REASSIGN'].includes(rh.action) && new Date(rh.date) <= instCreatedAt)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          if (candidate) { trigger = candidate; break; }
        }

        // B11a FIX: Concurrent initial dispatches share the same batch,
        // have no parentInstanceId, and have no prior REASSIGN trigger.
        // They are covered by the initial dispatch, so skip synthesizing a reassignment event.
        if (!trigger && !inst.parentInstanceId) {
          (inst.reviewHistory || [])
            .filter(rh => rh.action === 'REASSIGN_MERGED')
            .forEach(rh => {
              reassignEvents.push({
                action: 'REASSIGNED_TO_ANALYST',
                timestamp: rh.date,
                by: rh.by,
                note: `params merged back to ${toAnalyst}`,
              });
            });
          return;
        }

        let fromAnalyst = null;
        if (inst.parentInstanceId) {
          const parent = job.testInstances.find(i => String(i._id) === String(inst.parentInstanceId));
          if (parent?.assignedTo?.name) fromAnalyst = parent.assignedTo.name;
        }
        if (!fromAnalyst && sorted[idx - 1]?.assignedTo?.name) {
          fromAnalyst = sorted[idx - 1].assignedTo.name;
        }

        const note = fromAnalyst && fromAnalyst !== toAnalyst
          ? `from ${fromAnalyst} to ${toAnalyst}`
          : `to ${toAnalyst}`;

        reassignEvents.push({
          action: 'REASSIGNED_TO_ANALYST',
          timestamp: inst.createdAt,
          by: trigger?.by || inst.createdBy || null,
          note,
        });

        // Also capture any REASSIGN_MERGED on this non-primary instance
        (inst.reviewHistory || [])
          .filter(rh => rh.action === 'REASSIGN_MERGED')
          .forEach(rh => {
            reassignEvents.push({
              action: 'REASSIGNED_TO_ANALYST',
              timestamp: rh.date,
              by: rh.by,
              note: `params merged back to ${toAnalyst}`,
            });
          });
      });
    });

    // B11c FIX: Second pass for in-place reassignments (revisions returned to the same analyst)
    const childCreatedTimes = new Set(
      job.testInstances
        .filter(i => i.parentInstanceId)
        .map(i => new Date(i.createdAt).getTime())
    );

    job.testInstances
      .filter(inst => !['REOPENED', 'CANCELLED'].includes(inst.status))
      .forEach(inst => {
        const analystName = inst.assignedTo?.name || 'Analyst';
        (inst.reviewHistory || [])
          .filter(rh => rh.action === 'REASSIGN')
          .forEach(rh => {
            const rhTime = new Date(rh.date).getTime();
            // If this REASSIGN triggered the creation of a child instance (within 5s), skip
            const triggeredChild = [...childCreatedTimes].some(t => Math.abs(t - rhTime) < 5000);
            if (triggeredChild) return;

            reassignEvents.push({
              action: 'REASSIGNED_TO_ANALYST',
              timestamp: rh.date,
              by: rh.by,
              note: `returned for revision to ${analystName}${rh.note ? ': ' + rh.note.trim() : ''}`,
            });
          });
      });
  }

  const historyData = [...baseHistory, ...reassignEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATED': return <PlusCircle size={16} />;
      case 'REVIEW_APPROVED': return <ShieldCheck size={16} />;
      case 'DISPATCHED': return <CheckCircle size={16} />;
      case 'RETURNED_TO_OFFICER': return <RotateCcw size={16} />;
      case 'RESUBMITTED': return <RefreshCw size={16} />;
      case 'UPDATED': return <Edit size={16} />;
      case 'RETEST_REQUESTED': return <RotateCcw size={16} />;
      case 'HELD': return <PauseCircle size={16} />;
      case 'HOLD_RELEASED': return <PlayCircle size={16} />;
      case 'CANCELLED': return <AlertTriangle size={16} />;
      case 'AMENDMENT_SUBMITTED': return <Edit size={16} />;
      case 'AMENDMENT_APPROVED': return <CheckCircle size={16} />;
      case 'AMENDMENT_REJECTED': return <AlertTriangle size={16} />;
      case 'REPORT_UPLOADED': return <FileText size={16} />;
      case 'REPORT_REVERTED': return <RotateCcw size={16} />;
      case 'ULR_ASSIGNED': return <Award size={16} />;
      case 'REASSIGNED_TO_ANALYST': return <ArrowRightLeft size={16} />;
      case 'COMPLETED': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATED': return 'var(--color-primary)';
      case 'REVIEW_APPROVED': return '#10B981';
      case 'DISPATCHED': return '#10B981';
      case 'RETURNED_TO_OFFICER': return '#EF4444';
      case 'RESUBMITTED': return '#F59E0B';
      case 'UPDATED': return '#3B82F6';
      case 'RETEST_REQUESTED': return '#F59E0B';
      case 'HELD': return '#F59E0B';
      case 'HOLD_RELEASED': return '#10B981';
      case 'CANCELLED': return '#EF4444';
      case 'AMENDMENT_SUBMITTED': return '#8B5CF6';
      case 'AMENDMENT_APPROVED': return '#10B981';
      case 'AMENDMENT_REJECTED': return '#EF4444';
      case 'REPORT_UPLOADED': return '#10B981';
      case 'REPORT_REVERTED': return '#F59E0B';
      case 'ULR_ASSIGNED': return '#10B981';
      case 'REASSIGNED_TO_ANALYST': return '#F59E0B';
      case 'COMPLETED': return '#10B981';
      default: return 'var(--color-text-muted)';
    }
  };

  return (
    <div style={{ padding: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      {historyData.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No history available for this job.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          {/* Vertical line connecting timeline dots */}
          <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', backgroundColor: 'var(--color-border)', zIndex: 0 }} />
          
          {historyData.map((event, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                minWidth: '32px', height: '32px', borderRadius: '50%', 
                backgroundColor: 'white', border: `2px solid ${getActionColor(event.action)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: getActionColor(event.action)
              }}>
                {getActionIcon(event.action)}
              </div>
              
              <div style={{ flex: 1, backgroundColor: 'var(--color-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: getActionColor(event.action) }}>
                    {ACTION_LABELS[event.action] || event.action.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {formatDateTime(event.timestamp)}
                  </div>
                </div>
                
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>By:</span> 
                  <span style={{ fontWeight: 500 }}>{event.by?.name || 'System'}</span>
                </div>
                
                {event.note && (
                  <div style={{ fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${getActionColor(event.action)}` }}>
                    <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Note: </span>
                    {event.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Opens the Job History Timeline using the dynamic modal engine (modal.custom).
 */
export function openJobHistoryModal(modal, job) {
  if (!modal || !modal.custom) {
    console.error("modal.custom is required to open job history modal");
    return;
  }

  return modal.custom({
    title: (
      <div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Job History Timeline
        </div>
        {job && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(44, 62, 80, 0.07)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              letterSpacing: '0.04em',
            }}>
              {job.jobCode}
            </span>
            <span style={{ color: 'var(--color-border)', fontSize: '0.9rem' }}>·</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {job.clientName}
            </span>
          </div>
        )}
      </div>
    ),
    icon: <Clock size={22} color="var(--color-primary)" />,
    accentColor: 'var(--color-primary)',
    wide: true,
    content: () => <JobHistoryTimelineContent job={job} />,
  });
}

export default openJobHistoryModal;
