import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../layout/Layout';

export const PrivacyPolicy: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          {t('privacy.title', 'מדיניות פרטיות לאפליקציית "hebbirthday"')}
        </h1>
        
        <p className="text-sm text-gray-600 mb-8">
          {t('privacy.lastUpdated', 'תאריך עדכון אחרון')}: 12 בנובמבר 2025
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
                  <li>{t('privacy.section1.item3', 'מידע אודות צדדים שלישיים (בעלי יום ההולדת): שם פרטי, שם משפחה, תאריך לידה לועזי, מין (אופציונלי), וציון האם הלידה אירעה אחרי השקיעה.')}</li>
                  <li>{t('privacy.section1.item4', 'פרטי "ארגונים" (Tenants) ו"קבוצות" (Groups) שאתה יוצר.')}</li>
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
              <li>{t('privacy.section2.item2', 'כדי להציג את פרטי ימי ההולדת לחברי הארגון (Tenant) שלך.')}</li>
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
                <strong className="text-gray-900">{t('privacy.section3.subtitle1', 'חברי הארגון (Tenant):')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section3.content1', 'תוכן המשתמש שאתה מזין (כגון פרטי ימי הולדת) יהיה גלוי לשאר המשתמשים באותו "ארגון" (Tenant) שאליו שייכת הרשומה, בהתאם להגדרות האבטחה של הפרויקט.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle2', 'Google Firebase:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section3.content2', 'האפליקציה בנויה על פלטפורמת Firebase של Google, המשמשת לאימות, אחסון נתונים (Firestore) והרצת קוד (Functions). המידע שלך נשמר בשרתים של גוגל וכפוף למדיניות הפרטיות שלהם.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle3', 'Hebcal API:')}</strong>
                <p className="text-gray-700 mt-1">
                  {t('privacy.section3.content3', 'לצורך חישוב תאריך עברי מדויק, אנו שולחים באופן אוטומטי את התאריך הלועזי, המין (אם סופק) והמידע האם הלידה אירעה \'אחרי השקיעה\' לשירות החיצוני Hebcal API. אנו לא שולחים שמות או כל מידע מזהה אישי אחר (כגון שם פרטי או שם משפחה) לשירות זה.')}
                </p>
              </div>
              <div>
                <strong className="text-gray-900">{t('privacy.section3.subtitle4', 'Google Calendar API (באישור המשתמש בלבד):')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>{t('privacy.section3.item1', 'אם תבחר לסנכרן את ימי ההולדת ליומן שלך, האפליקציה תבקש את הרשאתך לגישה ליומן הגוגל שלך (scope: calendar.events).')}</li>
                  <li>{t('privacy.section3.item2', 'אנו נשתמש בהרשאה זו אך ורק כדי ליצור, לעדכן ולמחוק אירועי יום הולדת שהאפליקציה יצרה עבורך.')}</li>
                  <li>{t('privacy.section3.item3', 'כדי לאפשר פעולות אלו, אנו שומרים \'טוקן גישה\' (accessToken) עבור חשבונך במסד הנתונים שלנו (googleCalendarTokens). טוקן זה נשמר באופן מאובטח ונגיש רק לך, ואינו משמש לשום מטרה אחרת, ובפרט לא לקריאת אירועים קיימים ביומן שלך שלא נוצרו על ידי האפליקציה.')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section4.title', '4. העברת נתונים בינלאומית')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section4.content', 'השימוש בשירותי Firebase ו-Hebcal כרוך בכך שהמידע שלך עשוי להיות מאוחסן ומעובד בשרתים הממוקמים מחוץ לגבולות מדינת ישראל. אנו מסתמכים על כך שספקים אלו נוקטים באמצעי אבטחה העומדים בסטנדרטים בינלאומיים.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section5.title', '5. שמירת מידע ומדיניות גיבויים')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section5.content', 'אנו שומרים מידע אישי רק למשך הזמן הנחוץ למטרות שלשמן הוא נאסף. מידע אישי של חשבונך ונתוני ימי ההולדת שהזנת נשמרים במערכת הפעילה כל עוד חשבונך פעיל והנתונים לא נמחקו על ידך או על ידי מנהל בארגון שלך. אנו עשויים לשמור גיבויים של בסיס הנתונים לתקופה מוגבלת לצורכי שחזור במקרה של כשל טכני (Disaster Recovery). מידע שנמחק מהמערכת הפעילה עשוי להישאר בגיבויים אלו עד למחיקתם הסופית.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section6.title', '6. פרטיות ילדים')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section6.content', 'השירות אינו מיועד לשימוש על ידי ילדים מתחת לגיל 18. איננו אוספים ביודעין מידע אישי מילדים מתחת לגיל זה.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section7.title', '7. זכויות המשתמש')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section7.content', 'על פי חוק הגנת הפרטיות, אתה זכאי לעיין במידע האישי שלך, לבקש לתקן אותו או לבקש את מחיקתו. למימוש זכויות אלו, או בכל שאלה אחרת בנושאי פרטיות, אנא פנה אלינו באמצעות כתובת המייל:')} <a href="mailto:hebbirthday@gmail.com" className="text-blue-600 hover:text-blue-800 underline">hebbirthday@gmail.com</a>.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('privacy.section8.title', '8. שינויים במדיניות הפרטיות')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section8.content', 'אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת.')}
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

