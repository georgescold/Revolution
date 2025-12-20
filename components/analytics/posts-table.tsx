'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPostDialog } from './edit-post-dialog';
import { updatePost, deletePost } from '@/server/actions/analytics-actions';
import { toast } from 'sonner';
import Link from 'next/link';
import { PostDetailsModal } from './post-details-modal';

export function PostsTable({ posts }: { posts: any[] }) {
    return (
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
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden md:table-cell">Plateforme</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Vues</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Saves</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Note</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {posts.map((post) => (
                                <PostRow key={post.id} post={post} />
                            ))}
                            {posts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        Aucune donnée. Ajoute ton premier post !
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function PostRow({ post }: { post: any }) {
    const [editOpen, setEditOpen] = useState(false);
    const [isDeleting, startDeleteTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm('Es-tu sûr de vouloir supprimer ce post ?')) return;
        startDeleteTransition(async () => {
            const res = await deletePost(post.id);
            if (res.success) toast.success('Post supprimé');
            else toast.error('Erreur lors de la suppression');
        });
    };

    return (
        <PostDetailsModal postId={post.id} initialTitle={post.title || post.hookText}>
            <tr className="border-b border-border/10 transition-colors hover:bg-muted/50 cursor-pointer">
                <td className="p-4 align-middle font-medium">
                    <div className="flex flex-col">
                        <span className="font-bold">{post.title || post.hookText}</span>
                        {post.title && post.title !== post.hookText && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{post.hookText}</span>
                        )}
                        {post.description && (
                            <span className="text-xs text-muted-foreground/80 italic truncate max-w-[200px] mt-1">{post.description}</span>
                        )}
                    </div>
                </td>
                <td className="p-4 align-middle hidden md:table-cell">
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
                <td className="p-4 align-middle text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/editor/${post.id}`} className="cursor-pointer">
                                        <Pencil className="mr-2 h-4 w-4" /> Modifier
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </td>
            </tr>
        </PostDetailsModal>
    );
}
