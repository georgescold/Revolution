import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDashboardStats } from '@/server/actions/analytics-actions';
import { AddPostDialog } from './add-post-dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
                        <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                        {stats.engagementTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                        {stats.engagementTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.engagementTrend === 'up' ? 'text-green-600' : stats.engagementTrend === 'down' ? 'text-red-600' : ''}`}>
                            {stats.engagement > 0 ? '+' : ''}{stats.engagement}%
                        </div>
                    </CardContent>
                </Card>

                <Dialog>
                    <DialogTrigger asChild>
                        <Card className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/80 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Top Posts</CardTitle>
                                <Trophy className="h-4 w-4 text-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">{topPosts.length}</div>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-foreground" />
                                Top 5 Posts par Vues
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                            {topPosts.map((post, index) => (
                                <div key={post.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-secondary text-white' : 'bg-muted'}`}>
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{post.hookText}</p>
                                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                            <span>{post.metrics?.views?.toLocaleString()} vues</span>
                                            <span>•</span>
                                            <Badge variant="outline" className={post.platform === 'tiktok' ? 'border-primary/50 text-primary' : 'border-pink-500/50 text-pink-500'}>
                                                {post.platform}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

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
            <Card className="bg-card/30">
                <CardHeader>
                    <CardTitle>Derniers Posts</CardTitle>
                    <CardDescription>Analyse automatique de tes hooks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Hook / Titre</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Plateforme</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Vues</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Saves</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Note</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {posts.map((post) => (
                                    <tr key={post.id} className="border-b border-border/10 transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{post.hookText}</td>
                                        <td className="p-4 align-middle">
                                            <Badge variant="outline" className={post.platform === 'tiktok' ? 'border-primary/50 text-primary' : 'border-pink-500/50 text-pink-500'}>
                                                {post.platform}
                                            </Badge>
                                        </td>
                                        <td className="p-4 align-middle">{post.metrics?.views}</td>
                                        <td className="p-4 align-middle text-right">{post.metrics?.saves}</td>
                                        <td className="p-4 align-middle text-right">
                                            {(post.metrics?.saves || 0) > 100 ? (
                                                <Badge className="bg-secondary text-white">Viral</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {posts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Aucune donnée. Ajoute ton premier post !
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
