import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDashboardStats, updateFollowers } from '@/server/actions/analytics-actions';
import { AddPostDialog } from './add-post-dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PostsTable } from './posts-table';
import { PostDetailsModal } from './post-details-modal';
import { TopPostsCard } from './top-posts-card';
import { MetricHistoryCard } from './metric-history-card';

import { SyncButton } from './sync-button';

export async function AnalyticsView() {
    const stats = await getDashboardStats();

    if (!stats) return <div>Loading...</div>;

    const { posts, topPosts } = stats;
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Performance</h2>
                    <p className="text-sm text-muted-foreground capitalize">{today}</p>
                </div>
                <div className="flex gap-2">
                    <SyncButton />
                    <AddPostDialog />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Views Card with Graph */}
                <MetricHistoryCard
                    title="Vues"
                    value={stats.stats.totalViews}
                    subValue="(Total)"
                    trend={stats.stats.views > 0 ? Math.round((stats.stats.views / stats.stats.totalViews) * 100) : 0} // Approximated 'trend' as % of total or just show +N this week? User asked for graph. 
                    // Let's use the actual history for the graph.
                    // For the "trend" text, the design asked for evolution.
                    // The `stats.stats.engagementTrend` logic was standard. 
                    // I will use specific logic for views.
                    trendDirection="up" // Always up for total views
                    data={stats.history.views}
                    chartColor="#ec4899" // Pink for views? Or primary.
                    rangeOptions={[
                        { key: '7d', label: '7J' },
                        { key: '30d', label: '30J' },
                        { key: '6m', label: '6M' }
                    ]}
                />

                {/* Followers Card with Graph & Edit */}
                <MetricHistoryCard
                    title="Abonnés"
                    value={stats.stats.followers}
                    trend={Math.abs(stats.stats.followersTrend)}
                    trendDirection={stats.stats.followersTrendDirection as 'up' | 'down' | 'neutral'}
                    data={stats.history.followers}
                    editable={true}
                    onSave={updateFollowers}
                    chartColor="#10b981" // Green
                    rangeOptions={[
                        { key: '30d', label: '1M' },
                        { key: '6m', label: '6M' },
                        { key: '1y', label: '1A' }
                    ]}
                />

                {/* Posts Analyzed */}
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posts Analysés</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{posts.length}</div>
                    </CardContent>
                </Card>

                <TopPostsCard topPosts={topPosts} />
            </div>

            {/* Posts Table */}
            <div className="overflow-x-auto">
                <PostsTable posts={posts} />
            </div>
        </div>
    );
}
