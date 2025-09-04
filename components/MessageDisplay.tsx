

import React from 'react';
import type { MessageType } from '../types';

interface MessageDisplayProps {
  message: string;
  type: MessageType;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, type }) => {
  if (!message) return null;

  let bgColor = 'bg-sky-500/20';
  let textColor = 'text-sky-300';
  let icon = 'fas fa-info-circle';

  switch (type) {
    case 'success':
      bgColor = 'bg-green-500/30';
      textColor = 'text-green-300';
      icon = 'fas fa-check-circle';
      break;
    case 'error':
      bgColor = 'bg-red-500/30';
      textColor = 'text-red-300';
      icon = 'fas fa-times-circle';
      break;
    case 'final':
      bgColor = 'bg-indigo-500/30';
      textColor = 'text-indigo-300';
      icon = 'fas fa-trophy';
      break;
    case 'info':
    default:
      // Default is already set
      break;
  }

  return (
    <div 
      className={`my-4 p-3 rounded-lg shadow-sm flex items-center justify-center text-center ${bgColor} ${textColor} transition-all duration-300 ease-in-out`}
      role="alert"
    >
      <i className={`${icon} mr-2 text-lg`}></i>
      <span className="font-medium text-sm md:text-base">{message}</span>
    </div>
  );
};