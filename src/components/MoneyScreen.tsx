import React, { useState, useMemo } from 'react';
import { Plus, Filter, Tag, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import type { Entry, EntryType } from '../db';
import { formatNGN, getFriendlyDateLabel } from '../utils/date';

interface MoneyScreenProps {
  entries: Entry[];
  onOpenAddEntry: (type?: EntryType) => void;
  onEditEntry: (entry: Entry) => void;
}

type FilterType = 'all' | 'income' | 'expense';

export const MoneyScreen: React.FC<MoneyScreenProps> = ({
  entries,
  onOpenAddEntry,
  onEditEntry,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');

  // Overall totals
  const { totalEarned, totalSpent, netTotal } = useMemo(() => {
    let earned = 0;
    let spent = 0;
    for (const e of entries) {
      if (e.type === 'income') earned += e.amount_ngn;
      else spent += e.amount_ngn;
    }
    return {
      totalEarned: earned,
      totalSpent: spent,
      netTotal: earned - spent,
    };
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  // Group entries by day
  const groupedEntries = useMemo(() => {
    const groups: { date: string; friendlyLabel: string; items: Entry[] }[] = [];
    const dateMap = new Map<string, Entry[]>();

    for (const entry of filteredEntries) {
      const list = dateMap.get(entry.entry_date) || [];
      list.push(entry);
      dateMap.set(entry.entry_date, list);
    }

    // Sort unique dates descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    for (const date of sortedDates) {
      groups.push({
        date,
        friendlyLabel: getFriendlyDateLabel(date),
        items: dateMap.get(date) || [],
      });
    }

    return groups;
  }, [filteredEntries]);

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Money Tracker</h1>
          <p className="text-xs text-muted">All challenge earnings and expenses</p>
        </div>

        <button
          onClick={() => onOpenAddEntry('income')}
          aria-label="Add new entry"
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-lime text-bg font-extrabold flex items-center gap-1.5 hover:bg-lime-hover transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add</span>
        </button>
      </div>

      {/* Summary Tiles: Earned, Spent, Net */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-card border border-border rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Earned</span>
          <span className="text-base sm:text-lg font-extrabold text-lime font-heading block truncate">
            {formatNGN(totalEarned)}
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Spent</span>
          <span className="text-base sm:text-lg font-extrabold text-expense font-heading block truncate">
            {formatNGN(totalSpent)}
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Net</span>
          <span className={`text-base sm:text-lg font-extrabold font-heading block truncate ${
            netTotal >= 0 ? 'text-white' : 'text-expense'
          }`}>
            {formatNGN(netTotal)}
          </span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted flex-shrink-0" />
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as FilterType[]).map((f) => {
            const isSelected = filter === f;
            const label = f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses';
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`min-h-[44px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-card border-lime text-lime shadow-sm'
                    : 'bg-bg border-border text-muted hover:border-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Entries List */}
      <div className="space-y-4">
        {groupedEntries.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
            <CalendarIcon className="w-8 h-8 text-muted mx-auto" />
            <p className="text-sm font-bold text-white">No entries yet</p>
            <p className="text-xs text-muted max-w-xs mx-auto">
              Record your daily income or expenses. Every amount adds up towards your ₦500,000 goal!
            </p>
            <button
              onClick={() => onOpenAddEntry('income')}
              className="mt-2 min-h-[44px] px-4 py-2 bg-lime text-bg font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-lime-hover"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add your first entry
            </button>
          </div>
        ) : (
          groupedEntries.map((group) => (
            <div key={group.date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  {group.friendlyLabel}
                </span>
                <span className="text-[11px] text-muted/60">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {group.items.map((entry) => {
                  const isIncome = entry.type === 'income';
                  return (
                    <button
                      key={entry.id}
                      onClick={() => onEditEntry(entry)}
                      className="w-full min-h-[56px] p-3.5 flex items-center justify-between gap-3 text-left hover:bg-border/30 transition-colors cursor-pointer group"
                      aria-label={`Edit ${entry.title}, ${formatNGN(entry.amount_ngn)}`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate block">
                            {entry.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                          <span className="flex items-center gap-1 bg-bg/80 px-2 py-0.5 rounded-md border border-border/60 text-[10px]">
                            <Tag className="w-3 h-3" />
                            {entry.category}
                          </span>
                          {entry.note && (
                            <span className="truncate max-w-[150px] text-[11px] text-muted/80 italic">
                              "{entry.note}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 text-right">
                        <span className={`text-base font-extrabold font-heading ${
                          isIncome ? 'text-lime' : 'text-expense'
                        }`}>
                          {isIncome ? '+' : '−'}{formatNGN(entry.amount_ngn)}
                        </span>
                        <Edit2 className="w-3.5 h-3.5 text-muted/40 group-hover:text-muted transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
