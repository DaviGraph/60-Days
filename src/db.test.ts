import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  addEntry,
  updateEntry,
  deleteEntry,
  listEntries,
  saveStory,
  getStoryForDate,
  exportAll,
  importAll,
  exportEntriesCSV,
  calculateStreak,
} from '../src/db';
import {
  CHALLENGE_START,
  getDayNumber,
  getCountdown,
  formatNGN,
  getLagosDateString,
  getFriendlyDateLabel,
} from '../src/utils/date';

describe('Database and Timezone Utilities', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.stories.clear();
    await db.settings.clear();
  });

  it('formats NGN currency properly', () => {
    const formatted = formatNGN(500000);
    expect(formatted).toContain('500,000');
    expect(formatted).toContain('₦');
  });

  it('calculates Lagos Day N and countdown accurately', () => {
    // START: 2026-11-01T00:00:00+01:00
    const start = new Date(CHALLENGE_START);
    expect(getDayNumber(start)).toBe(1);

    // Day 2
    const day2 = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    expect(getDayNumber(day2)).toBe(2);

    // Day 61 (last day: 2026-12-31)
    const day61 = new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000 + 1000);
    expect(getDayNumber(day61)).toBe(61);

    // After end: capped at 61
    const after = new Date('2027-01-05T00:00:00+01:00');
    expect(getDayNumber(after)).toBe(61);

    const countdown = getCountdown(after);
    expect(countdown.isComplete).toBe(true);
    expect(countdown.days).toBe(0);

    const beforeEnd = new Date('2026-12-31T20:00:00+01:00');
    const cd2 = getCountdown(beforeEnd);
    expect(cd2.isComplete).toBe(false);
    expect(cd2.hours).toBe(4);
  });

  it('calculates Lagos date string and friendly labels', () => {
    const d = new Date('2026-11-05T12:00:00+01:00');
    const lagosDate = getLagosDateString(d);
    expect(lagosDate).toBe('2026-11-05');

    expect(getFriendlyDateLabel('2026-11-05', d)).toBe('Today');
    expect(getFriendlyDateLabel('2026-11-04', d)).toBe('Yesterday');
  });

  it('handles addEntry, updateEntry, deleteEntry and listEntries', async () => {
    const id = await addEntry({
      type: 'income',
      amount_ngn: 25000,
      title: 'Design Client',
      category: 'Client job',
      entry_date: '2026-11-01',
      note: 'Landing page design',
    });
    expect(id).toBeDefined();

    const list = await listEntries();
    expect(list.length).toBe(1);
    expect(list[0].amount_ngn).toBe(25000);

    await updateEntry(id!, { amount_ngn: 30000 });
    const updatedList = await listEntries();
    expect(updatedList[0].amount_ngn).toBe(30000);

    await deleteEntry(id!);
    const emptyList = await listEntries();
    expect(emptyList.length).toBe(0);
  });

  it('handles saveStory and getStoryForDate', async () => {
    await saveStory({
      story_date: '2026-11-01',
      text: 'Made my first ₦30k today!',
      background: 'purple',
      text_style: 'bold',
      text_size: 'L',
      align: 'center',
    });

    const story = await getStoryForDate('2026-11-01');
    expect(story).toBeDefined();
    expect(story?.text).toBe('Made my first ₦30k today!');

    // Update existing story on same date
    await saveStory({
      story_date: '2026-11-01',
      text: 'Updated story text',
      background: 'yellow',
      text_style: 'serif',
      text_size: 'M',
      align: 'left',
    });

    const updated = await getStoryForDate('2026-11-01');
    expect(updated?.text).toBe('Updated story text');
    expect(updated?.background).toBe('yellow');
  });

  it('exports and restores backup data with deduplication', async () => {
    await addEntry({
      type: 'income',
      amount_ngn: 50000,
      title: 'Dev Project',
      category: 'Freelance',
      entry_date: '2026-11-02',
    });

    await saveStory({
      story_date: '2026-11-02',
      text: 'Great day',
      background: 'orange',
      text_style: 'bold',
      text_size: 'L',
      align: 'center',
    });

    const backup = await exportAll();
    expect(backup.entries.length).toBe(1);
    expect(backup.stories.length).toBe(1);

    // Import the same backup: should not duplicate
    const importRes = await importAll(backup);
    expect(importRes.entriesImported).toBe(0);

    const allEntries = await listEntries();
    expect(allEntries.length).toBe(1);

    const csv = await exportEntriesCSV();
    expect(csv).toContain('Dev Project');
    expect(csv).toContain('50000');
  });

  it('calculates active streak correctly', async () => {
    const fixedNow = new Date('2026-11-03T12:00:00+01:00');
    // Add entry on Nov 2 and Nov 3
    await addEntry({
      type: 'income',
      amount_ngn: 10000,
      title: 'Sale',
      category: 'Sales',
      entry_date: '2026-11-02',
    });
    await addEntry({
      type: 'income',
      amount_ngn: 10000,
      title: 'Sale',
      category: 'Sales',
      entry_date: '2026-11-03',
    });

    const streak = await calculateStreak(fixedNow);
    expect(streak).toBe(2);
  });
});
