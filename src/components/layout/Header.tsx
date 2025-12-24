import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useGroupFilter } from '../../contexts/GroupFilterContext';
import { useGroups } from '../../hooks/useGroups';
import { useBirthdays } from '../../hooks/useBirthdays';
import { LogOut, FolderTree, Filter, Settings, ChevronDown, ChevronUp, Menu, Calculator, Bell } from 'lucide-react';
import { useTranslatedRootGroupName } from '../../utils/groupNameTranslator';
import { TenantSettings } from '../settings/TenantSettings';
import { GuestActivityModal } from '../modals/GuestActivityModal';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { CurrentDateDisplay } from '../common/CurrentDateDisplay';

export const Header: React.FC = () => {
  const { openAboutModal } = useLayoutContext();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuestActivity, setShowGuestActivity] = useState(false);
  const { selectedGroupIds, toggleGroupFilter, clearGroupFilters } = useGroupFilter();
  const { data: allGroups = [] } = useGroups();
  const { data: birthdays = [] } = useBirthdays();
  const filterRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowGroupFilter(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    if (showGroupFilter || mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGroupFilter, mobileMenuOpen]);
  
  // Check if we're on a public page (terms, privacy) without user
  const isPublicPage = !user && (location.pathname === '/terms' || location.pathname === '/privacy');

  const countsByGroup = useMemo(() => {
    if (isPublicPage) return new Map<string, number>();
    const map = new Map<string, number>();
    birthdays.forEach((birthday) => {
      const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
      groupIds.forEach((groupId) => {
        map.set(groupId, (map.get(groupId) ?? 0) + 1);
      });
    });
    return map;
  }, [birthdays, isPublicPage]);

  // Count guest-added birthdays for notification badge
  const guestBirthdaysCount = useMemo(() => {
    return birthdays.filter(b => b.created_by_guest === true).length;
  }, [birthdays]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // If public page, show minimal header
  if (isPublicPage) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/login')}
                className="flex flex-col items-start transition-opacity hover:opacity-80 -ms-1 pe-6"
              >
                <div className="text-xl sm:text-2xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
                  <span className="text-[#8e24aa]">Heb</span>
                  <span className="text-[#304FFE]">Birthday</span>
                  <span className="text-gray-400 text-sm sm:text-base ml-[1px]">.app</span>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium -mt-0.5">
                  {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 ms-auto">
                <a
                  href="https://www.linkedin.com/in/chagai-yechiel/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-start text-[10px] leading-tight text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                >
                  <span>{t('common.developedBy')}</span>
                <span>{i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}</span>
              </a>
                <button
                  onClick={openAboutModal}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-4">
          {/* שמאל - כותרת ומידע */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-start transition-opacity hover:opacity-80 -ms-1 pe-6"
            >
              <div className="text-xl sm:text-2xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
                <span className="text-[#8e24aa]">Heb</span>
                <span className="text-[#304FFE]">Birthday</span>
                <span className="text-gray-400 text-sm sm:text-base ml-[1px]">.app</span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 font-medium -mt-0.5">
                {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
              </span>
            </button>
          </div>

          <div className="flex-1 flex justify-center min-w-0 mt-2">
            <CurrentDateDisplay />
          </div>

            <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 ms-auto">
              <a
                href="https://www.linkedin.com/in/chagai-yechiel/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-start text-[10px] leading-tight text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
              >
                <span>{t('common.developedBy')}</span>
                <span>{i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}</span>
                </a>
                <button
                  onClick={openAboutModal}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* תפריט ביניים (Tablet/Small Laptop) */}
            <div className="hidden sm:flex md:hidden relative" ref={mobileMenuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <span className="text-sm font-medium text-gray-700">
                  {t('common.menu')}
                </span>
                {mobileMenuOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Dropdown Menu */}
              {mobileMenuOpen && (
                <div className="absolute top-full mt-2 end-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 w-64">
                  {user && (
                    <div className="px-4 py-2 border-b border-gray-200 mb-2">
                      <span className="text-sm font-semibold text-gray-700 block truncate">
                        {user.display_name || user.email}
                      </span>
                    </div>
                  )}

                  <div className="px-2 flex flex-col gap-1">
                    {user && location.pathname === '/' && (
                      <div className="relative">
                        <button
                          onClick={() => setShowGroupFilter(!showGroupFilter)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm ${
                            selectedGroupIds.length > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            <span>{t('groups.filterByGroup')}</span>
                          </div>
                          {selectedGroupIds.length > 0 ? (
                            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                              {selectedGroupIds.length}
                            </span>
                          ) : (
                            <ChevronDown className={`w-3 h-3 transition-transform ${showGroupFilter ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                        
                        {showGroupFilter && (
                          <div className="mt-1 pl-4 border-l-2 border-gray-100 ml-2">
                            <GroupFilterDropdown
                              allGroups={allGroups}
                              selectedGroupIds={selectedGroupIds}
                              toggleGroupFilter={toggleGroupFilter}
                              clearGroupFilters={clearGroupFilters}
                              countsByGroup={countsByGroup}
                              onClose={() => setShowGroupFilter(false)}
                              isMobile={true}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {user && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (location.pathname === '/groups') {
                            navigate('/');
                          } else {
                            navigate('/groups');
                          }
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                          location.pathname === '/groups'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FolderTree className="w-4 h-4" />
                        <span>{t('groups.manageGroups')}</span>
                      </button>
                    )}

                    {user && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (location.pathname === '/gelt') {
                            navigate('/');
                          } else {
                            navigate('/gelt');
                          }
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                          location.pathname === '/gelt'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Calculator className="w-4 h-4" />
                        <span>{t('gelt.title')}</span>
                      </button>
                    )}

                    {user && (
                      <>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                          onClick={() => {
                            setShowGuestActivity(true);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm text-gray-700 hover:bg-gray-50 relative"
                        >
                          <Bell className="w-4 h-4" />
                          <span>{t('dashboard.guestNotifications', 'התראות אורחים')}</span>
                          {guestBirthdaysCount > 0 && (
                            <span className="mr-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                              {guestBirthdaysCount}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowSettings(true);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Settings className="w-4 h-4" />
                          <span>{t('tenant.settings')}</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('auth.signOut')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowGroupFilter(!showGroupFilter)}
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

            {user && (
              <>
                <button
                  onClick={() => {
                    if (location.pathname === '/gelt') {
                      navigate('/');
                    } else {
                      navigate('/gelt');
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                    location.pathname === '/gelt'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>{t('gelt.title')}</span>
                </button>
                <div className="h-6 w-px bg-gray-300" />
              </>
            )}

            {user && (
              <>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('tenant.settings')}
                >
                  <Settings className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-gray-300" />
                <button
                  onClick={() => setShowGuestActivity(true)}
                  className="hidden md:flex relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('dashboard.guestNotifications', 'התראות אורחים')}
                >
                  <Bell className="w-5 h-5" />
                  {guestBirthdaysCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
                <div className="hidden md:block h-6 w-px bg-gray-300" />
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
    </div>
    {showSettings && <TenantSettings onClose={() => setShowSettings(false)} />}
    {showGuestActivity && (
      <GuestActivityModal
        isOpen={showGuestActivity}
        onClose={() => setShowGuestActivity(false)}
        birthdays={birthdays}
      />
    )}
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
  isMobile?: boolean;
}

const GroupFilterDropdown: React.FC<GroupFilterDropdownProps> = ({
  allGroups,
  selectedGroupIds,
  toggleGroupFilter,
  clearGroupFilters,
  countsByGroup,
  onClose,
  isMobile = false,
}) => {
  const { t } = useTranslation();
  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);
  
  const RootGroupLabel: React.FC<{ root: any }> = ({ root }) => {
    const translatedName = useTranslatedRootGroupName(root);
    return <span className="text-xs font-semibold text-gray-500 uppercase">{translatedName}</span>;
  };

  const containerClasses = isMobile
    ? "relative w-full bg-gray-50 rounded-lg mt-1"
    : "absolute top-full mt-2 start-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[280px] max-h-[400px] overflow-y-auto";

  return (
    <div className={containerClasses}>
      {!isMobile && (
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
      )}

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
