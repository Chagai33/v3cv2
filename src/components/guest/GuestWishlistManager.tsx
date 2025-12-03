import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WishlistItem } from '../../types';
import { guestService } from '../../services/guest.service';
import { Button } from '../common/Button';

const MAX_ITEMS = 20;
const MAX_NAME_LENGTH = 50;
const MAX_DESC_LENGTH = 200;

interface GuestWishlistManagerProps {
  initialWishlist: WishlistItem[];
  onLogout: () => void;
  onBackToSearch?: () => void;
  guestName?: string;
}

export const GuestWishlistManager: React.FC<GuestWishlistManagerProps> = ({ initialWishlist, onLogout, onBackToSearch, guestName }) => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const [items, setItems] = useState<WishlistItem[]>(initialWishlist);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const resetForm = () => {
    setItemName('');
    setDescription('');
    setPriority('medium');
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleAdd = async () => {
    if (!itemName.trim()) return;

    if (items.length >= MAX_ITEMS) {
      setError(t('guest.maxItemsError', { count: MAX_ITEMS }));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const id = await guestService.addItem({
        item_name: itemName,
        description,
        priority
      });

      // Optimistic update or just add
      const newItem: WishlistItem = {
        id,
        birthday_id: '', // Not needed for display
        tenant_id: '',
        item_name: itemName,
        description,
        priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setItems([newItem, ...items]);
      resetForm();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission-denied') || err.code === 'permission-denied') {
           setError(t('guest.accessDenied') || 'Access to the guest portal has been disabled.');
      } else {
           setError(t('guest.sessionExpired'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !itemName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await guestService.updateItem(editingId, {
        item_name: itemName,
        description,
        priority
      });

      setItems(items.map(item => item.id === editingId ? {
        ...item,
        item_name: itemName,
        description,
        priority,
        updated_at: new Date().toISOString()
      } : item));
      
      resetForm();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission-denied') || err.code === 'permission-denied') {
           setError(t('guest.accessDenied') || 'Access to the guest portal has been disabled.');
      } else {
           setError(t('guest.updateError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('guest.deleteConfirm'))) return;
    setLoading(true);
    try {
      await guestService.deleteItem(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission-denied') || err.code === 'permission-denied') {
           setError(t('guest.accessDenied') || 'Access to the guest portal has been disabled.');
      } else {
           setError(t('guest.deleteError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: WishlistItem) => {
    setEditingId(item.id);
    setItemName(item.item_name);
    setDescription(item.description || '');
    setPriority(item.priority);
    setIsAdding(false);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-orange-500 bg-orange-50';
      case 'low': return 'text-green-500 bg-green-50';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">{t('guest.myWishlist')}</h2>
                {guestName && (
                    <p className="text-sm text-gray-500 mt-1">
                        {t('guest.managingWishlistFor', 'Managing list for:')} <span className="font-medium text-gray-700">{guestName}</span>
                    </p>
                )}
            </div>
            <Button variant="secondary" size="sm" onClick={onLogout} className="text-red-600 hover:bg-red-50 border-red-200">
                {t('auth.signOut')}
            </Button>
        </div>
        
        {onBackToSearch && (
            <button
                onClick={onBackToSearch}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors w-fit"
            >
                {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{t('guest.backToSearch', 'Back to search')}</span>
            </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isAdding && !editingId && items.length < MAX_ITEMS && (
        <Button 
            onClick={() => setIsAdding(true)} 
            variant="outline"
            className="w-full !border-blue-600 !text-blue-600 hover:!bg-blue-50"
        >
            <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('guest.addNewItem')}
        </Button>
      )}

      {!isAdding && !editingId && items.length >= MAX_ITEMS && (
        <div className="text-center p-3 bg-gray-50 text-gray-500 text-sm rounded-lg border border-dashed border-gray-200">
            {t('guest.maxItemsLimitReached', { count: MAX_ITEMS })}
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">{isAdding ? t('guest.addNewItem') : t('guest.editItem')}</h3>
          
          <div className="space-y-3">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-500">{t('wishlist.itemName')}</label>
                    <span className="text-[10px] text-gray-400">{itemName.length}/{MAX_NAME_LENGTH}</span>
                </div>
                <input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    placeholder={t('wishlist.itemNamePlaceholder')}
                />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-500">{t('wishlist.description')}</label>
                    <span className="text-[10px] text-gray-400">{description.length}/{MAX_DESC_LENGTH}</span>
                </div>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={MAX_DESC_LENGTH}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 bg-white"
                    placeholder={t('wishlist.descriptionPlaceholder')}
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('wishlist.priority')}</label>
                <div className="flex gap-2">
                    {(['high', 'medium', 'low'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                                priority === p 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {t(`wishlist.${p}`)}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={isAdding ? handleAdd : handleUpdate} isLoading={loading} className="flex-1 !bg-blue-600 hover:!bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('guest.save')}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={loading} className="hover:bg-gray-50">
                {t('guest.cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 && !isAdding && (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                {t('guest.emptyWishlist')}
            </div>
        )}
        
        {items.map((item) => (
            <div key={item.id} className={`bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-200 shadow-sm transition-all group ${editingId === item.id ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(item.priority)}`}>
                                {t(`wishlist.${item.priority}`)}
                            </span>
                            <h4 className="font-medium text-gray-800">{item.item_name}</h4>
                        </div>
                        {item.description && (
                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</p>
                        )}
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => startEdit(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
