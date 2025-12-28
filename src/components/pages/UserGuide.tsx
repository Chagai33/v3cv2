import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../layout/InfoPageLayout';
import { 
  Menu,
  X,
  ChevronRight,
  Download,
  Calendar,
  Users,
  Gift,
  Calculator,
  MessageCircle,
  Settings,
  Sparkles,
  Zap,
  Star,
  Shield,
  AlertTriangle,
  Clock,
  Globe,
  Link2,
  FileText,
  Mail
} from 'lucide-react';

interface Section {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  color: string;
}

const sections: Section[] = [
  { id: 'intro', icon: <Sparkles className="w-4 h-4" />, titleKey: 'guide.nav.intro', color: 'bg-purple-500' },
  { id: 'import', icon: <Download className="w-4 h-4" />, titleKey: 'guide.nav.import', color: 'bg-blue-500' },
  { id: 'manage', icon: <Calendar className="w-4 h-4" />, titleKey: 'guide.nav.manage', color: 'bg-indigo-500' },
  { id: 'groups', icon: <Users className="w-4 h-4" />, titleKey: 'guide.nav.groups', color: 'bg-cyan-500' },
  { id: 'sync', icon: <Calendar className="w-4 h-4" />, titleKey: 'guide.nav.sync', color: 'bg-green-500' },
  { id: 'wishlist', icon: <Gift className="w-4 h-4" />, titleKey: 'guide.nav.wishlist', color: 'bg-pink-500' },
  { id: 'whatsapp', icon: <MessageCircle className="w-4 h-4" />, titleKey: 'guide.nav.whatsapp', color: 'bg-emerald-500' },
  { id: 'gelt', icon: <Calculator className="w-4 h-4" />, titleKey: 'guide.nav.gelt', color: 'bg-orange-500' },
  { id: 'features', icon: <Sparkles className="w-4 h-4" />, titleKey: 'guide.nav.features', color: 'bg-teal-500' },
  { id: 'settings', icon: <Settings className="w-4 h-4" />, titleKey: 'guide.nav.settings', color: 'bg-gray-500' },
];

