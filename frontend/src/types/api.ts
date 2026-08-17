export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface DatasetListItem {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  status: string;
  created_at: string;
  health_score?: number;
  anomaly_count?: number;
  missing_count?: number;
}

export interface DatasetColumn {
  id: string;
  name: string;
  original_name: string;
  detected_type: string;
  confidence: number;
  is_nullable: boolean;
  null_count: number;
  unique_count: number;
  stats?: Record<string, any>;
  position: number;
}

export interface DatasetVersion {
  id: string;
  version_number: number;
  name: string;
  description?: string;
  row_count: number;
  column_count: number;
  health_score?: number;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  action_code: string;
  version: string;
  description: string;
  dataset_name: string;
  timestamp: string;
  user: string;
  status: string;
  impact: string;
}

export interface AuditLogResponse {
  dataset_id: string;
  events: AuditEvent[];
  total: number;
}

export interface DatasetDetail {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  current_version_id?: string;
  row_count: number;
  column_count: number;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  columns?: DatasetColumn[];
  versions?: DatasetVersion[];
}

export interface ProblemCell {
  row_index: number;
  column_name: string;
  issue_type: string;
  severity: string;
  message: string;
  suggested_value?: string;
}

export interface DatasetPreview {
  dataset_id: string;
  version_id: string;
  total_rows: number;
  total_columns: number;
  columns: DatasetColumn[];
  rows: Record<string, any>[];
  problem_cells: ProblemCell[];
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Deduction {
  metric: string;
  deduction: number;
  reason: string;
  impact: string;
}

export interface HealthScoreBreakdown {
  overall_score: number;
  completeness_score: number;
  consistency_score: number;
  validity_score: number;
  uniqueness_score: number;
  anomaly_risk_score: number;
  readiness_analytics: number;
  readiness_ml: number;
  readiness_reporting: number;
  deductions: Deduction[];
}

export interface ColumnProfile {
  name: string;
  original_name: string;
  detected_type: string;
  confidence: number;
  is_nullable: boolean;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  memory_usage_bytes: number;
  is_constant: boolean;
  is_high_cardinality: boolean;
  quality_score: number;
  stats: Record<string, any>;
}

export interface DatasetProfile {
  dataset_id: string;
  version_id: string;
  total_rows: number;
  total_columns: number;
  total_cells: number;
  total_missing_cells: number;
  missing_percentage: number;
  duplicate_rows_count: number;
  duplicate_percentage: number;
  memory_usage_bytes: number;
  memory_usage_formatted: string;
  numeric_columns_count: number;
  categorical_columns_count: number;
  date_columns_count: number;
  boolean_columns_count: number;
  columns: ColumnProfile[];
  health: HealthScoreBreakdown;
}

export interface ActionableRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'missing' | 'anomaly' | 'duplicate' | 'standardization';
  affected_column?: string;
  affected_rows_count: number;
  action_type: string;
  recommended_params: Record<string, any>;
}

export interface ExecutiveSummary {
  dataset_name: string;
  total_records: number;
  total_columns: number;
  health_score: number;
  key_metrics: {
    label: string;
    value: string;
    change?: string;
    is_currency?: boolean;
  }[];
  narrative_paragraphs: string[];
  detected_anomalies_count: number;
  missing_values_count: number;
  duplicate_records_count: number;
  recommendations: ActionableRecommendation[];
}

