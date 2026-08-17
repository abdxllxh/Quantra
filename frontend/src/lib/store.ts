import { create } from 'zustand';

export type TabType = 
  | 'overview'
  | 'profiling'
  | 'smart_cleaning'
  | 'clean'
  | 'grid'
  | 'issues'
  | 'anomalies'
  | 'analytics'
  | 'charts'
  | 'ask'
  | 'export'
  | 'forecasting'
  | 'sql_workspace'
  | 'report_generator'
  | 'project_history'
  | 'settings'
  | 'admin_panel'
  | 'documentation';

export type ThemeMode = 'dark' | 'light';
export type SmartCleaningTarget = 'duplicates' | 'missing' | 'text' | 'dates' | 'outliers' | 'types';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
}

interface AppState {
  activeDatasetId: string | null;
  activeTab: TabType;
  theme: ThemeMode;
  isUploadModalOpen: boolean;
  isAuditModalOpen: boolean;
  refreshCounter: number;
  smartCleaningTarget: SmartCleaningTarget | null;
  toasts: ToastNotification[];
  setActiveDatasetId: (id: string | null) => void;
  setActiveTab: (tab: TabType) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setUploadModalOpen: (open: boolean) => void;
  setAuditModalOpen: (open: boolean) => void;
  triggerRefresh: () => void;
  setSmartCleaningTarget: (target: SmartCleaningTarget | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDatasetId: null,
  activeTab: 'overview',
  theme: 'dark',
  isUploadModalOpen: false,
  isAuditModalOpen: false,
  refreshCounter: 0,
  smartCleaningTarget: null,
  toasts: [],
  setActiveDatasetId: (id) => set({ activeDatasetId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('datalens_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('datalens_theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { theme: nextTheme };
    });
  },
  setUploadModalOpen: (open) => set({ isUploadModalOpen: open }),
  setAuditModalOpen: (open) => set({ isAuditModalOpen: open }),
  triggerRefresh: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
  setSmartCleaningTarget: (target) => set({ smartCleaningTarget: target }),
  showToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastNotification = { id, message, type, timestamp: Date.now() };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
