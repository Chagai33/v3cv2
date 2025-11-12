import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../layout/Layout';

export const TermsOfUse: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          {t('terms.title', 'תנאי שימוש לאפליקציית "hebbirthday"')}
        </h1>
        
        <p className="text-sm text-gray-600 mb-8">
          {t('terms.lastUpdated', 'תאריך עדכון אחרון')}: 12 בנובמבר 2025
        </p>

        <div className="prose prose-sm max-w-none" dir={isHebrew ? 'rtl' : 'ltr'}>
          <p className="mb-4">
            {t('terms.intro', 'ברוכים הבאים ל-"hebbirthday" (להלן: "האפליקציה" או "השירות"). השימוש באפליקציה, שירותיה ותכניה כפוף לתנאים המפורטים להלן ("תנאי השימוש"). אנא קרא אותם בעיון. שימושך באפליקציה, בכל דרך שהיא, מהווה הסכמה בלתי מסויגת לתנאים אלו. אם אינך מסכים לתנאי השימוש, כולם או חלקם, אינך רשאי לעשות שימוש באפליקציה.')}
          </p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section1.title', '1. הגדרת השירות')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section1.content', 'האפליקציה מספקת פלטפורמה לניהול, ריכוז ומעקב אחר ימי הולדת. השירות מאפשר למשתמשים ליצור "ארגונים" (Tenants) סגורים, להזין פרטי ימי הולדת (כולל תאריך לועזי, תאריך עברי, מין וציון "אחרי השקיעה"), ולנהל את הרשומות בסביבה שיתופית מבוססת הרשאות (בעלים, מנהל, חבר). האפליקציה כוללת חישוב אוטומטי של תאריכים עבריים ואפשרות לסנכרון עם יומן Google האישי של המשתמש.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section2.title', '2. כשרות משפטית וגיל שימוש')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section2.content', 'השימוש באפליקציה מותר אך ורק למשתמשים אשר גילם עולה על 18 שנים והם בעלי כשרות משפטית מלאה להתקשר בהסכם זה. בשימושך באפליקציה, הינך מצהיר ומאשר כי אתה עומד בתנאי גיל וכשרות אלו.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section3.title', '3. חשבונות משתמשים')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section3.content', 'השימוש באפליקציה דורש הרשמה ויצירת חשבון באמצעות דואר אלקטרוני וסיסמה או באמצעות שירותי אימות של צדדים שלישיים (כגון Google). הינך אחראי באופן בלעדי לשמירת סודיות פרטי ההתחברות שלך ולכל פעולה שתתבצע בחשבונך. כל משתמש משויך ל"ארגון" (Tenant) אחד או יותר ופועל בהתאם להרשאות שהוגדרו לו באותו ארגון.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section4.title', '4. קניין רוחני')}
            </h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <p>
                <strong>{t('terms.section4.subtitle1', 'האפליקציה:')}</strong> {t('terms.section4.content1', 'כל זכויות הקניין הרוחני באפליקציה, לרבות קוד המקור, העיצוב, הלוגו, הממשק הגרפי, וכל חומר אחר הכלול בה (למעט תוכן משתמשים), שייכות באופן בלעדי למפתח האפליקציה, חגי יחיאל. אין להעתיק, לשכפל, להפיץ, לשנות או לעשות כל שימוש מסחרי באפליקציה או בחלק ממנה ללא אישור מפורש בכתב. האייקונים המשמשים באפליקציה הם מתוך ספריית lucide-react ומופצים תחת רישיון ISC.')}
              </p>
              <p>
                <strong>{t('terms.section4.subtitle2', 'תוכן משתמשים (User-Generated Content):')}</strong> {t('terms.section4.content2', 'הינך האחראי הבלעדי לתוכן שאתה יוצר ומעלה לאפליקציה, כולל שמות, תאריכים, הערות וכל מידע אישי אחר.')}
              </p>
              <p>
                <strong>{t('terms.section4.subtitle3', 'אחריות על מידע צד ג\'')}</strong> {t('terms.section4.content3', 'האפליקציה מאפשרת לך להזין מידע אישי אודות אנשים אחרים (בעלי יום ההולדת). בהעלאת תוכן זה, הינך מצהיר ומתחייב כי השגת את כל ההסכמות החוקיות הנדרשות מאותם צדדים שלישיים (או מהאפוטרופוסים החוקיים שלהם) לצורך איסוף, שמירה ועיבוד המידע שלהם במסגרת השירות.')}
              </p>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section5.title', '5. שימוש נאות, הסרת תוכן והפסקת שירות')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section5.content', 'הנך מתחייב שלא להעלות לאפליקציה כל תוכן שהוא בלתי חוקי, פוגעני, מאיים, גזעני, מהווה לשון הרע או פוגע בפרטיות. מפתח האפליקציה שומר לעצמו את הזכות, לפי שיקול דעתו הבלעדי, להסיר לאלתר כל תוכן המפר תנאים אלו, וכן לחסום או להשעות גישה של משתמש לשירות, ללא הודעה מוקדמת.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section6.title', '6. שינויים, עדכונים והפסקת השירות')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section6.content', 'מפתח האפליקציה שומר לעצמו את הזכות המלאה, לפי שיקול דעתו הבלעדי, לשנות את האפליקציה ותכונותיה בכל עת, לרבות הוספה, גריעה או שינוי של פונקציונליות, ללא צורך במתן הודעה מוקדמת. הינך מסכים כי לא תהיה לך כל טענה או תביעה כלפי המפתח בגין ביצוע שינויים כאמור. תנאי שימוש אלו יחולו על כל גרסה מעודכנת. על שינויים מהותיים בתנאי השימוש תינתן הודעה סבירה. המשך שימושך באפליקציה לאחר עדכון יהווה הסכמה לתנאים המעודכנים. כמו כן, המפתח שומר לעצמו את הזכות להפסיק את פעילות האפליקציה, באופן מלא או חלקי.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section7.title', '7. הגבלת אחריות')}
            </h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <p>
                <strong>{t('terms.section7.subtitle1', 'השירות ניתן "כפי שהוא" (As-Is):')}</strong> {t('terms.section7.content1', 'האפליקציה מסופקת לשימוש כפי שהיא, ללא כל התחייבות או אחריות לתקינותה, זמינותה או אמינותה.')}
              </p>
              <p>
                <strong>{t('terms.section7.subtitle2', 'תוכן גולשים:')}</strong> {t('terms.section7.content2', 'מפתח האפליקציה אינו נושא באחריות לתוכן שמועלה על ידי המשתמשים, ובכלל זה לדיוק המידע שהוזן או לקבלת ההסכמות הנדרשות להזנתו.')}
              </p>
              <p>
                <strong>{t('terms.section7.subtitle3', 'חישוב תאריכים ושירותי צד ג\'')}</strong> {t('terms.section7.content3', 'האפליקציה מספקת כלי עזר לחישוב תאריכים עבריים. פונקציונליות זו תלויה בשירותי צד שלישי (כגון Hebcal API). מפתח האפליקציה אינו אחראי לדיוק החישובים, לטעויות, או לכשלים הנובעים משירותי צד שלישי אלו. כמו כן, סנכרון עם יומנים חיצוניים (כגון Google Calendar) מוצע "כפי שהוא" ואינו מובטח כנטול שגיאות. האחריות על וידוא נכונות התאריכים והאירועים חלה על המשתמש בלבד.')}
              </p>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section8.title', '8. סמכות שיפוט')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section8.content', 'על תנאי שימוש אלו יחולו דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל סכסוך תהא נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.')}
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('terms.section9.title', '9. יצירת קשר')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section9.content', 'בכל שאלה בנוגע לתנאי שימוש אלו, ניתן ליצור עמנו קשר באמצעות כתובת המייל:')} <a href="mailto:hebbirthday@gmail.com" className="text-blue-600 hover:text-blue-800 underline">hebbirthday@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

