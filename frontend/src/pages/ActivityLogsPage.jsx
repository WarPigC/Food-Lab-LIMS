import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import Fuse from "fuse.js";
import JobLogTable from "../components/JobLogTable";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import { fetchWithCache, invalidateCache, CACHE_KEYS, isCached } from "../utils/cache";
import API_URL from "../utils/api";
import { useSocket } from "../context/SocketContext";
import { useListControls } from "../hooks/useListControls";

function getJobStatus(job) {
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
  return "IN_PROGRESS";
}

function getJobNablMode(job) {
  if (job.siblingJobId || (job.sample?.nabl_type || "").toLowerCase() === "hybrid") {
    return "hybrid";
  }
  if ((job.sample?.nabl_type || "").toLowerCase() === "nabl") {
    return "nabl";
  }
  return "non nabl";
}

export default function ActivityLogsPage({
  title = "Activity Logs",
  fetchUrl = `${API_URL}/api/jobs`,
  enableSocketUpdates = false,
  onReopen = null,
  defaultExpandedId = null,
  user = null,
  cacheKey = CACHE_KEYS.JOBS,
}) {
  const [jobs, setJobs] = useState([]);
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  const [jobsCursor, setJobsCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [auditLoading, setAuditLoading] = useState(
    () => cacheKey && !isCached(cacheKey)
  );

  const socket = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setAllJobsLoaded(false);
      await fetchWithCache(fetchUrl, cacheKey, (raw) => {
        if (raw && raw.jobs) {
          setJobs(raw.jobs);
          setHasMoreJobs(raw.hasMore || false);
          setJobsCursor(raw.nextCursor || null);
        } else if (Array.isArray(raw)) {
          setJobs(raw);
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  }, [fetchUrl, cacheKey]);

  const loadMoreJobs = useCallback(async () => {
    if (!jobsCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const separator = fetchUrl.includes("?") ? "&" : "?";
      const res = await axios.get(`${fetchUrl}${separator}cursor=${jobsCursor}`);
      setJobs((prev) => {
        const existingIds = new Set(prev.map((j) => (j._id || j.id)?.toString()));
        const incoming = (res.data.jobs || []).filter(
          (j) => !existingIds.has((j._id || j.id)?.toString())
        );
        return [...prev, ...incoming];
      });
      setHasMoreJobs(res.data.hasMore);
      setJobsCursor(res.data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchUrl, jobsCursor, isLoadingMore]);

  const [allJobs, setAllJobs] = useState([]);
  const [allJobsLoaded, setAllJobsLoaded] = useState(false);
  const [isLoadingAllJobs, setIsLoadingAllJobs] = useState(false);

  const currentJobsList = allJobsLoaded ? allJobs : jobs;

  const searchableLogs = useMemo(() => {
    return currentJobsList.map((job) => {
      const actors = [
        ...(job.history || []).map((h) => h.by),
        ...(job.testInstances || []).map((t) => t.assignedTo?.name),
      ]
        .filter(Boolean)
        .join(" ");

      const details = [
        ...(job.history || []).map((h) => h.note || h.action),
        ...(job.testInstances || []).map((t) => t.parameterName),
      ]
        .filter(Boolean)
        .join(" ");

      return {
        ...job,
        _searchKey: [
          job.jobCode,
          job.clientName,
          job.customer?.customer_name,
          job.sample?.sample_name,
          job.sample?.sample_id,
          job.sample?.ulr_no,
          actors,
          details,
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [currentJobsList]);

  const activityFuse = useMemo(
    () =>
      new Fuse(searchableLogs, {
        keys: [
          "_searchKey",
          "jobCode",
          "clientName",
          "customer.customer_name",
          "sample.sample_name",
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [searchableLogs]
  );

  const activityFilterDefs = useMemo(
    () => [
      {
        id: "nabl",
        label: "NABL Type",
        type: "select",
        options: [
          { value: "Nabl", label: "NABL" },
          { value: "Non Nabl", label: "Non-NABL" },
          { value: "Hybrid", label: "Hybrid" },
        ],
        test: (job, value) => {
          if (!value) return true;
          const target = value.toLowerCase().replace("-", " ");
          return getJobNablMode(job) === target;
        },
      },
      {
        id: "status",
        label: "Overall Status",
        type: "select",
        options: [
          { value: "PENDING", label: "Pending" },
          { value: "IN_PROGRESS", label: "In Progress" },
          { value: "RETURNED", label: "Returned" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "CANCELLED", label: "Cancelled" },
        ],
        test: (job, value) => !value || getJobStatus(job) === value,
      },
      {
        id: "action",
        label: "Action Type",
        type: "select",
        options: [
          { value: "CREATED", label: "Job Created" },
          { value: "UPDATED", label: "Job Updated" },
          { value: "HELD", label: "Job On Hold" },
          { value: "CANCELLED", label: "Job Cancelled" },
          { value: "RETURNED_TO_OFFICER", label: "Returned" },
          { value: "REVIEW_APPROVED", label: "Review Approved" },
        ],
        test: (job, value) => {
          if (!value) return true;
          return (job.history || []).some(
            (h) => (h.action || "").toUpperCase() === value.toUpperCase()
          );
        },
      },
      {
        id: "role",
        label: "Actor Role",
        type: "select",
        options: [
          { value: "ADMIN", label: "Admin" },
          { value: "ADMIN_OFFICER", label: "Admin Officer" },
          { value: "HEAD", label: "Head" },
          { value: "TESTER", label: "Tester" },
        ],
        test: (job, value) => {
          if (!value) return true;
          const matchesHistory = (job.history || []).some(
            (h) =>
              (h.role || "").toUpperCase() === value.toUpperCase() ||
              (h.byRole || "").toUpperCase() === value.toUpperCase()
          );
          const matchesTests = (job.testInstances || []).some(
            (t) =>
              (t.assignedTo?.role || "").toUpperCase() === value.toUpperCase()
          );
          return matchesHistory || matchesTests;
        },
      },
      {
        id: "dateRange",
        label: "Date Created",
        type: "dateRange",
        test: (job, value) => {
          if (!value) return true;
          const d = new Date(job.createdAt);
          if (isNaN(d.getTime())) return true;
          if (value.from) {
            const fromDate = new Date(value.from);
            fromDate.setHours(0, 0, 0, 0);
            if (d < fromDate) return false;
          }
          if (value.to) {
            const toDate = new Date(value.to);
            toDate.setHours(23, 59, 59, 999);
            if (d > toDate) return false;
          }
          return true;
        },
      },
    ],
    []
  );

  const activitySortConfig = useMemo(
    () => ({
      searchPlaceholder: "Search Client or Code...",
      sortOptions: [
        { field: "createdAt", label: "Date Created" },
        { field: "jobCode", label: "Job Code" },
        { field: "clientName", label: "Client Name" },
      ],
      defaultSort: { field: "createdAt", direction: "desc" },
      filterDefs: activityFilterDefs,
    }),
    [activityFilterDefs]
  );

  const activityControls = useListControls(
    searchableLogs,
    activitySortConfig,
    {
      fullItems: currentJobsList,
      fuse: activityFuse,
    }
  );

  const hasActiveFilters = Object.keys(activityControls.activeFilters || {}).length > 0;

  useEffect(() => {
    const delay = (activityControls.searchQuery || hasActiveFilters) ? 0 : 500;
    const timer = setTimeout(() => {
      if (!allJobsLoaded && !isLoadingAllJobs) {
        setIsLoadingAllJobs(true);
        const separator = fetchUrl.includes("?") ? "&" : "?";
        axios
          .get(`${fetchUrl}${separator}limit=1000`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
          .then((res) => {
            setAllJobs(
              res.data.jobs || (Array.isArray(res.data) ? res.data : [])
            );
            setAllJobsLoaded(true);
          })
          .catch(console.error)
          .finally(() => setIsLoadingAllJobs(false));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [activityControls.searchQuery, hasActiveFilters, allJobsLoaded, isLoadingAllJobs, fetchUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket || !enableSocketUpdates) return;
    const triggerUpdate = () => {
      setAllJobsLoaded(false);
      if (cacheKey) invalidateCache(cacheKey);
      fetchData();
    };

    const events = [
      "JOB_CREATED",
      "JOB_RETEST_INITIATED",
      "TRANSFER_INITIATED",
      "TRANSFER_RECEIVED",
      "TEST_SUBMITTED",
      "TEST_REVIEWED",
      "JOB_UPDATED",
      "JOB_RETURNED",
      "JOB_DELETED",
    ];

    events.forEach((e) => socket.on(e, triggerUpdate));
    return () => {
      events.forEach((e) => socket.off(e, triggerUpdate));
    };
  }, [socket, enableSocketUpdates, fetchData, cacheKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 style={{ marginBottom: "1.5rem" }}>{title}</h1>

        <PageHeader
          config={activitySortConfig}
          controls={activityControls}
          onSearchChange={activityControls.setSearchQuery}
          resultCount={activityControls.processedItems.length}
          totalCount={currentJobsList.length}
          placeholder="Search Client or Code..."
        />

        {auditLoading && jobs.length === 0 ? (
          <div className="card">
            <Spinner message="Loading logs..." />
          </div>
        ) : (
          <JobLogTable
            jobs={activityControls.processedItems}
            searchTerm={activityControls.searchQuery}
            title="Lifecycle Tracker"
            hasMoreData={!allJobsLoaded && hasMoreJobs}
            isLoadingMoreData={isLoadingMore || isLoadingAllJobs}
            onLoadMoreData={loadMoreJobs}
            defaultExpandedId={defaultExpandedId}
            onReopen={onReopen}
          />
        )}
      </div>
    </div>
  );
}
