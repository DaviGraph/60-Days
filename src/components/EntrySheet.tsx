import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Entry, EntryType, EntryCategory, IncomeCategory, ExpenseCategory } from '../db';
import { getLagosDateString } from '../utils/date';
import { setSetting, getSetting } from '../db';

interface EntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: Omit<Entry, 'id' | 'created_at'>, existingId?: number) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  editingEntry?: Entry | null;
  defaultType?: EntryType;
}

const INCOME_CATEGORIES: IncomeCategory[] = ['Client job', 'Freelance', 'Sales', 'Other'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Data', 'Transport', 'Food', 'Tools', 'Other'];

export const EntrySheet: React.FC<EntrySheetProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  editingEntry,
  defaultType = 'income',
}) => {
  const [type, setType] = useState<EntryType>(defaultType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<EntryCategory>('Client job');
  const [date, setDate] = useState<string>(getLagosDateString());
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or restore draft
  useEffect(() => {
    if (!isOpen) return;

    if (editingEntry) {
      setType(editingEntry.type);
      setAmountStr(editingEntry.amount_ngn.toString());
      setTitle(editingEntry.title);
      setCategory(editingEntry.category);
      setDate(editingEntry.entry_date);
      setNote(editingEntry.note || '');
    } else {
      // Check for saved unsent draft
      getSetting<any>('unsentEntryDraft').then((draft) => {
        if (draft && !editingEntry) {
          setType(draft.type || defaultType);
          setAmountStr(draft.amountStr || '');
          setTitle(draft.title || '');
          setCategory(draft.category || (draft.type === 'expense' ? 'Data' : 'Client job'));
          setDate(draft.date || getLagosDateString());
          setNote(draft.note || '');
        } else {
          setType(defaultType);
          setAmountStr('');
          setTitle('');
          setCategory(defaultType === 'income' ? 'Client job' : 'Data');
          setDate(getLagosDateString());
          setNote('');
        }
      });
    }
  }, [isOpen, editingEntry, defaultType]);

  // Autosave unsent draft when typing (only when adding new, not editing)
  useEffect(() => {
    if (!isOpen || editingEntry) return;

    const draft = {
      type,
      amountStr,
      title,
      category,
      date,
      note,
    };
    const timer = setTimeout(() => {
      setSetting('unsentEntryDraft', draft).catch(console.error);
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, editingEntry, type, amountStr, title, category, date, note]);

  // When type toggles, ensure category defaults appropriately
  const handleTypeChange = (newType: EntryType) => {
    setType(newType);
    if (newType === 'income') {
      if (!INCOME_CATEGORIES.includes(category as IncomeCategory)) {
        setCategory('Client job');
      }
    } else {
      if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
        setCategory('Data');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          type,
          amount_ngn: Math.round(parsedAmount),
          title: title.trim(),
          category,
          entry_date: date,
          note: note.trim() || undefined,
        },
        editingEntry?.id
      );

      // Clear draft on successful submission
      await setSetting('unsentEntryDraft', null);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry?.id || !onDelete) return;
    const confirmed = window.confirm('Are you sure you want to delete this entry?');
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await onDelete(editingEntry.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-labelledby="entry-sheet-title"
        className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="entry-sheet-title" className="text-lg font-bold text-white">
            {editingEntry ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <div className="flex items-center gap-1">
            {editingEntry && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Delete entry"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-expense hover:bg-expense/10 cursor-pointer"
              >
                <Trash2 className="w-5 h-5 text-expense" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close form"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-border/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Type Toggle: Income vs Expense */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-bg rounded-xl border border-border">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`min-h-[44px] rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                type === 'income' ? 'bg-lime text-bg shadow-sm' : 'text-muted hover:text-white'
              }`}
            >
              + Income
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`min-h-[44px] rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                type === 'expense' ? 'bg-expense text-bg shadow-sm' : 'text-muted hover:text-white'
              }`}
            >
              − Expense
            </button>
          </div>

          {/* Amount in NGN */}
          <div>
            <label htmlFor="entry-amount" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Amount (₦)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-muted">₦</span>
              <input
                id="entry-amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="any"
                required
                placeholder="50,000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 bg-bg border border-border rounded-xl text-white text-xl font-bold focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="entry-title" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Title / Client / Item
            </label>
            <input
              id="entry-title"
              type="text"
              required
              placeholder={type === 'income' ? 'e.g., Website Redesign Deposit' : 'e.g., 20GB MTN Data Plan'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[48px] px-4 bg-bg border border-border rounded-xl text-white text-sm font-medium focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
            />
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? type === 'income'
                          ? 'bg-lime text-bg border-lime'
                          : 'bg-expense text-bg border-expense'
                        : 'bg-bg text-muted border-border hover:border-muted hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="entry-date" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              id="entry-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[48px] px-4 bg-bg border border-border rounded-xl text-white text-sm font-medium focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
            />
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="entry-note" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Note (Optional)
            </label>
            <textarea
              id="entry-note"
              rows={2}
              placeholder="Additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-bg border border-border rounded-xl text-white text-sm font-normal focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime resize-none"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full min-h-[48px] rounded-xl font-black text-bg text-base flex items-center justify-center transition-all cursor-pointer ${
                type === 'income' ? 'bg-lime hover:bg-lime-hover' : 'bg-expense hover:opacity-90'
              } disabled:opacity-50`}
            >
              {isSubmitting ? 'Saving...' : editingEntry ? 'Update Entry' : '+ Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
