import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, X } from 'lucide-react';
import { formatNGN } from '../utils/date';

interface MilestoneToastProps {
  milestone: number | null;
  onDismiss: () => void;
}

export const MilestoneToast: React.FC<MilestoneToastProps> = ({ milestone, onDismiss }) => {
  useEffect(() => {
    if (milestone) {
      // Trigger festive confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C6F432', '#FFFFFF', '#FFD93D', '#FF8A7A'],
      });
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [milestone, onDismiss]);

  if (!milestone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-sm bg-card border-2 border-lime shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-3 animate-bounce"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-lime/20 flex items-center justify-center flex-shrink-0 text-lime">
          <Award className="w-6 h-6 text-lime" />
        </div>
        <div>
          <p className="text-xs font-bold text-lime uppercase tracking-wider">Milestone Unlocked! 🎉</p>
          <p className="text-sm font-extrabold text-white">Earned {formatNGN(milestone)}!</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss milestone"
        className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-white cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
