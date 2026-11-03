import Dexie, { type Table } from 'dexie';

export type EntryType = 'income' | 'expense';

export type IncomeCategory = 'Client job' | 'Freelance' | 'Sales' | 'Other';
export type ExpenseCategory = 'Data' | 'Transport' | 'Food' | 'Tools' | 'Other';
export type EntryCategory = IncomeCategory | ExpenseCategory;

export interface Entry {
  id?: number;
  type: EntryType;
  amount_ngn: number;
  title: string;
  category: EntryCategory;
  note?: string;
  entry_date: string; // YYYY-MM-DD (Africa/Lagos)
  created_at: string; // ISO string
}

export type StoryBackground =
  | 'purple'
  | 'yellow'
  | 'orange'
  | 'black'
  | 'teal'
  | 'sunset';

export type StoryTextStyle = 'bold' | 'serif' | 'mono';
export type StoryTextSize = 'S' | 'M' | 'L';
export type StoryTextAlign = 'left' | 'center' | 'right';

export interface Story {
  id?: number;
  story_date: string; // &unique YYYY-MM-DD
  text: string;
  background: StoryBackground;
  text_style: StoryTextStyle;
  text_size: StoryTextSize;
  align: StoryTextAlign;
  updated_at: string; // ISO string
}

export interface SettingItem {
  key: string;
  value: any;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  entries: Entry[];
  stories: Story[];
  settings: Record<string, any>;
}

// Error listener for global UI banner
type ErrorListener = (message: string) => void;
const errorListeners: Set<ErrorListener> = new Set();

export function subscribeStorageError(listener: ErrorListener): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function notifyStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Storage operation failed';
  console.error('[Storage Error]', error);
  errorListeners.forEach((listener) => {
    try {
      listener(message);
    } catch (e) {
      console.error(e);
    }
  });
}

class Challenge61DB extends Dexie {
  entries!: Table<Entry, number>;
  stories!: Table<Story, number>;
  settings!: Table<SettingItem, string>;

  constructor() {
    super('Challenge61DB');
    this.version(1).stores({
      entries: '++id, type, amount_ngn, title, category, note, entry_date, created_at',
      stories: '++id, &story_date, text, background, text_style, text_size, align, updated_at',
      settings: 'key, value',
    });
  }
}

export const db = new Challenge61DB();

/**
 * Add entry with immediate Dexie write and error handling.
 */
