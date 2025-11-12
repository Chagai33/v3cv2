import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Trash2, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // TODO: Implement delete account functionality
      // This will require a Cloud Function to handle account deletion
      // For now, we'll show an error message
      showError(t('footer.deleteAccountNotImplemented', 'פונקציונליות מחיקת חשבון עדיין לא זמינה. אנא צור קשר עם התמיכה.'));
    } catch (err: any) {
      showError(err.message || t('footer.deleteAccountError', 'שגיאה במחיקת החשבון'));
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleFeedback = () => {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSf4M-3ytbYRAOIh9B7Bavgaw2WyGgDFP3PT7zgTmTMnUFXMrg/viewform', '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link
              to="/terms"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('footer.termsOfUse', 'תנאי שימוש')}
            </Link>
            <Link
              to="/privacy"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('footer.privacyPolicy', 'מדיניות פרטיות')}
            </Link>
            <button
              onClick={handleFeedback}
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-4 h-4" />
              {t('footer.feedback', 'משוב')}
            </button>
            {user && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('footer.deleteAccount', 'מחק חשבון')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm text-gray-700">
                      {t('footer.confirmDelete', 'לאשר מחיקה?')}
                    </span>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      {t('common.yes', 'כן')}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      {t('common.no', 'לא')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} hebbirthday. {t('footer.allRightsReserved', 'כל הזכויות שמורות')}
          </div>
        </div>
      </div>
    </footer>
  );
};

