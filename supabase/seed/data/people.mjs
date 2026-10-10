/**
 * Names and the hand-written demo accounts. Each name has three spellings:
 * [Uzbek Latin, Russian Cyrillic, English transliteration]; a person's full_name uses the one that
 * matches their app locale (uz / ru / en), as people in Tashkent usually do.
 */
// prettier-ignore
export const NAMES = {
  uzMale: [['Aziz', 'Азиз', 'Aziz'], ['Bekzod', 'Бекзод', 'Bekzod'], ['Jasur', 'Жасур', 'Jasur'], ['Sardor', 'Сардор', 'Sardor'], ['Otabek', 'Отабек', 'Otabek'], ['Javlon', 'Жавлон', 'Javlon'], ['Sherzod', 'Шерзод', 'Sherzod'], ['Ulugʻbek', 'Улугбек', 'Ulugbek'], ['Doniyor', 'Дониёр', 'Doniyor'], ['Rustam', 'Рустам', 'Rustam'], ['Farrux', 'Фаррух', 'Farrukh'], ['Akmal', 'Акмаль', 'Akmal'], ['Temur', 'Темур', 'Temur'], ['Islom', 'Ислом', 'Islom'], ['Shoxrux', 'Шохрух', 'Shokhrukh'], ['Sanjar', 'Санжар', 'Sanjar'], ['Nodir', 'Нодир', 'Nodir'], ['Behruz', 'Бехруз', 'Behruz'], ['Jamshid', 'Жамшид', 'Jamshid'], ['Eldor', 'Элдор', 'Eldor']],
  uzFemale: [['Dilnoza', 'Дильноза', 'Dilnoza'], ['Madina', 'Мадина', 'Madina'], ['Nilufar', 'Нилуфар', 'Nilufar'], ['Shahnoza', 'Шахноза', 'Shakhnoza'], ['Zarina', 'Зарина', 'Zarina'], ['Kamola', 'Камола', 'Kamola'], ['Malika', 'Малика', 'Malika'], ['Gulnoza', 'Гульноза', 'Gulnoza'], ['Sevara', 'Севара', 'Sevara'], ['Feruza', 'Феруза', 'Feruza'], ['Mohira', 'Мохира', 'Mokhira'], ['Nigora', 'Нигора', 'Nigora'], ['Dildora', 'Дилдора', 'Dildora'], ['Laylo', 'Лайло', 'Laylo'], ['Munisa', 'Муниса', 'Munisa'], ['Sabina', 'Сабина', 'Sabina'], ['Charos', 'Чарос', 'Charos'], ['Ziyoda', 'Зиёда', 'Ziyoda'], ['Yulduz', 'Юлдуз', 'Yulduz'], ['Kamila', 'Камила', 'Kamila']],
  uzSurname: [['Karimov', 'Каримов', 'Karimov'], ['Rahimov', 'Рахимов', 'Rakhimov'], ['Yusupov', 'Юсупов', 'Yusupov'], ['Tursunov', 'Турсунов', 'Tursunov'], ['Abdullayev', 'Абдуллаев', 'Abdullaev'], ['Ismoilov', 'Исмоилов', 'Ismoilov'], ['Saidov', 'Саидов', 'Saidov'], ['Nazarov', 'Назаров', 'Nazarov'], ['Ergashev', 'Эргашев', 'Ergashev'], ['Xolmatov', 'Холматов', 'Kholmatov'], ['Mirzayev', 'Мирзаев', 'Mirzaev'], ['Qodirov', 'Кадыров', 'Kadirov'], ['Sobirov', 'Собиров', 'Sobirov'], ['Usmonov', 'Усмонов', 'Usmonov'], ['Aliyev', 'Алиев', 'Aliev'], ['Hasanov', 'Хасанов', 'Khasanov'], ['Toshmatov', 'Тошматов', 'Toshmatov'], ['Umarov', 'Умаров', 'Umarov'], ['Jurayev', 'Жураев', 'Juraev'], ['Sultonov', 'Султонов', 'Sultonov']],
  ruMale: [['Dmitriy', 'Дмитрий', 'Dmitry'], ['Aleksandr', 'Александр', 'Alexander'], ['Sergey', 'Сергей', 'Sergey'], ['Artyom', 'Артём', 'Artyom'], ['Maksim', 'Максим', 'Maxim'], ['Nikita', 'Никита', 'Nikita'], ['Andrey', 'Андрей', 'Andrey'], ['Ilya', 'Илья', 'Ilya'], ['Pavel', 'Павел', 'Pavel'], ['Roman', 'Роман', 'Roman']],
  ruFemale: [['Anna', 'Анна', 'Anna'], ['Yekaterina', 'Екатерина', 'Ekaterina'], ['Olga', 'Ольга', 'Olga'], ['Mariya', 'Мария', 'Maria'], ['Alina', 'Алина', 'Alina'], ['Viktoriya', 'Виктория', 'Victoria'], ['Darya', 'Дарья', 'Daria'], ['Natalya', 'Наталья', 'Natalia'], ['Yelena', 'Елена', 'Elena'], ['Kseniya', 'Ксения', 'Ksenia']],
  ruSurname: [['Ivanov', 'Иванов', 'Ivanov'], ['Smirnov', 'Смирнов', 'Smirnov'], ['Petrov', 'Петров', 'Petrov'], ['Sokolov', 'Соколов', 'Sokolov'], ['Pavlov', 'Павлов', 'Pavlov'], ['Morozov', 'Морозов', 'Morozov'], ['Volkov', 'Волков', 'Volkov'], ['Lebedev', 'Лебедев', 'Lebedev']],
  koreanSurname: [['Kim', 'Ким', 'Kim'], ['Pak', 'Пак', 'Park'], ['Li', 'Ли', 'Lee'], ['Ten', 'Тен', 'Ten'], ['Tsoy', 'Цой', 'Tsoi']],
};

