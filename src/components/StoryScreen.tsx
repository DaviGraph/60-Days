import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Download,
  Copy,
  Check,
  History,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronLeft
} from 'lucide-react';
import { toPng } from 'html-to-image';
import type {
  Story,
  StoryBackground,
  StoryTextStyle,
  StoryTextSize,
  StoryTextAlign
} from '../db';
import { saveStory, setSetting, getSetting } from '../db';
import { getLagosDateString, getDayNumber, getFriendlyDateLabel } from '../utils/date';

interface StoryScreenProps {
  stories: Story[];
}

const BACKGROUND_OPTIONS: { id: StoryBackground; label: string; bgClass: string; isDarkText: boolean; previewColor: string }[] = [
  { id: 'purple', label: 'Purple', bgClass: 'bg-[#6C2BD9]', isDarkText: false, previewColor: '#6C2BD9' },
  { id: 'yellow', label: 'Yellow', bgClass: 'bg-[#FFD93D]', isDarkText: true, previewColor: '#FFD93D' },
  { id: 'orange', label: 'Orange', bgClass: 'bg-[#FF5A36]', isDarkText: false, previewColor: '#FF5A36' },
  { id: 'black', label: 'Black', bgClass: 'bg-[#0E1210]', isDarkText: false, previewColor: '#0E1210' },
  { id: 'teal', label: 'Teal', bgClass: 'bg-[#0FA3A3]', isDarkText: false, previewColor: '#0FA3A3' },
  { id: 'sunset', label: 'Sunset', bgClass: 'bg-gradient-to-br from-[#FF5A36] via-[#D946EF] to-[#6C2BD9]', isDarkText: false, previewColor: 'linear-gradient(135deg, #FF5A36, #6C2BD9)' },
];

