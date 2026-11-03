import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  addEntry,
  updateEntry,
  deleteEntry,
  subscribeStorageError,
  getSetting,
  setSetting,
  calculateStreak,
  type Entry,
  type EntryType
} from './db';
import { BottomNav, type TabType } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { MoneyScreen } from './components/MoneyScreen';
import { StoryScreen } from './components/StoryScreen';
import { EntrySheet } from './components/EntrySheet';
import { SettingsModal } from './components/SettingsModal';
import { StorageErrorBanner } from './components/StorageErrorBanner';
import { MilestoneToast } from './components/MilestoneToast';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEntrySheetOpen, setIsEntrySheetOpen] = useState(false);
  const [entrySheetDefaultType, setEntrySheetDefaultType] = useState<EntryType>('income');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [unlockedMilestone, setUnlockedMilestone] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);

  // Dexie live queries (single source of truth)
  const entries = useLiveQuery(() => db.entries.toArray(), []) || [];
  const stories = useLiveQuery(() => db.stories.toArray(), []) || [];

  // Storage error subscription
  useEffect(() => {
    return subscribeStorageError((msg) => {
      setStorageError(msg);
    });
  }, []);

  // Beforeinstallprompt capture
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Request persistent storage on first load
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(console.error);
    }
  }, []);

  // Load last active tab & last backup date from settings
  useEffect(() => {
    getSetting<TabType>('lastTab').then((savedTab) => {
      if (savedTab && ['home', 'money', 'story'].includes(savedTab)) {
        setActiveTab(savedTab);
      }
    });

    getSetting<string>('lastBackupDate').then((date) => {
      if (date) {
        setLastBackupDate(date);
      }
    });
  }, []);

  // Update streak whenever entries or stories change
  useEffect(() => {
    calculateStreak().then(setStreak);
  }, [entries, stories]);

  // Handle active tab change and persist to Dexie
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSetting('lastTab', tab).catch(console.error);
  };

  // Milestone check (₦100k, ₦250k, ₦400k, ₦500k)
  const lastTotalRef = useRef<number | null>(null);
  useEffect(() => {
    const totalEarned = entries
      .filter((e) => e.type === 'income')
      .reduce((acc, curr) => acc + curr.amount_ngn, 0);

    const milestones = [100000, 250000, 400000, 500000];

    getSetting<number[]>('celebratedMilestones', []).then((celebrated = []) => {
      for (const m of milestones) {
        if (totalEarned >= m && !celebrated.includes(m)) {
          // Trigger milestone unlock
          setUnlockedMilestone(m);
          setSetting('celebratedMilestones', [...celebrated, m]).catch(console.error);
          break;
        }
      }
    });

    lastTotalRef.current = totalEarned;
  }, [entries]);

  // Open add entry sheet
  const handleOpenAddEntry = (type: EntryType = 'income') => {
    setEditingEntry(null);
    setEntrySheetDefaultType(type);
    setIsEntrySheetOpen(true);
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setEntrySheetDefaultType(entry.type);
    setIsEntrySheetOpen(true);
  };

  const handleSubmitEntry = async (entryData: Omit<Entry, 'id' | 'created_at'>, existingId?: number) => {
    if (existingId) {
      await updateEntry(existingId, entryData);
    } else {
      await addEntry(entryData);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteEntry(id);
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white flex flex-col font-body selection:bg-lime selection:text-bg">
      {/* Storage failure error banner */}
      <StorageErrorBanner error={storageError} onDismiss={() => setStorageError(null)} />

      {/* Milestone Celebratory Toast */}
      <MilestoneToast
        milestone={unlockedMilestone}
        onDismiss={() => setUnlockedMilestone(null)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'home' && (
          <HomeScreen
            entries={entries}
            stories={stories}
            lastBackupDate={lastBackupDate}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAddEntry={handleOpenAddEntry}
            onNavigateToStory={() => handleTabChange('story')}
            streak={streak}
          />
        )}

        {activeTab === 'money' && (
          <MoneyScreen
            entries={entries}
            onOpenAddEntry={handleOpenAddEntry}
            onEditEntry={handleEditEntry}
          />
        )}

        {activeTab === 'story' && (
          <StoryScreen stories={stories} />
        )}
      </main>

      {/* Add / Edit Entry Sheet */}
      <EntrySheet
        isOpen={isEntrySheetOpen}
        onClose={() => setIsEntrySheetOpen(false)}
        onSubmit={handleSubmitEntry}
        onDelete={handleDeleteEntry}
        editingEntry={editingEntry}
        defaultType={entrySheetDefaultType}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lastBackupDate={lastBackupDate}
        onBackupCompleted={(date) => setLastBackupDate(date)}
        deferredPrompt={deferredPrompt}
        onInstallClicked={handleInstallPWA}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

export default App;
