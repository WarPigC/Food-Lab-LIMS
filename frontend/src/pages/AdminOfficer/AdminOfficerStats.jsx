import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchWithCache, invalidateCache, CACHE_KEYS, isCached } from "../../utils/cache";
import { cacheGet, cacheSet } from "../../utils/cacheStorage";
import API_URL from "../../utils/api";
import Spinner from "../../components/Spinner";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import RecentActivityTable from "../../components/RecentActivityTable";

import { Play, Check, CheckCircle, Users, Activity, Clock, FileText, ChevronRight } from "lucide-react";
import { formatJobCode } from "../../utils/serialUtils";
import { formatTestCode } from "../../utils/codeUtils";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [stats, setStats] = useState({
    ongoingJobs: 0,
    completedJobs: 0,
    activeAnalysts: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [statsLoading, setStatsLoading] = useState(
    () =>
      !isCached(CACHE_KEYS.JOBS) ||
      !isCached(CACHE_KEYS.INSTANCES),
  );

  const fetchStats = useCallback(async () => {
    try {
      // Use cache for initial render, then fetch fresh data in background
      const cachedStats = await cacheGet(CACHE_KEYS.STATS);
      const cachedInstances = await cacheGet(CACHE_KEYS.INSTANCES);
      const cachedActivity = await cacheGet(CACHE_KEYS.RECENT_ACTIVITY);

      const applyStats = (statsObj, instances, activity) => {
        if (!statsObj) statsObj = { ongoingJobs: 0, completedJobs: 0 };
        if (!Array.isArray(instances)) instances = [];
        if (!Array.isArray(activity)) activity = [];
        
        const activeAnalysts = new Set(
          instances
            .filter((i) => i.status === "PENDING" && i.assignedTo)
            .map((i) => i.assignedTo._id || i.assignedTo),
        ).size;
        setStats({ 
          ongoingJobs: statsObj.ongoingJobs || 0, 
          completedJobs: statsObj.completedJobs || 0, 
          activeAnalysts 
        });
        setRecentActivity(activity);
      };

      // Instant render from cache
      if (cachedStats && cachedInstances && cachedActivity) {
        applyStats(cachedStats, cachedInstances, cachedActivity);
      }

      // Fetch fresh in background
      const [statsRes, instancesRes, activityRes] = await Promise.all([
        axios.get(`${API_URL}/api/jobs/stats`),
        axios.get(`${API_URL}/api/tests/instances`),
        axios.get(`${API_URL}/api/jobs/recent-activity?limit=5`),
      ]);
      cacheSet(CACHE_KEYS.STATS, statsRes.data);
      cacheSet(CACHE_KEYS.INSTANCES, instancesRes.data);
      cacheSet(CACHE_KEYS.RECENT_ACTIVITY, activityRes.data);
      applyStats(statsRes.data, instancesRes.data, activityRes.data);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, user]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      invalidateCache(CACHE_KEYS.STATS, CACHE_KEYS.INSTANCES, CACHE_KEYS.RECENT_ACTIVITY);
      fetchStats();
    };
    const events = [
      "JOB_CREATED", "JOB_DISTRIBUTED", "TEST_SUBMITTED", "TEST_REVIEWED",
      "JOB_UPDATED", "JOB_RETURNED", "JOB_HELD", "TRANSFER_INITIATED", "TRANSFER_RECEIVED"
    ];
    events.forEach(e => socket.on(e, handleUpdate));
    return () => {
      events.forEach(e => socket.off(e, handleUpdate));
    };
  }, [socket, fetchStats]);

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div
      className="card"
      style={{
        flex: 1,
        minWidth: "220px",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        borderTop: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            padding: "0.6rem",
            backgroundColor: `${color}15`,
            color: color,
            borderRadius: "var(--radius-md)",
          }}
        >
          <Icon size={20} />
        </div>
        <div
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--color-text-main)",
          }}
        >
          {value}
        </div>
      </div>
      <div>
        <div
          style={{
            fontWeight: 600,
            color: "var(--color-text-main)",
            fontSize: "0.9rem",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {subtitle}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ marginBottom: "0.5rem", letterSpacing: "-0.025em" }}>
          Admin Officer Dashboard
        </h1>
      </div>

      <div className="stat-cards">
        <StatCard
          icon={Activity}
          title="Ongoing Jobs"
          value={stats.ongoingJobs}
          color="var(--color-primary)"
          subtitle="Currently in progress"
        />
        <StatCard
          icon={CheckCircle}
          title="Completed Jobs"
          value={stats.completedJobs}
          color="var(--color-success)"
          subtitle="Fully completed"
        />
        <StatCard
          icon={Users}
          title="Active Analysts"
          value={stats.activeAnalysts}
          color="#8B5CF6"
          subtitle="Currently working on jobs"
        />
      </div>

      <RecentActivityTable activities={recentActivity} isLoading={statsLoading} />
    </div>
  );
}
