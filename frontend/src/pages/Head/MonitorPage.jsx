import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { Eye, RotateCcw, ArrowRight, CheckCircle2, Circle, ChevronRight, AlertCircle, Clock } from "lucide-react";
import API_URL from "../../utils/api";
import Spinner from "../../components/Spinner";
import PageHeader from "../../components/PageHeader";
import InfiniteScroll from "../../components/InfiniteScroll";
import { formatJobCode } from "../../utils/serialUtils";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";
import { useModal } from "../../hooks/useModal";
import { useListControls } from "../../hooks/useListControls";
import { fetchWithCache, invalidateCache, CACHE_KEYS } from "../../utils/cache";
import Fuse from "fuse.js";

export default function MonitorPage() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const socket = useSocket();
  const toast = useToast();
  const modal = useModal();

  const [jobs, setJobs] = useState([]);
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  const [jobsCursor, setJobsCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Full dataset for client-side search across all pages
  const [allJobs, setAllJobs] = useState([]);
  const [allJobsLoaded, setAllJobsLoaded] = useState(false);
  const [isLoadingAllJobs, setIsLoadingAllJobs] = useState(false);

  const [assistants, setAssistants] = useState([]);
  const [expandedJobIds, setExpandedJobIds] = useState(() => {
    const initial = new Set();
    if (location.state?.expandJobId) {
      initial.add(location.state.expandJobId);
    }
    return initial;
  });

  // Track checked parameters per job: { [jobId]: Set<parameterId> }
  const [checkedParams, setCheckedParams] = useState({});
  // Track selected target assistant per job: { [jobId]: assistantId }
  const [targetAssistants, setTargetAssistants] = useState({});

  const [withdrawingJobId, setWithdrawingJobId] = useState(null);
  const [movingJobId, setMovingJobId] = useState(null);

  const myDept = user?.department ? user.department.toLowerCase() : "";

  const handleJobsData = useCallback((data) => {
    if (data && data.jobs) {
      setJobs(data.jobs);
      setHasMoreJobs(Boolean(data.hasMore));
      setJobsCursor(data.nextCursor || null);
    } else if (Array.isArray(data)) {
      setJobs(data);
    }
  }, []);

  // Fetch monitoring jobs with cache
  const fetchMonitoringJobs = useCallback(async () => {
    try {
      await fetchWithCache(
        `${API_URL}/api/jobs/monitoring`,
        CACHE_KEYS.JOBS_MONITORING,
        handleJobsData,
        { Authorization: `Bearer ${localStorage.getItem("token")}` }
      );
    } catch (err) {
      console.error("Error fetching monitoring jobs:", err);
      toast.error(err.response?.data?.message || "Failed to load monitoring jobs");
    } finally {
      setLoading(false);
    }
  }, [handleJobsData, toast]);

  // Load more jobs (infinite scroll)
  const loadMoreJobs = async () => {
    if (!jobsCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await axios.get(`${API_URL}/api/jobs/monitoring?cursor=${jobsCursor}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setJobs((prev) => {
        const existingIds = new Set(prev.map((j) => (j._id || j.id)?.toString()));
        const incoming = (res.data.jobs || []).filter(
          (j) => !existingIds.has((j._id || j.id)?.toString())
        );
        return [...prev, ...incoming];
      });
      setHasMoreJobs(Boolean(res.data.hasMore));
      setJobsCursor(res.data.nextCursor || null);
    } catch (err) {
      console.error("Error loading more monitoring jobs:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch department assistants
  const fetchAssistants = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const list = res.data || [];
      const deptAssistants = list.filter(
        (u) => u.role === "ASSISTANT" && u.department?.toLowerCase() === myDept
      );
      setAssistants(deptAssistants);
    } catch (err) {
      console.error("Error fetching assistants:", err);
    }
  }, [myDept]);

  useEffect(() => {
    fetchMonitoringJobs();
    fetchAssistants();
  }, [fetchMonitoringJobs, fetchAssistants]);

  // Auto-expand card if location.state specified expandJobId
  useEffect(() => {
    if (location.state?.expandJobId) {
      setExpandedJobIds((prev) => new Set([...prev, location.state.expandJobId]));
    }
  }, [location.state?.expandJobId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Live save-tick update
    const handleParamSaved = (data) => {
      const { instanceId, jobId, paramResults } = data;
      if (!paramResults || !Array.isArray(paramResults)) return;

      const updateJobList = (prevJobs) =>
        prevJobs.map((job) => {
          if (String(job._id) !== String(jobId)) return job;
          const updatedInstances = (job.testInstances || []).map((inst) => {
            if (String(inst._id) !== String(instanceId)) return inst;

            const resultMap = new Map();
            (inst.results || []).forEach((r) => resultMap.set(String(r.parameterId), { ...r }));

            paramResults.forEach((delta) => {
              const existing = resultMap.get(String(delta.parameterId));
              if (existing) {
                existing.isSaved = delta.isSaved;
                if (delta.value !== undefined) existing.value = delta.value;
                if (delta.testMethod !== undefined) existing.testMethod = delta.testMethod;
              }
            });

            return {
              ...inst,
              results: Array.from(resultMap.values()),
            };
          });

          return {
            ...job,
            testInstances: updatedInstances,
          };
        });

      setJobs(updateJobList);
      setAllJobs(updateJobList);
    };

    const handleMonitorWithdrawn = (data) => {
      setJobs((prevJobs) => prevJobs.filter((j) => String(j._id) !== String(data.jobId)));
      setAllJobs((prevJobs) => prevJobs.filter((j) => String(j._id) !== String(data.jobId)));
      invalidateCache(CACHE_KEYS.JOBS_MONITORING);
      invalidateCache(CACHE_KEYS.JOBS_MONITORING_ALL);
      invalidateCache(CACHE_KEYS.JOBS_HEAD_ACTIVE);
      invalidateCache(CACHE_KEYS.INSTANCES);
    };

    const handleParamsSplit = () => {
      invalidateCache(CACHE_KEYS.JOBS_MONITORING);
      invalidateCache(CACHE_KEYS.JOBS_MONITORING_ALL);
      invalidateCache(CACHE_KEYS.JOBS_HEAD_ACTIVE);
      invalidateCache(CACHE_KEYS.INSTANCES);
      setAllJobsLoaded(false);
      fetchMonitoringJobs();
    };

    const handleGeneralUpdate = () => {
      invalidateCache(CACHE_KEYS.JOBS_MONITORING);
      invalidateCache(CACHE_KEYS.JOBS_MONITORING_ALL);
      setAllJobsLoaded(false);
      fetchMonitoringJobs();
    };

    socket.on("PARAM_SAVED", handleParamSaved);
    socket.on("job:monitor-withdrawn", handleMonitorWithdrawn);
    socket.on("instance:params-split", handleParamsSplit);
    socket.on("JOB_DISTRIBUTED", handleGeneralUpdate);
    socket.on("JOB_UPDATED", handleGeneralUpdate);

    return () => {
      socket.off("PARAM_SAVED", handleParamSaved);
      socket.off("job:monitor-withdrawn", handleMonitorWithdrawn);
      socket.off("instance:params-split", handleParamsSplit);
      socket.off("JOB_DISTRIBUTED", handleGeneralUpdate);
      socket.off("JOB_UPDATED", handleGeneralUpdate);
    };
  }, [socket, fetchMonitoringJobs]);

  // List Controls (Search, Sort, Filter)
  const monitorFilterDefs = [
    {
      id: "analyst",
      label: "Assigned Analyst",
      type: "select",
      test: (job, value) => {
        if (!value) return true;
        return (job.testInstances || []).some(
          (inst) => inst.assignedTo?._id === value || inst.assignedTo === value
        );
      },
    },
    {
      id: "nabl",
      label: "NABL Type",
      type: "select",
      options: [
        { value: "Nabl", label: "NABL" },
        { value: "Non Nabl", label: "Non-NABL" },
      ],
      test: (job, value) => !value || job.sample?.nabl_type === value,
    },
  ];

  const monitorSortConfig = {
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
    sortOptions: [
      { key: "createdAt", label: "Date Created" },
      { key: "jobCode", label: "Job Code" },
    ],
    filterDefs: monitorFilterDefs,
  };

  const currentList = allJobsLoaded ? allJobs : jobs;

  const monitorFuse = useMemo(
    () =>
      new Fuse(currentList, {
        keys: [
          "jobCode",
          "clientName",
          "customer.customer_name",
          "sample.sample_name",
          "sample.sample_id",
          "testInstances.assignedTo.name",
        ],
        threshold: 0.35,
      }),
    [currentList]
  );

  const controls = useListControls(currentList, monitorSortConfig, {
    fullItems: currentList,
    fuse: monitorFuse,
  });

  // Fetch all monitoring jobs when search is first activated
  useEffect(() => {
    if (controls.searchQuery && !allJobsLoaded && !isLoadingAllJobs) {
      setIsLoadingAllJobs(true);
      axios
        .get(`${API_URL}/api/jobs/monitoring?limit=1000`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => {
          setAllJobs(res.data.jobs || []);
          setAllJobsLoaded(true);
        })
        .catch(console.error)
        .finally(() => setIsLoadingAllJobs(false));
    }
  }, [controls.searchQuery, allJobsLoaded, isLoadingAllJobs]);

  const toggleExpand = (jobId) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  // Checkbox toggle per parameter
  const handleToggleParam = (jobId, paramId) => {
    setCheckedParams((prev) => {
      const currentSet = new Set(prev[jobId] || []);
      if (currentSet.has(paramId)) {
        currentSet.delete(paramId);
      } else {
        currentSet.add(paramId);
      }
      return { ...prev, [jobId]: currentSet };
    });
  };

  // "Select All Parameters in Job" checkbox handler
  const handleToggleSelectAllInJob = (job) => {
    const allParamIds = [];
    (job.testInstances || []).forEach((inst) => {
      (inst.results || []).forEach((r) => {
        allParamIds.push(String(r.parameterId));
      });
    });

    setCheckedParams((prev) => {
      const currentSet = prev[job._id] || new Set();
      const allSelected = allParamIds.length > 0 && allParamIds.every((id) => currentSet.has(id));
      if (allSelected) {
        // Deselect all
        return { ...prev, [job._id]: new Set() };
      } else {
        // Select all
        return { ...prev, [job._id]: new Set(allParamIds) };
      }
    });
  };

  // Withdraw Action Handler
  const handleWithdraw = async (job) => {
    const confirmed = await modal.confirm({
      title: "Withdraw Dispatch",
      body: `Are you sure you want to withdraw job ${formatJobCode(job.jobCode)} back to the dispatch queue? Saved progress will be preserved for re-dispatch.`,
      variant: "warning",
      confirmLabel: "Withdraw & Return to Dispatch",
      cancelLabel: "Keep Dispatched",
    });

    if (!confirmed) return;

    setWithdrawingJobId(job._id);
    try {
      await axios.post(
        `${API_URL}/api/jobs/${job._id}/monitor-withdraw`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(`Job ${formatJobCode(job.jobCode)} withdrawn back to dispatch queue!`);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      setAllJobs((prev) => prev.filter((j) => j._id !== job._id));
      invalidateCache(CACHE_KEYS.JOBS_MONITORING);
      invalidateCache(CACHE_KEYS.JOBS_MONITORING_ALL);
      invalidateCache(CACHE_KEYS.JOBS_HEAD_ACTIVE);
      invalidateCache(CACHE_KEYS.INSTANCES);
    } catch (err) {
      console.error("Error withdrawing job:", err);
      modal.error(err.response?.data?.message || "Failed to withdraw job");
    } finally {
      setWithdrawingJobId(null);
    }
  };

  // Move Parameters Action Handler (supports moving multi-selected params to target analyst)
  const handleMoveParams = async (job) => {
    const selectedSet = checkedParams[job._id] || new Set();
    const selectedParamIds = Array.from(selectedSet);
    const targetId = targetAssistants[job._id];

    if (selectedParamIds.length === 0) {
      toast.warning("Please select at least one parameter to move");
      return;
    }

    if (!targetId) {
      toast.warning("Please choose a target analyst to receive the parameters");
      return;
    }

    const targetAnalystObj = assistants.find((a) => String(a._id) === String(targetId));
    const targetName = targetAnalystObj ? targetAnalystObj.name : "target analyst";

    const confirmed = await modal.confirm({
      title: "Move Parameters",
      body: `Move ${selectedParamIds.length} parameter(s) from job ${formatJobCode(job.jobCode)} to ${targetName}?`,
      variant: "info",
      confirmLabel: "Confirm Move",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    setMovingJobId(job._id);
    try {
      // Group selected parameters by their current source instance / analyst
      const byAnalyst = new Map(); // fromAnalystId -> [paramIds]
      (job.testInstances || []).forEach((inst) => {
        const fromAnalystId = inst.assignedTo?._id ? String(inst.assignedTo._id) : String(inst.assignedTo);
        (inst.results || []).forEach((r) => {
          const pId = String(r.parameterId);
          if (selectedSet.has(pId)) {
            if (!byAnalyst.has(fromAnalystId)) {
              byAnalyst.set(fromAnalystId, []);
            }
            byAnalyst.get(fromAnalystId).push(pId);
          }
        });
      });

      // Execute monitor-split for each distinct source analyst
      for (const [fromAnalystId, pIds] of byAnalyst.entries()) {
        if (fromAnalystId === String(targetId)) {
          // Skip if already assigned to target
          continue;
        }
        await axios.put(
          `${API_URL}/api/jobs/${job._id}/monitor-split`,
          {
            fromAnalystId,
            toAnalystId: targetId,
            paramIds: pIds,
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
      }

      toast.success(`Successfully moved ${selectedParamIds.length} parameter(s) to ${targetName}!`);

      // Clear selections for this job
      setCheckedParams((prev) => ({ ...prev, [job._id]: new Set() }));
      setTargetAssistants((prev) => ({ ...prev, [job._id]: "" }));

      // Invalidate caches & refetch
      invalidateCache(CACHE_KEYS.JOBS_MONITORING);
      invalidateCache(CACHE_KEYS.JOBS_MONITORING_ALL);
      invalidateCache(CACHE_KEYS.JOBS_HEAD_ACTIVE);
      invalidateCache(CACHE_KEYS.INSTANCES);
      setAllJobsLoaded(false);
      await fetchMonitoringJobs();
    } catch (err) {
      console.error("Error moving parameters:", err);
      modal.error(err.response?.data?.message || "Failed to move parameters");
    } finally {
      setMovingJobId(null);
    }
  };

  return (
    <div style={{ maxWidth: "1250px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Page Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: 0 }}>
          <Eye size={28} style={{ color: "var(--color-primary)" }} /> Job Monitor
        </h1>
        <p style={{ margin: "0.35rem 0 0 0", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          Live parameter progress, analyst migration, and dispatch controls for in-flight jobs.
        </p>
      </div>

      {/* Page Header (Search & Filter Controls) */}
      <PageHeader
        config={monitorSortConfig}
        controls={controls}
        onSearchChange={controls.setSearchQuery}
        resultCount={controls.processedItems.length}
        totalCount={currentList.length}
        filterSelectOptions={{
          analyst: assistants.map((a) => ({ value: a._id, label: a.name })),
        }}
      />

      {/* Main Content List */}
      {loading ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <Spinner message="Loading monitored jobs..." />
        </div>
      ) : controls.processedItems.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          <AlertCircle size={40} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
          <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.4rem 0" }}>
            No in-flight jobs to monitor
          </p>
          <p style={{ fontSize: "0.85rem", margin: 0 }}>
            Dispatched jobs will appear here while analysts work on them.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {controls.processedItems.map((job) => {
            const isExpanded = expandedJobIds.has(job._id);
            const instances = job.testInstances || [];

            // Aggregate parameters & analyst names
            const allParams = [];
            const analystNames = [];
            let totalSaved = 0;

            instances.forEach((inst) => {
              const name = inst.assignedTo?.name || "Unassigned";
              if (!analystNames.includes(name)) analystNames.push(name);
              (inst.results || []).forEach((r) => {
                allParams.push({ ...r, analystName: name, instanceId: inst._id });
                if (r.isSaved) totalSaved++;
              });
            });

            const totalParamsCount = allParams.length;
            const selectedSet = checkedParams[job._id] || new Set();
            const allSelected = totalParamsCount > 0 && allParams.every((p) => selectedSet.has(String(p.parameterId)));
            const someSelected = selectedSet.size > 0;

            return (
              <div
                key={job._id}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: isExpanded ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    backgroundColor: isExpanded ? "var(--color-surface-hover)" : "var(--color-surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onClick={() => toggleExpand(job._id)}
                >
                  {/* Left Header Info: Chevron, Job Code, Analysts */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                    <div
                      className={`card-accordion-chevron ${isExpanded ? "expanded" : ""}`}
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <ChevronRight size={20} />
                    </div>

                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                        {formatJobCode(job.jobCode)}
                      </h3>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-text-muted)",
                          marginTop: "0.25rem",
                        }}
                      >
                        <span>
                          <strong>Analysts:</strong> {analystNames.join(", ") || "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Controls: Progress Meter & Withdraw Button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                      flexWrap: "wrap",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Live Progress Pill */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        padding: "0.35rem 0.75rem",
                        backgroundColor: totalSaved === totalParamsCount ? "rgba(46, 204, 113, 0.12)" : "rgba(52, 152, 219, 0.12)",
                        borderRadius: "20px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: totalSaved === totalParamsCount ? "var(--color-success)" : "var(--color-primary)",
                      }}
                      title={`${totalSaved} of ${totalParamsCount} parameters saved`}
                    >
                      {totalSaved === totalParamsCount ? (
                        <CheckCircle2 size={15} color="var(--color-success)" />
                      ) : (
                        <Circle size={15} color="var(--color-primary)" />
                      )}
                      <span>
                        {totalSaved} / {totalParamsCount} saved
                      </span>
                    </div>

                    {/* Withdraw Dispatch Button */}
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleWithdraw(job)}
                      disabled={withdrawingJobId === job._id}
                      style={{
                        padding: "0.45rem 0.9rem",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#B45309",
                        backgroundColor: "#FFFBEB",
                        border: "1px solid #F59E0B",
                        borderRadius: "var(--radius-sm)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                      }}
                      title="Pull job back to dispatch queue"
                    >
                      {withdrawingJobId === job._id ? (
                        <Spinner size="sm" message="Withdrawing..." color="#B45309" />
                      ) : (
                        <>
                          <RotateCcw size={14} /> Withdraw Dispatch
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body (Expanded Accordion View) */}
                <div className={`card-accordion-wrapper ${isExpanded ? "expanded" : ""}`}>
                  <div className="card-accordion-inner">
                    <div style={{ padding: "1.25rem", backgroundColor: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
                      {/* Select All in Job Bar */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.65rem 0.9rem",
                          backgroundColor: "var(--color-surface-hover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                          marginBottom: "1rem",
                          fontSize: "0.88rem",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            cursor: "pointer",
                            fontWeight: 600,
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => handleToggleSelectAllInJob(job)}
                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          />
                          <span>Select All Parameters in Job ({totalParamsCount})</span>
                        </label>

                        {someSelected && (
                          <span style={{ fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 600 }}>
                            {selectedSet.size} of {totalParamsCount} selected
                          </span>
                        )}
                      </div>

                      {/* Parameters Table */}
                      <div
                        className="table-scroll"
                        style={{
                          maxHeight: "440px",
                          overflowY: "auto",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead
                            style={{
                              position: "sticky",
                              top: 0,
                              zIndex: 5,
                              backgroundColor: "var(--color-surface-hover)",
                              boxShadow: "0 1px 0 var(--color-border)",
                            }}
                          >
                            <tr style={{ textAlign: "left" }}>
                              <th style={{ padding: "0.6rem 0.75rem", width: "40px", textAlign: "center" }}>
                                #
                              </th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Parameter Name</th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Unit</th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Assigned Analyst</th>
                              <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Status</th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Test Method</th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Saved Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allParams.map((param, idx) => {
                              const pId = String(param.parameterId);
                              const isChecked = selectedSet.has(pId);

                              return (
                                <tr
                                  key={`${param.instanceId}-${pId}-${idx}`}
                                  className="param-table-row"
                                  style={{
                                    borderBottom: "1px solid var(--color-border)",
                                    backgroundColor: isChecked ? "rgba(52, 152, 219, 0.08)" : "transparent",
                                    transition: "background-color 0.15s",
                                  }}
                                >
                                  {/* Selection Checkbox */}
                                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleParam(job._id, pId)}
                                      style={{ cursor: "pointer", width: "15px", height: "15px" }}
                                    />
                                  </td>

                                  {/* Parameter Name */}
                                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
                                    {param.name || param.paramName || "Unknown Parameter"}
                                  </td>

                                  {/* Unit */}
                                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--color-text-muted)" }}>
                                    {param.unit || "N/A"}
                                  </td>

                                  {/* Analyst */}
                                  <td style={{ padding: "0.6rem 0.75rem" }}>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "0.2rem 0.55rem",
                                        borderRadius: "4px",
                                        backgroundColor: "var(--color-surface-hover)",
                                        fontSize: "0.8rem",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {param.analystName}
                                    </span>
                                  </td>

                                  {/* Live Status Pill */}
                                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                                    {param.isSaved ? (
                                      <span
                                        className="badge badge-success"
                                        style={{
                                          fontSize: "0.75rem",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.3rem",
                                          padding: "0.2rem 0.5rem",
                                        }}
                                      >
                                        <CheckCircle2 size={12} /> Saved
                                      </span>
                                    ) : (
                                      <span
                                        className="badge badge-secondary"
                                        style={{
                                          fontSize: "0.75rem",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.3rem",
                                          padding: "0.2rem 0.5rem",
                                          backgroundColor: "rgba(149, 165, 166, 0.15)",
                                          color: "var(--color-text-muted)",
                                        }}
                                      >
                                        <Circle size={10} /> In Progress
                                      </span>
                                    )}
                                  </td>

                                  {/* Test Method */}
                                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                                    {param.testMethod || "N/A"}
                                  </td>

                                  {/* Saved Value */}
                                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>
                                    {param.value !== undefined && param.value !== null && param.value !== "" ? (
                                      <span style={{ fontFamily: "monospace", color: "var(--color-primary-dark)" }}>
                                        {param.value}
                                      </span>
                                    ) : (
                                      <span style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "0.8rem" }}>
                                        None
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Migration Footer Controls (visible when at least 1 param is checked) */}
                      {someSelected && (
                        <div
                          style={{
                            marginTop: "1.25rem",
                            padding: "1rem 1.25rem",
                            backgroundColor: "rgba(52, 152, 219, 0.08)",
                            border: "1px solid rgba(52, 152, 219, 0.3)",
                            borderRadius: "var(--radius-md)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 700, color: "#0369A1", fontSize: "0.95rem" }}>
                              {selectedSet.size} parameter(s) selected
                            </span>
                            <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                              (Choose target analyst to transfer)
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                            <select
                              value={targetAssistants[job._id] || ""}
                              onChange={(e) =>
                                setTargetAssistants((prev) => ({ ...prev, [job._id]: e.target.value }))
                              }
                              style={{
                                padding: "0.45rem 0.75rem",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)",
                                fontSize: "0.88rem",
                                minWidth: "180px",
                                backgroundColor: "white",
                              }}
                            >
                              <option value="" disabled>
                                Select target analyst...
                              </option>
                              {assistants.map((ast) => (
                                <option key={ast._id} value={ast._id}>
                                  {ast.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleMoveParams(job)}
                              disabled={movingJobId === job._id || !targetAssistants[job._id]}
                              style={{
                                padding: "0.45rem 1.15rem",
                                fontSize: "0.88rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                            >
                              {movingJobId === job._id ? (
                                <Spinner size="sm" message="Moving..." color="#fff" />
                              ) : (
                                <>
                                  Move to Analyst <ArrowRight size={16} />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <InfiniteScroll
            hasMore={!controls.searchQuery && hasMoreJobs}
            isLoading={isLoadingMore}
            onLoadMore={loadMoreJobs}
          />
        </div>
      )}
    </div>
  );
}
