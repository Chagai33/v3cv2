import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, FileText, X, Sparkles } from 'lucide-react';

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

    onAnalyze(text);
  };

  const handleClear = () => {
    setText('');
  };

  const lineCount = text.split('\n').filter(line => line.trim()).length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl shadow-xl p-6 border border-purple-100">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">
              {t('import.pasteTitle', 'הדבק רשימת ימי הולדת')}
            </h3>
            <p className="text-sm text-gray-600">
              {t('import.pasteSubtitle', 'העתק רשימה מוואטסאפ, הערות או כל מקום אחר')}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-4 border border-purple-100">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-medium text-purple-700">
                {t('import.pasteHowTo', 'איך זה עובד?')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 mr-2">
                <li>{t('import.pasteInstructionDate', 'כל שורה צריכה להכיל שם ותאריך (לדוגמה: משה כהן 15/03/1990)')}</li>
                <li>{t('import.pasteInstructionFormat', 'תומך בפורמטים: DD/MM/YYYY, DD.MM.YY, YYYY-MM-DD ועוד')}</li>
                <li>{t('import.pasteInstructionNames', 'תומך בשמות מורכבים ושמות משפחה דו-חלקיים (בן דוד, אבו חצירה, וכו\')')}</li>
                <li>{t('import.pasteInstructionGender', 'ציין "זכר"/"נקבה" (או "male"/"female") לזיהוי מגדר')}</li>
                <li>{t('import.pasteInstructionSunset', 'כתוב "כן" או "yes" עבור לידה אחרי שקיעה (ברירת מחדל: לא)')}</li>
                <li>{t('import.pasteInstructionNotes', 'הערות בסוגריים יועברו אוטומטית לשדה ההערות')}</li>
                <li>{t('import.pasteInstructionSmart', 'המערכת מסירה אוטומטית תארים (הרב, ד"ר) ומילות מפתח')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('import.pastePlaceholder', 
              'לדוגמה:\nמשה כהן 15/03/1990 זכר\nשרה לוי 22.05.85 נקבה כן\nדוד ישראלי 1985-12-10 (חבר טוב)'
            )}
            className="w-full h-64 px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed transition-all"
            disabled={isAnalyzing}
            dir="auto"
          />
          
          {/* Character count */}
          <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
            <span>
              {lineCount > 0 && (
                <>
                  {t('import.pasteLineCount', '{{count}} שורות', { count: lineCount })}
                </>
              )}
            </span>
            <span>{text.length} {t('import.pasteCharacters', 'תווים')}</span>
          </div>
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
            disabled={!text.trim() || isAnalyzing}
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

        {/* Example Section */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-purple-600 hover:text-purple-700 font-medium select-none">
            {t('import.pasteShowExample', 'הצג דוגמאות')}
          </summary>
          <div className="mt-3 bg-white/60 rounded-lg p-4 text-sm font-mono text-gray-700 border border-purple-100">
            <div className="space-y-1" dir="rtl">
              <div className="font-semibold text-purple-700 mb-2">{t('import.exampleBasic', 'דוגמאות בסיסיות:')}</div>
              <div>משה כהן 15/03/1990 זכר</div>
              <div>שרה לוי 22.05.85 נקבה כן</div>
              <div>דוד ישראלי 10/12/1985 male</div>
              <div>רחל אברהם 1992-08-03 female (בת דודה)</div>
              
              <div className="font-semibold text-purple-700 mt-3 mb-2">{t('import.exampleComplex', 'שמות מורכבים:')}</div>
              <div>בן ציון כהן 05/06/1995 זכר</div>
              <div>אורית בן ברוך 10/10/2000 נקבה כן</div>
              <div>יוסי דוד אבו חצירה 15/03/1990 male</div>
              <div>הרב משה בן דוד 22.05.85 ז (רב הקהילה)</div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

