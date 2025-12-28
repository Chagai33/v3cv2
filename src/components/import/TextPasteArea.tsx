import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, X, Sparkles, ChevronDown } from 'lucide-react';
import { TEXT_IMPORT_LIMITS } from '../../utils/textParser';

interface TextPasteAreaProps {
  onAnalyze: (text: string) => void;
  isAnalyzing?: boolean;
  initialValue?: string;
}

export const TextPasteArea: React.FC<TextPasteAreaProps> = ({
  onAnalyze,
  isAnalyzing = false,
  initialValue = '',
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(initialValue);
  const [honeypot, setHoneypot] = useState(''); // Anti-bot field

  // Update text when initialValue changes
  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  const handleAnalyze = () => {
    // Honey pot check - if filled, it's probably a bot
    if (honeypot) {
      console.warn('Honeypot triggered - possible bot submission');
      return;
    }

    if (!text.trim()) {
      return;
    }

    // No blocking validation - pass to preview which will show warnings
    onAnalyze(text);
  };

  const handleClear = () => {
    setText('');
  };

  const lineCount = text.split('\n').filter(line => line.trim()).length;
  
  // Calculate limits
  const { MAX_CHARACTERS, MAX_LINES } = TEXT_IMPORT_LIMITS;
  const isNearLimit = text.length > MAX_CHARACTERS * 0.8;
  const isOverLimit = text.length > MAX_CHARACTERS || lineCount > MAX_LINES;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl shadow-xl p-4 sm:p-6 border border-purple-100">
        {/* Collapsible Info Box */}
        <details className="mb-4 group">
          <summary className="cursor-pointer flex items-center gap-2 text-sm text-purple-700 hover:text-purple-800 font-medium select-none py-2 px-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors border border-purple-100">
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            <Sparkles className="w-4 h-4" />
            {t('import.pasteHowTo', 'איך זה עובד?')}
          </summary>
          <div className="mt-2 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-purple-100">
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 mr-2">
              <li>{t('import.pasteInstructionDate', 'כל שורה צריכה להכיל שם ותאריך (לדוגמה: משה כהן 15/03/1990)')}</li>
              <li>{t('import.pasteInstructionFormat', 'תומך בפורמטים: DD/MM/YYYY, DD.MM.YY, YYYY-MM-DD ועוד')}</li>
              <li>{t('import.pasteInstructionNames', 'תומך בשמות מורכבים ושמות משפחה דו-חלקיים (בן דוד, אבו חצירה, וכו\')')}</li>
              <li>{t('import.pasteInstructionGender', 'ציין "זכר"/"נקבה" (או "male"/"female") לזיהוי מגדר')}</li>
              <li>{t('import.pasteInstructionSunset', 'כתוב "כן" או "yes" עבור לידה אחרי שקיעה (ברירת מחדל: לא)')}</li>
              <li>{t('import.pasteInstructionNotes', 'הערות בסוגריים יועברו אוטומטית לשדה ההערות')}</li>
            </ul>
          </div>
        </details>

        {/* Textarea */}
        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('import.pastePlaceholder', 
              'לדוגמה:\nמשה כהן 15/03/1990 זכר\nשרה לוי 22.05.85 נקבה כן\nדוד ישראלי 1985-12-10 (חבר טוב)'
            )}
            className={`w-full h-48 sm:h-64 px-3 sm:px-4 py-2 sm:py-3 bg-white border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed transition-all text-right ${
              isOverLimit ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isAnalyzing}
            dir="rtl"
            maxLength={MAX_CHARACTERS + 100} // Small buffer to show warning
          />
          
          {/* Character & Line count with limits */}
          <div className="flex justify-between items-center mt-2 text-sm">
            <span className={lineCount > MAX_LINES ? 'text-red-600 font-medium' : 'text-gray-500'}>
              {lineCount > 0 && (
                <>
                  {t('import.pasteLineCount', '{{count}} שורות', { count: lineCount })}
                  {lineCount > MAX_LINES && ` (${t('import.maxLines', 'מקסימום {{max}}', { max: MAX_LINES })})`}
                </>
              )}
            </span>
            <span className={isOverLimit ? 'text-red-600 font-medium' : isNearLimit ? 'text-orange-500' : 'text-gray-500'}>
              {text.length.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} {t('import.pasteCharacters', 'תווים')}
            </span>
          </div>

          {/* Over limit warning - only block when truly over limit */}
          {isOverLimit && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm text-orange-700">
                {text.length > MAX_CHARACTERS 
                  ? t('import.tooManyChars', 'חרגת ממגבלת התווים ({{max}})', { max: MAX_CHARACTERS.toLocaleString() })
                  : t('import.tooManyLines', 'חרגת ממגבלת השורות ({{max}})', { max: MAX_LINES })
                }
              </p>
            </div>
          )}
        </div>

        {/* Honeypot - Hidden field to catch bots */}
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
          }}
          aria-hidden="true"
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isAnalyzing || isOverLimit}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-indigo-600"
          >
            <Wand2 className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>
              {isAnalyzing
                ? t('import.pasteAnalyzing', 'מנתח...')
                : t('import.pasteAnalyze', 'נתח רשימה')}
            </span>
          </button>

          {text.trim() && (
            <button
              onClick={handleClear}
              disabled={isAnalyzing}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('import.pasteClear', 'נקה')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