export async function addEntry(entry: Omit<Entry, 'id' | 'created_at'>): Promise<number | undefined> {
  try {
    const newEntry: Entry = {
      ...entry,
      created_at: new Date().toISOString(),
    };
    return await db.entries.add(newEntry);
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * Update an existing entry.
 */
export async function updateEntry(id: number, entry: Partial<Entry>): Promise<number> {
  try {
    return await db.entries.update(id, entry);
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * Delete an entry by ID.
 */
export async function deleteEntry(id: number): Promise<void> {
  try {
    await db.entries.delete(id);
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * List all entries, sorted by entry_date descending, then created_at descending.
 */
export async function listEntries(): Promise<Entry[]> {
  try {
    const all = await db.entries.toArray();
    return all.sort((a, b) => {
      const dateCmp = b.entry_date.localeCompare(a.entry_date);
      if (dateCmp !== 0) return dateCmp;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  } catch (error) {
    notifyStorageError(error);
    return [];
  }
}

/**
 * Save story (create or update for given story_date).
 */
export async function saveStory(story: Omit<Story, 'id' | 'updated_at'>): Promise<number | undefined> {
  try {
    const existing = await db.stories.where('story_date').equals(story.story_date).first();
    const updated_at = new Date().toISOString();

    if (existing && existing.id) {
      await db.stories.update(existing.id, {
        ...story,
        updated_at,
      });
      return existing.id;
    } else {
      return await db.stories.add({
        ...story,
        updated_at,
      });
    }
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * Get story for specific YYYY-MM-DD date.
 */
export async function getStoryForDate(date: string): Promise<Story | undefined> {
  try {
    return await db.stories.where('story_date').equals(date).first();
  } catch (error) {
    notifyStorageError(error);
    return undefined;
  }
}

/**
 * List all stories sorted descending by story_date.
 */
export async function listStories(): Promise<Story[]> {
  try {
    const stories = await db.stories.toArray();
    return stories.sort((a, b) => b.story_date.localeCompare(a.story_date));
  } catch (error) {
    notifyStorageError(error);
    return [];
  }
}

/**
 * Settings helpers
 */
export async function getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const item = await db.settings.get(key);
    return item ? (item.value as T) : defaultValue;
  } catch (error) {
    notifyStorageError(error);
    return defaultValue;
  }
}

export async function setSetting<T = any>(key: string, value: T): Promise<void> {
  try {
    await db.settings.put({ key, value });
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * Export all data to BackupData object
 */
export async function exportAll(): Promise<BackupData> {
  try {
    const entries = await db.entries.toArray();
    const stories = await db.stories.toArray();
    const settingsList = await db.settings.toArray();

    const settings: Record<string, any> = {};
    settingsList.forEach((s) => {
      settings[s.key] = s.value;
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
      stories,
      settings,
    };
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * Import backup data, merging without duplicate IDs or story dates.
 */
export async function importAll(backup: BackupData): Promise<{ entriesImported: number; storiesImported: number }> {
  try {
    let entriesImported = 0;
    let storiesImported = 0;

    await db.transaction('rw', db.entries, db.stories, db.settings, async () => {
      // 1. Merge entries: match by matching created_at, entry_date, title, amount_ngn
      const existingEntries = await db.entries.toArray();
      for (const entry of backup.entries || []) {
        const isDuplicate = existingEntries.some((existing) => {
          if (entry.id && existing.id === entry.id) return true;
          return (
            existing.entry_date === entry.entry_date &&
            existing.title === entry.title &&
            existing.amount_ngn === entry.amount_ngn &&
            existing.created_at === entry.created_at
          );
        });

        if (!isDuplicate) {
          const { id, ...data } = entry;
          await db.entries.add(data as Entry);
          entriesImported++;
        }
      }

      // 2. Merge stories: match by story_date
      for (const story of backup.stories || []) {
        const existingStory = await db.stories.where('story_date').equals(story.story_date).first();
        if (!existingStory) {
          const { id, ...data } = story;
          await db.stories.add(data as Story);
          storiesImported++;
        } else {
          // If backup story is newer, update it
          if (story.updated_at && (!existingStory.updated_at || story.updated_at > existingStory.updated_at)) {
            await db.stories.update(existingStory.id!, {
              text: story.text,
              background: story.background,
              text_style: story.text_style,
              text_size: story.text_size,
              align: story.align,
              updated_at: story.updated_at,
            });
            storiesImported++;
          }
        }
      }

      // 3. Settings import
      if (backup.settings) {
        for (const [k, v] of Object.entries(backup.settings)) {
          if (k !== 'lastTab') { // preserve active tab on restore if user is currently looking at Settings
            await db.settings.put({ key: k, value: v });
          }
        }
      }
    });

    return { entriesImported, storiesImported };
  } catch (error) {
    notifyStorageError(error);
    throw error;
  }
}

/**
 * Export entries to CSV string
 */
export async function exportEntriesCSV(): Promise<string> {
  const entries = await listEntries();
  const headers = ['ID', 'Date', 'Type', 'Category', 'Title', 'Amount (NGN)', 'Note', 'Created At'];
  const rows = entries.map((e) => [
    e.id ?? '',
    `"${e.entry_date}"`,
    `"${e.type}"`,
    `"${e.category}"`,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    e.amount_ngn,
    `"${(e.note || '').replace(/"/g, '""')}"`,
    `"${e.created_at}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Calculate active streak of days with at least one entry or story.
 */
export async function calculateStreak(now: Date = new Date()): Promise<number> {
  const entries = await db.entries.toArray();
  const stories = await db.stories.toArray();

  const activeDates = new Set<string>();
  entries.forEach((e) => activeDates.add(e.entry_date));
  stories.forEach((s) => activeDates.add(s.story_date));

  // Determine starting date: today in Lagos or yesterday if nothing today
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const todayStr = formatter.format(now);
  let checkDate = new Date(now.getTime());

  // If not done today, streak can still continue from yesterday
  if (!activeDates.has(todayStr)) {
    checkDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  let streak = 0;
  while (true) {
    const dateStr = formatter.format(checkDate);
    if (activeDates.has(dateStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return streak;
}
