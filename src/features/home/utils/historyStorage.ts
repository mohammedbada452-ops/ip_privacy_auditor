import type { ScoreHistoryEntry, PrivacyScoreTier } from '../types';

const STORAGE_KEY = 'privacy_score_history_v1';
const MAX_HISTORY_ITEMS = 20;

// In-memory fallback for environments where localStorage is blocked or restricted
let memoryHistory: ScoreHistoryEntry[] = [];

export function getScoreHistory(): ScoreHistoryEntry[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [...memoryHistory];
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...memoryHistory];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ITEMS);
    }
    return [];
  } catch (err) {
    console.warn('Unable to read score history from localStorage:', err);
    return [...memoryHistory];
  }
}

export function saveScoreHistoryEntry(
  score: number,
  tier: PrivacyScoreTier,
  issuesCount: number,
  label?: string,
  isPartial = false,
  activeIssues: string[] = [],
  scanId?: string,
  timestamp?: number
): ScoreHistoryEntry[] {
  try {
    const existing = getScoreHistory();
    const previous = existing.length > 0 ? existing[0] : null;
    const delta = previous ? score - previous.score : undefined;
    const prevScore = previous ? previous.score : undefined;

    const previousIssues = previous?.remainingIssues || [];
    
    // Fixed issues = issues that were in previous scan but are NOT in current active issues
    const fixedIssues = previousIssues.filter((prev) => !activeIssues.includes(prev));
    // New issues = issues in current scan that were NOT in previous scan
    const newIssues = previous ? activeIssues.filter((curr) => !previousIssues.includes(curr)) : [];
    // Remaining issues = current active issues
    const remainingIssues = [...activeIssues];

    const newEntry: ScoreHistoryEntry = {
      id: scanId || `scan_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`}`,
      timestamp: timestamp || Date.now(),
      score: Math.max(0, Math.min(100, Math.round(score))),
      previousScore: prevScore,
      tier,
      issuesCount,
      label: label || (existing.length === 0 ? 'Initial Audit' : 'Privacy Check'),
      isPartial,
      scoreDelta: delta,
      fixedIssues,
      remainingIssues,
      newIssues,
    };

    const updated = [newEntry, ...existing].slice(0, MAX_HISTORY_ITEMS);
    memoryHistory = updated;

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (err) {
    console.warn('Unable to persist score history to localStorage:', err);
    return memoryHistory;
  }
}

export function clearScoreHistory(): void {
  try {
    memoryHistory = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Unable to clear score history:', err);
  }
}

export function calculateScoreTrend(history: ScoreHistoryEntry[]): {
  overallDelta: number;
  averageScore: number;
  scanCount: number;
  highestScore: number;
  lowestScore: number;
} {
  if (!history || history.length === 0) {
    return {
      overallDelta: 0,
      averageScore: 0,
      scanCount: 0,
      highestScore: 0,
      lowestScore: 0,
    };
  }

  const scores = history.map((h) => h.score);
  const latest = history[0].score;
  const oldest = history[history.length - 1].score;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    overallDelta: latest - oldest,
    averageScore: avg,
    scanCount: history.length,
    highestScore: highest,
    lowestScore: lowest,
  };
}
