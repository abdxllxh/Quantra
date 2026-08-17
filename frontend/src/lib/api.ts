import {
  DatasetListItem,
  DatasetDetail,
  DatasetPreview,
  DatasetProfile,
  ExecutiveSummary,
  IssueItem,
  AnomalyResults,
  ChartRecommendation,
  AskQuestionResponse,
  CorrelationResponse,
  BusinessKPIsResponse,
  CustomerAnalyticsResponse,
  FileInspectResponse,
  AuditLogResponse,
  AdaptiveDashboardResponse,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Datasets
  getDatasets: () => fetcher<DatasetListItem[]>('/datasets/'),
  getDataset: (id: string) => fetcher<DatasetDetail>(`/datasets/${id}`),
  getAuditLogs: (id: string) => fetcher<AuditLogResponse>(`/datasets/${id}/audit-logs`),
  deleteAuditLog: (datasetId: string, logId: string) =>
    fetcher<{ message: string; id: string }>(`/datasets/${datasetId}/audit-logs/${logId}`, { method: 'DELETE' }),
  deleteDataset: (id: string) => fetcher<{ message: string }>(`/datasets/${id}`, { method: 'DELETE' }),
  
  // File Upload & Inspection
  inspectFile: async (file: File): Promise<FileInspectResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/datasets/inspect`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to inspect file');
    return res.json();
  },

  uploadDataset: async (file: File, name?: string, projectId?: string, sheetName?: string): Promise<DatasetDetail> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (sheetName) formData.append('sheet_name', sheetName);

    const res = await fetch(`${API_BASE_URL}/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  seedDemoSample: () => fetcher<DatasetDetail>('/datasets/seed-sample', { method: 'POST' }),
  seedSample: (type = 'ecommerce') => fetcher<DatasetDetail>(`/datasets/seed-sample`, { method: 'POST' }),

  // Preview & Profiling
  getPreview: (id: string, page = 1, pageSize = 50, search?: string) => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    return fetcher<DatasetPreview>(`/datasets/${id}/preview?page=${page}&page_size=${pageSize}${searchParam}`);
  },
  getDatasetPreview: (id: string, page = 1, pageSize = 50, search?: string) => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    return fetcher<DatasetPreview>(`/datasets/${id}/preview?page=${page}&page_size=${pageSize}${searchParam}`);
  },
  getProfile: (id: string) => fetcher<DatasetProfile>(`/datasets/${id}/profile`),
  getSummary: (id: string) => fetcher<ExecutiveSummary>(`/datasets/${id}/summary`),
  
  // Issues Center
  getIssues: (id: string, filters?: { status?: string; severity?: string; issueType?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status_filter', filters.status);
    if (filters?.severity) params.append('severity_filter', filters.severity);
    if (filters?.issueType) params.append('issue_type_filter', filters.issueType);
    return fetcher<IssueItem[]>(`/datasets/${id}/issues?${params.toString()}`);
  },
  updateIssueStatus: (datasetId: string, issueId: string, status: string) =>
    fetcher<IssueItem>(`/datasets/${datasetId}/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  batchUpdateIssues: (datasetId: string, issueIds: string[], status: string) =>
    fetcher<{ message: string }>(`/datasets/${datasetId}/issues/batch-update`, {
      method: 'POST',
      body: JSON.stringify({ issue_ids: issueIds, status }),
    }),

  // Anomalies
  getAnomalies: (id: string, options?: string | { method?: string; threshold?: number; column_name?: string }) => {
    if (typeof options === 'string') {
      return fetcher<AnomalyResults>(`/datasets/${id}/anomalies?method=${options}&threshold=3.0`);
    }
    const method = options?.method || 'auto';
    const threshold = options?.threshold || 3.0;
    const colParam = options?.column_name ? `&column_name=${encodeURIComponent(options.column_name)}` : '';
    return fetcher<AnomalyResults>(`/datasets/${id}/anomalies?method=${method}&threshold=${threshold}${colParam}`);
  },

  // Cleaning & Transformations
  imputeMissing: (id: string, columnName: string, strategy: string, constantValue?: any) =>
    fetcher(`/datasets/${id}/clean/impute`, {
      method: 'POST',
      body: JSON.stringify({ column_name: columnName, strategy, constant_value: constantValue }),
    }),
  batchImpute: (id: string, columnNames?: string[], strategy = 'auto', constantValue?: any) =>
    fetcher(`/datasets/${id}/clean/batch-impute`, {
      method: 'POST',
      body: JSON.stringify({ column_names: columnNames, strategy, constant_value: constantValue }),
    }),
  deduplicate: (id: string, keep = 'first', subsetColumns?: string[]) =>
    fetcher(`/datasets/${id}/clean/deduplicate`, {
      method: 'POST',
      body: JSON.stringify({ keep, subset_columns: subsetColumns }),
    }),
  standardizeCategories: (id: string, columnName: string, mappings: Record<string, string>) =>
    fetcher(`/datasets/${id}/clean/standardize-categories`, {
      method: 'POST',
      body: JSON.stringify({ column_name: columnName, mappings }),
    }),
  cleanText: (id: string, columnName: string, action: string, findStr?: string, replaceStr?: string) =>
    fetcher(`/datasets/${id}/clean/text`, {
      method: 'POST',
      body: JSON.stringify({ column_name: columnName, action, find_str: findStr, replace_str: replaceStr }),
    }),
  cleanOutliers: (id: string, columnNames: string[], method: string, action: string) =>
    fetcher(`/datasets/${id}/clean/outliers`, {
      method: 'POST',
      body: JSON.stringify({ column_names: columnNames, method, action }),
    }),
  convertColumnTypes: (id: string, columnNames: string[], targetType: string) =>
    fetcher(`/datasets/${id}/transform/convert-types`, {
      method: 'POST',
      body: JSON.stringify({ column_names: columnNames, target_type: targetType }),
    }),
  addCalculatedColumn: (id: string, newColumnName: string, expression: string) =>
    fetcher(`/datasets/${id}/transform/calculated-column`, {
      method: 'POST',
      body: JSON.stringify({ new_column_name: newColumnName, expression }),
    }),
  addConditionalColumn: (id: string, payload: any) =>
    fetcher(`/datasets/${id}/transform/conditional-column`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  renameColumns: (id: string, mappings: Record<string, string>) =>
    fetcher(`/datasets/${id}/transform/rename-columns`, {
      method: 'POST',
      body: JSON.stringify({ mappings }),
    }),
  splitColumn: (id: string, sourceColumn: string, delimiter: string, newColumnNames: string[]) =>
    fetcher(`/datasets/${id}/transform/split-column`, {
      method: 'POST',
      body: JSON.stringify({ source_column: sourceColumn, delimiter, new_column_names: newColumnNames }),
    }),
  mergeColumns: (id: string, sourceColumns: string[], newColumnName: string, separator: string) =>
    fetcher(`/datasets/${id}/transform/merge-columns`, {
      method: 'POST',
      body: JSON.stringify({ source_columns: sourceColumns, new_column_name: newColumnName, separator }),
    }),
  extractDate: (id: string, sourceColumn: string, extractPart: string, newColumnName: string) =>
    fetcher(`/datasets/${id}/transform/extract-date`, {
      method: 'POST',
      body: JSON.stringify({ source_column: sourceColumn, extract_part: extractPart, new_column_name: newColumnName }),
    }),
  extractDateFeature: (id: string, sourceColumn: string, extractPart: string, newColumnName?: string) =>
    fetcher(`/datasets/${id}/transform/extract-date`, {
      method: 'POST',
      body: JSON.stringify({
        source_column: sourceColumn,
        extract_part: extractPart,
        new_column_name: newColumnName || `${sourceColumn}_${extractPart}`,
      }),
    }),

  // Versions & Undo
  restoreVersion: (datasetId: string, versionId: string) =>
    fetcher<DatasetDetail>(`/datasets/${datasetId}/versions/${versionId}/restore`, { method: 'POST' }),
  rollbackVersion: (datasetId: string, versionId: string) =>
    fetcher<DatasetDetail>(`/datasets/${datasetId}/versions/${versionId}/restore`, { method: 'POST' }),

  // Analytics & Aggregations
  runGroupBy: (id: string, payload: any) =>
    fetcher<any>(`/datasets/${id}/group`, { method: 'POST', body: JSON.stringify(payload) }),
  runPivot: (id: string, payload: any) =>
    fetcher<any>(`/datasets/${id}/pivot`, { method: 'POST', body: JSON.stringify(payload) }),
  getCorrelations: (id: string) => fetcher<CorrelationResponse>(`/datasets/${id}/correlations`),
  getKPIs: (id: string) => fetcher<BusinessKPIsResponse>(`/datasets/${id}/kpis`),
  getCustomerAnalytics: (id: string) => fetcher<CustomerAnalyticsResponse>(`/datasets/${id}/customer-analytics`),
  getCharts: (id: string) => fetcher<ChartRecommendation[]>(`/datasets/${id}/charts`),
  getAdaptiveDashboard: (id: string, variant = 0) =>
    fetcher<AdaptiveDashboardResponse>(`/datasets/${id}/adaptive-dashboard?variant=${variant}`, {
      cache: 'no-store',
    }),

  // AI & Assistant
  askQuestion: (id: string, question: string, privacyMode = false, contextMode = 'general') =>
    fetcher<AskQuestionResponse>(`/datasets/${id}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question, privacy_mode: privacyMode, context_mode: contextMode }),
    }),
  askCopilot: (id: string, question: string, privacyMode = false, contextMode = 'general') =>
    fetcher<AskQuestionResponse>(`/datasets/${id}/copilot`, {
      method: 'POST',
      body: JSON.stringify({ question, privacy_mode: privacyMode, context_mode: contextMode }),
    }),
  getSuggestedQuestions: (id: string) =>
    fetcher<{ suggested_questions: string[]; category_suggestions: Record<string, string[]> }>(
      `/datasets/${id}/suggested-questions`
    ),

  // Export URLs
  getExcelExportUrl: (id: string) => `${API_BASE_URL}/datasets/${id}/export/excel`,
  getCSVExportUrl: (id: string) => `${API_BASE_URL}/datasets/${id}/export/csv`,
};
