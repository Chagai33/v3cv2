import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useGroupFilter } from '../../contexts/GroupFilterContext';
import { useGroups } from '../../hooks/useGroups';
import { useBirthdays } from '../../hooks/useBirthdays';
import { LogOut, Globe, Menu, X, FolderTree, Filter } from 'lucide-react';
import { useTranslatedRootGroupName } from '../../utils/groupNameTranslator';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const { selectedGroupIds, toggleGroupFilter, clearGroupFilters } = useGroupFilter();
  const { data: allGroups = [] } = useGroups();
  const { data: birthdays = [] } = useBirthdays();

  // Check if we're on a public page (terms, privacy) without user
  const isPublicPage = !user && (location.pathname === '/terms' || location.pathname === '/privacy');

  const countsByGroup = useMemo(() => {
    if (isPublicPage) return new Map<string, number>();
    const map = new Map<string, number>();
    birthdays.forEach((birthday) => {
      if (!birthday.group_id) return;
      map.set(birthday.group_id, (map.get(birthday.group_id) ?? 0) + 1);
    });
    return map;
  }, [birthdays, isPublicPage]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  // If public page, show minimal header
  if (isPublicPage) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/login')}
                className="text-base sm:text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {t('birthday.birthdays')}
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <a
                  href="https://www.linkedin.com/in/chagai-yechiel/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t('common.developedBy')} {i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}
                </a>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {t('common.version')} 1.0
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={i18n.language === 'he' ? t('common.switchToEnglish') : t('common.switchToHebrew')}
              >
                <Globe className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-4">
          {/* שמאל - כותרת ומידע */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="text-lg sm:text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors truncate"
            >
              {t('birthday.birthdays')}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <a
                href="https://www.linkedin.com/in/chagai-yechiel/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 transition-colors"
              >
                {t('common.developedBy')} {i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}
              </a>
              <span className="text-gray-400">•</span>
              <span>
                {t('common.version')} 1.0
              </span>
            </div>
          </div>

          {/* ימין - כפתורים עם separators */}
          <div className="hidden md:flex items-center gap-2">
            {user && (
              <>
                <span className="text-sm text-gray-600 px-2">
                  {user.display_name || user.email}
                </span>
                <div className="h-6 w-px bg-gray-300" />
              </>
            )}

            {user && location.pathname === '/' && (
              <>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (selectedGroupIds.length > 0) {
                        clearGroupFilters();
                        setShowGroupFilter(false);
                      } else {
                        setShowGroupFilter(!showGroupFilter);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                      selectedGroupIds.length > 0
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>{t('groups.filterByGroup')}</span>
                    {selectedGroupIds.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
                        {selectedGroupIds.length}
                      </span>
                    )}
                  </button>

                  {showGroupFilter && (
                    <GroupFilterDropdown
                      allGroups={allGroups}
                      selectedGroupIds={selectedGroupIds}
                      toggleGroupFilter={toggleGroupFilter}
                      clearGroupFilters={clearGroupFilters}
                      countsByGroup={countsByGroup}
                      onClose={() => setShowGroupFilter(false)}
                    />
                  )}
                </div>
                <div className="h-6 w-px bg-gray-300" />
              </>
            )}

            {user && (
              <>
                <button
                  onClick={() => {
                    if (location.pathname === '/groups') {
                      navigate('/');
                    } else {
                      navigate('/groups');
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                    location.pathname === '/groups'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  <span>{t('groups.manageGroups')}</span>
                </button>
                <div className="h-6 w-px bg-gray-300" />
              </>
            )}

            <button
              onClick={toggleLanguage}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={i18n.language === 'he' ? t('common.switchToEnglish') : t('common.switchToHebrew')}
            >
              <Globe className="w-5 h-5" />
            </button>

            {user && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('auth.signOut')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

interface GroupFilterDropdownProps {
  allGroups: any[];
  selectedGroupIds: string[];
  toggleGroupFilter: (id: string) => void;
  clearGroupFilters: () => void;
  countsByGroup: Map<string, number>;
  onClose: () => void;
}

const GroupFilterDropdown: React.FC<GroupFilterDropdownProps> = ({
  allGroups,
  selectedGroupIds,
  toggleGroupFilter,
  clearGroupFilters,
  countsByGroup,
  onClose,
}) => {
  const { t } = useTranslation();
  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);
  
  const RootGroupLabel: React.FC<{ root: any }> = ({ root }) => {
    const translatedName = useTranslatedRootGroupName(root);
    return <span className="text-xs font-semibold text-gray-500 uppercase">{translatedName}</span>;
  };

  return (
    <div className="absolute top-full mt-2 start-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[280px] max-h-[400px] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          {t('groups.filterByGroup')}
        </span>
        {selectedGroupIds.length > 0 && (
          <button
            onClick={() => {
              clearGroupFilters();
              onClose();
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('common.clear', 'נקה הכל')}
          </button>
        )}
      </div>

      <div className="py-2">
        {rootGroups.map((root) => {
          const children = childGroups.filter(c => c.parent_id === root.id);
          if (children.length === 0) return null;

          return (
            <div key={root.id} className="mb-2">
              <div className="px-4 py-1 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: root.color }}
                />
                <RootGroupLabel root={root} />
              </div>
              {children.map((group) => {
                const count = countsByGroup.get(group.id) ?? 0;
                return (
                  <button
                    key={group.id}
                    onClick={() => toggleGroupFilter(group.id)}
                    className={`w-full px-6 py-2 text-start hover:bg-gray-50 flex items-center justify-between ${
                      selectedGroupIds.includes(group.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{group.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        ({count})
                      </span>
                    </div>
                    {selectedGroupIds.includes(group.id) && (
                      <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
