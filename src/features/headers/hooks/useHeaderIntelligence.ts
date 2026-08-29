import { useState, useCallback, useMemo } from 'react';
import { useUnifiedScan } from '../../../context/UnifiedScanContext';
import type {
  HeadersAnalysisResponse,
  HeaderCategoryFilter,
  HeaderSortField,
  HeaderSortOrder,
  HeaderItem,
} from '../types';

export interface UseHeaderIntelligenceResult {
  data: HeadersAnalysisResponse | null;
  previousData: HeadersAnalysisResponse | null;
  scoreDelta: number | null;
  dismissComparison: () => void;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  selectedCategory: HeaderCategoryFilter;
  setSelectedCategory: (cat: HeaderCategoryFilter) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: HeaderSortField;
  setSortField: (f: HeaderSortField) => void;
  sortOrder: HeaderSortOrder;
  setSortOrder: (o: HeaderSortOrder) => void;
  showOnlyRisks: boolean;
  setShowOnlyRisks: (val: boolean) => void;
  filteredHeaders: HeaderItem[];
  totalFilteredCount: number;
}

export function useHeaderIntelligence(): UseHeaderIntelligenceResult {
  const {
    currentSnapshot,
    previousSnapshot,
    isScanning,
    isRechecking,
    error: scanError,
    recheckHeaders,
    dismissComparison,
  } = useUnifiedScan();

  const data = currentSnapshot?.headers?.data ?? null;
  const previousData = previousSnapshot?.headers?.data ?? null;
  const isLoading = isScanning && !data;
  const isRefreshing = isRechecking;
  const error = scanError ? new Error(scanError) : null;

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<HeaderCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<HeaderSortField>('default');
  const [sortOrder, setSortOrder] = useState<HeaderSortOrder>('asc');
  const [showOnlyRisks, setShowOnlyRisks] = useState<boolean>(false);

  const refetch = useCallback(async () => {
    await recheckHeaders();
  }, [recheckHeaders]);

  const scoreDelta = useMemo(() => {
    if (!data || !previousData) return null;
    return data.headerPrivacyExposureScore - previousData.headerPrivacyExposureScore;
  }, [data, previousData]);

  // Filter and sort items
  const filteredHeaders = useMemo(() => {
    if (!data || !data.headers) return [];

    let items = [...data.headers];

    // 1. Category Filter
    if (selectedCategory !== 'ALL') {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // 2. Risk filter
    if (showOnlyRisks) {
      items = items.filter(
        (item) => item.privacyStatus === 'WARNING' || item.privacyStatus === 'DANGER' || item.riskPoints > 0
      );
    }

    // 3. Search query filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const canonicalMatch = item.canonicalName.toLowerCase().includes(q);
        const valMatch = (item.sanitizedValue || '').toLowerCase().includes(q) || (item.rawValue || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const impactMatch = (item.privacyImpact || '').toLowerCase().includes(q);
        return nameMatch || canonicalMatch || valMatch || descMatch || impactMatch;
      });
    }

    // 4. Sorting
    items.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.canonicalName.localeCompare(b.canonicalName);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'severity': {
          const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
          comparison = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
          break;
        }
        case 'status':
          comparison = a.privacyStatus.localeCompare(b.privacyStatus);
          break;
        case 'default':
        default:
          comparison = (b.riskPoints || 0) - (a.riskPoints || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [data, selectedCategory, showOnlyRisks, searchQuery, sortField, sortOrder]);

  return {
    data,
    previousData,
    scoreDelta,
    dismissComparison,
    isLoading,
    isRefreshing,
    error,
    refetch,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    showOnlyRisks,
    setShowOnlyRisks,
    filteredHeaders,
    totalFilteredCount: filteredHeaders.length,
  };
}
