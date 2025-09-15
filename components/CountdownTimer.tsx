import React, { useState, useEffect, useMemo } from 'react';

const getJsDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    return null;
};

interface CountdownTimerProps {
    startTime: any;
    duration: number;
    showProgressBar?: boolean;
    textClassName?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
    startTime, 
    duration, 
    showProgressBar = true, 
    textClassName = 'text-2xl' 
}) => {
    // We use this state just to trigger re-renders every 500ms
    const [, setTick] = useState(0);

    const serverStartTime = useMemo(() => getJsDateFromTimestamp(startTime)?.getTime(), [startTime]);

    useEffect(() => {
        if (!serverStartTime) return;

        const interval = setInterval(() => {
            // If time is up, stop ticking
            if (Date.now() > serverStartTime + duration * 1000) {
                clearInterval(interval);
            } else {
                setTick(tick => tick + 1);
            }
        }, 500);


        return () => clearInterval(interval);
    }, [serverStartTime, duration]);

    // Calculate timeLeft on every render
    const now = Date.now();
    const elapsed = serverStartTime ? Math.floor((now - serverStartTime) / 1000) : 0;
    const timeLeft = Math.max(0, duration - elapsed);

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
