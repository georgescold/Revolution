'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { PostDetailsModal } from './post-details-modal';
import { cn } from '@/lib/utils';

interface TopPostsCardProps {
    topPosts: any[];
}

export function TopPostsCard({ topPosts }: TopPostsCardProps) {
    const [expanded, setExpanded] = useState(false);

    const displayedPosts = expanded ? topPosts : topPosts.slice(0, 5);

    return (
        <Card
            className={cn("bg-card/50 backdrop-blur row-span-2 transition-all duration-300", expanded ? "row-span-3" : "")}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-white/5 transition-colors rounded-t-xl" onClick={() => setExpanded(!expanded)}>
                <CardTitle className="text-sm font-medium">Top Posts {expanded ? '(10)' : '(5)'}</CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-4">
                    {displayedPosts.map((post: any, index: number) => (
                        <PostDetailsModal key={post.id} postId={post.id} initialTitle={post.title || post.hookText}>
                            <div className="flex items-start gap-3 hover:bg-white/5 p-2 rounded -ml-2 transition-colors cursor-pointer">
                                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                                    {index + 1}
                                </span>
                                <div className="space-y-1 overflow-hidden">
                                    <p className="text-sm font-medium leading-none truncate" title={post.title || post.hookText}>
                                        {post.title || post.hookText}
                                    </p>
                                    <p className="text-xs text-muted-foreground w-full flex justify-between gap-4">
                                        <span>{post.metrics?.views?.toLocaleString()} vues</span>
                                        <span className={post.platform === 'tiktok' ? 'text-blue-400' : 'text-pink-500'}>{post.platform}</span>
                                    </p>
                                </div>
                            </div>
                        </PostDetailsModal>
                    ))}
                    {topPosts.length === 0 && (
                        <p className="text-sm text-muted-foreground">Pas encore de top posts.</p>
                    )}

                    {!expanded && topPosts.length > 5 && (
                        <div
                            className="text-xs text-center text-muted-foreground cursor-pointer hover:text-primary transition-colors pt-2"
                            onClick={() => setExpanded(true)}
                        >
                            Voir plus...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
