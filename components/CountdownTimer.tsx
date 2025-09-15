import React, { useState, useEffect, useMemo, useRef } from 'react';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

interface CountdownTimerProps {
    startTime: any;
    duration: number;
    onEnd?: () => void;
    showProgressBar?: boolean;
    textClassName?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
    startTime, 
    duration, 
    onEnd,
    showProgressBar = true, 
    textClassName = 'text-2xl' 
}) => {
    const [tick, setTick] = useState(0);
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    const serverStartTime = useMemo(() => getJsDateFromTimestamp(startTime)?.getTime(), [startTime]);

    useEffect(() => {
        if (!serverStartTime) return;

        let isEnded = false;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const endTime = serverStartTime + duration * 1000;

            if (now >= endTime) {
                if (!isEnded) {
                    isEnded = true;
                    onEndRef.current?.();
                }
                clearInterval(interval);
            }
            // Trigger re-render to update the displayed time
            setTick(t => t + 1);
        }, 500);

        return () => clearInterval(interval);
    }, [serverStartTime, duration]);

    // Calculate timeLeft on every render to ensure accuracy
    const now = Date.now();
    const elapsed = serverStartTime ? Math.floor((now - serverStartTime) / 1000) : 0;
    
    // This is the raw calculation, which can be > duration if client clock is behind server.
    let timeLeft = Math.max(0, duration - elapsed);

    // If elapsed is negative, it means the client's clock is behind the server's start time.
    // In this case, we cap the display at the full duration to avoid showing confusing times like "41s" on a 30s timer.
    // The timer will appear to "pause" until the client clock catches up to the start time.
    if (elapsed < 0) {
        timeLeft = duration;
    }

    const percentage = duration > 0 ? (timeLeft / duration) * 100 : 0;
    const barColor = timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 20 ? 'bg-yellow-400' : 'bg-green-400';
    const textColor = timeLeft <= 10 ? 'text-red-500' : timeLeft <= 20 ? 'text-yellow-400' : 'text-green-400';

    if (!showProgressBar) {
        return (
            <div className={`font-mono font-bold ${textClassName} ${textColor}`}>
                {timeLeft}s
            </div>
        );
    }
    
    return (
        <div className="w-full">
            <div className={`text-center font-mono font-bold mb-1 ${textClassName}`}>
                {timeLeft}s
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2.5">
                <div 
                    className={`${barColor} h-2.5 rounded-full transition-all duration-500`} 
                    style={{width: `${percentage}%`}}
                ></div>
            </div>
        </div>
    );
};