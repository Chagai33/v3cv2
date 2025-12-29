import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../layout/InfoPageLayout';

export const PrivacyPolicy: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  return (
    <InfoPageLayout>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          {t('privacy.title', 'מדיניות פרטיות לאפליקציית "hebbirthday"')}
        </h1>
        
        <p className="text-sm text-gray-600 mb-8">
          {t('privacy.lastUpdated', 'תאריך עדכון אחרון')}: 29 בדצמבר 2025
        </p>

        <div className="prose prose-sm max-w-none" dir={isHebrew ? 'rtl' : 'ltr'}>
          <p className="mb-4">
            {t('privacy.intro', 'אנו מכבדים את פרטיות המשתמשים שלנו ("אתה", "המשתמש") ומחויבים להגן עליה. מדיניות פרטיות זו מתארת איזה מידע אישי אנו אוספים, כיצד אנו משתמשים בו, עם מי אנו חולקים אותו, ומהן זכויותיך בנוגע למידע זה.')}
          </p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section1.title', '1. איזה מידע אנו אוספים?')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('privacy.section1.intro', 'אנו אוספים את סוגי המידע הבאים:')}
            </p>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900">{t('privacy.section1.subtitle1', 'מידע שאתה מספק (מידע אישי):')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>
                    <strong>{t('privacy.section1.item1.title', 'פרטי חשבון:')}</strong> {t('privacy.section1.item1.content', 'שם תצוגה, כתובת דוא"ל, מספר טלפון (אופציונלי), ותמונה (אופציונלי). אם נרשמת דרך שירות צד ג\' (כמו גוגל), אנו אוספים את המידע שמועבר אלינו מאותו שירות.')}
                  </li>
                  <li>
                    <strong>{t('privacy.section1.item2.title', 'סיסמה:')}</strong> {t('privacy.section1.item2.content', 'אם נרשמת באמצעות דוא"ל, סיסמתך נשמרת באופן מוצפן.')}
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section1.subtitle2', 'מידע שאתה מזין (תוכן משתמש):')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section1.item3', 'מידע אודות צדדים שלישיים (בעלי יום ההולדת): שם פרטי, שם משפחה, תאריך לידה לועזי, מין, וציון האם הלידה אירעה אחרי השקיעה.')}</li>
                  <li>{t('privacy.section1.item4', 'פרטי "קבוצות" (Groups) שאתה יוצר לניהול רשימות ימי הולדת.')}</li>
                  <li>{t('privacy.section1.item5', 'הערות או פריטי רשימת משאלות (Wishlist) שאתה מוסיף לרשומות.')}</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section1.subtitle3', 'מידע טכני (נאסף אוטומטית):')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section1.item6', 'מזהים טכניים (כגון כתובת IP) הנאספים על ידי שירותי התשתית שלנו (Firebase) לצורכי תפעול, אבטחה וניתוח שימוש.')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section2.title', '2. כיצד אנו משתמשים במידע?')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('privacy.section2.intro', 'השימוש במידע נועד אך ורק למטרות הבאות:')}
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>{t('privacy.section2.item1', 'כדי לאפשר את תפקודה התקין של האפליקציה, לספק לך את השירות ולאמת את זהותך.')}</li>
              <li>{t('privacy.section2.item2', 'כדי להציג את פרטי ימי ההולדת לך ולמי שתבחר לשתף איתו באמצעות לינק שיתוף.')}</li>
              <li>{t('privacy.section2.item3', 'כדי לבצע חישוב של תאריכים עבריים (כמפורט בסעיף 3).')}</li>
              <li>{t('privacy.section2.item4', 'כדי לאפשר לך לסנכרן אירועים ליומן הגוגל האישי שלך (כמפורט בסעיף 3).')}</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section3.title', '3. שיתוף מידע עם צדדים שלישיים')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('privacy.section3.intro', 'אנו לא מוכרים או משתפים את המידע האישי שלך, למעט במקרים החיוניים לתפעול השירות:')}
            </p>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle1', 'שיתוף קבוצות (לינק אורח):')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section3.content1', 'תוכן המשתמש שאתה מזין (כגון פרטי ימי הולדת) הוא פרטי כברירת מחדל. אם תבחר כמנהל קבוצה ליצור "לינק שיתוף", רק הרשומות בקבוצה הספציפית הזו יהיו גלויות למי שמחזיק בלינק. מחזיקי הלינק יכולים לצפות ברשומות ולהוסיף רשומות חדשות בהתאם להגדרות הקבוצה. מסיבות אבטחה, תוקף הלינק מוגבל ל-72 שעות, ולאחר מכן יש ליצור לינק חדש.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle2', 'Google Firebase:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section3.content2', 'האפליקציה בנויה על פלטפורמת Firebase של Google, המשמשת לאימות, אחסון נתונים (Firestore) והרצת קוד (Functions). המידע שלך נשמר בשרתים של גוגל וכפוף למדיניות הפרטיות שלהם.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle3', 'חישוב תאריכים עבריים:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section3.content3', 'חישוב התאריכים העבריים מתבצע באופן מקומי בדפדפן שלך באמצעות ספריית @hebcal/core. אין שליחת מידע לשרתים חיצוניים לצורך חישוב זה - כל העיבוד מתבצע במכשיר שלך.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle4', 'Google Calendar API (באישור המשתמש בלבד):')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section3.item1', 'אם תבחר לסנכרן את ימי ההולדת ליומן שלך, האפליקציה תבקש את הרשאתך לגישה ליומן הגוגל שלך (scope: calendar.events).')}</li>
                  <li>{t('privacy.section3.item2', 'לצורך אבטחת המשתמש והגנה על המידע שלך, האפליקציה כותבת ומוחקת אירועים אך ורק מיומנים ייעודיים שנוצרו על ידי האפליקציה עצמה. אין לאפליקציה גישה לקריאה, עריכה או מחיקה של יומנים או אירועים אחרים בחשבון הגוגל שלך.')}</li>
                  <li>{t('privacy.section3.item3', 'כדי לאפשר פעולות אלו, אנו שומרים \'טוקן גישה\' (accessToken) עבור חשבונך במסד הנתונים שלנו (googleCalendarTokens). טוקן זה נשמר באופן מאובטח ונגיש רק לך, ואינו משמש לשום מטרה אחרת.')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section4.title', '4. ניתוח שימוש ואנליטיקס')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('privacy.section4.intro', 'אנו משתמשים ב-Google Analytics 4 (GA4) לצורך ניתוח שימוש ושיפור השירות. מידע זה עוזר לנו להבין כיצד המשתמשים משתמשים באפליקציה ולשפר את החוויה.')}
            </p>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900">{t('privacy.section4.subtitle1', 'מידע הנאסף באופן אוטומטי:')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section4.item1', 'צפיות בדפים ומסלולי ניווט באפליקציה')}</li>
                  <li>{t('privacy.section4.item2', 'מידע טכני כללי (סוג דפדפן, מערכת הפעלה, גודל מסך)')}</li>
                  <li>{t('privacy.section4.item3', 'מיקום גיאוגרפי משוער (מדינה/עיר)')}</li>
                  <li>{t('privacy.section4.item4', 'מקור התנועה (מאיפה הגעת לאתר)')}</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section4.subtitle2', 'אירועי שימוש מובחנים:')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section4.item5', 'הרשמות חדשות (ללא פרטים מזהים)')}</li>
                  <li>{t('privacy.section4.item6', 'שימוש בתכונות כגון שיתוף לוואטסאפ, רשימת משאלות')}</li>
                  <li>{t('privacy.section4.item7', 'העדפות שפה וסוג קלט תאריך')}</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section4.subtitle3', 'ניטור אבטחה:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section4.security', 'לצורך מניעת שימוש לרעה, אנו עוקבים אחר פעולות בכמויות גדולות (כגון ייבוא או מחיקה של יותר מ-50 רשומות). מידע זה אינו כולל פרטים אישיים של אנשי הקשר.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section4.subtitle4', 'מה איננו שולחים ל-Google Analytics:')}</strong>
                <p className="text-gray-700 mt-1 mb-2">
                  {t('privacy.section4.notCollectedIntro', 'חשוב להבדיל: הנתונים הבאים נשמרים במסד הנתונים שלנו לצורך השירות, אך אינם נשלחים לגוגל אנליטיקס:')}
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section4.notCollected1', 'שמות של אנשי קשר או ימי הולדת')}</li>
                  <li>{t('privacy.section4.notCollected2', 'תאריכי לידה ספציפיים')}</li>
                  <li>{t('privacy.section4.notCollected3', 'תוכן הערות או רשימות משאלות')}</li>
                  <li>{t('privacy.section4.notCollected4', 'מידע מזהה אישי מפורש')}</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section4.subtitle5', 'ביטול מעקב:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section4.optout', 'ניתן לבטל את המעקב באמצעות הגדרות הפרטיות בדפדפן, התקנת תוסף Google Analytics Opt-out, או שימוש במצב גלישה פרטית.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section4.subtitle6', 'תקופת שמירה:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section4.retention', 'נתוני האנליטיקס נשמרים ב-Google Analytics למשך 14 חודשים (ברירת המחדל של GA4) ולאחר מכן נמחקים אוטומטית.')}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section5.title', '5. העברת נתונים בינלאומית')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section5.content', 'השימוש בשירותי Firebase ו-Google Analytics כרוך בכך שהמידע שלך עשוי להיות מאוחסן ומעובד בשרתים הממוקמים מחוץ לגבולות מדינת ישראל. אנו מסתמכים על כך שספקים אלו נוקטים באמצעי אבטחה העומדים בסטנדרטים בינלאומיים. יצוין כי חישוב התאריכים העבריים מתבצע מקומית בדפדפן ואינו כרוך בהעברת נתונים לשרתים חיצוניים.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section6.title', '6. שמירת מידע ומדיניות גיבויים')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section6.content', 'אנו שומרים מידע אישי רק למשך הזמן הנחוץ למטרות שלשמן הוא נאסף. מידע אישי של חשבונך ונתוני ימי ההולדת שהזנת נשמרים במערכת הפעילה כל עוד חשבונך פעיל והנתונים לא נמחקו על ידך. אנו עשויים לשמור גיבויים של בסיס הנתונים לתקופה מוגבלת לצורכי שחזור במקרה של כשל טכני (Disaster Recovery). מידע שנמחק מהמערכת הפעילה עשוי להישאר בגיבויים אלו עד למחיקתם הסופית.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.sectionSecurity.title', '7. אבטחת מידע וגישה טכנית')}
            </h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <div>
                <strong className="text-gray-900">{t('privacy.sectionSecurity.subtitle1', 'אחסון מידע:')}</strong>
                <p className="mt-1">
                  {t('privacy.sectionSecurity.content1', 'המידע שלך מאוחסן בשרתי Google Firebase. הסיסמאות מוצפנות, אך תוכן המשתמש (שמות, תאריכי לידה, הערות) נשמר ללא הצפנה ברמת האפליקציה. הצפנה ברמת התשתית מתבצעת על ידי Firebase.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.sectionSecurity.subtitle2', 'גישה טכנית:')}</strong>
                <p className="mt-1">
                  {t('privacy.sectionSecurity.content2', 'לשקיפות מלאה: למפתח האפליקציה יש גישה טכנית למסד הנתונים ב-Firebase, כפי שמקובל בכל שירות ענן. גישה זו משמשת אך ורק לצורכי תפעול, תחזוקה, תמיכה טכנית ושיפור השירות. אין שימוש במידע זה למטרות שיווק, מכירה לצדדים שלישיים, או כל מטרה אחרת שאינה קשורה לתפעול השירות.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.sectionSecurity.subtitle3', 'אמצעי אבטחה:')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('privacy.sectionSecurity.measure1', 'חיבור מאובטח (HTTPS) בכל הפעילות')}</li>
                  <li>{t('privacy.sectionSecurity.measure2', 'אימות דו-שלבי באמצעות Firebase Authentication')}</li>
                  <li>{t('privacy.sectionSecurity.measure3', 'כללי אבטחה (Security Rules) המגבילים גישה למידע רק למשתמש הרלוונטי')}</li>
                  <li>{t('privacy.sectionSecurity.measure4', 'עדכוני אבטחה שוטפים של תשתיות האפליקציה')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section7.title', '8. פרטיות ילדים')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section7.content', 'השירות אינו מיועד לשימוש על ידי ילדים מתחת לגיל 18. איננו אוספים ביודעין מידע אישי מילדים מתחת לגיל זה.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section8.title', '9. מסירת מידע, הסכמה וזכויות המשתמש')}
            </h2>
            <div className="text-gray-700 leading-relaxed space-y-4">
              <div>
                <strong className="text-gray-900">{t('privacy.section8.subtitle1', 'האם חובה למסור את המידע?')}</strong>
                <p className="mt-1">
                  {t('privacy.section8.content1', 'מסירת המידע האישי (כגון שם, כתובת דוא"ל, ותאריכי ימי הולדת) תלויה ברצונך ובהסכמתך המלאה. עם זאת, היות ומטרת האפליקציה היא ניהול ושמירת מידע זה עבורך בענן, סירוב למסירת פרטי הזיהוי (רישום) ימנע מאיתנו את האפשרות לספק לך גישה למערכת.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section8.subtitle2', 'השירותים הניתנים:')}</strong>
                <p className="mt-1">
                  {t('privacy.section8.content2', 'המידע הנאסף משמש לצורך ניהול רשימות ימי הולדת (לכלל המשתמשים) ולצורך סנכרון ותזכורות ביומן Google (למשתמשים הבוחרים לחבר את חשבון הגוגל שלהם בלבד).')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section8.subtitle3', 'זכויותיך (עיון, תיקון ומחיקה):')}</strong>
                <p className="mt-1">
                  {t('privacy.section8.content3', 'בהתאם לחוק הגנת הפרטיות, עומדת לך הזכות לעיין במידע המוחזק אודותיך ולבקש לתקנו או למוחקו. באפליקציית HebBirthday, זכויות אלו ממומשות באופן ישיר דרך הממשק:')}
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('privacy.section8.right1', 'ניתן לעיין בכל המידע השמור אודותיך בכל עת דרך לוח הבקרה (Dashboard).')}</li>
                  <li>{t('privacy.section8.right2', 'ניתן לתקן או לערוך כל פרט (שם, תאריך, קבוצה) באופן עצמאי דרך כפתורי העריכה.')}</li>
                  <li>{t('privacy.section8.right3', 'למחיקת החשבון והמידע לצמיתות, ניתן להשתמש בכפתור המחיקה באזור ההגדרות או לפנות אלינו במייל.')}</li>
                </ul>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section8.subtitle4', 'ביטול מעקב אנליטיקס:')}</strong>
                <p className="mt-1">
                  {t('privacy.section8.content4', 'ניתן לבטל את איסוף נתוני האנליטיקס באמצעות הגדרות הדפדפן, התקנת תוסף Google Analytics Opt-out, או שימוש במצב גלישה פרטית.')}
                </p>
              </div>
              <p className="mt-2">
                {t('privacy.section8.contact', 'בכל שאלה נוספת בנושאי פרטיות, אנא פנה אלינו באמצעות כתובת המייל:')} <a href="mailto:hebbirthday@gmail.com" className="text-blue-600 hover:text-blue-800 underline">hebbirthday@gmail.com</a>.
              </p>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section9.title', '10. שינויים במדיניות הפרטיות')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section9.content', 'אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת.')}
            </p>
          </section>
        </div>
      </div>
    </InfoPageLayout>
  );
};

