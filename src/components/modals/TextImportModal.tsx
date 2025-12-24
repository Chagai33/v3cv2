import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { TextPasteArea } from '../import/TextPasteArea';
import { parseFreeText } from '../../utils/textParser';
import { CSVBirthdayData } from '../../utils/csvExport';

interface TextImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedData: (data: CSVBirthdayData[], originalText: string) => void;
  initialText?: string;
}

export const TextImportModal: React.FC<TextImportModalProps> = ({
  isOpen,
  onClose,
  onParsedData,
  initialText = '',
}) => {
  const { t } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reset analyzing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAnalyzing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    
    // Simulate a slight delay for better UX (shows the analyzing state)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const parsed = parseFreeText(text);
      
      if (parsed.length === 0) {
        // No valid data found - could show an error toast here
        setIsAnalyzing(false);
        return;
      }

      // Pass the parsed data AND original text to the parent
      onParsedData(parsed, text);
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error parsing text:', error);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t('import.pasteTitle', 'הדבק רשימת ימי הולדת')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('import.pasteSubtitle', 'העתק רשימה מוואטסאפ, הערות או כל מקום אחר')}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('common.close', 'סגור')}
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TextPasteArea 
            onAnalyze={handleAnalyze} 
            isAnalyzing={isAnalyzing}
            initialValue={initialText}
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {t('import.backToImport', 'חזור לייבוא')} •{' '}
            <button
              onClick={onClose}
              disabled={isAnalyzing}
              className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
            >
              {t('common.cancel', 'ביטול')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

