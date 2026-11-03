import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { exportAll, importAll, exportEntriesCSV, setSetting } from '../db';
import { getLagosDateString } from '../utils/date';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastBackupDate: string | null;
  onBackupCompleted: (date: string) => void;
  deferredPrompt: any;
  onInstallClicked: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lastBackupDate,
  onBackupCompleted,
  deferredPrompt,
  onInstallClicked,
}) => {
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Check storage persistence
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((persisted) => {
        setIsPersistent(persisted);
        if (!persisted && navigator.storage.persist) {
          navigator.storage.persist().then((granted) => {
            setIsPersistent(granted);
          });
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      const data = await exportAll();
      const today = getLagosDateString();
      const filename = `challenge-backup-${today}.json`;
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      let shared = false;
      // Try Web Share API if supported with files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: '61-Day Challenge Backup',
            text: `Backup data for 61-Day Challenge (${today})`,
            files: [file],
          });
          shared = true;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsBackingUp(false);
            return;
          }
          console.warn('Web Share API error, falling back to download:', shareErr);
        }
      }

      if (!shared) {
        // Fall back to normal download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      const nowIso = new Date().toISOString();
      await setSetting('lastBackupDate', nowIso);
      onBackupCompleted(nowIso);
      setStatusMessage({ type: 'success', text: 'Backup created and saved successfully!' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Failed to create backup: ' + (err.message || 'Unknown error') });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Are you sure you want to restore this backup? Existing entries will be preserved and backup data will be safely merged.'
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.entries && !parsed.stories) {
        throw new Error('Invalid backup file format');
      }

      const res = await importAll(parsed);
      setStatusMessage({
        type: 'success',
        text: `Restored successfully! Imported ${res.entriesImported} new entries and ${res.storiesImported} stories.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Failed to restore: ' + (err.message || 'Invalid JSON file') });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await exportEntriesCSV();
      const today = getLagosDateString();
      const filename = `challenge-entries-${today}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'CSV export downloaded!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'CSV export failed: ' + err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-lime" />
            <h2 id="settings-modal-title" className="text-lg font-bold text-white">Settings & Data Safety</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-border/40 focus:outline-none focus:ring-2 focus:ring-lime cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                statusMessage.type === 'success' ? 'bg-[#183420] text-lime border border-lime/30' : 'bg-red-950/80 text-expense border border-expense/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Storage & PWA Persistence */}
          <div className="bg-bg/60 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Device Storage Status</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Persistent Storage</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                isPersistent ? 'bg-lime/20 text-lime border border-lime/40' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
              }`}>
                {isPersistent === null ? 'Checking...' : isPersistent ? 'Persistent: Yes' : 'Persistent: No'}
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Installed PWAs are protected by browsers and far less likely to be cleared automatically.
            </p>

            {deferredPrompt && (
              <button
                type="button"
                onClick={onInstallClicked}
                className="w-full mt-2 min-h-[44px] px-4 py-2 bg-lime text-bg font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-lime-hover transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-bg" />
                <span>Install app (Add to Home Screen)</span>
              </button>
            )}
          </div>

          {/* Backup & Restore */}
          <div className="bg-bg/60 border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Backup & Restore</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last backup:{' '}
                  {lastBackupDate
                    ? new Date(lastBackupDate).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Never'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={isBackingUp}
                className="w-full min-h-[44px] px-4 py-3 bg-card border border-lime text-lime font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-lime/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-lime" />
                <span>{isBackingUp ? 'Preparing backup...' : 'Back up now (Share or Download)'}</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleRestoreFileSelected}
                  className="hidden"
                  id="restore-file-input"
                />
                <label
                  htmlFor="restore-file-input"
                  className="w-full min-h-[44px] px-4 py-3 bg-border/40 hover:bg-border border border-border text-white font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-muted" />
                  <span>Restore backup</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full min-h-[44px] px-4 py-3 bg-border/40 hover:bg-border border border-border text-white font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-muted" />
                <span>Export entries to CSV</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-muted/70 pt-2">
            61-Day Challenge · Single user · Zero backend · Offline ready
          </div>
        </div>
      </div>
    </div>
  );
};
