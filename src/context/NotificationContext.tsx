import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notify: (item: Omit<NotificationItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((item: Omit<NotificationItem, 'id'>) => {
    const id = 'notif_' + Math.random().toString(36).substr(2, 9) + Date.now();
    const newItem: NotificationItem = { ...item, id };
    
    setNotifications(prev => [newItem, ...prev.slice(0, 4)]);

    const dur = item.duration || 4000;
    setTimeout(() => {
      removeNotification(id);
    }, dur);
  }, [removeNotification]);

  const success = useCallback((title: string, message?: string) => notify({ type: 'success', title, message }), [notify]);
  const warning = useCallback((title: string, message?: string) => notify({ type: 'warning', title, message }), [notify]);
  const error = useCallback((title: string, message?: string) => notify({ type: 'error', title, message }), [notify]);
  const info = useCallback((title: string, message?: string) => notify({ type: 'info', title, message }), [notify]);

  return (
    <NotificationContext.Provider value={{ notify, success, warning, error, info }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-md w-full">
        {notifications.map(n => {
          let bg = 'bg-slate-900 border-slate-700 text-slate-100';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (n.type === 'success') {
            bg = 'bg-emerald-950/90 border-emerald-700/60 text-emerald-100';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (n.type === 'warning') {
            bg = 'bg-amber-950/90 border-amber-700/60 text-amber-100';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          } else if (n.type === 'error') {
            bg = 'bg-rose-950/90 border-rose-700/60 text-rose-100';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          }

          return (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-2 ${bg}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.message && <p className="text-xs opacity-90 mt-0.5 break-words">{n.message}</p>}
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
