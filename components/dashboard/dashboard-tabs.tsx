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
            {/* Tabs Navigation - TikTok Style */}
            <div className="border-b-2 border-border bg-card">
                <div className="flex gap-1 px-6">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`
                            relative px-6 py-4 font-bold text-sm uppercase tracking-wide transition-all
                            ${activeTab === 'analytics'
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        Analyse Statistique
                        {activeTab === 'analytics' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={`
                            relative px-6 py-4 font-bold text-sm uppercase tracking-wide transition-all
                            ${activeTab === 'collections'
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        Collections
                        {activeTab === 'collections' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('creation')}
                        className={`
                            relative px-6 py-4 font-bold text-sm uppercase tracking-wide transition-all
                            ${activeTab === 'creation'
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        Création
                        {activeTab === 'creation' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
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
