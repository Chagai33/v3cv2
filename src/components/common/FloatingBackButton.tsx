import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface FloatingBackButtonProps {
  onClick?: () => void;
  to?: string;
  className?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  onClick,
  to,
  className = '',
  position = 'bottom-left',
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  const positionClasses = {
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 sm:hidden`}>
      <button
        onClick={handleClick}
        className={`p-4 bg-white/80 backdrop-blur-md border border-white/30 text-gray-700 rounded-full shadow-xl hover:bg-white/90 transition-all active:scale-95 ring-1 ring-black/5 ${className}`}
        aria-label={t('common.back')}
      >
        {i18n.language === 'he' ? (
          <ArrowRight className="w-6 h-6" />
        ) : (
          <ArrowLeft className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};



