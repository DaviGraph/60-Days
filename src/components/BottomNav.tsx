import React from 'react';
import { Home, DollarSign, BookOpen } from 'lucide-react';

export type TabType = 'home' | 'money' | 'story';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'money' as TabType, label: 'Money', icon: DollarSign },
    { id: 'story' as TabType, label: 'Story', icon: BookOpen },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border pb-safe"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive ? 'text-lime font-bold' : 'text-muted hover:text-white'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-lime/10' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-lime stroke-[2.5]' : 'text-muted stroke-[1.8]'}`} />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
