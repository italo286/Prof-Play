import React from 'react';
import { AuthProvider } from './AuthContext';
import { ProfileProvider } from './ProfileContext';
import { GameDataProvider } from './GameDataContext';
import { DuelProvider } from './DuelContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <GameDataProvider>
        <ProfileProvider>
          <DuelProvider>
            {children}
          </DuelProvider>
        </ProfileProvider>
      </GameDataProvider>
    </AuthProvider>
  );
};
