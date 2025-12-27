import { Heart, Bookmark, MessageCircle } from "lucide-react";

interface FloatingStatsProps {
    variant?: 'default' | 'landing';
}

export function FloatingStats({ variant = 'default' }: FloatingStatsProps) {
    // Smaller sizes as requested
    const iconSize = variant === 'landing' ? "w-6 h-6 md:w-8 md:h-8" : "w-3 h-3 md:w-4 md:h-4";
    const containerClass = "absolute flex items-center justify-center opacity-0 animate-[fade-in-out_8s_linear_infinite]";

    // We use a custom keyframe for individual appearing/disappearing to simulate passing by them
    // combined with the global fly motion or just independent motion.

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {/* We create multiple independent items with different delays/positions to simulate a field we fly through */}

            {/* Item 1 - Replaced Eye with MessageCircle */}
            <div className={`${containerClass} top-[20%] left-[10%]`} style={{ animationDelay: '0s', animationDuration: '10s' }}>
                <MessageCircle className={`${iconSize} text-[#25D366] rotate-[-12deg]`} fill="currentColor" />
            </div>

            {/* Item 2 */}
            <div className={`${containerClass} top-[40%] left-[80%]`} style={{ animationDelay: '2s', animationDuration: '12s' }}>
                <Heart className={`${iconSize} text-[#FE2C55] rotate-[10deg]`} fill="currentColor" />
            </div>

            {/* Item 3 */}
            <div className={`${containerClass} top-[60%] left-[20%]`} style={{ animationDelay: '4s', animationDuration: '9s' }}>
                <Bookmark className={`${iconSize} text-[#FFD700] rotate-[-5deg]`} fill="currentColor" />
            </div>

            {/* Item 4 */}
            <div className={`${containerClass} top-[80%] left-[70%]`} style={{ animationDelay: '6s', animationDuration: '11s' }}>
                <MessageCircle className={`${iconSize} text-[#25D366] rotate-[15deg]`} fill="currentColor" />
            </div>

            {/* Item 5 - Extra volume for Landing */}
            {variant === 'landing' && (
                <>
                    {/* Replaced Eye with Heart */}
                    <div className={`${containerClass} top-[30%] left-[50%]`} style={{ animationDelay: '1s', animationDuration: '13s' }}>
                        <Heart className={`${iconSize} text-[#FE2C55] rotate-[5deg]`} fill="currentColor" />
                    </div>
                    <div className={`${containerClass} top-[70%] left-[40%]`} style={{ animationDelay: '5s', animationDuration: '14s' }}>
                        <Heart className={`${iconSize} text-[#FE2C55] rotate-[-8deg]`} fill="currentColor" />
                    </div>
                    <div className={`${containerClass} top-[10%] left-[85%]`} style={{ animationDelay: '3s', animationDuration: '15s' }}>
                        <Bookmark className={`${iconSize} text-[#FFD700] rotate-[20deg]`} fill="currentColor" />
                    </div>
                </>
            )}
        </div>
    );
}
