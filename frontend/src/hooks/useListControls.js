import { useState, useMemo, useCallback } from 'react';
import { resolveSiblings, jobCodeComparator } from '../utils/siblingUtils';

export function useListControls(rawItems, config, options = {}) {
  const {
    defaultSortKey = 'createdAt',
    defaultSortDir = 'desc',
    sortOptions = [],
    filterDefs = [],
  } = config;

  const {
    getSiblingId,
    fullItems = [],
    groupRoots,
    fuse
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [activeFilters, setActiveFilters] = useState({});

  const setFilter = useCallback((filterId, value, mode = 'include') => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: { value, mode }
    }));
  }, []);

  const clearFilter = useCallback((filterId) => {
    setActiveFilters(prev => {
      const next = { ...prev };
      delete next[filterId];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setSortKey(defaultSortKey);
    setSortDir(defaultSortDir);
    setActiveFilters({});
  }, [defaultSortKey, defaultSortDir]);

  const toggleSortDir = useCallback(() => {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const processedItems = useMemo(() => {
    let filtered = [...rawItems];

    // High-accuracy search with exact-match prioritization
    if (searchQuery) {
      const term = searchQuery.trim().toLowerCase();
      const isNumeric = /\d/.test(term);
      const pool = (fuse && fullItems && fullItems.length > 0) ? fullItems : rawItems;

      // 1. Exact substring check across primary identifier fields
      const exactMatches = [];
      for (const item of pool) {
        const code = String(item.jobCode || item.testCode || '').toLowerCase();
        const client = String(item.clientName || item.customer?.customer_name || '').toLowerCase();
        const sample = String(item.sample?.sample_name || item.sample?.sample_id || '').toLowerCase();
        const searchKey = String(item._searchKey || item._paramNames || item._actors || item._details || '').toLowerCase();

        if (code.includes(term) || client.includes(term) || sample.includes(term) || (searchKey && searchKey.includes(term))) {
          exactMatches.push(item);
        }
      }

      if (exactMatches.length > 0) {
        filtered = exactMatches;
      } else if (!isNumeric && fuse) {
        // Fuzzy search ONLY for non-numeric text queries if no exact substring matches found
        filtered = fuse.search(searchQuery).map(r => r.item);
      } else {
        filtered = [];
      }
    }

    if (!filtered || filtered.length === 0) return [];

    // Apply Filters (AND logic)
    const activeFilterEntries = Object.entries(activeFilters);
    if (activeFilterEntries.length > 0) {
      filtered = filtered.filter(item => {
        for (const [filterId, filterState] of activeFilterEntries) {
          const def = filterDefs.find(d => d.id === filterId);
          if (def && def.test) {
            const passed = def.test(item, filterState.value);
            if (filterState.mode === 'exclude') {
              if (passed) return false;
            } else {
              if (!passed) return false;
            }
          }
        }
        return true;
      });
    }

    // Sibling Pull-in / Root Grouping
    if (getSiblingId) {
      filtered = resolveSiblings(filtered, fullItems, getSiblingId);
    } else if (groupRoots) {
      const roots = new Set(filtered.map(i => groupRoots(i)).filter(Boolean));
      if (roots.size > 0 && fullItems && fullItems.length > 0) {
        const expanded = [];
        const seen = new Set();
        for (const item of fullItems) {
          const root = groupRoots(item);
          if (root && roots.has(root) && !seen.has(item._id)) {
            expanded.push(item);
            seen.add(item._id);
          }
        }
        filtered = expanded;
      }
    }

    // Sort: when search is active, prioritize exact match position before regular field sort
    filtered.sort((a, b) => {
      if (searchQuery) {
        const term = searchQuery.trim().toLowerCase();
        const aCode = String(a.jobCode || a.testCode || '').toLowerCase();
        const bCode = String(b.jobCode || b.testCode || '').toLowerCase();
        const aExact = aCode === term;
        const bExact = bCode === term;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        const aStarts = aCode.startsWith(term);
        const bStarts = bCode.startsWith(term);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
      }

      if (sortKey === 'jobCode' || sortKey === 'testCode') {
        const aCode = a.jobCode || a.testCode;
        const bCode = b.jobCode || b.testCode;
        return jobCodeComparator(aCode, bCode, sortDir);
      }

      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rawItems, searchQuery, fuse, activeFilters, sortKey, sortDir, filterDefs, fullItems, getSiblingId, groupRoots]);

  const isFiltered = searchQuery !== '' || Object.keys(activeFilters).length > 0;

  return {
    searchQuery, setSearchQuery,
    sortKey, setSortKey,
    sortDir, setSortDir, toggleSortDir,
    activeFilters, setFilter, clearFilter, clearAll,
    processedItems,
    isFiltered,
    resultCount: processedItems.length
  };
}