const VARIANT = { uz: 0, ru: 1, en: 2 };

/** Uzbek and Russian surnames take -a in the feminine form (Karimov -> Karimova). */
const feminine = (surname) => surname.map((s, i) => `${s}${i === 1 ? 'а' : 'a'}`);

/** A random person: { gender, locale, fullName, nameVariants }. */
export function randomPerson(rng) {
  const roll = rng.next();
  const gender = rng.chance(0.52) ? 'female' : 'male';
  let first;
  let last;
  let locale;
  if (roll < 0.7) {
    first = rng.pick(gender === 'female' ? NAMES.uzFemale : NAMES.uzMale);
    const surname = rng.pick(NAMES.uzSurname);
    last = gender === 'female' ? feminine(surname) : surname;
    locale = rng.weighted(['uz', 'ru', 'en'], (l) => ({ uz: 0.5, ru: 0.35, en: 0.15 })[l]);
  } else {
    first = rng.pick(gender === 'female' ? NAMES.ruFemale : NAMES.ruMale);
    if (roll < 0.88) {
      const surname = rng.pick(NAMES.ruSurname);
      last = gender === 'female' ? feminine(surname) : surname;
    } else {
      last = rng.pick(NAMES.koreanSurname);
    }
    locale = rng.chance(0.85) ? 'ru' : 'en';
  }
  const i = VARIANT[locale];
  return { gender, locale, fullName: `${first[i]} ${last[i]}` };
}

/** Partner staff (phones end in 00 -> partner role) and the admin. */
// prettier-ignore
export const STAFF = [
  { key: 'staff-1', phone: '+998901234500', fullName: 'Бахтиёр Юсупов', gender: 'male', locale: 'ru', venues: [['pulse-fitness-yunusabad', 'owner'], ['pulse-fitness-chilanzar', 'owner']] },
  { key: 'staff-2', phone: '+998901234600', fullName: 'Shahzod Aliyev', gender: 'male', locale: 'uz', venues: [['pulse-fitness-yunusabad', 'staff']] },
  { key: 'staff-3', phone: '+998901234700', fullName: 'Ольга Ким', gender: 'female', locale: 'ru', venues: [['lotus-yoga-shaykhantahur', 'owner']] },
  { key: 'staff-4', phone: '+998901234800', fullName: 'Nodira Saidova', gender: 'female', locale: 'uz', venues: [['zilol-aqua-mirzo-ulugbek', 'staff']] },
  { key: 'staff-5', phone: '+998901234900', fullName: 'Rustam Karimov', gender: 'male', locale: 'en', venues: [['oasis-spa-mirabad', 'owner'], ['tiniq-massage-almazar', 'owner']] },
];

