/**
 * User-generated and templated text: review texts (written in the reviewer's own language),
 * notification templates, cancellation and manual check-in reasons, trainer bios.
 */

/** Review texts by locale and rating; each text is used at most once. */
// prettier-ignore
export const REVIEW_TEXTS = {
  ru: {
    5: [
      'Очень чисто, персонал внимательный и всегда подскажет. Хожу второй месяц и менять не собираюсь.',
      'Отличное место! Записываюсь через приложение, на входе отмечают за пару секунд.',
      'Атмосфера супер, после визита чувствую себя другим человеком. Рекомендую.',
      'Удобно, что рядом с домом и открыто допоздна. Всё на высоте.',
    ],
    4: [
      'Хорошее место, но вечером бывает многолюдно. В остальном всё нравится.',
      'Понравилось, только парковка маленькая — лучше приезжать заранее.',
      'Всё хорошо, хотелось бы больше свободных слотов на выходных.',
    ],
    3: ['Неплохо, но раздевалки пора обновить. Персонал приветливый.', 'Нормально, но в час пик приходится ждать.'],
    2: ['Пришла к открытию, а администратор опоздал на пятнадцать минут. Надеюсь, это случайность.'],
  },
  uz: {
    5: [
      'Juda toza, xodimlar eʼtiborli. Ilova orqali yozilaman, kirishda bir necha soniyada belgilashadi.',
      'Ajoyib joy! Tashrifdan keyin oʻzimni yangi odamdek his qilaman.',
      'Uyimga yaqin va kechgacha ochiq — juda qulay. Hammasi aʼlo darajada.',
    ],
    4: ['Yaxshi joy, lekin kechqurun odam koʻp boʻladi. Qolgani yoqdi.', 'Hammasi yaxshi, faqat avtoturargoh kichik.'],
    3: ['Yomon emas, lekin kiyinish xonalarini yangilash kerak.'],
    2: ['Ochilish vaqtida keldim, administrator oʻn besh daqiqa kechikdi.'],
  },
  en: {
    5: [
      'Spotless, with friendly, helpful staff. Checking in with the QR code takes two seconds.',
      'A lovely place to switch off after work. I come every week now.',
      'Close to home and open late. Everything is top notch.',
    ],
    4: ['Really good overall, just a bit crowded after 7 pm.', 'Liked it a lot; parking is tight, so come early.'],
    3: ['Decent, but the changing rooms could use an update.'],
    2: ['Arrived at opening time and had to wait fifteen minutes for the front desk.'],
  },
};

/** Notification templates; {placeholders} are filled per locale by build/extras.mjs. */
// prettier-ignore
export const NOTIFICATIONS = {
  visit_checked_in: {
    title: { ru: 'Посещение засчитано', uz: 'Tashrif tasdiqlandi', en: 'Visit checked in' },
    body: { ru: 'Спасибо, что были в {venue}! Осталось посещений: {left}.', uz: 'Tashrifingiz uchun rahmat: {venue}. Qolgan tashriflar: {left}.', en: 'Thanks for visiting {venue}! Visits left: {left}.' },
  },
  review_request: {
    title: { ru: 'Как всё прошло?', uz: 'Qanday oʻtdi?', en: 'How was it?' },
    body: { ru: 'Оцените визит в {venue} — это поможет другим с выбором.', uz: '{venue} tashrifini baholang — bu boshqalarga tanlashda yordam beradi.', en: 'Rate your visit to {venue}. It helps other members choose.' },
  },
  subscription_renewal: {
    title: { ru: 'Скоро продление подписки', uz: 'Obuna tez orada uzaytiriladi', en: 'Your subscription renews soon' },
    body: { ru: 'Тариф {plan} продлится {date}. Изменить тариф можно в профиле.', uz: '{plan} tarifi {date} kuni uzaytiriladi. Tarifni profilda oʻzgartirishingiz mumkin.', en: 'Your {plan} plan renews on {date}. You can change it in your profile.' },
  },
  penalty_applied: {
    title: { ru: 'Бронирование временно недоступно', uz: 'Bron qilish vaqtincha cheklangan', en: 'Booking is paused for now' },
    body: { ru: 'Три неявки за 30 дней: новые брони снова откроются {date}.', uz: '30 kun ichida uch marta kelmaslik: yangi bronlar {date} kuni yana ochiladi.', en: 'Three no-shows in 30 days: new bookings reopen on {date}.' },
  },
  waitlist_joined: {
    title: { ru: 'Вы в листе ожидания', uz: 'Siz kutish roʻyxatidasiz', en: 'You’re on the waitlist' },
    body: { ru: '{class}, {venue}: ваше место в очереди — {position}. Сообщим, если освободится место.', uz: '{class}, {venue}: navbatdagi oʻrningiz — {position}. Joy boʻshasa, xabar beramiz.', en: '{class} at {venue}: you are number {position} in line. We’ll let you know if a spot opens up.' },
  },
};

export function fillTemplate(template, values) {
  const out = {};
  for (const [locale, text] of Object.entries(template)) {
    out[locale] = text.replace(/\{(\w+)\}/g, (_, name) => {
      const value = values[name];
      return typeof value === 'object' && value !== null ? value[locale] : String(value);
    });
  }
  return out;
}

// prettier-ignore
export const CANCEL_REASONS = {
  ru: ['Не успеваю после работы', 'Изменились планы', 'Плохо себя чувствую'],
  uz: ['Ishdan ulgurmayapman', 'Rejalarim oʻzgardi', 'Oʻzimni yaxshi his qilmayapman'],
  en: ['Running late from work', 'Plans changed', 'Feeling unwell'],
};

/** Typed by venue staff (Russian is the working language at the front desk). */
export const MANUAL_REASONS = [
  'Разрядился телефон у клиента',
  'Не загрузился QR-код, сверили по номеру телефона',
  'Нет интернета у клиента',
];

function ruYears(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'года';
  return 'лет';
}

/** Trainer bio: the category focus sentence plus years of experience. */
export function trainerBio(focus, years) {
  return {
    ru: `${focus.ru} Опыт работы — ${years} ${ruYears(years)}.`,
    uz: `${focus.uz} ${years} yillik tajribaga ega.`,
    en: `${focus.en} ${years} years of experience.`,
  };
}
