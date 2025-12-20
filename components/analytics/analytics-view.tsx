import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDashboardStats } from '@/server/actions/analytics-actions';
import { AddPostDialog } from './add-post-dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PostsTable } from './posts-table';
import { PostDetailsModal } from './post-details-modal';
import { TopPostsCard } from './top-posts-card';

export async function AnalyticsView() {
    const data = await getDashboardStats();

    if (!data) return <div>Loading...</div>;

    const { posts, stats, topPosts } = data;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Performance</h2>
                <AddPostDialog />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vues (7 derniers)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.views.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Engagement & Abonnés</CardTitle>
                        {/* Overall Trend Icon based on both metrics? Or just engagement */}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs text-muted-foreground">Engagement</p>
                                <div className={`text-2xl font-bold ${stats.engagementTrend === 'up' ? 'text-green-600' : stats.engagementTrend === 'down' ? 'text-red-600' : ''}`}>
                                    {stats.engagement > 0 ? '+' : ''}{stats.engagement}%
                                </div>
                            </div>
                            {stats.engagementTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-600 mb-2" />}
                            {stats.engagementTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-600 mb-2" />}
                        </div>

                        <div className="border-t border-border/50 pt-3 flex justify-between items-end">
                            <div>
                                <p className="text-xs text-muted-foreground">Abonnés ({stats.followers.toLocaleString()})</p>
                                <div className={`text-xl font-bold ${stats.followersTrendDirection === 'up' ? 'text-green-600' : stats.followersTrendDirection === 'down' ? 'text-red-600' : ''}`}>
                                    {stats.followersTrendDirection === 'up' ? '+' : ''}{stats.followersTrend}%
                                </div>
                            </div>
                            {stats.followersTrendDirection === 'up' && <TrendingUp className="h-4 w-4 text-green-600 mb-1" />}
                            {stats.followersTrendDirection === 'down' && <TrendingDown className="h-4 w-4 text-red-600 mb-1" />}
                        </div>
                    </CardContent>
                </Card>

                <TopPostsCard topPosts={topPosts} />

                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posts Analysés</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{posts.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Posts Table */}
            <PostsTable posts={posts} />
        </div>
    );
}
