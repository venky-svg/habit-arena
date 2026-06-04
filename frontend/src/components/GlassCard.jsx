import React from 'react';

export const GlassCard = ({ children, className = '', glowColor = '', onClick }) => {
  const getGlowClass = () => {
    switch (glowColor) {
      case 'violet': return 'border-glow-violet';
      case 'cyan': return 'border-glow-cyan';
      case 'gold': return 'border-glow-gold';
      default: return '';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`glass rounded-2xl p-6 shadow-glass ${getGlowClass()} ${onClick ? 'cursor-pointer hover:scale-[1.01] duration-300' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
