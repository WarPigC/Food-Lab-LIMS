import React from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  RotateCcw,
  PlusCircle,
  PauseCircle,
  XCircle,
  AlertCircle,
  Edit,
  FileText
} from 'lucide-react';
import { formatTestCode } from '../utils/codeUtils';
import { formatDateTime } from '../utils/dateUtils';
import Spinner from './Spinner';

const ACTION_CONFIG = {
  DISPATCHED: {
    label: 'Dispatched',
    bg: 'rgba(59, 130, 246, 0.1)',
    color: '#2563EB',
    Icon: CheckCircle
  },
  SUBMITTED: {
    label: 'Submitted',
    bg: 'rgba(99, 102, 241, 0.1)',
    color: '#4F46E5',
    Icon: Clock
  },
  APPROVED: {
    label: 'Approved',
    bg: 'rgba(16, 185, 129, 0.1)',
    color: '#059669',
    Icon: CheckCircle
  },
  REASSIGNED: {
    label: 'Reassigned',
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#D97706',
    Icon: ArrowRightLeft
  },
  RETURNED: {
    label: 'Returned',
    bg: 'rgba(239, 68, 68, 0.1)',
    color: '#DC2626',
    Icon: RotateCcw
  },
  CREATED: {
    label: 'Created',
    bg: 'rgba(14, 165, 233, 0.1)',
    color: '#0284C7',
    Icon: PlusCircle
  },
  HELD: {
    label: 'On Hold',
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#B45309',
    Icon: PauseCircle
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'rgba(107, 114, 128, 0.1)',
    color: '#4B5563',
    Icon: XCircle
  },
  TRANSFER: {
    label: 'Transfer',
    bg: 'rgba(20, 184, 166, 0.1)',
    color: '#0D9488',
    Icon: ArrowRightLeft
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#D97706',
    Icon: AlertCircle
  },
  AMENDED: {
    label: 'Amended',
    bg: 'rgba(139, 92, 246, 0.1)',
    color: '#7C3AED',
    Icon: Edit
  },
  REPORT: {
    label: 'Report',
    bg: 'rgba(59, 130, 246, 0.1)',
    color: '#2563EB',
    Icon: FileText
  },
  ACTIVITY: {
    label: 'Activity',
    bg: 'rgba(107, 114, 128, 0.1)',
    color: '#4B5563',
    Icon: Activity
  }
};

export default function RecentActivityTable({
  activities = [],
  isLoading = false,
  emptyMessage = 'No recent activity detected.'
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Activity size={18} /> Recent Activity
        </h3>
        {activities.length > 0 && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              fontWeight: 500
            }}
          >
            {activities.length} recent {activities.length === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>

      <div className="table-scroll">
        <table
          style={{
            width: '100%',
            minWidth: '850px',
            tableLayout: 'fixed',
            borderCollapse: 'collapse'
          }}
        >
          <colgroup>
            <col style={{ width: '125px' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '145px' }} />
          </colgroup>
          <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
            <tr>
              <th
                style={{
                  width: '125px',
                  padding: '0.85rem 0.75rem',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              >
                Action
              </th>
              <th
                style={{
                  width: '35%',
                  padding: '0.85rem 0.75rem',
                  paddingLeft: '1.5rem',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              >
                Event Description
              </th>
              <th
                style={{
                  width: '220px',
                  padding: '0.85rem 0.75rem',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              >
                Job Code
              </th>
              <th
                style={{
                  width: '18%',
                  padding: '0.85rem 0.75rem',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              >
                Client
              </th>
              <th
                style={{
                  width: '17%',
                  padding: '0.85rem 0.75rem',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              >
                Performed By
              </th>
              <th
                style={{
                  width: '145px',
                  padding: '0.85rem 0.75rem',
                  paddingRight: '1.75rem',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              >
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <Spinner message="Fetching activity..." />
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              activities.map((item) => {
                const config = ACTION_CONFIG[item.action] || ACTION_CONFIG.ACTIVITY;
                const ActionIcon = config.Icon;
                const formattedCode = formatTestCode(item.jobCode);

                return (
                  <tr key={item._id}>
                    <td
                      style={{
                        padding: '0.85rem 0.75rem',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          backgroundColor: config.bg,
                          color: config.color,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <ActionIcon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td
                      title={item.message}
                      style={{
                        padding: '0.85rem 0.75rem',
                        paddingLeft: '1.5rem',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'left'
                      }}
                    >
                      {item.message}
                    </td>
                    <td
                      style={{
                        padding: '0.85rem 0.75rem',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formattedCode ? (
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: 'var(--color-text-main)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formattedCode}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>N/A</span>
                      )}
                    </td>
                    <td
                      title={item.clientName || 'N/A'}
                      style={{
                        padding: '0.85rem 0.75rem',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.clientName || (
                        <span style={{ color: 'var(--color-text-muted)' }}>N/A</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '0.85rem 0.75rem',
                        textAlign: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.1rem',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}
                      >
                        <span
                          title={item.user?.name || 'System'}
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}
                        >
                          {item.user?.name || 'System'}
                        </span>
                        {item.user?.role && (
                          <span
                            title={String(item.user.role).replace(/_/g, ' ').toLowerCase()}
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--color-text-muted)',
                              textTransform: 'capitalize',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                          >
                            {String(item.user.role).replace(/_/g, ' ').toLowerCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.85rem 0.75rem',
                        paddingRight: '1.75rem',
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatDateTime(item.timestamp)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