export const UserGuide: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const [activeSection, setActiveSection] = useState('intro');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id));
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i];
        if (element && element.offsetTop <= window.scrollY + 150) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 100, behavior: 'smooth' });
      setIsSidebarOpen(false);
    }
  };


  return (
    <InfoPageLayout>
      <div className="max-w-7xl mx-auto flex gap-8">
        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed lg:sticky top-20 ${isHebrew ? 'right-0' : 'left-0'}
            h-[calc(100vh-80px)] w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4
            transition-transform duration-300 z-20 overflow-y-auto
            ${isSidebarOpen ? 'translate-x-0' : isHebrew ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="space-y-1">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive ? `${section.color} text-white shadow-md` : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  {section.icon}
                  <span className="flex-1 text-start">{t(section.titleKey)}</span>
                  {isActive && <ChevronRight className={`w-4 h-4 ${isHebrew ? 'rotate-180' : ''}`} />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile Menu Button - Sticky */}
          <div className="lg:hidden sticky top-16 z-20 mb-2 sm:mb-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8">
            <div className="prose prose-sm max-w-none" dir={isHebrew ? 'rtl' : 'ltr'}>
              
              {/* INTRO */}
              <section id="intro" className="mb-8 sm:mb-12 scroll-mt-20">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                    {t('guide.intro.title', 'על המערכת')}
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    {t('guide.intro.desc', 'HebBirthday נועדה לגשר על הפער בין הלוח העברי לטכנולוגיה של ימינו. במקום לחשב ידנית מתי יוצא יום ההולדת העברי בכל שנה, המערכת עושה זאת אוטומטית.')}
                  </p>
                  
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900">{t('guide.intro.mainFeatures', 'פיצ\'רים מרכזיים:')}</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{t('guide.intro.feature1Title', 'סנכרון חכם:')}</p>
                          <p className="text-sm text-gray-600">{t('guide.intro.feature1Desc', 'חישוב תאריכים עבריים ל-10 שנים קדימה וסנכרון ליומן Google נפרד.')}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{t('guide.intro.feature2Title', 'סיכום שבועי:')}</p>
                          <p className="text-sm text-gray-600">{t('guide.intro.feature2Desc', 'יצוא רשימת חוגגים מהירה להדבקה בוואטסאפ.')}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Gift className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{t('guide.intro.feature3Title', 'ניהול מתנות:')}</p>
                          <p className="text-sm text-gray-600">{t('guide.intro.feature3Desc', 'רשימות משאלות אישיות לכל חוגג.')}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calculator className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{t('guide.intro.feature4Title', 'מחשבונים:')}</p>
                          <p className="text-sm text-gray-600">{t('guide.intro.feature4Desc', 'חישוב אוטומטי של דמי חנוכה ופורים לפי גילאים.')}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Link2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{t('guide.intro.feature5Title', 'איסוף מידע:')}</p>
                          <p className="text-sm text-gray-600">{t('guide.intro.feature5Desc', 'לינק שיתוף שמאפשר לבני משפחה להוסיף את עצמם למערכת.')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* IMPORT */}
              <section id="import" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-blue-200">
                  <Download className="w-6 h-6 text-blue-600" />
                  {t('guide.section1.title', 'איסוף המידע - 3 דרכים קלות')}
                </h2>

                {/* Smart Link */}
                <div className="mb-6">
                  <div className="p-5 rounded-xl bg-blue-50 border border-blue-200">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-blue-600" />
                      {t('guide.section1.link.title', '1. הלינק החכם (Smart Share Link)')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {t('guide.section1.link.recommended', 'הדרך המומלצת לאיסוף מהמשפחה!')}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      {t('guide.section1.link.desc', 'במקום לרדוף אחרי כל אחד בנפרד, שולחים לינק אחד בוואטסאפ הקבוצתי. כל אחד מקליד את הפרטים שלו בעצמו.')}
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">{t('guide.section1.link.howItWorks', 'איך זה עובד?')}</h4>
                      <ol className="space-y-1 text-sm text-gray-700">
                        <li>1. {t('guide.section1.link.step1', 'יצירת הלינק: בדשבורד, ליד כל קבוצה יש כפתור שיתוף 📤')}</li>
                        <li>2. {t('guide.section1.link.step2', 'שליחה: שליחת הלינק לקבוצת הוואטסאפ המשפחתית')}</li>
                        <li>3. {t('guide.section1.link.step3', 'הוספה: בני המשפחה לוחצים, מקלידים שם ותאריך, ולוחצים "שלח"')}</li>
                        <li>4. {t('guide.section1.link.step4', 'אישור: מקבלים התראה על כל הוספה חדשה')}</li>
                      </ol>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <h4 className="font-bold text-amber-900 mb-1">{t('guide.section1.linkLimits', 'מגבלות')}</h4>
                          <ul className="text-amber-800 space-y-0.5">
                            <li>⏰ {t('guide.section1.limit1', 'תקף ל-72 שעות בלבד')}</li>
                            <li>📊 {t('guide.section1.limit2', 'מקסימום 50 הוספות לכל לינק')}</li>
                            <li>🔄 {t('guide.section1.limit3', 'ניתן לאפס ולהפיק לינק חדש')}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paste & Import */}
                <div className="mb-6">
                  <div className="p-5 rounded-xl bg-purple-50 border border-purple-200">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      {t('guide.section1.paste.title', '2. הדבק וייבא (Paste & Import)')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      {t('guide.section1.paste.intro', 'יש לכם רשימה כתובה בפתקים או בוואטסאפ? המערכת מזהה את הנתונים אוטומטית!')}
                    </p>

                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">{t('guide.section1.paste.detects', 'מה המערכת מזהה:')}</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>✅ {t('guide.section1.paste.detect2', 'מגדר: זכר/נקבה או male/female')}</li>
                        <li>✅ {t('guide.section1.paste.detect3', 'אחרי שקיעה: "כן", "yes", "בלילה"')}</li>
                        <li>✅ {t('guide.section1.paste.detect4', 'הערות: כל טקסט בסוגריים')}</li>
                        <li>✅ {t('guide.section1.paste.detect5', 'הסרת תארים: הרב, ד"ר, מר, מרת')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* CSV Import */}
                <div className="mb-6">
                  <div className="p-5 rounded-xl bg-green-50 border border-green-200">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      {t('guide.section1.csv.title', '3. ייבוא מקובץ Excel/CSV')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {t('guide.section1.csv.desc', 'יש לכם טבלה מוכנה? ייבאו אותה בקליק.')}
                    </p>
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">{t('guide.section1.csv.columns', 'עמודות נתמכות:')}</h4>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>✅ {t('guide.section1.csv.col1', 'שם פרטי')}</li>
                        <li>✅ {t('guide.section1.csv.col2', 'שם משפחה')}</li>
                        <li>✅ {t('guide.section1.csv.col3', 'תאריך לידה')}</li>
                        <li>⚪ {t('guide.section1.csv.col4', 'מגדר')}</li>
                        <li>⚪ {t('guide.section1.csv.col5', 'אחרי שקיעה')}</li>
                        <li>⚪ {t('guide.section1.csv.col6', 'הערות')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* MANAGE */}
              <section id="manage" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-indigo-200">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                  {t('guide.section2.title', 'ניהול ימי הולדת')}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('guide.section2.intro', 'לחיצה על כפתור ה-+ פותחת טופס הוספה. המערכת מחשבת אוטומטית את התאריך העברי ואת הגיל.')}
                </p>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">
                        {t('guide.section2.sunset.title', '"אחרי השקיעה" - למה זה חשוב?')}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {t('guide.section2.sunset.desc', 'היום העברי מתחיל בשקיעה! מי שנולד ב-15 במרץ בשעה 21:00 — בלוח העברי זה כבר ה-16. אם התאריך העברי לא מדויק, עברו לעריכה ושנו את ההגדרה.')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('guide.section2.statusLegend', 'מקרא סטטוסים:')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">{t('guide.section2.status.synced', 'מסונכרן ליומן')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-700">{t('guide.section2.status.pending', 'יש שינויים לסנכרון')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700">{t('guide.section2.status.error', 'שגיאה בסנכרון')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <span className="text-gray-700">{t('guide.section2.status.notSynced', 'לא מסונכרן')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 {t('guide.section2.tip', 'טיפ: סמנו כמה רשומות יחד כדי לסנכרן, לייצא, או לשייך לקבוצות בבת אחת!')}
                  </p>
                </div>
              </section>

              {/* GROUPS */}
              <section id="groups" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-cyan-200">
                  <Users className="w-6 h-6 text-cyan-600" />
                  {t('guide.section4.title', 'קבוצות וארגון')}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('guide.section4.intro', 'המערכת תומכת ב-4 קטגוריות ראשיות + תתי-קבוצות בהיררכיה.')}
                </p>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-2">{t('guide.section4.structure', 'מבנה לדוגמה:')}</h3>
                  <div className="font-mono text-sm space-y-1 text-gray-700 bg-white rounded p-3">
                    <div>📁 {t('guide.section4.family', 'משפחה')}</div>
                    <div className="ms-4">├── {t('guide.section4.sub1', 'יחיאל (תת-קבוצה)')}</div>
                    <div className="ms-4">├── {t('guide.section4.sub2', 'כהן (תת-קבוצה)')}</div>
                    <div className="ms-4">└── {t('guide.section4.sub3', 'לוי (תת-קבוצה)')}</div>
                    <div className="mt-1">📁 {t('guide.section4.friends', 'חברים')}</div>
                    <div className="ms-4">├── {t('guide.section4.friendsSub', 'חברי עבודה')}</div>
                    <div>📁 {t('guide.section4.work', 'עבודה')}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('guide.section4.groupSettings', 'הגדרות לכל קבוצה:')}</h3>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    <li>🎨 {t('guide.section4.setting1', 'צבע - לזיהוי קל ברשימה')}</li>
                    <li>📅 {t('guide.section4.setting2', 'העדפת לוח שנה - עברי/לועזי/שניהם')}</li>
                    <li>🌐 {t('guide.section4.setting3', 'גישת אורחים - האם לאפשר הוספה דרך הלינק')}</li>
                    <li>🎁 {t('guide.section4.setting4', 'פורטל משאלות - האם לאפשר עריכת משאלות')}</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    💡 {t('guide.section4.tip', 'טיפ: רשומה יכולה להיות בכמה קבוצות במקביל!')}
                  </p>
                </div>
              </section>

              {/* SYNC */}
              <section id="sync" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-green-200">
                  <Calendar className="w-6 h-6 text-green-600" />
                  {t('guide.section3.title', 'סנכרון ליומן Google')}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('guide.section3.intro', 'המערכת יוצרת אירועים ביומן Google ל-10 השנים הקרובות באופן אוטומטי.')}
                </p>

                <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">
                        {t('guide.section3.dedicated.title', 'יומן ייעודי ונפרד')}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        {t('guide.section3.dedicated.desc', 'חשוב: המערכת לא מתערבבת עם הפגישות האישיות שלכם! היא יוצרת יומן נפרד וייעודי (למשל "ימי הולדת עבריים").')}
                      </p>
                      <div className="text-sm text-gray-700">
                        <strong>{t('guide.section3.dedicated.why', 'למה?')}</strong>
                        <ul className="mt-1 space-y-0.5">
                          <li>📂 {t('guide.section3.dedicated.reason1', 'שמירה על סדר')}</li>
                          <li>🔒 {t('guide.section3.dedicated.reason2', 'אבטחת מידע')}</li>
                          <li>🎚️ {t('guide.section3.dedicated.reason3', 'אפשרות להציג/להסתיר בקליק אחד')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('guide.section3.eventFormat', 'מבנה האירוע ביומן:')}</h3>
                  <div className={`bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 space-y-1 ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
                    <div className="text-blue-600 font-bold">📅 גילה | 40 | יום הולדת עברי</div>
                    <div className="text-gray-500">🗓️ 15 במרץ 2026</div>
                    <div className="text-gray-600">📝 {t('guide.section3.eventDesc', 'תיאור:')}</div>
                    <div className={`${isHebrew ? 'mr-4' : 'ms-4'} text-gray-600`}>{t('guide.section3.eventBirth', 'תאריך לידה: י"ח באדר תשמ"ו')}</div>
                    <div className={`${isHebrew ? 'mr-4' : 'ms-4'} text-gray-600`}>{t('guide.section3.eventAge', 'גיל: 40')}</div>
                    <div className={`${isHebrew ? 'mr-4' : 'ms-4'} text-gray-600`}>{t('guide.section3.eventWishlist', 'רשימת משאלות:')}</div>
                    <div className={`${isHebrew ? 'mr-8' : 'ms-8'} text-gray-500`}>• {t('guide.section3.eventItem1', 'שמלה חדשה')}</div>
                    <div className={`${isHebrew ? 'mr-8' : 'ms-8'} text-gray-500`}>• {t('guide.section3.eventItem2', 'ספר בישול')}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('guide.section3.tools', 'כלי ניהול מתקדמים:')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-green-50 rounded border border-green-200 text-green-900">➕ {t('guide.section3.tool1', 'יצירת יומן חדש')}</div>
                    <div className="p-2 bg-blue-50 rounded border border-blue-200 text-blue-900">📜 {t('guide.section3.tool2', 'היסטוריית סנכרונים')}</div>
                    <div className="p-2 bg-red-50 rounded border border-red-200 text-red-900">🗑️ {t('guide.section3.tool3', 'מחיקת יומן')}</div>
                    <div className="p-2 bg-gray-100 rounded border text-gray-700">🔌 {t('guide.section3.tool4', 'ניתוק מהיומן')}</div>
                  </div>
                </div>
              </section>

              {/* WISHLIST */}
              <section id="wishlist" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-pink-200">
                  <Gift className="w-6 h-6 text-pink-600" />
                  {t('guide.section5.title', 'רשימת משאלות ופורטל מתנות')}
                </h2>

                <div className="mb-6">
                  <div className="p-5 rounded-xl bg-pink-50 border border-pink-200">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-pink-600" />
                      {t('guide.section5.wishlist.title', 'רשימת משאלות')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {t('guide.section5.wishlist.desc', 'לכל רשומה אפשר להצמיד רעיונות למתנות עם עדיפויות. המשאלות מופיעות גם בתיאור האירוע ביומן Google!')}
                    </p>
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">{t('guide.section5.wishlist.structure', 'מבנה פריט:')}</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>📝 {t('guide.section5.wishlist.field1', 'שם הפריט (למשל: "משחק לגו")')}</li>
                        <li>📄 {t('guide.section5.wishlist.field2', 'תיאור (פרטים נוספים - אופציונלי)')}</li>
                        <li>⭐ {t('guide.section5.wishlist.field3', 'עדיפות: גבוהה / בינונית / נמוכה')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="p-5 rounded-xl bg-purple-50 border border-purple-200">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-600" />
                      {t('guide.section5.portal.title', 'פורטל מתנות לאורחים')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {t('guide.section5.portal.intro', 'רוצים שבני המשפחה יעדכנו את המשאלות שלהם בעצמם?')}
                    </p>
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="font-mono text-center text-sm text-purple-700 bg-purple-100 rounded px-3 py-2">
                        hebbirthday.app/portal
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">{t('guide.section5.portal.howItWorks', 'איך זה עובד?')}</h4>
                      <ol className="space-y-1 text-sm text-gray-700">
                        <li>1. {t('guide.section5.portal.step1', 'כניסה: האורח מקליד שם + תאריך לידה')}</li>
                        <li>2. {t('guide.section5.portal.step2', 'אימות: המערכת מוודאת שהפרטים תואמים')}</li>
                        <li>3. {t('guide.section5.portal.step3', 'עריכה: האורח יכול להוסיף/לערוך/למחוק פריטים')}</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ⚙️ {t('guide.section5.control', 'שליטה מלאה: אפשר להפעיל/לכבות את הפורטל גלובלית או לכל קבוצה בנפרד.')}
                  </p>
                </div>
              </section>

              {/* SYNC - continued with detailed content */}
              <section id="whatsapp" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-emerald-200">
                  <MessageCircle className="w-6 h-6 text-emerald-600" />
                  {t('guide.section7.title', 'כפתור הוואטסאפ החכם')}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('guide.section7.intro', 'הכפתור הירוק מייצר רשימה מסודרת של כל החוגגים — מותאם להדבקה בתיאור קבוצת הוואטסאפ המשפחתית.')}
                </p>

                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('guide.section7.options', 'אפשרויות העתקה:')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2 bg-purple-50 rounded border border-purple-200 text-sm text-purple-900">
                      📅 {t('guide.section7.option1', 'תאריכים עבריים')}
                    </div>
                    <div className="p-2 bg-blue-50 rounded border border-blue-200 text-sm text-blue-900">
                      📆 {t('guide.section7.option2', 'תאריכים לועזיים')}
                    </div>
                    <div className="p-2 bg-indigo-50 rounded border border-indigo-200 text-sm text-indigo-900">
                      📅📆 {t('guide.section7.option3', 'שניהם יחד')}
                    </div>
                    <div className="p-2 bg-gray-100 rounded border text-sm text-gray-700">
                      ☑️ {t('guide.section7.option4', 'כולל יום בשבוע')}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-2">{t('guide.section7.example', 'דוגמת פלט:')}</h3>
                  <div className="bg-white rounded-lg p-3 text-sm font-mono text-gray-700" dir="rtl">
                    🎂 ימי הולדת קרובים - מרץ 2026<br/><br/>
                    • משה כהן - י״ח באדר (15/03) - יום שני<br/>
                    • שרה לוי - כ״ב באדר (19/03) - יום שישי<br/>
                    • דוד ישראלי - כ״ה באדר (22/03) - יום שני
                  </div>
                </div>
              </section>

              {/* GELT */}
              <section id="gelt" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-orange-200">
                  <Calculator className="w-6 h-6 text-orange-600" />
                  {t('guide.section6.title', 'מחשבון דמי חנוכה/פורים')}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('guide.section6.intro', 'פיצ\'ר ייחודי! מחשבון חכם לחישוב תקציב דמי חנוכה או פורים לילדים.')}
                </p>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-3">{t('guide.section6.flow', 'איך זה עובד?')}</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>{t('guide.section6.step1', 'ייבוא ילדים מרשימת ימי ההולדת (עם פילטרים!)')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>{t('guide.section6.step2', 'הגדרת קבוצות גיל וסכום לכל קבוצה')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>{t('guide.section6.step3', 'הגדרת תקציב (משתתפים או סכום קבוע)')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <span>{t('guide.section6.step4', 'חישוב אוטומטי והצגת תוצאות')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                      <span>{t('guide.section6.step5', 'שמירת פרופיל לשנה הבאה')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-1">{t('guide.section6.profiles.title', 'פרופילי תקציב')}</h3>
                      <p className="text-sm text-blue-800 mb-2">
                        {t('guide.section6.profiles.desc', 'שמרו את ההגדרות לשנה הבאה! עד 10 פרופילים, ואחד מהם כברירת מחדל שנטען אוטומטית.')}
                      </p>
                      <p className="text-xs text-blue-700">
                        ⚠️ {t('guide.section6.profiles.note', 'חשוב: רשימת הילדים לא נשמרת בפרופיל - רק ההגדרות נשמרות')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* FEATURES */}
              <section id="features" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-teal-200">
                  <Sparkles className="w-6 h-6 text-teal-600" />
                  {t('guide.section8.title', 'פיצ\'רים נוספים')}
                </h2>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-600" />
                      {t('guide.section8.zodiac.title', '🌟 סטטיסטיקת מזלות')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {t('guide.section8.zodiac.desc', 'המערכת מחשבת מזל לועזי ועברי לכל רשומה, עם התראה על פערים כשהמזלות שונים.')}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      {t('guide.section8.languages.title', '🌍 תמיכה בשפות')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {t('guide.section8.languages.desc', 'עברית ואנגלית מלאה כולל כיוון RTL/LTR. מתאים למשפחות בחו"ל!')}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      {t('guide.section8.guestAlerts.title', '🔔 התראות אורחים')}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {t('guide.section8.guestAlerts.desc', 'צפייה בימי הולדת שנוספו על ידי אורחים דרך הלינק החכם, עם אפשרות לבטל הוספה.')}
                    </p>
                  </div>
                </div>
              </section>

              {/* SETTINGS */}
              <section id="settings" className="mb-12 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3 pb-3 border-b-2 border-gray-200">
                  <Settings className="w-6 h-6 text-gray-600" />
                  {t('guide.section9.title', 'הגדרות ופרטיות')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-gray-50 rounded-xl border">
                    <h3 className="font-bold text-gray-900 mb-2 text-sm">⚙️ {t('guide.section9.settings', 'הגדרות כלליות')}</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>📅 {t('guide.section9.setting1', 'העדפת לוח שנה ברירת מחדל')}</li>
                      <li>🌐 {t('guide.section9.setting2', 'פורטל אורחים (הפעלה/כיבוי)')}</li>
                      <li>🌍 {t('guide.section9.setting3', 'שפת ממשק')}</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border">
                    <h3 className="font-bold text-gray-900 mb-2 text-sm">🔒 {t('guide.section9.security', 'אבטחה')}</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>🔐 {t('guide.section9.sec1', 'אימות Google / Email')}</li>
                      <li>🏢 {t('guide.section9.sec2', 'נתונים מבודדים (Multi-tenant)')}</li>
                      <li>📋 {t('guide.section9.sec3', 'תנאי שימוש ופרטיות')}</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-red-900 mb-1">{t('guide.section9.danger', 'אזור סכנה')}</h3>
                      <p className="text-sm text-red-800">
                        {t('guide.section9.dangerDesc', 'מחיקת חשבון — מוחק לצמיתות את כל הנתונים. פעולה זו אינה הפיכה.')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="mt-16 pt-6 border-t border-gray-200 text-center">
                <p className="text-gray-600 mb-2">
                  {t('guide.footer.text', 'נבנה עם ❤️ בישראל 🇮🇱')}
                </p>
                <p className="text-sm text-gray-500">
                  © 2024-2025 HebBirthday | {t('guide.footer.rights', 'כל הזכויות שמורות')}
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </InfoPageLayout>
  );
};