export const ADMIN = {
  key: 'admin',
  phone: '+998900000000',
  fullName: 'Администратор (демо)',
  gender: null,
  locale: 'ru',
};

/**
 * Featured demo members: fixed phones and scripted stories (see docs/SEED.md). `scenario` and the
 * story fields are interpreted by build/activity.mjs.
 */
// prettier-ignore
export const FEATURED = [
  { key: 'f1', phone: '+998901000001', fullName: 'Дильноза Каримова', gender: 'female', locale: 'ru', district: 'yunusabad', scenario: 'active', plan: 'standard', startOffset: -12, previous: 'standard', home: ['pulse-fitness-yunusabad', 'lotus-yoga-shaykhantahur', 'zilol-aqua-mirzo-ulugbek', 'nafas-yoga-yunusabad'], favorites: ['pulse-fitness-yunusabad', 'lotus-yoga-shaykhantahur', 'zilol-aqua-mirzo-ulugbek'] },
  { key: 'f2', phone: '+998901000002', fullName: 'Jasur Toshmatov', gender: 'male', locale: 'uz', district: 'sergeli', scenario: 'active', plan: 'basic', startOffset: -22, previous: 'basic', home: ['kuch-gym-sergeli', 'chaqmoq-box-sergeli'], scriptedOnly: true },
  { key: 'f3', phone: '+998901000003', fullName: 'Kamila Yusupova', gender: 'female', locale: 'en', district: 'mirabad', scenario: 'active', plan: 'premium', startOffset: -8, previous: 'premium', home: ['atlas-club-mirabad', 'oqim-yoga-loft-mirabad', 'core-pilates-yakkasaray', 'oasis-spa-mirabad', 'aqua-nur-yakkasaray'], favorites: ['oasis-spa-mirabad', 'core-pilates-yakkasaray'] },
  { key: 'f4', phone: '+998901000004', fullName: 'Анна Ким', gender: 'female', locale: 'ru', district: 'mirzo-ulugbek', scenario: 'frozen', plan: 'standard', startOffset: -20, freezeStartOffset: -6, freezeDays: 14, home: ['muvozanat-pilates-mirzo-ulugbek', 'zilol-aqua-mirzo-ulugbek', 'shifo-massage-mirzo-ulugbek'] },
  { key: 'f5', phone: '+998901000005', fullName: 'Sardor Rahimov', gender: 'male', locale: 'uz', district: 'yunusabad', scenario: 'none', signupOffset: -2, favorites: ['nafas-yoga-yunusabad', 'kuch-gym-sergeli'] },
  { key: 'f6', phone: '+998901000006', fullName: 'Тимур Назаров', gender: 'male', locale: 'ru', district: 'chilanzar', scenario: 'active', plan: 'basic', startOffset: -26, home: ['delfin-pool-chilanzar', 'raqs-studio-chilanzar', 'kedr-banya-chilanzar'], scriptedOnly: true },
  { key: 'f7', phone: '+998901000007', fullName: 'Malika Ismoilova', gender: 'female', locale: 'uz', district: 'shaykhantahur', scenario: 'pending', plan: 'premium', previous: 'standard', previousEndOffset: -9, home: ['lotus-yoga-shaykhantahur', 'sharq-hammam-shaykhantahur', 'ritm-dance-shaykhantahur'] },
  { key: 'f8', phone: '+998901000008', fullName: 'Daniel Kim', gender: 'male', locale: 'en', district: 'yakkasaray', scenario: 'active', plan: 'premium', startOffset: -17, previous: 'premium', scheduledPlan: 'standard', home: ['aqua-nur-yakkasaray', 'forge-box-mirabad', 'recover-lab-shaykhantahur', 'core-pilates-yakkasaray'] },
];

export const DEVICE_NAMES = {
  ios: ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 16', 'iPhone SE'],
  android: [
    'Samsung Galaxy A54',
    'Samsung Galaxy S23',
    'Redmi Note 13',
    'Xiaomi 14',
    'Honor X8',
    'realme 11',
    'Tecno Camon 30',
  ],
};
