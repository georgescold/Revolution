'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Pencil } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, useTransition, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MetricHistoryCardProps {
    title: string;
    value: number | string;
    subValue?: string;
    trend: number;
    trendDirection: 'up' | 'down' | 'neutral';
    data: { date: string; value: number; originalDate?: Date | string }[];
    onSave?: (newValue: number) => Promise<{ error?: string; success?: boolean }>;
    editable?: boolean;
    chartColor?: string;
    rangeOptions?: { key: string; label: string }[];
}

export function MetricHistoryCard({
    title,
    value,
    subValue,
    trend,
    trendDirection,
    data,
    onSave,
    editable = false,
    chartColor = "#10b981", // green-500 default
    rangeOptions = [
        { key: '7d', label: '7J' },
        { key: '30d', label: '30J' },
        { key: '6m', label: '6M' }
    ]
}: MetricHistoryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value.toString());
    const [isPending, startTransition] = useTransition();

    // Local state for optimistic updates
    const [localData, setLocalData] = useState(data);
    const [localValue, setLocalValue] = useState(value);

    // Sync with props when server data updates
    useEffect(() => {
        setLocalData(data);
        setLocalValue(value);
    }, [data, value]);

    // Default to '30d' or the last option
    const defaultRange = rangeOptions.find(o => o.key === '30d') ? '30d' : rangeOptions[Math.floor(rangeOptions.length / 2)]?.key || rangeOptions[0]?.key;
    const [timeRange, setTimeRange] = useState<string>(defaultRange);

    const handleSave = () => {
        if (!onSave) return;
        const num = parseInt(editValue.toString().replace(/\s/g, ''), 10);
        if (isNaN(num)) {
            toast.error("Valeur invalide");
            return;
        }

        // --- Optimistic Update Logic ---
        const previousValue = localValue;
        const previousData = [...localData];

        // 1. Update main value immediately
        setLocalValue(num);

        // 2. Update graph data immediately
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const newData = [...localData];
        const lastIndex = newData.length - 1;

        if (lastIndex >= 0 && newData[lastIndex].date === todayFormatted) {
            // Update today's existing point
            newData[lastIndex] = { ...newData[lastIndex], value: num };
        } else {
            // Append new point for today
            newData.push({ date: todayFormatted, value: num, originalDate: today });
        }
        setLocalData(newData);
        setIsEditing(false);
        // -------------------------------

        startTransition(async () => {
            const res = await onSave(num);
            if (res.error) {
                toast.error(res.error);
                // Revert on failure
                setLocalValue(previousValue);
                setLocalData(previousData);
            } else {
                toast.success("Mis à jour !");
            }
        });
    };

    // Determine trend color
    // Use localValue/localData if you want dynamic trend update too, 
    // but trend prop is usually complex (vs previous period). 
    // For simplicity, we keep static trend or could re-calculate locally.
    const trendColor = trendDirection === 'up' ? 'text-green-500' : trendDirection === 'down' ? 'text-red-500' : 'text-muted-foreground';
    const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

    // Filter data based on timeRange (using localData)
    const getFilteredData = () => {
        if (!localData || localData.length === 0) return [{ date: 'Aujourd\'hui', value: typeof localValue === 'number' ? localValue : 0 }];

        // Check if data has originalDate (inserted by server)
        const hasDateObjects = localData.some(d => d.originalDate);

        if (!hasDateObjects) {
            // Fallback to array slicing if no proper dates provided (legacy behavior, but prone to gaps)
            // But user reported 7J not working, probably due to data gaps.
            const sortedData = [...localData];
            let itemsToKeep = 30;
            if (timeRange === '1d') itemsToKeep = 2; // Show at least 2 points for a line
            else if (timeRange === '7d') itemsToKeep = 7;
            else if (timeRange === '30d') itemsToKeep = 30;
            else if (timeRange === '6m') itemsToKeep = 180;
            else if (timeRange === '1y') itemsToKeep = 365;

            // If we have fewer items than requested, return all (this is where "7J" issue might hide if data is old?? No, slices end. )
            // If data is [Oct 1, Dec 25, Dec 26] and we ask 7J (slice -7), we get all 3. 
            // Oct 1 is shown. This is WRONG for "Last 7 Days". 
            // We MUST change to Date filtering.
            return sortedData.slice(-itemsToKeep);
        }

        // Proper Date Filtering
        const now = new Date();
        const cutoffDate = new Date(now);

        if (timeRange === '1d') cutoffDate.setDate(now.getDate() - 1);
        else if (timeRange === '7d') cutoffDate.setDate(now.getDate() - 7);
        else if (timeRange === '30d') cutoffDate.setDate(now.getDate() - 30);
        else if (timeRange === '6m') cutoffDate.setMonth(now.getMonth() - 6);
        else if (timeRange === '1y') cutoffDate.setFullYear(now.getFullYear() - 1);

        // Reset hours for cutoff to include the full start day? Or strict time? 
        // Strict time is safer for "Last X".

        return localData.filter(item => {
            if (!item.originalDate) return true; // Keep if no date?? Or discard? Discard is safer to enforce range.
            const itemDate = new Date(item.originalDate);
            return itemDate >= cutoffDate;
        });
    };

    const chartData = getFilteredData();

    return (
        <Card className="bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="flex items-center gap-1">
                    {/* Time Range Selector */}
                    <div className="flex bg-muted/50 rounded-lg p-0.5 mr-2">
                        {rangeOptions.map((option) => (
                            <button
                                key={option.key}
                                onClick={() => setTimeRange(option.key)}
                                className={`
                                    text-[10px] px-2 py-0.5 rounded-md transition-all font-medium
                                    ${timeRange === option.key
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                                `}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {editable && !isEditing && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    {/* Value Section */}
                    <div className="flex items-baseline justify-between">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-8 w-24 text-lg font-bold"
                                    type="number"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                />
                                <Button size="sm" onClick={handleSave} disabled={isPending}>OK</Button>
                            </div>
                        ) : (
                            <div>
                                <div className="text-2xl font-bold flex items-baseline gap-2">
                                    {typeof localValue === 'number' ? localValue.toLocaleString() : localValue}
                                    {subValue && <span className="text-sm font-normal text-muted-foreground">{subValue}</span>}
                                </div>
                                <div className={`flex items-center text-xs ${trendColor} mt-1`}>
                                    <TrendIcon className="h-3 w-3 mr-1" />
                                    {trendDirection === 'up' ? '+' : ''}{trend}%
                                    <span className="text-muted-foreground ml-1">vs période préc.</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chart Section */}
                    <div className="h-[80px] w-full -mx-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={chartColor}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#gradient-${title})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
