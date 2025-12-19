'use client';

import { useState } from 'react';

type DashboardTabsProps = {
    analyticsContent: React.ReactNode;
    collectionsContent: React.ReactNode;
    creationContent: React.ReactNode;
};

export function DashboardTabs({ analyticsContent, collectionsContent, creationContent }: DashboardTabsProps) {
    const [activeTab, setActiveTab] = useState<'analytics' | 'collections' | 'creation'>('analytics');

    return (
        <div className="flex flex-col h-full">
            {/* Tabs Navigation - Revolution Style */}
            <div className="border-b-2 border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex gap-4 px-6 overflow-x-auto scrollbar-hide pb-0.5 md:pb-0">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`
                            relative px-4 md:px-6 py-4 font-black text-sm md:text-base uppercase tracking-tighter transition-all whitespace-nowrap
                            ${activeTab === 'analytics'
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        Analyse Statistique
                        {activeTab === 'analytics' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(255,0,80,0.5)]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={`
                            relative px-4 md:px-6 py-4 font-black text-sm md:text-base uppercase tracking-tighter transition-all whitespace-nowrap
                            ${activeTab === 'collections'
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        Collections
                        {activeTab === 'collections' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(255,0,80,0.5)]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('creation')}
                        className={`
                            relative px-4 md:px-6 py-4 font-black text-sm md:text-base uppercase tracking-tighter transition-all whitespace-nowrap
                            ${activeTab === 'creation'
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        Création
                        {activeTab === 'creation' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(255,0,80,0.5)]" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-6">
                <div style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
                    {analyticsContent}
                </div>
                <div style={{ display: activeTab === 'collections' ? 'block' : 'none' }}>
                    {collectionsContent}
                </div>
                <div style={{ display: activeTab === 'creation' ? 'block' : 'none' }}>
                    {creationContent}
                </div>
            </div>
        </div>
    );
}
