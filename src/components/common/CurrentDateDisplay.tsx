import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTodayHebrewDate } from '../../hooks/useTodayHebrewDate';

export const CurrentDateDisplay: React.FC = () => {
  const { i18n } = useTranslation();
  const { data: hebrewDate } = useTodayHebrewDate();

  if (!hebrewDate) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center px-2 leading-none select-none min-w-[80px]">
      <span className="text-[10px] sm:text-xs font-bold text-[#8e24aa] whitespace-nowrap mb-0.5">
        {hebrewDate.hebrew}
      </span>
      <span className="text-[10px] sm:text-xs font-medium text-[#304FFE] whitespace-nowrap">
        {new Date().toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric'
        })}
      </span>
    </div>
  );
};











