import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { SyncHistoryItem } from '../../types';

interface SyncHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SyncHistoryItem[];
}

export const SyncHistoryModal: React.FC<SyncHistoryModalProps> = ({ isOpen, onClose, history }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PARTIAL': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'FAILED': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-0 border border-gray-200 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">{t('googleCalendar.syncHistory')}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('googleCalendar.noHistory')}</p>
          ) : (
            history.map((item, index) => (
              <div key={item.id || index} className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.type === 'BATCH' ? t('googleCalendar.batchSync') : t('googleCalendar.singleSync')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.timestamp && isValid(new Date(item.timestamp)) ? format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm') : '-'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    item.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                    item.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {t(`googleCalendar.status.${item.status}`)}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>{t('googleCalendar.totalRecords')}: {item.total}</span>
                    <span className="text-green-600">{t('googleCalendar.recordsCompleted')}: {item.successCount}</span>
                    <span className="text-red-600">{t('googleCalendar.recordsFailed')}: {item.failedCount}</span>
                  </div>
                  
                  {item.failedItems && item.failedItems.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="font-medium text-red-700 mb-1">{t('googleCalendar.failures')}:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-red-600">
                        {item.failedItems.map((fail, i) => (
                          <li key={i} className="truncate">
                            <span className="font-medium">{fail.name}</span>: {fail.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