export interface IssueItem {
  id: string;
  dataset_id: string;
  version_id?: string;
  issue_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  row_index?: number;
  column_name?: string;
  original_value?: string;
  suggested_value?: string;
  anomaly_score?: number;
  message: string;
  explanation?: string;
  status: 'open' | 'fixed' | 'ignored' | 'marked_valid';
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface AnomalyItem {
  row_index: number;
  column_name: string;
  actual_value: any;
  expected_range: string;
  deviation_pct?: number;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection_method: string;
  reason: string;
  is_valid: boolean;
}

export interface AnomalyScatterPoint {
  row_index: number;
  column_name: string;
  value: number;
  is_anomaly: boolean;
  score: number;
  reason?: string;
  severity?: string;
}

export interface AnomalyResults {
  dataset_id: string;
  total_anomalies: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  affected_columns_count: number;
  affected_rows_count: number;
  anomalies: AnomalyItem[];
  column_summaries: {
    column_name: string;
    anomaly_count: number;
    anomaly_percentage: number;
    max_severity: string;
    methods_used: string[];
    typical_min?: number;
    typical_max?: number;
  }[];
  scatter_points?: {
    row_index: number;
    column_name: string;
    value: number;
    is_anomaly: boolean;
    score: number;
    reason?: string;
    severity?: string;
  }[];
}

export interface ChartRecommendation {
  chart_type: 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'donut' | 'histogram';
  title: string;
  x_axis: string;
  y_axis?: string;
  group_by?: string;
  aggregation?: string;
  data: Record<string, any>[];
  explanation: string;
}

export interface ToolCallRecord {
  tool_name: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  execution_time_ms?: number;
}

export interface ProposedTransformation {
  action: string;
  target_column?: string;
  details: string;
  preview_affected_rows: number;
  operation_payload: Record<string, any>;
  requires_confirmation: boolean;
}

export interface AskQuestionResponse {
  success?: boolean;
  intent?: 'dataset_question' | 'workspace_help';
  answer: string;
  grounded_data?: Record<string, any>;
  tool_calls: ToolCallRecord[];
  recommended_chart?: ChartRecommendation;
  proposed_transformation?: ProposedTransformation;
  confidence_score: number;
  evidence_summary?: string;
  suggested_followups: string[];
  target_section?: string | null;
}

export interface CorrelationPair {
  col1: string;
  col2: string;
  correlation: number;
  relationship: string;
  explanation: string;
}

export interface CorrelationResponse {
  columns: string[];
  matrix: Record<string, Record<string, number>>;
  top_positive: CorrelationPair[];
  top_negative: CorrelationPair[];
}

export interface KPIItem {
  label: string;
  value: any;
  formatted_value: string;
  column_source?: string;
  aggregation: string;
  comparison_text?: string;
  growth_pct?: number;
  sparkline?: number[];
  icon?: string;
}

export interface BusinessKPIsResponse {
  kpis: KPIItem[];
  top_insights: string[];
}

export interface DashboardKPI {
  id: string;
  label: string;
  value: number;
  formatted_value: string;
  comparison_text: string;
  trend: 'positive' | 'negative' | 'neutral';
  source_column?: string | null;
  sparkline: number[];
}

export interface DashboardVisual {
  id: string;
  title: string;
  subtitle: string;
  chart_type: 'area' | 'line' | 'bar' | 'horizontal_bar' | 'donut' | 'scatter' | 'radar' | 'heatmap';
  data: Record<string, string | number>[];
  x_key: string;
  y_keys: string[];
  perspective_ids: string[];
  size: 'standard' | 'wide';
  value_format: string;
}

export interface DashboardInsight {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  impact: 'high' | 'medium' | 'low';
  direction: 'positive' | 'negative' | 'neutral';
  perspective_id: string;
  visual_ids: string[];
}

export interface DashboardRecommendation {
  id: string;
  title: string;
  action: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  insight_ids: string[];
}

export interface DashboardPerspective {
  id: string;
  label: string;
  description: string;
  kpi_ids: string[];
  visual_ids: string[];
  insight_ids: string[];
}

export interface AdaptiveDashboardResponse {
  dataset_id: string;
  version_id: string;
  domain: string;
  domain_label: string;
  title: string;
  subtitle: string;
  engine_mode: string;
  generated_at: string;
  dashboard_variant: number;
  dashboard_mode: string;
  kpis: DashboardKPI[];
  visuals: DashboardVisual[];
  insights: DashboardInsight[];
  recommendations: DashboardRecommendation[];
  perspectives: DashboardPerspective[];
}

export interface CustomerAnalyticsResponse {
  available: boolean;
  dataset_id: string;
  version_id: string;
  message?: string;
  detected_columns: {
    customer?: string | null;
    value?: string | null;
    date?: string | null;
    segment?: string | null;
    satisfaction?: string | null;
  };
  metrics?: {
    unique_customers: number;
    repeat_customers: number;
    repeat_rate: number;
    total_value: number;
    average_customer_value: number;
    average_frequency: number;
    average_satisfaction: number | null;
    value_label: string;
  };
  brief?: string[];
  segments?: { name: string; customers: number; value: number; average_value: number }[];
  tiers?: { name: string; customers: number; percentage: number }[];
  top_customers?: { customer: string; frequency: number; value: number; tier: string }[];
  methodology?: string;
}

export interface SheetInfo {
  name: string;
  row_count: number;
  column_count: number;
  columns: string[];
  preview_rows: Record<string, any>[];
}

export interface FileInspectResponse {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  file_size_formatted: string;
  sheet_count: number;
  sheet_names: string[];
  sheets: SheetInfo[];
}
