/**
 * The 12 venue categories. `icon` is a lucide icon name (kebab-case). Slugs follow the
 * venue_categories.slug check (lower-case words joined by hyphens), hence "martial-arts" and
 * "sauna-hammam". `visitMin` is the drop-in booking length, `classShare` the probability that a
 * visit to such a venue is a class rather than a drop-in, `tint` the photo placeholder colour.
 */
export const CATEGORIES = [
  {
    slug: 'gym',
    icon: 'dumbbell',
    name: { ru: 'Тренажёрные залы', uz: 'Trenajyor zallari', en: 'Gyms' },
    visitMin: 90,
    classShare: 0.25,
    tint: [72, 78, 96],
    focus: {
      ru: 'Помогает поставить технику базовых упражнений и составить понятный план тренировок.',
      uz: 'Asosiy mashqlar texnikasini sozlash va tushunarli mashgʻulot rejasini tuzishga yordam beradi.',
      en: 'Helps you nail the basic lifts and build a clear training plan.',
    },
  },
  {
    slug: 'pool',
    icon: 'waves-ladder',
    name: { ru: 'Бассейны', uz: 'Basseynlar', en: 'Pools' },
    visitMin: 60,
    classShare: 0.3,
    tint: [74, 132, 168],
    focus: {
      ru: 'Учит плавать взрослых с нуля и помогает опытным пловцам улучшить технику.',
      uz: 'Kattalarga noldan suzishni oʻrgatadi va tajribali suzuvchilarga texnikani yaxshilashda yordam beradi.',
      en: 'Teaches adults to swim from scratch and helps experienced swimmers refine their stroke.',
    },
  },
  {
    slug: 'yoga',
    icon: 'flower-2',
    name: { ru: 'Йога', uz: 'Yoga', en: 'Yoga' },
    visitMin: 75,
    classShare: 0.85,
    tint: [186, 160, 132],
    focus: {
      ru: 'Ведёт мягкие и динамичные практики, внимательно следит за выравниванием.',
      uz: 'Yumshoq va dinamik amaliyotlarni olib boradi, tana holatiga diqqat bilan qaraydi.',
      en: 'Leads both gentle and dynamic practices with careful attention to alignment.',
    },
  },
  {
    slug: 'pilates',
    icon: 'person-standing',
    name: { ru: 'Пилатес', uz: 'Pilates', en: 'Pilates' },
    visitMin: 55,
    classShare: 0.9,
    tint: [176, 150, 160],
    focus: {
      ru: 'Работает с осанкой и мышцами корпуса, в том числе после травм спины.',
      uz: 'Qomat va tana mushaklari bilan, jumladan bel jarohatlaridan keyin ham ishlaydi.',
      en: 'Works on posture and core strength, including after back injuries.',
    },
  },
  {
    slug: 'dance',
    icon: 'music',
    name: { ru: 'Танцы', uz: 'Raqs', en: 'Dance' },
    visitMin: 60,
    classShare: 0.9,
    tint: [150, 96, 140],
    focus: {
      ru: 'Ставит хореографию для взрослых и умеет раскрепостить даже тех, кто танцует впервые.',
      uz: 'Kattalar uchun xoreografiya sahnalashtiradi va ilk bor raqsga tushayotganlarni ham ochib yuboradi.',
      en: 'Choreographs for adults and puts even first-time dancers at ease.',
    },
  },
  {
    slug: 'martial-arts',
    icon: 'swords',
    name: { ru: 'Единоборства', uz: 'Jang sanʼatlari', en: 'Martial arts' },
    visitMin: 90,
    classShare: 0.85,
    tint: [120, 64, 56],
    focus: {
      ru: 'Мастер спорта, тренирует взрослых новичков и готовит к соревнованиям.',
      uz: 'Sport ustasi, kattalarni noldan oʻrgatadi va musobaqalarga tayyorlaydi.',
      en: 'A master of sport who coaches adult beginners and prepares fighters for competition.',
    },
  },
  {
    slug: 'crossfit',
    icon: 'flame',
    name: { ru: 'Кроссфит', uz: 'Krossfit', en: 'CrossFit' },
    visitMin: 60,
    classShare: 0.8,
    tint: [160, 84, 48],
    focus: {
      ru: 'Подбирает нагрузку под уровень каждого и следит за техникой в интенсивных комплексах.',
      uz: 'Har kimning darajasiga mos yuklama tanlaydi va jadal komplekslarda texnikani kuzatadi.',
      en: 'Scales every workout to your level and keeps technique sharp under fatigue.',
    },
  },
  {
    slug: 'spa',
    icon: 'sparkles',
    name: { ru: 'Спа', uz: 'Spa', en: 'Spa' },
    visitMin: 120,
    classShare: 0.15,
    tint: [120, 160, 150],
    focus: {
      ru: 'Специалист по спа-ритуалам и восстановительным процедурам.',
      uz: 'Spa marosimlari va tiklovchi muolajalar boʻyicha mutaxassis.',
      en: 'A specialist in spa rituals and restorative treatments.',
    },
  },
  {
    slug: 'sauna-hammam',
    icon: 'thermometer-sun',
    name: { ru: 'Сауны и хаммамы', uz: 'Saunalar va hammomlar', en: 'Saunas & hammams' },
    visitMin: 120,
    classShare: 0.15,
    tint: [168, 120, 88],
    focus: {
      ru: 'Банный мастер: знает, как правильно прогреться и восстановиться после парной.',
      uz: 'Hammom ustasi: qanday qilib toʻgʻri isinish va bugʻxonadan keyin tiklanishni yaxshi biladi.',
      en: 'A bath master who knows how to warm up properly and recover after the steam room.',
    },
  },
  {
    slug: 'massage',
    icon: 'hand',
    name: { ru: 'Массаж', uz: 'Massaj', en: 'Massage' },
    visitMin: 60,
    classShare: 0.1,
    tint: [150, 128, 108],
    focus: {
      ru: 'Сертифицированный массажист: классический, спортивный и расслабляющий массаж.',
      uz: 'Sertifikatlangan massajchi: klassik, sport va tinchlantiruvchi massaj.',
      en: 'A certified therapist offering classic, sports and relaxing massage.',
    },
  },
  {
    slug: 'physio',
    icon: 'stethoscope',
    name: { ru: 'Физиотерапия', uz: 'Fizioterapiya', en: 'Physiotherapy' },
    visitMin: 60,
    classShare: 0.6,
    tint: [92, 140, 132],
    focus: {
      ru: 'Физиотерапевт, помогает восстановиться после травм и операций.',
      uz: 'Fizioterapevt, jarohat va operatsiyalardan keyin tiklanishga yordam beradi.',
      en: 'A physiotherapist who helps people recover from injuries and surgery.',
    },
  },
  {
    slug: 'recovery',
    icon: 'heart-pulse',
    name: { ru: 'Восстановление', uz: 'Tiklanish', en: 'Recovery' },
    visitMin: 60,
    classShare: 0.4,
    tint: [96, 120, 160],
    focus: {
      ru: 'Подскажет, как быстрее восстанавливаться между тренировками.',
      uz: 'Mashgʻulotlar orasida qanday qilib tezroq tiklanishni maslahat beradi.',
      en: 'Shows you how to bounce back faster between workouts.',
    },
  },
];

export const categoryBySlug = (slug) => {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) throw new Error(`unknown category ${slug}`);
  return category;
};
