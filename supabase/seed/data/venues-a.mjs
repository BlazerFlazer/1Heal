/**
 * Venues 1-15 (gyms, pools, yoga, pilates, dance). Fictional businesses on real Tashkent streets.
 * classes: template keys from classes.mjs, or { key, slots: [[weekday, 'HH:MM'], ...] } for a
 * fixed weekly timetable (weekday 0 = Sunday). womenOnly: [[weekday, from, to], ...].
 */
// prettier-ignore
export const VENUES_A = [
  {
    slug: 'pulse-fitness-yunusabad', category: 'gym', tier: 2, priceTier: 2, district: 'yunusabad', lat: 41.3432, lng: 69.2968, hours: 'gym',
    name: { ru: 'Pulse Fitness Юнусабад', uz: 'Pulse Fitness Yunusobod', en: 'Pulse Fitness Yunusabad' },
    street: { ru: 'просп. Амира Темура, 107Б', uz: 'Amir Temur shoh koʻchasi, 107B', en: '107B Amir Temur Avenue' },
    description: {
      ru: 'Просторный зал на двух этажах: свободные веса, кардиозона с видом на проспект и отдельная студия для групповых занятий. На первом визите тренер поможет составить программу.',
      uz: 'Ikki qavatli keng zal: erkin ogʻirliklar, shoh koʻchaga qaragan kardio zonasi va guruh mashgʻulotlari uchun alohida studiya. Birinchi tashrifda murabbiy dastur tuzishga yordam beradi.',
      en: 'A spacious two-floor gym with free weights, a cardio zone overlooking the avenue and a separate studio for group classes. On your first visit a coach will help you build a programme.',
    },
    amenities: ['showers', 'lockers', 'parking', 'wifi', 'towels', 'air_conditioning', 'personal_training'],
    classes: ['functional', 'hiit', 'strength_basics', 'stretching'],
  },
  {
    slug: 'pulse-fitness-chilanzar', category: 'gym', tier: 2, priceTier: 2, district: 'chilanzar', lat: 41.2853, lng: 69.2142, hours: 'gym',
    name: { ru: 'Pulse Fitness Чиланзар', uz: 'Pulse Fitness Chilonzor', en: 'Pulse Fitness Chilanzar' },
    street: { ru: 'просп. Бунёдкор, 42', uz: 'Bunyodkor shoh koʻchasi, 42', en: '42 Bunyodkor Avenue' },
    description: {
      ru: 'Зал сети Pulse рядом с метро «Чиланзар»: силовая зона, функциональный тренинг и сауна после тренировки. Открывается рано утром.',
      uz: 'Pulse tarmogʻining «Chilonzor» metrosi yonidagi zali: kuch zonasi, funksional mashgʻulotlar va mashgʻulotdan keyin sauna. Erta tongdan ochiq.',
      en: 'The Pulse club next to Chilanzar metro, with a strength zone, functional training and a sauna for after your workout. Opens early in the morning.',
    },
    amenities: ['showers', 'lockers', 'sauna', 'wifi', 'towels'],
    classes: ['functional', 'hiit'],
  },
  {
    slug: 'kuch-gym-sergeli', category: 'gym', tier: 1, priceTier: 1, district: 'sergeli', lat: 41.2571, lng: 69.2265, hours: 'gym',
    name: { ru: 'Kuch Gym', uz: 'Kuch Gym', en: 'Kuch Gym' },
    street: { ru: 'ул. Янги Сергели, 11', uz: 'Yangi Sergeli koʻchasi, 11', en: '11 Yangi Sergeli Street' },
    description: {
      ru: 'Районный зал без лишнего: штанги, гантели, тренажёры на все группы мышц и дружелюбная атмосфера. Удобно заниматься до и после работы.',
      uz: 'Ortiqcha narsalarsiz mahalla zali: shtangalar, gantellar, barcha mushak guruhlari uchun trenajyorlar va samimiy muhit. Ishdan oldin va keyin shugʻullanish qulay.',
      en: 'A no-frills neighbourhood gym with barbells, dumbbells, machines for every muscle group and a friendly crowd. Easy to fit in before or after work.',
    },
    amenities: ['showers', 'lockers', 'parking', 'water'],
    classes: ['strength_basics'],
  },
  {
    slug: 'atlas-club-mirabad', category: 'gym', tier: 3, priceTier: 3, district: 'mirabad', lat: 41.2989, lng: 69.2817, hours: 'gym24',
    name: { ru: 'Atlas Club', uz: 'Atlas Club', en: 'Atlas Club' },
    street: { ru: 'ул. Тараса Шевченко, 23', uz: 'Taras Shevchenko koʻchasi, 23', en: '23 Taras Shevchenko Street' },
    description: {
      ru: 'Премиальный клуб, открытый круглосуточно: новое оборудование, зона восстановления с хаммамом и свежие полотенца. Даже в часы пик здесь спокойно.',
      uz: 'Kecha-kunduz ochiq premium klub: yangi jihozlar, hammomli tiklanish zonasi va toza sochiqlar. Gavjum soatlarda ham bu yerda osoyishta.',
      en: 'A premium club open around the clock, with new equipment, a recovery area with a hammam and fresh towels. Calm even at peak hours.',
    },
    amenities: ['showers', 'lockers', 'parking', 'wifi', 'towels', 'sauna', 'cafe', 'air_conditioning', 'personal_training', 'hairdryer'],
    classes: ['functional', 'stretching', 'hiit'],
  },
  {
    slug: 'bars-fitness-almazar', category: 'gym', tier: 1, priceTier: 1, district: 'almazar', lat: 41.3451, lng: 69.2196, hours: 'gym',
    name: { ru: 'Bars Fitness', uz: 'Bars Fitness', en: 'Bars Fitness' },
    street: { ru: 'ул. Фароби, 18', uz: 'Forobiy koʻchasi, 18', en: '18 Farobiy Street' },
    description: {
      ru: 'Зал рядом со студенческим городком: много свободных весов, турники и площадка для функциональных тренировок. По вечерам здесь людно и весело.',
      uz: 'Talabalar shaharchasi yonidagi zal: koʻplab erkin ogʻirliklar, turniklar va funksional mashgʻulotlar maydonchasi. Kechqurunlari gavjum va qiziqarli.',
      en: 'A gym next to the student campus with plenty of free weights, pull-up bars and a functional training area. Busy and lively in the evenings.',
    },
    amenities: ['showers', 'lockers', 'wifi', 'water'],
    classes: ['functional', 'hiit'],
  },
  {
    slug: 'zilol-aqua-mirzo-ulugbek', category: 'pool', tier: 2, priceTier: 2, district: 'mirzo-ulugbek', lat: 41.3272, lng: 69.3301, hours: 'pool',
    womenOnly: [[2, '10:00', '13:00'], [4, '10:00', '13:00']],
    name: { ru: 'Аквацентр Zilol', uz: 'Zilol akvamarkazi', en: 'Zilol Aqua Centre' },
    street: { ru: 'ул. Буюк Ипак Йули, 158', uz: 'Buyuk Ipak Yoʻli koʻchasi, 158', en: '158 Buyuk Ipak Yuli Street' },
    description: {
      ru: 'Бассейн 25 метров на шесть дорожек с подогревом воды, детская чаша и инструкторы по плаванию. По вторникам и четвергам утром — женские часы.',
      uz: 'Isitiladigan suvli olti yoʻlakli 25 metrlik basseyn, bolalar hovuzi va suzish boʻyicha instruktorlar. Seshanba va payshanba kunlari ertalab — ayollar uchun soatlar.',
      en: 'A heated 25-metre pool with six lanes, a children’s pool and swimming instructors. Tuesday and Thursday mornings are women-only hours.',
    },
    amenities: ['showers', 'lockers', 'hairdryer', 'towels', 'parking', 'kids_room'],
    classes: ['aqua_aerobics', 'learn_to_swim', 'technique'],
  },
  {
    slug: 'delfin-pool-chilanzar', category: 'pool', tier: 1, priceTier: 1, district: 'chilanzar', lat: 41.2781, lng: 69.2027, hours: 'pool',
    womenOnly: [[6, '09:00', '12:00']],
    name: { ru: 'Бассейн «Дельфин»', uz: '«Delfin» basseyni', en: 'Delfin Pool' },
    street: { ru: 'Чиланзар, 9-й квартал, 3А', uz: 'Chilonzor 9-mavze, 3A', en: '3A Chilanzar Block 9' },
    description: {
      ru: 'Классический районный бассейн, где многие учились плавать. Свободное плавание, аквааэробика и женские часы по субботам.',
      uz: 'Koʻpchilik suzishni oʻrgangan klassik mahalla basseyni. Erkin suzish, akvaaerobika va shanba kunlari ayollar uchun soatlar.',
      en: 'A classic neighbourhood pool where many locals learned to swim. Lap swimming, aqua aerobics and women-only hours on Saturdays.',
    },
    amenities: ['showers', 'lockers', 'hairdryer'],
    classes: ['aqua_aerobics', 'learn_to_swim'],
  },
  {
    slug: 'aqua-nur-yakkasaray', category: 'pool', tier: 3, priceTier: 3, district: 'yakkasaray', lat: 41.2874, lng: 69.2633, hours: 'poolPremium',
    name: { ru: 'Aqua Nur Club', uz: 'Aqua Nur Club', en: 'Aqua Nur Club' },
    street: { ru: 'ул. Бобура, 76', uz: 'Bobur koʻchasi, 76', en: '76 Bobur Street' },
    description: {
      ru: 'Бассейн с морской водой, джакузи и панорамными окнами на парк. После плавания — финская сауна и травяной чай в лаунже.',
      uz: 'Dengiz suvli basseyn, jakuzi va bogʻga qaragan panorama oynalari. Suzishdan keyin — fin saunasi va lounjda giyohli choy.',
      en: 'A saltwater pool with a jacuzzi and panoramic windows onto the park. After your swim, a Finnish sauna and herbal tea in the lounge.',
    },
    amenities: ['showers', 'lockers', 'towels', 'sauna', 'hairdryer', 'cafe', 'parking', 'tea_lounge'],
    classes: ['aqua_aerobics', 'technique'],
  },
  {
    slug: 'lotus-yoga-shaykhantahur', category: 'yoga', tier: 2, priceTier: 2, district: 'shaykhantahur', lat: 41.3163, lng: 69.2471, hours: 'studio',
    name: { ru: 'Lotus Yoga Studio', uz: 'Lotus Yoga Studio', en: 'Lotus Yoga Studio' },
    street: { ru: 'ул. Абая, 4', uz: 'Abay koʻchasi, 4', en: '4 Abay Street' },
    description: {
      ru: 'Светлая студия в тихом дворе в центре города. Хатха, виньяса и йога-нидра для любого уровня, коврики и пледы выдаём.',
      uz: 'Shahar markazidagi sokin hovlida joylashgan yorugʻ studiya. Har qanday daraja uchun xatha, vinyasa va yoga-nidra; gilamcha va pled beriladi.',
      en: 'A bright studio in a quiet courtyard in the city centre. Hatha, vinyasa and yoga nidra for every level; mats and blankets provided.',
    },
    amenities: ['mats_provided', 'showers', 'lockers', 'tea_lounge', 'wifi'],
    classes: [{ key: 'hatha', slots: [[1, '19:00'], [3, '19:00'], [6, '10:00']] }, 'vinyasa', 'nidra'],
  },
  {
    slug: 'nafas-yoga-yunusabad', category: 'yoga', tier: 1, priceTier: 1, district: 'yunusabad', lat: 41.3587, lng: 69.2862, hours: 'studio',
    name: { ru: 'Nafas Yoga', uz: 'Nafas Yoga', en: 'Nafas Yoga' },
    street: { ru: 'ул. Богишамол, 21', uz: 'Bogʻishamol koʻchasi, 21', en: '21 Bogishamol Street' },
    description: {
      ru: 'Небольшая студия у Юнусабадского парка: утренняя практика перед работой и мягкая йога по вечерам. Хорошее место, чтобы начать.',
      uz: 'Yunusobod bogʻi yonidagi kichik studiya: ish oldidan ertalabki amaliyot va kechqurun yumshoq yoga. Boshlash uchun yaxshi joy.',
      en: 'A small studio by Yunusabad park, with morning practice before work and gentle yoga in the evenings. A good place to start.',
    },
    amenities: ['mats_provided', 'lockers', 'water'],
    classes: ['hatha', 'nidra'],
  },
  {
    slug: 'oqim-yoga-loft-mirabad', category: 'yoga', tier: 3, priceTier: 3, district: 'mirabad', lat: 41.3051, lng: 69.2875, hours: 'studio',
    name: { ru: 'Oqim Yoga Loft', uz: 'Oqim Yoga Loft', en: 'Oqim Yoga Loft' },
    street: { ru: 'ул. Афросиаб, 12', uz: 'Afrosiyob koʻchasi, 12', en: '12 Afrosiyob Street' },
    description: {
      ru: 'Лофт с высокими потолками и тёплым полом. Аштанга, йога в гамаках и звуковые медитации с опытными преподавателями.',
      uz: 'Shiftlari baland va pollari isitiladigan loft. Tajribali ustozlar bilan ashtanga, gamakda yoga va tovushli meditatsiyalar.',
      en: 'A loft with high ceilings and heated floors. Ashtanga, aerial yoga and sound meditation with experienced teachers.',
    },
    amenities: ['mats_provided', 'showers', 'lockers', 'towels', 'tea_lounge', 'air_conditioning'],
    classes: ['ashtanga', 'aerial', 'vinyasa'],
  },
  {
    slug: 'core-pilates-yakkasaray', category: 'pilates', tier: 3, priceTier: 3, district: 'yakkasaray', lat: 41.2932, lng: 69.2684, hours: 'studio',
    cancellationWindowMin: 720,
    name: { ru: 'Core Pilates Studio', uz: 'Core Pilates Studio', en: 'Core Pilates Studio' },
    street: { ru: 'ул. Шота Руставели, 41', uz: 'Shota Rustaveli koʻchasi, 41', en: '41 Shota Rustaveli Street' },
    description: {
      ru: 'Студия пилатеса на реформерах: занятия в мини-группах до шести человек, внимание к технике и восстановлению после травм.',
      uz: 'Reformerlarda pilates studiyasi: oltitagacha kishilik kichik guruhlarda mashgʻulotlar, texnika va jarohatdan keyin tiklanishga eʼtibor.',
      en: 'A reformer Pilates studio with small groups of up to six and close attention to technique and injury recovery.',
    },
    amenities: ['showers', 'lockers', 'towels', 'air_conditioning'],
    classes: [{ key: 'reformer', slots: [[1, '08:00'], [2, '19:00'], [4, '19:00'], [6, '11:00']] }, 'mat'],
  },
  {
    slug: 'muvozanat-pilates-mirzo-ulugbek', category: 'pilates', tier: 2, priceTier: 2, district: 'mirzo-ulugbek', lat: 41.3184, lng: 69.3076, hours: 'studio',
    name: { ru: 'Muvozanat Pilates', uz: 'Muvozanat Pilates', en: 'Muvozanat Pilates' },
    street: { ru: 'просп. Мустакиллик, 59', uz: 'Mustaqillik shoh koʻchasi, 59', en: '59 Mustaqillik Avenue' },
    description: {
      ru: 'Пилатес на ковриках и с малым оборудованием: укрепляем спину, корпус и осанку. Удобно для тех, кто весь день сидит за компьютером.',
      uz: 'Gilamchada va kichik jihozlar bilan pilates: bel, tana va qomatni mustahkamlaymiz. Kun boʻyi kompyuter oldida oʻtiradiganlar uchun qulay.',
      en: 'Mat Pilates and small-equipment classes that strengthen your back, core and posture. Ideal if you spend all day at a desk.',
    },
    amenities: ['mats_provided', 'showers', 'lockers', 'wifi'],
    classes: ['mat', 'healthy_back'],
  },
  {
    slug: 'ritm-dance-shaykhantahur', category: 'dance', tier: 1, priceTier: 1, district: 'shaykhantahur', lat: 41.3248, lng: 69.2569, hours: 'dance',
    name: { ru: 'Школа танцев Ritm', uz: 'Ritm raqs maktabi', en: 'Ritm Dance School' },
    street: { ru: 'ул. Лабзак, 7', uz: 'Labzak koʻchasi, 7', en: '7 Labzak Street' },
    description: {
      ru: 'Хип-хоп, бачата и современная хореография для взрослых. Группы для новичков стартуют каждый месяц, партнёр не нужен.',
      uz: 'Kattalar uchun xip-xop, bachata va zamonaviy xoreografiya. Yangi boshlovchilar guruhlari har oy ochiladi, sherik shart emas.',
      en: 'Hip-hop, bachata and contemporary choreography for adults. Beginner groups start every month, and no partner is needed.',
    },
    amenities: ['showers', 'lockers', 'water', 'air_conditioning'],
    classes: ['hiphop', 'bachata', 'contemporary'],
  },
  {
    slug: 'raqs-studio-chilanzar', category: 'dance', tier: 1, priceTier: 1, district: 'chilanzar', lat: 41.2921, lng: 69.2301, hours: 'dance',
    name: { ru: 'Raqs Studio', uz: 'Raqs Studio', en: 'Raqs Studio' },
    street: { ru: 'ул. Мукими, 104', uz: 'Muqimiy koʻchasi, 104', en: '104 Muqimiy Street' },
    description: {
      ru: 'Зумба, восточные и национальные танцы в большом зале с зеркалами. Весёлые тренировки, после которых хочется вернуться.',
      uz: 'Koʻzgular bilan jihozlangan katta zalda zumba, sharq va milliy raqslar. Yana qaytgingiz keladigan quvnoq mashgʻulotlar.',
      en: 'Zumba, oriental and Uzbek folk dance in a big mirrored hall. Fun workouts that keep you coming back.',
    },
    amenities: ['lockers', 'water', 'air_conditioning'],
    classes: ['zumba', 'uzbek_folk'],
  },
];
