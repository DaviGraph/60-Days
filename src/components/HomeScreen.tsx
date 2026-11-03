import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Plus,
  Minus,
  Flame,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight
} from 'lucide-react';
import type { Entry, Story } from '../db';
import {
  formatNGN,
  getDayNumber,
  getCountdown,
  getDaysLeft,
  getLagosDateString,
  TOTAL_GOAL_NGN,
  TOTAL_DAYS
} from '../utils/date';

interface HomeScreenProps {
  entries: Entry[];
  stories: Story[];
  lastBackupDate: string | null;
  onOpenSettings: () => void;
  onOpenAddEntry: (defaultType: 'income' | 'expense') => void;
  onNavigateToStory: () => void;
  streak: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  entries,
  stories,
  lastBackupDate,
  onOpenSettings,
  onOpenAddEntry,
  onNavigateToStory,
  streak,
}) => {
  // Live ticking clock state
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => getLagosDateString(now), [now]);
  const dayNumber = useMemo(() => getDayNumber(now), [now]);
  const countdown = useMemo(() => getCountdown(now), [now]);
  const daysLeft = useMemo(() => getDaysLeft(now), [now]);

  // Aggregate stats
  const { totalEarned, earnedToday, spentToday, weeklyEarned, weeklySpent, bestDay } = useMemo(() => {
    let earned = 0;
    let spent = 0;
    let todayE = 0;
    let todayS = 0;
    const dailyIncomeMap = new Map<string, number>();

    // Current week boundary: last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = getLagosDateString(sevenDaysAgo);
    let weekE = 0;
    let weekS = 0;

    for (const entry of entries) {
      if (entry.type === 'income') {
        earned += entry.amount_ngn;
        if (entry.entry_date === todayStr) todayE += entry.amount_ngn;
        if (entry.entry_date >= sevenDaysAgoStr) weekE += entry.amount_ngn;

        dailyIncomeMap.set(entry.entry_date, (dailyIncomeMap.get(entry.entry_date) || 0) + entry.amount_ngn);
      } else {
        spent += entry.amount_ngn;
        if (entry.entry_date === todayStr) todayS += entry.amount_ngn;
        if (entry.entry_date >= sevenDaysAgoStr) weekS += entry.amount_ngn;
      }
    }

    let maxDay = { date: '', amount: 0 };
    dailyIncomeMap.forEach((amt, date) => {
      if (amt > maxDay.amount) {
        maxDay = { date, amount: amt };
      }
    });

    return {
      totalEarned: earned,
      totalSpent: spent,
      earnedToday: todayE,
      spentToday: todayS,
      weeklyEarned: weekE,
      weeklySpent: weekS,
      bestDay: maxDay,
    };
  }, [entries, todayStr, now]);

  // Run rate calculation
  const remainingNeeded = Math.max(0, TOTAL_GOAL_NGN - totalEarned);
  const dailyNeeded = daysLeft > 0 ? Math.ceil(remainingNeeded / daysLeft) : 0;
  const progressPercent = Math.min(100, Math.round((totalEarned / TOTAL_GOAL_NGN) * 100));

  // Today's story status
  const todayStory = useMemo(() => {
    return stories.find((s) => s.story_date === todayStr);
  }, [stories, todayStr]);

  // Backup reminder: if last backup was > 3 days ago or never
  const showBackupReminder = useMemo(() => {
    if (!lastBackupDate) return true;
    const backupTime = new Date(lastBackupDate).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return now.getTime() - backupTime > threeDaysMs;
  }, [lastBackupDate, now]);

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto px-4 pt-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-lime uppercase tracking-wider bg-lime/10 px-2 py-0.5 rounded-full border border-lime/20">
              Day {dayNumber} of {TOTAL_DAYS}
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                <Flame className="w-3.5 h-3.5 fill-current" />
                {streak} {streak === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
            ₦500,000 Challenge
          </h1>
        </div>

        <button
          onClick={onOpenSettings}
          aria-label="Settings and Data Safety"
          className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted hover:text-white hover:border-lime/50 transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Backup Reminder Banner */}
      {showBackupReminder && (
        <div
          onClick={onOpenSettings}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenSettings(); }}
          className="bg-card border border-orange-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:bg-border/30 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-orange-300">Backup Recommended</p>
              <p className="text-xs text-muted">
                {lastBackupDate ? 'Last backup was over 3 days ago.' : 'You have not backed up your data yet.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-lime flex items-center gap-1 flex-shrink-0">
            Back up <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Live Countdown Card */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Time Remaining</span>
          <span className="text-xs text-muted/80">Ends 31 Dec 2026</span>
        </div>

        {countdown.isComplete ? (
          <div className="text-center py-3 bg-bg/50 rounded-xl border border-lime/30">
            <h2 className="text-xl font-black text-lime">Challenge Complete! 🎉</h2>
            <p className="text-sm text-white font-medium mt-1">Final Earned: {formatNGN(totalEarned)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-bg/80 border border-border/80 rounded-xl py-2 px-1">
              <span className="block text-2xl font-black text-white font-heading">{countdown.days}</span>
              <span className="text-[10px] font-bold text-muted uppercase">Days</span>
            </div>
            <div className="bg-bg/80 border border-border/80 rounded-xl py-2 px-1">
              <span className="block text-2xl font-black text-white font-heading">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="text-[10px] font-bold text-muted uppercase">Hrs</span>
            </div>
            <div className="bg-bg/80 border border-border/80 rounded-xl py-2 px-1">
              <span className="block text-2xl font-black text-white font-heading">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] font-bold text-muted uppercase">Min</span>
            </div>
            <div className="bg-bg/80 border border-border/80 rounded-xl py-2 px-1">
              <span className="block text-2xl font-black text-lime font-heading">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] font-bold text-muted uppercase">Sec</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Earned</span>
            <div className="text-3xl font-black text-lime font-heading mt-0.5">
              {formatNGN(totalEarned)}
            </div>
          </div>
          <span className="text-xs text-muted font-medium">
            of {formatNGN(TOTAL_GOAL_NGN)} ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-bg h-3.5 rounded-full overflow-hidden border border-border/60 p-0.5">
          <div
            className="bg-lime h-full rounded-full transition-all duration-500 ease-out min-w-[6px]"
            style={{ width: `${Math.max(2, progressPercent)}%` }}
          />
        </div>

        {/* Target Run-rate */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60 text-muted">
          <span>Target Run-rate</span>
          <span className="font-bold text-white">
            {remainingNeeded <= 0 ? (
              <span className="text-lime">Goal reached! 🚀</span>
            ) : (
              <>Need <span className="text-lime font-extrabold">{formatNGN(dailyNeeded)}</span> a day to finish on time</>
            )}
          </span>
        </div>
      </div>

      {/* Quick Tiles: Today's Earned & Spent */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">Earned Today</span>
          <span className="text-xl font-extrabold text-lime font-heading block">
            {formatNGN(earnedToday)}
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">Spent Today</span>
          <span className="text-xl font-extrabold text-expense font-heading block">
            {formatNGN(spentToday)}
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onOpenAddEntry('income')}
          className="min-h-[48px] bg-lime hover:bg-lime-hover text-bg font-extrabold rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-5 h-5 text-bg stroke-[3]" />
          <span>+ Income</span>
        </button>

        <button
          onClick={() => onOpenAddEntry('expense')}
          className="min-h-[48px] bg-card border border-expense text-expense hover:bg-expense/10 font-extrabold rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
        >
          <Minus className="w-5 h-5 text-expense stroke-[3]" />
          <span>+ Expense</span>
        </button>
      </div>

      {/* Story Status Tile */}
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigateToStory}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToStory(); }}
        className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-lime/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {todayStory ? (
            <CheckCircle2 className="w-6 h-6 text-lime flex-shrink-0" />
          ) : (
            <Circle className="w-6 h-6 text-muted flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold text-white">
              {todayStory ? "Today's Story is written" : "Write today's Story"}
            </p>
            <p className="text-xs text-muted">
              {todayStory ? 'Tap to view or share your card' : 'Share how your day went (Day ' + dayNumber + ')'}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted" />
      </div>

      {/* Weekly Summary Card */}
      <div className="bg-card/70 border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-lime" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Last 7 Days Summary</span>
          </div>
          <span className="text-xs text-muted">Net: {formatNGN(weeklyEarned - weeklySpent)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-bg/60 p-2 rounded-xl border border-border/60">
            <span className="text-[10px] text-muted block uppercase font-bold">Earned</span>
            <span className="text-xs font-extrabold text-lime mt-0.5 block">{formatNGN(weeklyEarned)}</span>
          </div>
          <div className="bg-bg/60 p-2 rounded-xl border border-border/60">
            <span className="text-[10px] text-muted block uppercase font-bold">Spent</span>
            <span className="text-xs font-extrabold text-expense mt-0.5 block">{formatNGN(weeklySpent)}</span>
          </div>
          <div className="bg-bg/60 p-2 rounded-xl border border-border/60">
            <span className="text-[10px] text-muted block uppercase font-bold">Best Day</span>
            <span className="text-xs font-extrabold text-white mt-0.5 block truncate">
              {bestDay.amount > 0 ? formatNGN(bestDay.amount) : '₦0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
