import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Plus, Cloud, Users } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-slide-in relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('help.title')}</h2>
            <p className="text-gray-600 leading-relaxed">
              {t('help.intro')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Plus className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{t('help.step1_title')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t('help.step1_desc')}</p>
              </div>
            </div>

            <div className="flex gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{t('help.step2_title')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t('help.step2_desc')}</p>
              </div>
            </div>

            <div className="flex gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                  <Cloud className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{t('help.step3_title')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t('help.step3_desc')}</p>
              </div>
            </div>

            <div className="flex gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{t('help.step4_title')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t('help.step4_desc')}</p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-500 italic">
              {t('help.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

