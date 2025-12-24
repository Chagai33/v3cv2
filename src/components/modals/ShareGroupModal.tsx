import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link as LinkIcon, Copy, Check, RefreshCw, AlertCircle, Share2 } from 'lucide-react';
import { Group } from '../../types';
import { groupService } from '../../services/group.service';

interface ShareGroupModalProps {
  group: Group;
  onClose: () => void;
}

export const ShareGroupModal: React.FC<ShareGroupModalProps> = ({ group, onClose }) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [guestToken, setGuestToken] = useState<string | null>(group.guest_access_token || null);
  const [isEnabled, setIsEnabled] = useState(group.is_guest_access_enabled ?? false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate guest link URL
  const guestLink = guestToken
    ? `${window.location.origin}/guest/${group.id}/${guestToken}`
    : null;

  // WhatsApp message template with proper RTL/LTR separation
  const whatsAppMessage = guestLink
    ? `היי! 👋

אני מזמין אותך להוסיף ימי הולדת לקבוצת ${group.name} שלנו.

פשוט לחץ על הקישור הזה:

${guestLink}

⏰ הקישור תקף ל-72 שעות
📝 מקסימום 50 הוספות לכל קישור

תודה! 🎂`
    : '';

  // WhatsApp link with properly encoded message
  const whatsAppLink = whatsAppMessage
    ? `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`
    : null;

  // Generate or regenerate token
  const handleGenerateToken = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = await groupService.generateGuestAccessToken(group.id);
      setGuestToken(token);
      setIsEnabled(true);

      // Update group state
      await groupService.updateGroup(group.id, {
        is_guest_access_enabled: true,
      });
    } catch (err: any) {
      console.error('Error generating token:', err);
      setError(t('groups.guestAccessLinkError', 'שגיאה ביצירת קישור גישת אורחים'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle guest access
  const handleToggleAccess = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const newState = !isEnabled;
      await groupService.updateGroup(group.id, {
        is_guest_access_enabled: newState,
      });
      setIsEnabled(newState);

      if (!newState) {
        // If disabling, also reset token
        await groupService.resetGuestAccessToken(group.id);
        setGuestToken(null);
      }
    } catch (err: any) {
      console.error('Error toggling access:', err);
      setError(t('groups.guestAccessLinkError', 'שגיאה בעדכון גישת אורחים'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!guestLink) return;

    try {
      await navigator.clipboard.writeText(guestLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Copy WhatsApp message to clipboard
  const handleCopyWhatsApp = async () => {
    if (!whatsAppMessage) return;

    try {
      await navigator.clipboard.writeText(whatsAppMessage);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    } catch (err) {
      console.error('Failed to copy WhatsApp message:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${group.color}20` }}
            >
              <Share2 className="w-5 h-5" style={{ color: group.color }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('groups.shareGroupTitle', 'שיתוף קבוצה - {{name}}', { name: group.name })}
              </h2>
              <p className="text-sm text-gray-600">
                {t('groups.shareGroupDescription', 'שלח קישור למשפחה או חברים')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900">
                {t('groups.guestAccessToggle', 'אפשר גישת אורחים')}
              </p>
              <p className="text-sm text-gray-600">
                {t('groups.guestAccessToggleDescription', 'הפעל/בטל גישת אורחים לקבוצה זו')}
              </p>
            </div>
            <button
              onClick={handleToggleAccess}
              disabled={isGenerating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-green-600' : 'bg-gray-300'
              } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Guest Access Status */}
          {isEnabled ? (
            <>
              {!guestToken ? (
                /* Generate Link Button */
                <div className="text-center py-8">
                  <button
                    onClick={handleGenerateToken}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('groups.generating', 'מייצר קישור...')}
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-5 h-5" />
                        {t('groups.generateLink', 'צור קישור')}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Link Display */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('groups.guestAccessLink', 'קישור גישת אורחים')}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-mono break-all">
                        {guestLink}
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className={`p-3 rounded-lg transition-colors ${
                          copiedLink
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                        title={t('groups.copyLink', 'העתק קישור')}
                      >
                        {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Limitations Info */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 space-y-1">
                      <p className="font-semibold">
                        {t('groups.guestLinkLimitations', 'מגבלות קישור')}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>{t('groups.linkExpires72Hours', 'הקישור תקף ל-72 שעות בלבד')}</li>
                        <li>{t('groups.maxContributions', 'מקסימום 50 הוספות לכל קישור')}</li>
                        <li>{t('groups.resetLinkForNew', 'ניתן לאפס ולהפיק קישור חדש בכל עת')}</li>
                      </ul>
                    </div>
                  </div>

                  {/* WhatsApp Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('groups.whatsappMessage', 'הודעת וואטסאפ')}
                    </label>
                    <div className="flex flex-col gap-3">
                      <div className="px-4 py-3 bg-green-50 border border-green-300 rounded-lg text-sm text-gray-700 whitespace-pre-wrap" dir="auto">
                        {whatsAppMessage}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyWhatsApp}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 ${
                            copiedWhatsApp
                              ? 'bg-green-600 text-white'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {copiedWhatsApp ? (
                            <>
                              <Check className="w-4 h-4" />
                              {t('groups.whatsappMessageCopied', 'ההודעה הועתקה!')}
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              {t('groups.copyWhatsAppMessage', 'העתק הודעה')}
                            </>
                          )}
                        </button>
                        {whatsAppLink && (
                          <a
                            href={whatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            {t('groups.openWhatsApp', 'פתח בוואטסאפ')}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Regenerate Link */}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              'groups.regenerateConfirm',
                              'האם ברצונך ליצור קישור חדש? הקישור הישן יפסיק לעבוד.'
                            )
                          )
                        ) {
                          handleGenerateToken();
                        }
                      }}
                      disabled={isGenerating}
                      className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('groups.generateNewLink', 'צור קישור חדש')}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Disabled State */
            <div className="text-center py-8 text-gray-500">
              <p>{t('groups.guestAccessDisabled', 'גישת אורחים מושבתת')}</p>
              <p className="text-sm mt-2">
                {t('groups.enableToShare', 'הפעל גישת אורחים כדי לשתף קישור')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            {t('common.close', 'סגור')}
          </button>
        </div>
      </div>
    </div>
  );
};

