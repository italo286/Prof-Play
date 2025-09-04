import React, { useContext, useEffect, useState } from 'react';
import { ProfileContext } from '../contexts/ProfileContext';
import { playLevelUpSound, playBadgeSound } from '../utils/audio';
import { LevelUpModal } from './LevelUpModal';

const NotificationToast: React.FC<{
    icon: string;
    title: string;
    message: string;
    onDismiss: () => void;
}> = ({ icon, title, message, onDismiss }) => {
    
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onDismiss, 300); // Wait for fade out
        }, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
          className={`fixed top-5 right-5 w-80 bg-blue-800 rounded-xl shadow-2xl p-4 z-50 border-l-4 border-yellow-400 transform transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
          role="alert"
          aria-live="assertive"
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <i className={`fas ${icon} text-3xl text-yellow-500`}></i>
                </div>
                <div className="ml-4 flex-1">
                    <p className="text-base font-bold text-blue-50">{title}</p>
                    <p className="mt-1 text-sm text-blue-200">{message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={onDismiss} className="inline-flex text-blue-300 hover:text-white">
                        <span className="sr-only">Fechar</span>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};


export const NotificationManager: React.FC = () => {
    const { notifications, dismissCurrentNotification } = useContext(ProfileContext);

    const currentNotification = notifications[0] || null;

    useEffect(() => {
        if (currentNotification) {
            if (currentNotification.type === 'level') {
                playLevelUpSound();
            } else if (currentNotification.type === 'badge') {
                playBadgeSound();
            }
        }
    }, [currentNotification]);

    if (!currentNotification) return null;

    if (currentNotification.type === 'level') {
        return (
            <LevelUpModal
                level={currentNotification.payload.to}
                onDismiss={dismissCurrentNotification}
            />
        );
    }

    if (currentNotification.type === 'badge') {
        return (
            <NotificationToast
                icon={currentNotification.payload.icon}
                title="Nova medalha conquistada!"
                message={`Você ganhou a medalha: ${currentNotification.payload.name}.`}
                onDismiss={dismissCurrentNotification}
            />
        );
    }
    
    return null;
};