export const StoryScreen: React.FC<StoryScreenProps> = ({ stories }) => {
  const todayDate = useMemo(() => getLagosDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);

  // Story styling state
  const [text, setText] = useState<string>('');
  const [background, setBackground] = useState<StoryBackground>('purple');
  const [textStyle, setTextStyle] = useState<StoryTextStyle>('bold');
  const [textSize, setTextSize] = useState<StoryTextSize>('M');
  const [align, setAlign] = useState<StoryTextAlign>('center');

  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Load existing story or draft when selectedDate changes
  useEffect(() => {
    let isMounted = true;

    async function loadStoryOrDraft() {
      // 1. Try finding existing story in Dexie
      const existing = stories.find((s) => s.story_date === selectedDate);
      if (existing) {
        if (isMounted) {
          setText(existing.text);
          setBackground(existing.background);
          setTextStyle(existing.text_style);
          setTextSize(existing.text_size);
          setAlign(existing.align);
        }
        return;
      }

      // 2. If it's today's date, check for draft
      if (selectedDate === todayDate) {
        const draft = await getSetting<any>('storyDraft');
        if (draft && isMounted) {
          setText(draft.text || '');
          setBackground(draft.background || 'purple');
          setTextStyle(draft.text_style || 'bold');
          setTextSize(draft.text_size || 'M');
          setAlign(draft.align || 'center');
          return;
        }
      }

      // 3. Fallback defaults
      if (isMounted) {
        setText('');
        setBackground('purple');
        setTextStyle('bold');
        setTextSize('M');
        setAlign('center');
      }
    }

    loadStoryOrDraft();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, stories, todayDate]);

  // Autosave function
  const saveCurrentState = useCallback(async () => {
    if (!text.trim()) return;

    try {
      // Save draft into settings
      await setSetting('storyDraft', {
        date: selectedDate,
        text,
        background,
        text_style: textStyle,
        text_size: textSize,
        align,
      });

      // Also persist to Dexie stories table
      await saveStory({
        story_date: selectedDate,
        text,
        background,
        text_style: textStyle,
        text_size: textSize,
        align,
      });

      setHasSavedDraft(true);
    } catch (err) {
      console.error('Failed to autosave story:', err);
    }
  }, [selectedDate, text, background, textStyle, textSize, align]);

  // Debounced autosave after typing (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCurrentState();
    }, 400);

    return () => clearTimeout(timer);
  }, [saveCurrentState]);

  // Autosave on visibilitychange (hidden), pagehide and beforeunload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentState();
      }
    };

    const handleBeforeUnload = () => {
      saveCurrentState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveCurrentState]);

  // Calculate day number for the story's date
  const cardDayNumber = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return getDayNumber(dateObj);
  }, [selectedDate]);

  const activeBg = useMemo(() => {
    return BACKGROUND_OPTIONS.find((b) => b.id === background) || BACKGROUND_OPTIONS[0];
  }, [background]);

  const textColorClass = activeBg.isDarkText ? 'text-black' : 'text-white';
  const mutedTextClass = activeBg.isDarkText ? 'text-black/70' : 'text-white/80';
  const badgeClass = activeBg.isDarkText ? 'bg-black/10 text-black border-black/20' : 'bg-white/15 text-white border-white/20';

  // Font family based on textStyle
  const fontClass = useMemo(() => {
    if (textStyle === 'serif') return 'font-serif italic';
    if (textStyle === 'mono') return 'font-mono font-bold tracking-tight';
    return 'font-heading font-extrabold';
  }, [textStyle]);

  // Font size
  const fontSizeClass = useMemo(() => {
    if (textSize === 'S') return 'text-xl sm:text-2xl leading-snug';
    if (textSize === 'L') return 'text-3xl sm:text-4xl leading-tight';
    return 'text-2xl sm:text-3xl leading-snug';
  }, [textSize]);

  // Alignment
  const alignClass = useMemo(() => {
    if (align === 'left') return 'text-left';
    if (align === 'right') return 'text-right';
    return 'text-center';
  }, [align]);

  // Export 1080x1920 PNG
  const handleExportImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // html-to-image export with 1080x1920 scale
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Upscale for crisp 1080x1920 export
        quality: 1,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `story-day-${cardDayNumber}-${selectedDate}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export story card image:', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = async () => {
    if (!text.trim()) return;
    try {
      const formatted = `${text}\n\nDay ${cardDayNumber} of 61 · ₦500K challenge`;
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Daily Story</h1>
          <p className="text-xs text-muted">Create & share your daily TikTok-style card</p>
        </div>

        <button
          onClick={() => setIsHistoryView(!isHistoryView)}
          aria-label={isHistoryView ? 'Back to Editor' : 'Story History'}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-card border border-border text-white hover:border-lime/50 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
        >
          {isHistoryView ? (
            <>
              <ChevronLeft className="w-4 h-4 text-lime" />
              <span>Editor</span>
            </>
          ) : (
            <>
              <History className="w-4 h-4 text-lime" />
              <span>Past Stories ({stories.length})</span>
            </>
          )}
        </button>
      </div>

      {isHistoryView ? (
        /* Past Stories List */
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider">Saved Stories</h2>
          {stories.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-muted mx-auto" />
              <p className="text-sm font-bold text-white">No stories recorded yet</p>
              <p className="text-xs text-muted">
                Write how your day went today and save your first card.
              </p>
            </div>
          ) : (
            stories.map((s) => (
              <div
                key={s.story_date}
                className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-lime/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-lime uppercase">
                      {getFriendlyDateLabel(s.story_date)}
                    </span>
                    <span className="text-xs text-muted">({s.story_date})</span>
                  </div>
                  <p className="text-sm text-white line-clamp-2 italic">
                    "{s.text}"
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(s.story_date);
                    setIsHistoryView(false);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-bg border border-border text-xs font-bold text-white hover:text-lime hover:border-lime transition-colors cursor-pointer flex-shrink-0"
                >
                  Open & Share
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Story Editor & 9:16 Card Preview */
        <div className="space-y-4">
          {/* Active Date Indicator */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              {selectedDate === todayDate ? "Today's Card" : `Story for ${selectedDate}`}
            </span>
            {hasSavedDraft && (
              <span className="text-[11px] text-lime font-medium flex items-center gap-1">
                <Check className="w-3 h-3 text-lime" /> Autosaved
              </span>
            )}
          </div>

          {/* 9:16 Preview Card */}
          <div className="flex justify-center">
            <div
              ref={cardRef}
              className={`w-full aspect-[9/16] max-w-[340px] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 ${activeBg.bgClass} ${textColorClass}`}
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between z-10">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-sm ${badgeClass}`}>
                  Day {cardDayNumber} of 61
                </span>
                <span className={`text-xs font-bold ${mutedTextClass}`}>
                  ₦500k Challenge
                </span>
              </div>

              {/* Direct Card Text Area */}
              <div className="my-auto py-4 z-10">
                <textarea
                  value={text}
                  maxLength={280}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tap here to write how your day went... What was your win or hustle today?"
                  aria-label="Story text post content"
                  rows={6}
                  className={`w-full bg-transparent border-none resize-none focus:outline-none placeholder:opacity-50 ${textColorClass} ${fontClass} ${fontSizeClass} ${alignClass}`}
                />
              </div>

              {/* Card Footer (Auto-filled) */}
              <div className="pt-3 border-t border-current/15 flex items-center justify-between z-10">
                <span className={`text-[11px] font-bold tracking-tight ${mutedTextClass}`}>
                  Day {cardDayNumber} of 61 · ₦500K challenge
                </span>
                <span className={`text-[10px] font-mono ${mutedTextClass}`}>
                  {text.length}/280
                </span>
              </div>
            </div>
          </div>

          {/* Customization Controls */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            {/* Background Selector */}
            <div>
              <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                Card Background
              </span>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {BACKGROUND_OPTIONS.map((bg) => {
                  const isSelected = background === bg.id;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBackground(bg.id)}
                      aria-label={`Select ${bg.label} background`}
                      style={{ background: bg.previewColor }}
                      className={`w-11 h-11 rounded-full flex-shrink-0 border-2 transition-transform cursor-pointer ${
                        isSelected ? 'border-lime scale-110 shadow-lg ring-2 ring-lime/40' : 'border-border/60 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Typography & Alignment Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/80">
              {/* Text Style Chips */}
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                  Font Style
                </span>
                <div className="flex gap-1.5">
                  {(['bold', 'serif', 'mono'] as StoryTextStyle[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTextStyle(st)}
                      className={`flex-1 min-h-[44px] py-1 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer capitalize ${
                        textStyle === st
                          ? 'bg-lime text-bg border-lime'
                          : 'bg-bg text-muted border-border hover:border-muted hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Size */}
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                  Text Size
                </span>
                <div className="flex gap-1.5">
                  {(['S', 'M', 'L'] as StoryTextSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setTextSize(sz)}
                      className={`flex-1 min-h-[44px] py-1 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        textSize === sz
                          ? 'bg-lime text-bg border-lime'
                          : 'bg-bg text-muted border-border hover:border-muted hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alignment Row */}
            <div className="flex items-center justify-between pt-1 border-t border-border/80">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Text Alignment
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAlign('left')}
                  aria-label="Align text left"
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                    align === 'left' ? 'bg-lime text-bg border-lime' : 'bg-bg text-muted border-border hover:text-white'
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAlign('center')}
                  aria-label="Align text center"
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                    align === 'center' ? 'bg-lime text-bg border-lime' : 'bg-bg text-muted border-border hover:text-white'
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAlign('right')}
                  aria-label="Align text right"
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                    align === 'right' ? 'bg-lime text-bg border-lime' : 'bg-bg text-muted border-border hover:text-white'
                  }`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Export & Sharing Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleExportImage}
              disabled={isExporting || !text.trim()}
              className="min-h-[48px] px-4 py-3 bg-lime hover:bg-lime-hover text-bg font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-5 h-5 text-bg stroke-[2.5]" />
              <span>{isExporting ? 'Generating...' : 'Save as image'}</span>
            </button>

            <button
              onClick={handleCopyText}
              disabled={!text.trim()}
              className="min-h-[48px] px-4 py-3 bg-card border border-border text-white hover:border-lime font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-lime" />
                  <span className="text-lime">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-muted" />
                  <span>Copy text</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
