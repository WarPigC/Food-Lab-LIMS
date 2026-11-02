import React, { useState, useContext } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Filter,
  Clock,
  XCircle,
  Edit,
  FileText,
  PauseCircle,
  Loader2,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderMinus,
  Trash2,
  CheckSquare,
  Square,
  Check,
  X,
} from "lucide-react";
import axios from "axios";
import API_URL from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import JobTimeline from "./JobTimeline";
import GlobalJobHistory, { openJobHistoryModal } from "./GlobalJobHistory";
import AssignmentHistory from "./AssignmentHistory";
import ReportModal from "./ReportModal";
import InfiniteScroll from "./InfiniteScroll";
import { formatJobCode } from "../utils/serialUtils";
import { formatDate } from "../utils/dateUtils";
import { useModal } from "../hooks/useModal";

function GroupNamingModalContent({ message, defaultValue = "", confirmLabel = "Save", resolve, close }) {
  const [name, setName] = useState(defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    resolve(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "0.25rem" }}>
      {message && (
        <div style={{ fontSize: "0.92rem", color: "var(--color-text-muted)" }}>
          {message}
        </div>
      )}
      <div>
        <input
          type="text"
          className="modal-input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. October Batch"
          required
          autoFocus
          style={{ width: "100%" }}
        />
      </div>
      <div className="modal-footer" style={{ margin: 0, padding: 0 }}>
        <button
          type="button"
          className="btn btn-secondary modal-btn"
          onClick={() => resolve(null)}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary modal-btn"
          disabled={!name.trim()}
        >
          {confirmLabel}
        </button>
      </div>
    </form>
  );
}

