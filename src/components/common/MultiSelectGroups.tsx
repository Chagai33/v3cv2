import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface GroupOption {
    id: string;
    name: string;
    parentName?: string;
    isRoot?: boolean;
}

interface MultiSelectGroupsProps {
    groups: GroupOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    label: string;
    error?: string;
    placeholder?: string;
}

export const MultiSelectGroups: React.FC<MultiSelectGroupsProps> = ({
    groups,
    selectedIds,
    onChange,
    label,
    error,
    placeholder
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const defaultPlaceholder = placeholder || t('groups.selectGroups');

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (id: string) => {
        const newSelection = selectedIds.includes(id)
            ? selectedIds.filter(sid => sid !== id)
            : [...selectedIds, id];
        onChange(newSelection);
    };

    const selectedCount = selectedIds.length;
    
    // Generate display text
    let displayText = defaultPlaceholder;
    if (selectedCount > 0) {
        if (selectedCount === 1) {
            const group = groups.find(g => g.id === selectedIds[0]);
            displayText = group ? group.name : t('groups.unknownGroup');
        } else {
            displayText = t('groups.groupsSelected', { count: selectedCount });
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 text-left bg-white border rounded-lg flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    error ? 'border-red-500' : 'border-gray-300'
                }`}
            >
                <span className={`text-sm sm:text-base truncate block ${selectedCount === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                    {displayText}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            
            {error && (
                 <p className="text-red-500 text-xs mt-0.5 sm:mt-1">{error}</p>
            )}

            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {groups.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">{t('groups.noGroupsAvailable')}</div>
                    ) : (
                        groups.map(group => {
                            const isRoot = group.isRoot === true;
                            const isSelected = selectedIds.includes(group.id);
                            const isDisabled = isRoot;
                            
                            return (
                                <div 
                                    key={group.id}
                                    onClick={() => !isDisabled && toggleSelection(group.id)}
                                    className={`flex items-center px-3 py-2 transition-colors border-b border-gray-50 last:border-0 ${
                                        isDisabled 
                                            ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                                            : 'cursor-pointer hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`w-5 h-5 border rounded flex items-center justify-center mr-3 flex-shrink-0 ${
                                        isSelected && !isDisabled
                                            ? 'bg-blue-600 border-blue-600' 
                                            : isDisabled
                                            ? 'border-gray-300 bg-gray-200'
                                            : 'border-gray-300'
                                    }`}>
                                        {isSelected && !isDisabled && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-medium ${
                                            isRoot ? 'text-gray-600' : 'text-gray-900'
                                        }`}>
                                            {group.name}
                                            {isRoot && (
                                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                                    ({t('groups.rootGroup', 'Main Group')})
                                                </span>
                                            )}
                                        </div>
                                        {group.parentName && (
                                            <div className="text-xs text-gray-500">
                                                {t('groups.underGroup', 'Under')}: {group.parentName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};








