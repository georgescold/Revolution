'use client';

import { useState } from 'react';

type DashboardTabsProps = {
    analyticsContent: React.ReactNode;
    collectionsContent: React.ReactNode;
    userNav?: React.ReactNode;
};

export function DashboardTabs({ analyticsContent, collectionsContent, creationContent, userNav }: DashboardTabsProps) {
    const [activeTab, setActiveTab] = useState<'analytics' | 'collections' | 'creation'>('analytics');

    return (
        <div className="flex flex-col h-full">
            {/* Tabs Navigation - Revolution Style */}
            {/* Tabs Navigation - Revolution Style - Pills (Discreet) */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4 pt-4 px-6 flex items-center justify-between">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`
                            relative px-6 py-2.5 font-bold text-sm transition-all rounded-full
                            ${activeTab === 'analytics'
                                ? 'bg-secondary text-secondary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                            }
                        `}
                    >
                        ANALYSE STATISTIQUE
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={`
                            relative px-6 py-2.5 font-bold text-sm transition-all rounded-full
                            ${activeTab === 'collections'
                                ? 'bg-secondary text-secondary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                            }
                        `}
                    >
                        COLLECTIONS
                    </button>
                    <button
                        onClick={() => setActiveTab('creation')}
                        className={`
                            relative px-6 py-2.5 font-bold text-sm transition-all rounded-full
                            ${activeTab === 'creation'
                                ? 'bg-secondary text-secondary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                            }
                        `}
                    >
                        CRÉATION
                    </button>
                </div>

                {/* Right Side Icons */}
                {userNav && (
                    <div className="flex items-center gap-2 pl-4">
                        {userNav}
                    </div>
                )}
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