export default function JobLogTable({
  jobs,
  title = "Job Logs",
  enableGrouping = false,
  onMergeJobs,
  onReopen,
  onDeleteJob,
  onEditJob,
  onHoldJob,
  editingJobId,
  loadingJobId,
  defaultExpandedId,
  hasMoreData,
  onLoadMoreData,
  isLoadingMoreData,
  onServerSearch,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedJobId, setExpandedJobId] = useState(defaultExpandedId || null);
  const [openActionJobId, setOpenActionJobId] = useState(null);
  const [closingActionJobId, setClosingActionJobId] = useState(null);
  const closeTimerRef = React.useRef(null);
  const [page, setPage] = useState(1);
  // True during the debounce window, prevents the local filter from showing
  // a false "no results" against stale data before the server responds
  const [serverSearchPending, setServerSearchPending] = useState(false);
  const PAGE_SIZE = 15;

  const closeActionDropdown = React.useCallback(() => {
    if (!openActionJobId) return;
    setClosingActionJobId(openActionJobId);
    setOpenActionJobId(null);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setClosingActionJobId(null);
    }, 300);
  }, [openActionJobId]);

  const toggleActionDropdown = React.useCallback((jobId) => {
    if (openActionJobId === jobId) {
      closeActionDropdown();
    } else {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setClosingActionJobId(null);
      setOpenActionJobId(jobId);
    }
  }, [openActionJobId, closeActionDropdown]);

  React.useEffect(() => {
    if (!openActionJobId) return;
    const handleClickOutside = () => closeActionDropdown();
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [openActionJobId, closeActionDropdown]);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (groupCloseTimerRef.current) clearTimeout(groupCloseTimerRef.current);
    };
  }, []);

  const { user, updateJobGroups } = useContext(AuthContext) || {};
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [selectionAnchorId, setSelectionAnchorId] = useState(null);
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [closingGroupId, setClosingGroupId] = useState(null);
  const groupCloseTimerRef = React.useRef(null);
  const [loadingGroupId, setLoadingGroupId] = useState(null);
  const [subRangeRemovingGroupId, setSubRangeRemovingGroupId] = useState(null);

  const GROUP_COLORS = [
    "#3B82F6",
    "#10B981",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
    "#06B6D4",
    "#6366F1",
  ];

  const jobGroups = (enableGrouping && user?.jobGroups) ? user.jobGroups : [];

  const getJobSerial = (jobOrCode) => {
    if (!jobOrCode) return null;
    if (typeof jobOrCode === "number") {
      return jobOrCode % 10000;
    }
    if (typeof jobOrCode === "object") {
      if (typeof jobOrCode.sampleSerial === "number") {
        return jobOrCode.sampleSerial % 10000;
      }
      jobOrCode = jobOrCode.jobCode || jobOrCode.sample?.sample_id;
    }
    const clean = String(jobOrCode || "").replace(/-.*/, "").trim();
    if (clean.length >= 4) {
      const num = parseInt(clean.slice(-4), 10);
      if (!isNaN(num)) return num;
    } else if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  const isJobInGroup = (jobOrCode, group) => {
    if (!jobOrCode || !group) return false;
    const serial = getJobSerial(jobOrCode);
    const minSerial = group.startSerial ?? getJobSerial(group.startJobCode);
    const maxSerial = group.endSerial ?? getJobSerial(group.endJobCode);
    if (serial !== null && minSerial !== null && maxSerial !== null) {
      const min = Math.min(minSerial, maxSerial);
      const max = Math.max(minSerial, maxSerial);
      if (serial < min || serial > max) return false;

      const code = typeof jobOrCode === "object" ? jobOrCode.jobCode : String(jobOrCode);
      if (code && group.startJobCode && group.endJobCode) {
        const gYearStart = String(group.startJobCode).slice(0, 2);
        const gYearEnd = String(group.endJobCode).slice(0, 2);
        if (gYearStart === gYearEnd && gYearStart.length === 2 && !isNaN(parseInt(gYearStart, 10))) {
          const jYear = String(code).slice(0, 2);
          if (jYear !== gYearStart) return false;
        }
      }
      return true;
    }
    const code = typeof jobOrCode === "object" ? jobOrCode.jobCode : String(jobOrCode);
    const minCode = group.startJobCode < group.endJobCode ? group.startJobCode : group.endJobCode;
    const maxCode = group.startJobCode < group.endJobCode ? group.endJobCode : group.startJobCode;
    return code >= minCode && code <= maxCode;
  };

  const findGroupForJob = (jobOrCode) => {
    return jobGroups.find(g => isJobInGroup(jobOrCode, g));
  };

  const clearSelection = () => {
    setIsSelectingRange(false);
    setSelectionAnchorId(null);
    setSelectedJobIds(new Set());
    setSubRangeRemovingGroupId(null);
  };

  const handleStartGrouping = (job) => {
    closeActionDropdown();
    setIsSelectingRange(true);
    setSelectionAnchorId(job._id);
    setSelectedJobIds(new Set([job._id]));
  };

  const handleJobSelectionClick = (job, e) => {
    if (e) e.stopPropagation();
    if (!selectionAnchorId) {
      setSelectionAnchorId(job._id);
      setSelectedJobIds(new Set([job._id]));
      return;
    }

    const anchorIdx = visibleJobs.findIndex(j => j._id === selectionAnchorId);
    const targetIdx = visibleJobs.findIndex(j => j._id === job._id);

    if (anchorIdx === -1 || targetIdx === -1) {
      setSelectionAnchorId(job._id);
      setSelectedJobIds(new Set([job._id]));
      return;
    }

    const startIdx = Math.min(anchorIdx, targetIdx);
    const endIdx = Math.max(anchorIdx, targetIdx);
    const slice = visibleJobs.slice(startIdx, endIdx + 1);
    setSelectedJobIds(new Set(slice.map(j => j._id)));
  };

  const handleToggleJobInSelection = (jobId, e) => {
    if (e) e.stopPropagation();
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
        if (next.size === 0) {
          clearSelection();
        }
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (selectedJobIds.size === 0) return;
    const selectedList = visibleJobs.filter(j => selectedJobIds.has(j._id));
    if (selectedList.length === 0) return;

    const hasCollision = selectedList.some(j => findGroupForJob(j));
    if (hasCollision) {
      await modal.error({
        title: "Range Conflict",
        message: "One or more of the selected jobs already belong to an existing group."
      });
      return;
    }

    const sortedBySerial = [...selectedList].sort((a, b) => {
      const sA = getJobSerial(a) ?? 0;
      const sB = getJobSerial(b) ?? 0;
      if (sA !== sB) return sA - sB;
      return (a.jobCode || "").localeCompare(b.jobCode || "");
    });

    const minSerial = getJobSerial(sortedBySerial[0]);
    const maxSerial = getJobSerial(sortedBySerial[sortedBySerial.length - 1]);
    const minCode = sortedBySerial[0].jobCode;
    const maxCode = sortedBySerial[sortedBySerial.length - 1].jobCode;

    const name = await modal.custom({
      title: "Create Job Group",
      icon: <FolderPlus size={22} style={{ color: "var(--color-primary)" }} />,
      accentColor: "var(--color-primary, #2563EB)",
      content: ({ resolve, close }) => (
        <GroupNamingModalContent
          message={`Enter a name for this group (${selectedList.length} jobs):`}
          confirmLabel="Create Group"
          resolve={resolve}
          close={close}
        />
      ),
    });

    if (!name || !name.trim()) return;

    const color = GROUP_COLORS[jobGroups.length % GROUP_COLORS.length];
    const newGroup = {
      id: `grp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      startJobCode: minCode,
      endJobCode: maxCode,
      startSerial: minSerial,
      endSerial: maxSerial,
      count: selectedList.length,
      color,
      isCollapsed: true,
      createdAt: new Date().toISOString()
    };

    if (updateJobGroups) {
      await updateJobGroups([...jobGroups, newGroup]);
    }
    clearSelection();
  };

  const handleRenameGroup = async (group, e) => {
    if (e) e.stopPropagation();
    const newName = await modal.custom({
      title: "Rename Job Group",
      icon: <Folder size={22} style={{ color: group.color || "var(--color-primary)" }} />,
      accentColor: group.color || "var(--color-primary, #2563EB)",
      content: ({ resolve, close }) => (
        <GroupNamingModalContent
          message="Enter the new name for this group:"
          defaultValue={group.name}
          confirmLabel="Rename"
          resolve={resolve}
          close={close}
        />
      ),
    });
    if (!newName || !newName.trim() || newName.trim() === group.name) return;

    const updated = jobGroups.map(g => g.id === group.id ? { ...g, name: newName.trim() } : g);
    if (updateJobGroups) {
      await updateJobGroups(updated);
    }
  };

  const handleDisbandGroup = async (group, e) => {
    if (e) e.stopPropagation();
    const confirmed = await modal.confirm({
      title: "Disband Group",
      message: `Are you sure you want to disband "${group.name}"? Jobs will remain as individual items.`,
      variant: "warning",
      confirmText: "Disband"
    });
    if (!confirmed) return;

    const updated = jobGroups.filter(g => g.id !== group.id);
    if (expandedGroupId === group.id) setExpandedGroupId(null);
    if (updateJobGroups) {
      await updateJobGroups(updated);
    }
  };

  const toggleGroupExpand = async (group) => {
    if (expandedGroupId === group.id) {
      setClosingGroupId(group.id);
      setExpandedGroupId(null);
      if (groupCloseTimerRef.current) clearTimeout(groupCloseTimerRef.current);
      groupCloseTimerRef.current = setTimeout(() => {
        setClosingGroupId(null);
      }, 210);
      return;
    }

    if (groupCloseTimerRef.current) clearTimeout(groupCloseTimerRef.current);
    setClosingGroupId(null);
    setExpandedGroupId(group.id);

    // On-demand fetch if missing jobs in range
    const loadedCount = jobs.filter(j => isJobInGroup(j, group)).length;

    if (loadedCount < group.count) {
      setLoadingGroupId(group.id);
      try {
        const startSer = group.startSerial ?? getJobSerial(group.startJobCode);
        const endSer = group.endSerial ?? getJobSerial(group.endJobCode);
        const queryParams = new URLSearchParams({
          includeCancelled: "true",
          rangeStart: group.startJobCode,
          rangeEnd: group.endJobCode,
        });
        if (startSer !== null && endSer !== null) {
          queryParams.set("startSerial", String(startSer));
          queryParams.set("endSerial", String(endSer));
        }
        const res = await axios.get(`${API_URL}/api/jobs?${queryParams.toString()}`);
        if (res.data?.jobs && onMergeJobs) {
          onMergeJobs(res.data.jobs);
        }
      } catch (err) {
        console.error("Failed to load range for group:", err);
      } finally {
        setLoadingGroupId(null);
      }
    }
  };

  const handleStartSubRangeRemoval = (group, job) => {
    closeActionDropdown();
    setSubRangeRemovingGroupId(group.id);
    setIsSelectingRange(true);
    setSelectionAnchorId(job._id);
    setSelectedJobIds(new Set([job._id]));
  };

  const handleConfirmSubRangeRemoval = async () => {
    const group = jobGroups.find(g => g.id === subRangeRemovingGroupId);
    if (!group) {
      clearSelection();
      return;
    }

    const groupJobs = visibleJobs.filter(j => isJobInGroup(j, group));
    const selectedCount = selectedJobIds.size;

    // Case 1: All jobs selected, disband
    if (selectedCount >= groupJobs.length) {
      const confirmed = await modal.confirm({
        title: "Disband Group",
        message: `All jobs in "${group.name}" are selected. This will disband the group. Proceed?`,
        variant: "warning",
        confirmText: "Disband"
      });
      if (confirmed) {
        const updated = jobGroups.filter(g => g.id !== group.id);
        if (expandedGroupId === group.id) setExpandedGroupId(null);
        if (updateJobGroups) await updateJobGroups(updated);
      }
      clearSelection();
      return;
    }

    // Remaining jobs after removal
    const remainingJobs = groupJobs.filter(j => !selectedJobIds.has(j._id));
    if (remainingJobs.length === 0) {
      clearSelection();
      return;
    }

    const sortedRemaining = [...remainingJobs].sort((a, b) => (getJobSerial(a) || 0) - (getJobSerial(b) || 0));
    
    // Check if contiguous in visibleJobs sequence
    let isSplit = false;
    let splitIdx = -1;
    for (let i = 0; i < sortedRemaining.length - 1; i++) {
      const idxA = visibleJobs.findIndex(j => j._id === sortedRemaining[i]._id);
      const idxB = visibleJobs.findIndex(j => j._id === sortedRemaining[i + 1]._id);
      if (idxB - idxA > 1) {
        isSplit = true;
        splitIdx = i;
        break;
      }
    }

    if (isSplit && splitIdx !== -1) {
      const part1 = sortedRemaining.slice(0, splitIdx + 1);
      const part2 = sortedRemaining.slice(splitIdx + 1);

      const confirmed = await modal.confirm({
        title: "Split Group",
        message: `Removing middle jobs will split "${group.name}" into two groups ("${group.name} - Part 1" and "${group.name} - Part 2"). Proceed?`,
        confirmText: "Split & Remove"
      });

      if (!confirmed) return;

      const group1 = {
        ...group,
        id: `grp_${Date.now()}_1`,
        name: `${group.name} - Part 1`,
        startJobCode: part1[0].jobCode < part1[part1.length - 1].jobCode ? part1[0].jobCode : part1[part1.length - 1].jobCode,
        endJobCode: part1[0].jobCode < part1[part1.length - 1].jobCode ? part1[part1.length - 1].jobCode : part1[0].jobCode,
        startSerial: getJobSerial(part1[0]),
        endSerial: getJobSerial(part1[part1.length - 1]),
        count: part1.length,
      };

      const group2 = {
        ...group,
        id: `grp_${Date.now()}_2`,
        name: `${group.name} - Part 2`,
        startJobCode: part2[0].jobCode < part2[part2.length - 1].jobCode ? part2[0].jobCode : part2[part2.length - 1].jobCode,
        endJobCode: part2[0].jobCode < part2[part2.length - 1].jobCode ? part2[part2.length - 1].jobCode : part2[0].jobCode,
        startSerial: getJobSerial(part2[0]),
        endSerial: getJobSerial(part2[part2.length - 1]),
        count: part2.length,
      };

      const updated = jobGroups.map(g => g.id === group.id ? group1 : g).concat(group2);
      if (updateJobGroups) await updateJobGroups(updated);
    } else {
      const minRem = sortedRemaining[0].jobCode;
      const maxRem = sortedRemaining[sortedRemaining.length - 1].jobCode;
      const trimmedGroup = {
        ...group,
        startJobCode: minRem,
        endJobCode: maxRem,
        startSerial: getJobSerial(sortedRemaining[0]),
        endSerial: getJobSerial(sortedRemaining[sortedRemaining.length - 1]),
        count: sortedRemaining.length,
      };
      const updated = jobGroups.map(g => g.id === group.id ? trimmedGroup : g);
      if (updateJobGroups) await updateJobGroups(updated);
    }

    clearSelection();
  };

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // Debounced server search
  React.useEffect(() => {
    if (!onServerSearch) return;
    if (searchTerm) setServerSearchPending(true);
    const timeoutId = setTimeout(() => {
      setServerSearchPending(false);
      onServerSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, onServerSearch]);

  React.useEffect(() => {
    if (defaultExpandedId) {
      setExpandedJobId(defaultExpandedId);
      setTimeout(() => {
        const row = document.getElementById(`job-row-${defaultExpandedId}`);
        if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [defaultExpandedId]);

  // Helper to determine a simple global status for a job
  const getJobStatus = (job) => {
    if (job.status === "ON_HOLD") return "ON_HOLD";
    if (job.status === "CANCELLED") return "CANCELLED";
    
    let statuses = [];
    if (job.distribution?.micro?.required)
      statuses.push(job.distribution.micro.status);
    if (job.distribution?.chemical?.required)
      statuses.push(job.distribution.chemical.status);

    if (statuses.length === 0) return "PENDING";
    if (statuses.some((s) => s === "RETURNED")) return "RETURNED";
    if (statuses.every((s) => s === "COMPLETED")) return "COMPLETED";
    if (statuses.every((s) => s === "PENDING")) return "PENDING";
    // Any mix (e.g. one COMPLETED + one PENDING, or any ASSIGNED_TO_ASSISTANT) = in progress
    return "IN_PROGRESS";
  };

  // Group jobs: only show ROOT jobs in the main table. Child jobs will be fetched/passed inside JobTimeline.
  const rootJobs = jobs.filter((j) => !j.isRetest);

  // When server search is active, skip local filtering entirely —
  // the server owns the result set. Only apply local status filter.
  const filteredJobsAll = (onServerSearch && searchTerm)
    ? rootJobs.filter((j) => {
        const jobStatus = getJobStatus(j);
        return statusFilter === "ALL" || jobStatus === statusFilter;
      })
    : rootJobs.filter((j) => {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          j.jobCode.toLowerCase().includes(term) ||
          j.clientName.toLowerCase().includes(term);
        const jobStatus = getJobStatus(j);
        const matchStatus = statusFilter === "ALL" || jobStatus === statusFilter;
        return matchSearch && matchStatus;
      });

  const totalPages = Math.ceil(filteredJobsAll.length / PAGE_SIZE);
  const visibleJobs = filteredJobsAll.slice(0, page * PAGE_SIZE);

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage(p => p + 1);
      
      // Proactive Pre-fetching:
      // If we are now on the last page of our locally loaded data, 
      // fire the network request for the next batch in the background.
      // This hides the 2-second API delay completely!
      if (page + 1 >= totalPages && hasMoreData && onLoadMoreData && !isLoadingMoreData) {
        onLoadMoreData();
      }
    } else if (hasMoreData && onLoadMoreData && !isLoadingMoreData) {
      onLoadMoreData();
      // Increase page immediately so the newly loaded data shows up
      setPage(p => p + 1);
    }
  };

  const toggleExpand = (id) => {
    setExpandedJobId(expandedJobId === id ? null : id);
  };

  const modal = useModal();
  const [selectedReportJob, setSelectedReportJob] = useState(null);

  const StatusBadge = ({ status, isLoading }) => {
    if (isLoading) {
      return (
        <span
          className="badge badge-warning"
          style={{ backgroundColor: "#FEF3C7", color: "#D97706", display: 'inline-flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}
        >
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
          Updating...
        </span>
      );
    }

    switch (status) {
      case "ON_HOLD":
        return (
          <span
            className="badge"
            style={{ backgroundColor: "#F59E0B", color: "white" }}
          >
            Held
          </span>
        );
      case "COMPLETED":
        return <span className="badge badge-success">Completed</span>;
      case "IN_PROGRESS":
        return <span className="badge badge-warning">In Progress</span>;
      case "REOPENED":
        return (
          <span
            className="badge badge-warning"
            style={{ backgroundColor: "#f59e0b" }}
          >
            Reopened
          </span>
        );
      case "RETURNED":
        return (
          <span
            className="badge"
            style={{ backgroundColor: "#EF4444", color: "white" }}
          >
            Returned
          </span>
        );
      case "CANCELLED":
        return (
          <span
            className="badge"
            style={{ backgroundColor: "#64748B", color: "white" }}
          >
            Cancelled
          </span>
        );
      default:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "var(--color-border)",
              color: "var(--color-text-main)",
            }}
          >
            Pending
          </span>
        );
    }
  };



  const showActions =
    !!onDeleteJob ||
    !!onEditJob ||
    enableGrouping ||
    jobs.some((j) => j.history && j.history.length > 0) ||
    jobs.some((j) => getJobStatus(j) === "COMPLETED");

  // Prepare display items for grouping partition
  const displayItems = [];
  const renderedGroupIds = new Set();

  visibleJobs.forEach((job, index) => {
    const group = enableGrouping ? findGroupForJob(job) : null;
    if (!group) {
      displayItems.push({ type: "job", job, index, isGrouped: false });
    } else {
      if (!renderedGroupIds.has(group.id)) {
        renderedGroupIds.add(group.id);
        displayItems.push({ type: "group-header", group });
        const isGroupOpen = expandedGroupId === group.id || closingGroupId === group.id;
        if (isGroupOpen) {
          const groupMemberJobs = filteredJobsAll
            .filter((j) => isJobInGroup(j, group))
            .sort((a, b) => {
              const sA = getJobSerial(a) || 0;
              const sB = getJobSerial(b) || 0;
              if (sA !== sB) return sB - sA;
              return (b.jobCode || "").localeCompare(a.jobCode || "");
            });
          groupMemberJobs.forEach((mJob, mIdx) => {
            displayItems.push({
              type: "job",
              job: mJob,
              index: mIdx,
              isGrouped: true,
              group,
              isClosing: closingGroupId === group.id,
              groupIndex: mIdx,
            });
          });
        }
      }
    }
  });

  if (enableGrouping && !searchTerm && statusFilter === "ALL") {
    jobGroups.forEach((g) => {
      if (!renderedGroupIds.has(g.id)) {
        renderedGroupIds.add(g.id);
        displayItems.push({ type: "group-header", group: g });
        const isGroupOpen = expandedGroupId === g.id || closingGroupId === g.id;
        if (isGroupOpen) {
          const groupMemberJobs = filteredJobsAll
            .filter((j) => isJobInGroup(j, g))
            .sort((a, b) => {
              const sA = getJobSerial(a) || 0;
              const sB = getJobSerial(b) || 0;
              if (sA !== sB) return sB - sA;
              return (b.jobCode || "").localeCompare(a.jobCode || "");
            });
          groupMemberJobs.forEach((mJob, mIdx) => {
            displayItems.push({
              type: "job",
              job: mJob,
              index: mIdx,
              isGrouped: true,
              group: g,
              isClosing: closingGroupId === g.id,
              groupIndex: mIdx,
            });
          });
        }
      }
    });
  }

  return (
    <div className="card" style={{ padding: "0", overflow: "hidden" }}>
      <div
        style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--color-surface)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h2 style={{ margin: 0, width: "100%" }}>{title}</h2>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search Client or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: "2.2rem",
                paddingRight: "1rem",
                paddingBottom: "0.4rem",
                paddingTop: "0.4rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <Filter
              size={18}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                paddingLeft: "2.2rem",
                appearance: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                paddingBottom: "0.4rem",
                paddingTop: "0.4rem",
              }}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RETURNED">Returned</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div
        className="hide-on-mobile"
        style={{ overflowX: "auto", overflowY: "hidden", width: "100%" }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            minWidth: "850px",
          }}
        >
          <colgroup>
            <col style={{ width: "45px" }} />
            <col style={{ width: "170px" }} />
            <col />
            <col style={{ width: "145px" }} />
            <col style={{ width: "145px" }} />
            {showActions && <col style={{ width: "135px" }} />}
          </colgroup>
          <thead style={{ backgroundColor: "var(--color-surface-hover)" }}>
            <tr>
              <th style={{ width: "45px", textAlign: "center" }}></th>
              <th style={{ width: "170px", textAlign: "center", whiteSpace: "nowrap" }}>Job Code</th>
              <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Client Name</th>
              <th style={{ width: "145px", textAlign: "center", whiteSpace: "nowrap" }}>Date Created</th>
              <th style={{ width: "145px", textAlign: "center", whiteSpace: "nowrap" }}>Overall Status</th>
              {showActions && <th style={{ width: "135px", textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayItems.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? 6 : 5}
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  {serverSearchPending || isLoadingMoreData
                    ? null
                    : "No jobs match your filters."}
                </td>
              </tr>
            ) : (
              displayItems.map((item) => {
                if (item.type === "group-header") {
                  const group = item.group;
                  const isExpanded = expandedGroupId === group.id;
                  const isLoading = loadingGroupId === group.id;

                  return (
                    <React.Fragment key={`group-${group.id}`}>
                      <tr
                        id={`group-row-${group.id}`}
                        className="group-header-row"
                        onClick={() => toggleGroupExpand(group)}
                        style={{
                          backgroundColor: "#ffffff",
                          borderBottom: "1px solid var(--color-border)",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ textAlign: "center", verticalAlign: "middle", position: "relative", padding: 0 }}>
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: "4px",
                              backgroundColor: group.color,
                            }}
                          />
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              verticalAlign: "middle",
                            }}
                          >
                            <ChevronDown
                              size={20}
                              style={{
                                color: isExpanded ? group.color : "var(--color-text-muted)",
                                transition: "transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), color 0.18s ease",
                                transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                              }}
                            />
                          </div>
                        </td>
                        <td colSpan={showActions ? 5 : 4} style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {isExpanded ? (
                                  <FolderOpen size={20} style={{ color: group.color }} />
                                ) : (
                                  <Folder size={20} style={{ color: group.color }} />
                                )}
                                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                                  {group.name}
                                </span>
                              </div>

                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.25rem 0.75rem",
                                  borderRadius: "9999px",
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  backgroundColor: "var(--color-surface-hover, #F1F5F9)",
                                  color: "var(--color-text-muted, #475569)",
                                  border: "1px solid var(--color-border, #E2E8F0)",
                                }}
                              >
                                {group.count} Job(s). {formatJobCode(group.startJobCode)} to {formatJobCode(group.endJobCode)}
                              </span>

                              {isLoading && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                  <Loader2 size={13} className="spin" /> Loading range...
                                </span>
                              )}
                            </div>

                            {showActions && (
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginRight: "1rem",
                                  flexShrink: 0,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleRenameGroup(group, e)}
                                  style={{
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface, #fff)",
                                    borderRadius: "6px",
                                    padding: "0.45rem 0.75rem",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    color: "var(--color-text-main)",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                  }}
                                  title="Rename Group"
                                >
                                  Rename
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleDisbandGroup(group, e)}
                                  style={{
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    background: "rgba(239, 68, 68, 0.06)",
                                    borderRadius: "6px",
                                    padding: "0.45rem 0.75rem",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    color: "var(--color-danger, #EF4444)",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                  }}
                                  title="Disband Group"
                                >
                                  Disband
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                }

                const job = item.job;
                const index = item.index;
                const isGrouped = item.isGrouped;
                const group = item.group;
                const isSelected = selectedJobIds.has(job._id);

                return (
                <React.Fragment key={job._id}>
                  <tr
                    id={`job-row-${job._id}`}
                    className={isGrouped ? `grouped-job-row ${item.isClosing ? "is-closing" : ""}` : ""}
                    style={{
                      "--item-idx": item.groupIndex ?? 0,
                      cursor: "pointer",
                      borderBottom:
                        expandedJobId === job._id
                          ? "none"
                          : "1px solid var(--color-border)",
                      ...(isSelected && {
                        backgroundColor: `${group ? group.color : "var(--color-primary, #2563EB)"}15`,
                      }),
                      ...(editingJobId === job._id && !isSelected && {
                        backgroundColor: "rgba(245, 158, 11, 0.06)",
                        boxShadow: "inset 4px 0 0 var(--color-warning)",
                      }),
                      ...(job.pendingParamAmendments?.status === "REJECTED" && !isSelected && {
                        backgroundColor: "rgba(239, 68, 68, 0.05)",
                        boxShadow: "inset 4px 0 0 var(--color-danger)",
                      }),
                    }}
                    onClick={(e) => {
                      if (isSelectingRange) {
                        handleJobSelectionClick(job, e);
                      } else {
                        toggleExpand(job._id);
                      }
                    }}
                  >
                    <td
                      style={{ textAlign: "center", verticalAlign: "middle", position: "relative", padding: 0 }}
                      onClick={(e) => {
                        if (isSelectingRange) {
                          handleToggleJobInSelection(job._id, e);
                        }
                      }}
                    >
                      {isGrouped && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: "4px",
                            backgroundColor: group.color,
                          }}
                        />
                      )}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "20px",
                          height: "20px",
                          verticalAlign: "middle",
                        }}
                      >
                        {isSelectingRange ? (
                          <div
                            role="checkbox"
                            aria-checked={isSelected}
                            style={{
                              width: "20px",
                              height: "20px",
                              minWidth: "20px",
                              minHeight: "20px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              boxSizing: "border-box",
                              position: "relative",
                              transition: "all 0.15s ease",
                              ...(isSelected
                                ? {
                                    backgroundColor: group ? group.color : "var(--color-primary, #2563EB)",
                                    border: `2px solid ${group ? group.color : "var(--color-primary, #2563EB)"}`,
                                    color: "#ffffff",
                                  }
                                : {
                                    backgroundColor: "var(--color-surface, #ffffff)",
                                    border: "2px solid #94A3B8",
                                  }),
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleJobInSelection(job._id, e)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                opacity: 0,
                                width: "100%",
                                height: "100%",
                                margin: 0,
                                cursor: "pointer",
                              }}
                            />
                            {isSelected && <Check size={14} strokeWidth={3} color="#ffffff" />}
                          </div>
                        ) : expandedJobId === job._id ? (
                          <ChevronDown size={20} color="var(--color-primary)" />
                        ) : (
                          <ChevronRight
                            size={20}
                            color="var(--color-text-muted)"
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "left", paddingLeft: "1.25rem", fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
                      <span>
                        {formatJobCode(job.jobCode)}
                      </span>
                      {job.pendingParamAmendments?.status === "REJECTED" && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.7rem",
                            padding: "0.1rem 0.4rem",
                            backgroundColor: "var(--color-danger)",
                            color: "white",
                            borderRadius: "4px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Parameter(s) Rejected
                        </span>
                      )}
                    </td>
                    <td
                      title={job.clientName}
                      style={{
                        textAlign: "left",
                        paddingLeft: "1rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {job.clientName}
                    </td>
                    <td style={{ textAlign: "left", paddingLeft: "1.25rem", whiteSpace: "nowrap" }}>
                      {formatDate(job.createdAt)}
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <StatusBadge
                        status={
                          job.status === "ON_HOLD"
                            ? "ON_HOLD"
                            : job.status === "CANCELLED"
                            ? "CANCELLED"
                            : getJobStatus(job)
                        }
                        isLoading={loadingJobId === job._id}
                      />
                    </td>
                    {showActions && (
                      <td
                        style={{
                          padding: 0,
                          position: "relative",
                          verticalAlign: "middle",
                          height: "1px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "flex-end",
                            height: "100%",
                            minHeight: "48px",
                            position: "relative",
                          }}
                        >
                          {getJobStatus(job) === "COMPLETED" && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                paddingLeft: "0.5rem",
                                paddingRight: "0.25rem",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReportJob(job);
                                }}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  fontSize: "0.8rem",
                                  background:
                                    "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  fontWeight: 600,
                                  boxShadow: "0 2px 6px rgba(124, 58, 237, 0.2)",
                                  transition: "transform 0.1s",
                                }}
                                title="View & Download Report"
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.transform = "scale(1.05)")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.transform = "scale(1)")
                                }
                              >
                                <FileText size={14} /> Report
                              </button>
                            </div>
                          )}

                          {(() => {
                            const hasHistory = job.history?.length > 0;
                            const canEdit = onEditJob && !["COMPLETED", "CANCELLED"].includes(getJobStatus(job));
                            const canHold = onHoldJob && !["ON_HOLD", "COMPLETED", "CANCELLED"].includes(getJobStatus(job));
                            const canCancel = onDeleteJob && !["COMPLETED", "CANCELLED"].includes(job.status);
                            const hasAnyAction = hasHistory || canEdit || canHold || canCancel || enableGrouping;

                            if (!hasAnyAction) return null;

                            const isOpen = openActionJobId === job._id;
                            const isClosing = closingActionJobId === job._id;
                            const isRendered = isOpen || isClosing;
                            const isNearBottom = index >= visibleJobs.length - 2 && visibleJobs.length > 3;

                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "stretch",
                                  position: "relative",
                                  flex: 1,
                                  height: "100%",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActionDropdown(job._id);
                                  }}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: isOpen
                                      ? "var(--color-primary, #2563EB)"
                                      : "var(--color-text-muted, #6B7280)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    cursor: "pointer",
                                    padding: "0 1.25rem 0 0.5rem",
                                    width: "100%",
                                    height: "100%",
                                    minHeight: "48px",
                                    transition: "color 0.15s ease",
                                    outline: "none",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isOpen) e.currentTarget.style.color = "var(--color-primary, #2563EB)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isOpen) e.currentTarget.style.color = "var(--color-text-muted, #6B7280)";
                                  }}
                                  title={isOpen ? "Close Actions" : "Show Actions"}
                                >
                                  {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                </button>

                                {isRendered && (
                                  <div
                                    className={`action-dropdown-menu ${isOpen ? "is-open" : "is-closing"} ${isNearBottom ? "open-upward" : ""}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {hasHistory && (
                                      <button
                                        className="action-dropdown-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          closeActionDropdown();
                                          openJobHistoryModal(modal, job);
                                        }}
                                      >
                                        <Clock size={15} style={{ color: "var(--color-text-muted)" }} />
                                        <span>Job History</span>
                                      </button>
                                    )}

                                    {canEdit && (
                                      <button
                                        className="action-dropdown-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          closeActionDropdown();
                                          onEditJob(job);
                                        }}
                                        style={{
                                          color: job.pendingParamAmendments?.status === "REJECTED"
                                            ? "var(--color-danger)"
                                            : editingJobId === job._id
                                            ? "var(--color-warning)"
                                            : "inherit",
                                        }}
                                      >
                                        <Edit size={15} style={{ color: "var(--color-primary)" }} />
                                        <span>{editingJobId === job._id ? "Editing..." : "Edit Job"}</span>
                                      </button>
                                    )}

                                    {canHold && (
                                      <button
                                        className="action-dropdown-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          closeActionDropdown();
                                          onHoldJob(job._id);
                                        }}
                                      >
                                        <PauseCircle size={15} style={{ color: "#F59E0B" }} />
                                        <span>Place on Hold</span>
                                      </button>
                                    )}

                                    {canCancel && (
                                      <button
                                        className="action-dropdown-item action-dropdown-item--danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          closeActionDropdown();
                                          onDeleteJob(job._id);
                                        }}
                                      >
                                        <XCircle size={15} style={{ color: "var(--color-danger)" }} />
                                        <span>Cancel Job</span>
                                      </button>
                                    )}

                                    {enableGrouping && !findGroupForJob(job) && (
                                      <button
                                        className="action-dropdown-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartGrouping(job);
                                        }}
                                      >
                                        <FolderPlus size={15} style={{ color: "var(--color-primary)" }} />
                                        <span>Group Jobs</span>
                                      </button>
                                    )}

                                    {enableGrouping && findGroupForJob(job) && (
                                      <button
                                        className="action-dropdown-item action-dropdown-item--danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartSubRangeRemoval(findGroupForJob(job), job);
                                        }}
                                      >
                                        <FolderMinus size={15} style={{ color: "var(--color-danger)" }} />
                                        <span>Remove from Group</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandedJobId === job._id && (
                    <tr>
                      <td
                        colSpan={showActions ? 6 : 5}
                        style={{
                          padding: "0",
                          backgroundColor: "var(--color-surface-hover)",
                        }}
                      >
                        <div
                          style={{
                            padding: "1.5rem",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          <JobTimeline
                            job={job}
                            allJobs={jobs}
                            onReopen={onReopen}
                          />
                          <AssignmentHistory testInstances={job.testInstances} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div
        className="show-on-mobile-flex"
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          backgroundColor: "var(--color-surface-hover)",
        }}
      >
        {visibleJobs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--color-text-muted)",
            }}
          >
            {serverSearchPending || isLoadingMoreData
              ? null
              : "No jobs match your filters."}
          </div>
        ) : (
          displayItems.map((item) => {
            if (item.type === "group-header") {
              const group = item.group;
              const isExpanded = expandedGroupId === group.id;

              return (
                <div
                  key={`mobile-group-${group.id}`}
                  onClick={() => toggleGroupExpand(group)}
                  style={{
                    backgroundColor: "#ffffff",
                    borderTop: "1px solid var(--color-border)",
                    borderRight: "1px solid var(--color-border)",
                    borderBottom: "1px solid var(--color-border)",
                    borderLeft: `4px solid ${group.color}`,
                    borderRadius: "var(--radius-lg, 8px)",
                    padding: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {isExpanded ? (
                        <FolderOpen size={20} style={{ color: group.color }} />
                      ) : (
                        <Folder size={20} style={{ color: group.color }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: "1rem" }}>{group.name}</span>
                    </div>
                    <ChevronDown
                      size={20}
                      style={{
                        color: isExpanded ? group.color : "var(--color-text-muted)",
                        transition: "transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), color 0.18s ease",
                        transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "9999px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        backgroundColor: "var(--color-surface-hover, #F1F5F9)",
                        color: "var(--color-text-muted, #475569)",
                        border: "1px solid var(--color-border, #E2E8F0)",
                      }}
                    >
                      {group.count} Job(s). {formatJobCode(group.startJobCode)} to {formatJobCode(group.endJobCode)}
                    </span>

                    <div style={{ display: "flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleRenameGroup(group, e)}
                        style={{
                          border: "1px solid var(--color-border)",
                          background: "transparent",
                          borderRadius: "4px",
                          padding: "0.4rem 0.65rem",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDisbandGroup(group, e)}
                        style={{
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "var(--color-danger)",
                          borderRadius: "4px",
                          padding: "0.4rem 0.65rem",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Disband
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const job = item.job;
            const isGrouped = item.isGrouped;
            const group = item.group;
            const isSelected = selectedJobIds.has(job._id);

            const cardBorderColor = job.pendingParamAmendments?.status === "REJECTED"
              ? "var(--color-danger)"
              : editingJobId === job._id
              ? "var(--color-warning)"
              : (expandedJobId === job._id || isSelected)
              ? "var(--color-primary)"
              : "var(--color-border)";
            const cardBorderWidth = (job.pendingParamAmendments?.status === "REJECTED" || editingJobId === job._id || expandedJobId === job._id || isSelected)
              ? "2px"
              : "1px";

            return (
            <div
              key={`mobile-job-${job._id}`}
              className={isGrouped ? `grouped-job-card ${item.isClosing ? "is-closing" : ""}` : ""}
              onClick={(e) => {
                if (isSelectingRange) {
                  handleJobSelectionClick(job, e);
                }
              }}
              style={{
                "--item-idx": item.groupIndex ?? 0,
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                boxShadow: "var(--shadow-sm)",
                borderTop: `${cardBorderWidth} solid ${cardBorderColor}`,
                borderRight: `${cardBorderWidth} solid ${cardBorderColor}`,
                borderBottom: `${cardBorderWidth} solid ${cardBorderColor}`,
                borderLeft: isGrouped ? `5px solid ${group.color}` : `${cardBorderWidth} solid ${cardBorderColor}`,
                backgroundColor: isSelected
                  ? `${group ? group.color : "var(--color-primary, #2563EB)"}10`
                  : job.pendingParamAmendments?.status === "REJECTED"
                  ? "rgba(239, 68, 68, 0.04)"
                  : editingJobId === job._id
                  ? "rgba(245, 158, 11, 0.04)"
                  : "var(--color-surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        color: "var(--color-primary)",
                      }}
                    >
                      {formatJobCode(job.jobCode)}
                    </span>
                    {job.pendingParamAmendments?.status === "REJECTED" && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.1rem 0.4rem",
                          backgroundColor: "var(--color-danger)",
                          color: "white",
                          borderRadius: "4px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Parameter(s) Rejected
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text-muted)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {formatDate(job.createdAt)}
                  </div>
                </div>
                <StatusBadge 
                  status={
                    job.status === "ON_HOLD" 
                      ? "ON_HOLD" 
                      : job.status === "CANCELLED" 
                        ? "CANCELLED" 
                        : getJobStatus(job)
                  } 
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Client
                </div>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                  {job.clientName}
                </div>
              </div>

              {showActions && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginBottom: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  {getJobStatus(job) === "COMPLETED" && (
                    <button
                      onClick={() => setSelectedReportJob(job)}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        fontSize: "0.85rem",
                        background:
                          "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontWeight: 600,
                        boxShadow: "0 2px 6px rgba(124, 58, 237, 0.2)",
                      }}
                    >
                      <FileText size={14} /> Report
                    </button>
                  )}
                  {job.history?.length > 0 && (
                    <button
                      onClick={() => openJobHistoryModal(modal, job)}
                      style={{
                        padding: "0.5rem",
                        background: editingJobId === job._id
                          ? "rgba(245, 158, 11, 0.15)"
                          : "var(--color-surface-hover)",
                        border: editingJobId === job._id
                          ? "1px solid rgba(245, 158, 11, 0.4)"
                          : "1px solid var(--color-border)",
                        borderRadius: "6px",
                        color: editingJobId === job._id
                          ? "var(--color-warning)"
                          : "var(--color-text-main)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Clock size={16} />
                    </button>
                  )}
                  {onEditJob && !["COMPLETED", "CANCELLED"].includes(getJobStatus(job)) && (
                    <button
                      onClick={() => onEditJob(job)}
                      style={{
                        padding: "0.5rem",
                        background:
                          job.pendingParamAmendments?.status === "REJECTED"
                            ? "rgba(239, 68, 68, 0.15)"
                            : editingJobId === job._id
                            ? "rgba(245, 158, 11, 0.15)"
                            : "var(--color-surface-hover)",
                        border:
                          job.pendingParamAmendments?.status === "REJECTED"
                            ? "1px solid var(--color-danger)"
                            : editingJobId === job._id
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid var(--color-border)",
                        borderRadius: "6px",
                        color:
                          job.pendingParamAmendments?.status === "REJECTED"
                            ? "var(--color-danger)"
                            : editingJobId === job._id
                            ? "var(--color-warning)"
                            : "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={
                        job.pendingParamAmendments?.status === "REJECTED"
                          ? "Parameter Amendments Rejected - Click to Edit"
                          : editingJobId === job._id
                          ? "Currently Editing"
                          : "Edit Job"
                      }
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  {onHoldJob && !["ON_HOLD", "COMPLETED", "CANCELLED"].includes(getJobStatus(job)) && (
                    <button
                      onClick={() => onHoldJob(job._id)}
                      style={{
                        padding: "0.5rem",
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        borderRadius: "6px",
                        color: "#F59E0B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Place Job on Hold"
                    >
                      <PauseCircle size={16} />
                    </button>
                  )}
                  {onDeleteJob && !["COMPLETED", "CANCELLED"].includes(getJobStatus(job)) && (
                    <button
                      onClick={() => onDeleteJob(job._id)}
                      style={{
                        padding: "0.5rem",
                        background: "var(--color-danger-light)",
                        border: "1px solid var(--color-danger)",
                        borderRadius: "6px",
                        color: "var(--color-danger)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Cancel Job"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => toggleExpand(job._id)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.75rem",
                  background:
                    expandedJobId === job._id
                      ? "var(--color-primary)"
                      : "var(--color-surface-hover)",
                  color:
                    expandedJobId === job._id
                      ? "white"
                      : "var(--color-primary)",
                  border:
                    expandedJobId === job._id
                      ? "none"
                      : "1px solid var(--color-border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.1rem",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {expandedJobId === job._id ? "Hide Workflow Timeline" : "View Workflow Timeline"}{" "}
                  {expandedJobId === job._id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
                <div style={{ fontSize: "0.72rem", fontWeight: 400, opacity: 0.75 }}>
                  {expandedJobId === job._id ? "" : "Pipeline stages and current status per department"}
                </div>
              </button>

              {expandedJobId === job._id && (
                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px dashed var(--color-border)",
                    margin: "1rem -1.25rem -1.25rem -1.25rem",
                    padding: "1rem 0.5rem 0.5rem 0.5rem",
                    backgroundColor: "#F9FAFB",
                    borderBottomLeftRadius: "var(--radius-lg)",
                    borderBottomRightRadius: "var(--radius-lg)",
                  }}
                >
                  <JobTimeline job={job} allJobs={jobs} onReopen={onReopen} />
                  <AssignmentHistory testInstances={job.testInstances} />
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      <InfiniteScroll 
        hasMore={page < totalPages || hasMoreData} 
        isLoading={isLoadingMoreData || false} 
        onLoadMore={handleLoadMore} 
      />

      {selectedReportJob && (
        <ReportModal
          job={selectedReportJob}
          onClose={() => setSelectedReportJob(null)}
        />
      )}

      {isSelectingRange && selectedJobIds.size > 0 && (
        <div className="group-floating-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: subRangeRemovingGroupId ? "var(--color-danger)" : "var(--color-primary)",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {selectedJobIds.size}
            </span>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--color-text-main)" }}>
              {subRangeRemovingGroupId
                ? `${selectedJobIds.size} job(s) selected for removal`
                : `${selectedJobIds.size} job(s) selected for group`}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {subRangeRemovingGroupId ? (
              <button
                type="button"
                onClick={handleConfirmSubRangeRemoval}
                style={{
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  backgroundColor: "var(--color-danger, #EF4444)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <FolderMinus size={15} />
                <span>Remove from Group</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateGroup}
                style={{
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  backgroundColor: "var(--color-primary, #2563EB)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <FolderPlus size={15} />
                <span>Create Group</span>
              </button>
            )}

            <button
              type="button"
              onClick={clearSelection}
              style={{
                padding: "0.45rem 0.8rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                borderRadius: "6px",
                backgroundColor: "transparent",
                color: "var(--color-text-muted, #6B7280)",
                border: "1px solid var(--color-border)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
