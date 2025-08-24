import React from 'react';

const Logo = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Helmet Base */}
        <ellipse
          cx="50"
          cy="45"
          rx="35"
          ry="25"
          fill="#C0392B"
          stroke="#A93226"
          strokeWidth="2"
        />
        
        {/* Helmet Top */}
        <path
          d="M15 45 Q15 25 50 25 Q85 25 85 45"
          fill="#C0392B"
          stroke="#A93226"
          strokeWidth="2"
        />
        
        {/* Helmet Visor */}
        <path
          d="M20 40 Q20 35 50 35 Q80 35 80 40"
          fill="#A93226"
          stroke="#8B2A1F"
          strokeWidth="1"
        />
        
        {/* Helmet Ridge */}
        <path
          d="M25 30 Q25 28 50 28 Q75 28 75 30"
          fill="#A93226"
          stroke="#8B2A1F"
          strokeWidth="1"
        />
        
        {/* Helmet Strap */}
        <rect
          x="15"
          y="60"
          width="70"
          height="8"
          rx="4"
          fill="#A93226"
          stroke="#8B2A1F"
          strokeWidth="1"
        />
        
        {/* Helmet Strap Buckle */}
        <rect
          x="45"
          y="58"
          width="10"
          height="12"
          rx="2"
          fill="#8B2A1F"
          stroke="#6B1F18"
          strokeWidth="1"
        />
        
        {/* RR Initials */}
        <text
          x="50"
          y="42"
          textAnchor="middle"
          fill="white"
          fontSize="16"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          RR
        </text>
        
        {/* Helmet Shine */}
        <ellipse
          cx="35"
          cy="35"
          rx="8"
          ry="4"
          fill="rgba(255, 255, 255, 0.3)"
        />
        
        {/* Helmet Reflection */}
        <path
          d="M30 30 Q32 28 35 28 Q38 28 40 30"
          fill="rgba(255, 255, 255, 0.2)"
          stroke="none"
        />
      </svg>
    </div>
  );
};

export default Logo;
