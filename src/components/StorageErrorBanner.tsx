import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface StorageErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
}

export const StorageErrorBanner: React.FC<StorageErrorBannerProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-[#EF4444] text-white px-4 py-3 shadow-lg flex items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-white" />
        <span>Storage Error: {error}. Check if your browser storage is full.</span>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error banner"
        className="p-1 rounded hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
      >
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};
