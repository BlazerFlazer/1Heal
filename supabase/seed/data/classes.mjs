/**
 * Class template catalog: key -> name/description (ru/uz/en), duration (min), capacity, level.
 * Keys double as trainer specialties (trainers.specialties) so the app can translate them.
 */
const t = (name, description, durationMin, capacity, level = 'any') => ({
  name,
  description,
  durationMin,
  capacity,
  level,
});

// prettier-ignore
export const CLASSES = {
  functional: t(
    { ru: 'Функциональный тренинг', uz: 'Funksional mashgʻulot', en: 'Functional training' },
    { ru: 'Круговая тренировка с собственным весом, гирями и эспандерами.', uz: 'Oʻz vazni, gantellar va rezina lentalar bilan aylanma mashgʻulot.', en: 'A circuit workout with bodyweight, kettlebells and resistance bands.' },
    55, 14),
  strength_basics: t(
    { ru: 'Силовая база', uz: 'Kuch asoslari', en: 'Strength basics' },
    { ru: 'Учимся правильно приседать, делать становую тягу и жим под присмотром тренера.', uz: 'Murabbiy nazorati ostida toʻgʻri oʻtirib-turish, shtanga tortish va siqishni oʻrganamiz.', en: 'Learn to squat, deadlift and press with good form under a coach’s eye.' },
    60, 8, 'beginner'),
  hiit: t(
    { ru: 'Интервальная тренировка HIIT', uz: 'HIIT intervalli mashgʻulot', en: 'HIIT intervals' },
    { ru: 'Короткие интенсивные интервалы, чтобы разогнать пульс и сжечь калории.', uz: 'Pulsni tezlashtirish va kaloriya yoqish uchun qisqa va jadal intervallar.', en: 'Short, intense intervals to raise your heart rate and burn calories.' },
    45, 16, 'intermediate'),
  stretching: t(
    { ru: 'Стретчинг', uz: 'Choʻzilish mashqlari', en: 'Stretching' },
    { ru: 'Спокойная растяжка всего тела для гибкости и восстановления.', uz: 'Egiluvchanlik va tiklanish uchun butun tanani xotirjam choʻzish.', en: 'A calm full-body stretch for flexibility and recovery.' },
    50, 16),
  aqua_aerobics: t(
    { ru: 'Аквааэробика', uz: 'Akvaaerobika', en: 'Aqua aerobics' },
    { ru: 'Энергичная тренировка в воде под музыку, щадящая для суставов.', uz: 'Musiqa ostida suvda gʻayratli mashgʻulot, boʻgʻimlarga yengil.', en: 'An upbeat workout in the water set to music, easy on the joints.' },
    45, 20),
  learn_to_swim: t(
    { ru: 'Плавание для взрослых с нуля', uz: 'Kattalar uchun noldan suzish', en: 'Adult learn-to-swim' },
    { ru: 'Учимся держаться на воде и правильно дышать в небольшой группе с инструктором.', uz: 'Instruktor bilan kichik guruhda suvda turish va toʻgʻri nafas olishni oʻrganamiz.', en: 'Learn to float and breathe properly in a small group with an instructor.' },
    45, 6, 'beginner'),
  technique: t(
    { ru: 'Техника кроля', uz: 'Krol texnikasi', en: 'Front crawl technique' },
    { ru: 'Ставим технику кроля и работаем над выносливостью.', uz: 'Krol texnikasini sozlaymiz va chidamlilik ustida ishlaymiz.', en: 'Polish your front crawl and build endurance.' },
    60, 8, 'intermediate'),
  hatha: t(
    { ru: 'Хатха-йога', uz: 'Xatha-yoga', en: 'Hatha yoga' },
    { ru: 'Плавная практика с удержанием асан и вниманием к дыханию.', uz: 'Asanalarni ushlab turish va nafasga eʼtibor qaratilgan ravon amaliyot.', en: 'A steady practice holding postures with attention to the breath.' },
    75, 16),
  vinyasa: t(
    { ru: 'Виньяса-флоу', uz: 'Vinyasa flow', en: 'Vinyasa flow' },
    { ru: 'Динамичные связки асан в ритме дыхания.', uz: 'Nafas ritmida asanalarning dinamik bogʻlamalari.', en: 'Dynamic sequences of postures linked to the breath.' },
    60, 16, 'intermediate'),
  nidra: t(
    { ru: 'Йога-нидра', uz: 'Yoga-nidra', en: 'Yoga nidra' },
    { ru: 'Глубокое расслабление лёжа, которое помогает снять стресс и лучше спать.', uz: 'Yotgan holda chuqur boʻshashish: stressni yengillashtiradi va uyquni yaxshilaydi.', en: 'Deep guided relaxation lying down to ease stress and sleep better.' },
    45, 18),
  ashtanga: t(
    { ru: 'Аштанга-йога', uz: 'Ashtanga-yoga', en: 'Ashtanga yoga' },
    { ru: 'Классическая последовательность аштанги для тех, кто уже практикует.', uz: 'Amaliyot qilib yurganlar uchun ashtanganing klassik ketma-ketligi.', en: 'The classic Ashtanga sequence for people who already practise.' },
    90, 14, 'advanced'),
  aerial: t(
    { ru: 'Йога в гамаках', uz: 'Gamakda yoga', en: 'Aerial yoga' },
    { ru: 'Асаны в подвесных гамаках: вытяжение позвоночника и немного полёта.', uz: 'Osma gamaklarda asanalar: umurtqa pogʻonasini choʻzish va biroz parvoz.', en: 'Postures in suspended hammocks for spinal traction and a little flight.' },
    60, 8),
  reformer: t(
    { ru: 'Пилатес на реформере', uz: 'Reformerda pilates', en: 'Reformer Pilates' },
    { ru: 'Работа на реформере в мини-группе: сила корпуса и контроль движения.', uz: 'Kichik guruhda reformerda mashgʻulot: tana kuchi va harakat nazorati.', en: 'Reformer work in a mini group for core strength and movement control.' },
    55, 6),
  mat: t(
    { ru: 'Пилатес на ковриках', uz: 'Gilamchada pilates', en: 'Mat Pilates' },
    { ru: 'Базовые упражнения пилатеса для глубоких мышц и осанки.', uz: 'Chuqur mushaklar va qomat uchun pilatesning asosiy mashqlari.', en: 'Core Pilates exercises for deep muscles and posture.' },
    55, 12),
  healthy_back: t(
    { ru: 'Здоровая спина', uz: 'Sogʻlom bel', en: 'Healthy back' },
    { ru: 'Мягкие упражнения для тех, у кого от сидячей работы болит поясница или шея.', uz: 'Oʻtirib ishlashdan beli yoki boʻyni ogʻriydiganlar uchun yengil mashqlar.', en: 'Gentle exercises for lower back or neck pain from desk work.' },
    50, 10, 'beginner'),
  hiphop: t(
    { ru: 'Хип-хоп для начинающих', uz: 'Yangi boshlovchilar uchun xip-xop', en: 'Hip-hop for beginners' },
    { ru: 'Базовые шаги и простые связки под актуальную музыку.', uz: 'Zamonaviy musiqa ostida asosiy qadamlar va oddiy bogʻlamalar.', en: 'Basic steps and easy combinations to current music.' },
    60, 20, 'beginner'),
  bachata: t(
    { ru: 'Бачата', uz: 'Bachata', en: 'Bachata' },
    { ru: 'Парный танец со сменой партнёров по кругу — приходить можно одному.', uz: 'Sheriklar navbat bilan almashadigan juft raqs — yolgʻiz kelish mumkin.', en: 'A partner dance with rotating partners, so you can come on your own.' },
    60, 20),
  contemporary: t(
    { ru: 'Контемпорари', uz: 'Kontemporari', en: 'Contemporary' },
    { ru: 'Свободное движение, импровизация и работа в партере.', uz: 'Erkin harakat, improvizatsiya va polda ishlash.', en: 'Free movement, improvisation and floor work.' },
    75, 14, 'intermediate'),
  zumba: t(
    { ru: 'Зумба', uz: 'Zumba', en: 'Zumba' },
    { ru: 'Танцевальная кардиотренировка на латиноамериканских ритмах.', uz: 'Lotin Amerikasi ritmlarida raqsli kardio mashgʻulot.', en: 'A dance cardio workout to Latin rhythms.' },
    55, 25),
  uzbek_folk: t(
    { ru: 'Узбекский национальный танец', uz: 'Oʻzbek milliy raqsi', en: 'Uzbek folk dance' },
    { ru: 'Пластика рук, характерные движения и красивые постановки.', uz: 'Nafis qoʻl harakatlari, oʻziga xos qadamlar va chiroyli sahnalashtirishlar.', en: 'Graceful arm work, signature movements and beautiful routines.' },
    60, 16),
  boxing: t(
    { ru: 'Бокс', uz: 'Boks', en: 'Boxing' },
    { ru: 'Стойка, удары и работа на лапах; перчатки можно взять в клубе.', uz: 'Turish holati, zarbalar va lapalarda ishlash; qoʻlqopni klubdan olish mumkin.', en: 'Stance, punches and pad work; gloves are available at the club.' },
    60, 16),
  kickboxing: t(
    { ru: 'Кикбоксинг', uz: 'Kikboksing', en: 'Kickboxing' },
    { ru: 'Удары руками и ногами, кардио и сила в одной тренировке.', uz: 'Qoʻl va oyoq zarbalari, kardio va kuch bitta mashgʻulotda.', en: 'Punches and kicks, cardio and strength in one workout.' },
    60, 16, 'intermediate'),
  mma: t(
    { ru: 'ММА', uz: 'MMA', en: 'MMA' },
    { ru: 'Смешанные единоборства: ударная техника, борьба и спарринги.', uz: 'Aralash jang sanʼati: zarba texnikasi, kurash va sparringlar.', en: 'Mixed martial arts: striking, grappling and sparring.' },
    90, 14, 'advanced'),
  judo: t(
    { ru: 'Дзюдо для взрослых', uz: 'Kattalar uchun dzyudo', en: 'Adult judo' },
    { ru: 'Страховка, броски и борьба в партере с нуля.', uz: 'Noldan toʻgʻri yiqilish, tashlashlar va parterda kurash.', en: 'Breakfalls, throws and groundwork from scratch.' },
    90, 18, 'beginner'),
  karate: t(
    { ru: 'Карате', uz: 'Karate', en: 'Karate' },
    { ru: 'Кихон, ката и кумитэ для взрослых любого уровня.', uz: 'Har qanday darajadagi kattalar uchun kixon, kata va kumite.', en: 'Kihon, kata and kumite for adults of any level.' },
    75, 18),
  kurash: t(
    { ru: 'Курэш', uz: 'Kurash', en: 'Kurash' },
    { ru: 'Национальная борьба в стойке: захваты за пояс, броски и честный поединок.', uz: 'Tik turgan holdagi milliy kurash: belbogʻdan ushlash, tashlashlar va halol bellashuv.', en: 'National stand-up wrestling: belt grips, throws and fair play.' },
    90, 20),
  wod: t(
    { ru: 'Тренировка дня (WOD)', uz: 'Kun mashgʻuloti (WOD)', en: 'Workout of the day (WOD)' },
    { ru: 'Разминка, техника и интенсивный комплекс — каждый день новый.', uz: 'Badan qizdirish, texnika va jadal kompleks — har kuni yangisi.', en: 'Warm-up, skill work and an intense workout, new every day.' },
    60, 14),
  olympic: t(
    { ru: 'Тяжёлая атлетика', uz: 'Ogʻir atletika', en: 'Olympic weightlifting' },
    { ru: 'Рывок и толчок: техника, мобильность и постепенное увеличение веса.', uz: 'Siltab va dast koʻtarish: texnika, harakatchanlik va vaznni asta-sekin oshirish.', en: 'Snatch and clean & jerk: technique, mobility and progressive loading.' },
    75, 8, 'intermediate'),
  express: t(
    { ru: 'Экспресс 45', uz: 'Ekspress 45', en: 'Express 45' },
    { ru: 'Короткий интенсивный комплекс на 45 минут — идеально в обеденный перерыв.', uz: '45 daqiqalik qisqa jadal kompleks — tushlik tanaffusi uchun ayni muddao.', en: 'A short, intense 45-minute session, perfect for a lunch break.' },
    45, 12),
  hammam_ritual: t(
    { ru: 'Ритуал хаммама', uz: 'Hammom marosimi', en: 'Hammam ritual' },
    { ru: 'Прогрев на горячем мраморе, кесе-пилинг и пенный массаж с мастером.', uz: 'Issiq marmarda isinish, kesa-piling va usta bilan koʻpikli massaj.', en: 'Warming up on hot marble, a kese scrub and a foam massage with a therapist.' },
    90, 6),
  aqua_relax: t(
    { ru: 'Аква-релакс', uz: 'Akva-relaks', en: 'Aqua relax' },
    { ru: 'Мягкая растяжка и дыхательные упражнения в тёплом бассейне.', uz: 'Iliq basseynda yumshoq choʻzilish va nafas mashqlari.', en: 'Gentle stretching and breathing exercises in a warm pool.' },
    45, 10),
  salt_room: t(
    { ru: 'Сеанс в соляной комнате', uz: 'Tuz xonasida seans', en: 'Salt room session' },
    { ru: 'Спокойный отдых в соляной пещере под расслабляющую музыку.', uz: 'Tinchlantiruvchi musiqa ostida tuz gʻorida xotirjam dam olish.', en: 'Quiet rest in a salt cave with relaxing music.' },
    40, 8),
  steam_ceremony: t(
    { ru: 'Парение с банным мастером', uz: 'Hammom ustasi bilan bugʻ marosimi', en: 'Steam ceremony with a bath master' },
    { ru: 'Банная церемония с вениками, ароматами и контрастным душем.', uz: 'Supurgi, xushboʻy moylar va kontrast dush bilan hammom marosimi.', en: 'A bath ceremony with birch whisks, aromas and a contrast shower.' },
    60, 8),
  scrub: t(
    { ru: 'Кесе-пилинг и пенный массаж', uz: 'Kesa-piling va koʻpikli massaj', en: 'Kese scrub and foam massage' },
    { ru: 'Традиционное очищение кожи рукавицей кесе и мыльной пеной.', uz: 'Kesa qoʻlqopi va sovun koʻpigi bilan anʼanaviy teri tozalash.', en: 'Traditional skin cleansing with a kese mitt and soap foam.' },
    45, 6),
  mfr: t(
    { ru: 'Самомассаж с роллом (МФР)', uz: 'Rolik bilan oʻz-oʻzini massaj qilish', en: 'Foam rolling' },
    { ru: 'Учимся снимать напряжение в мышцах с помощью ролла и мячей.', uz: 'Rolik va koptoklar yordamida mushaklardagi zoʻriqishni yoʻqotishni oʻrganamiz.', en: 'Learn to release muscle tension with a foam roller and balls.' },
    50, 10),
  face_massage: t(
    { ru: 'Самомассаж лица', uz: 'Yuzni oʻz-oʻzini massaj qilish', en: 'Facial self-massage' },
    { ru: 'Простые техники, которые снимают отёки и напряжение.', uz: 'Shish va zoʻriqishni ketkazadigan oddiy usullar.', en: 'Simple techniques to reduce puffiness and tension.' },
    45, 10),
  exercise_therapy: t(
    { ru: 'ЛФК для спины', uz: 'Bel uchun davolash gimnastikasi', en: 'Back exercise therapy' },
    { ru: 'Лечебная гимнастика в мини-группе под контролем физиотерапевта.', uz: 'Fizioterapevt nazorati ostida kichik guruhda davolash gimnastikasi.', en: 'Therapeutic exercise in a small group supervised by a physiotherapist.' },
    50, 6, 'beginner'),
  knee_rehab: t(
    { ru: 'Реабилитация колена', uz: 'Tizzani tiklash', en: 'Knee rehab' },
    { ru: 'Восстановление после травм и операций на колене, постепенное возвращение к нагрузкам.', uz: 'Tizza jarohati va operatsiyalaridan keyin tiklanish, yuklamaga bosqichma-bosqich qaytish.', en: 'Recovery after knee injuries or surgery with a gradual return to load.' },
    50, 6),
  posture: t(
    { ru: 'Осанка и мобильность', uz: 'Qomat va harakatchanlik', en: 'Posture and mobility' },
    { ru: 'Упражнения для подвижности грудного отдела и плеч.', uz: 'Koʻkrak qismi va yelkalar harakatchanligi uchun mashqlar.', en: 'Exercises for upper back and shoulder mobility.' },
    45, 8),
  mobility: t(
    { ru: 'Растяжка и мобилити', uz: 'Choʻzilish va harakatchanlik', en: 'Stretch and mobility' },
    { ru: 'Восстанавливающая растяжка после тренировок с акцентом на бёдра и спину.', uz: 'Mashgʻulotlardan keyin son va belga urgʻu berilgan tiklovchi choʻzilish.', en: 'Restorative stretching after training, focused on hips and back.' },
    45, 10),
  breathwork: t(
    { ru: 'Дыхательная практика', uz: 'Nafas amaliyoti', en: 'Breathwork' },
    { ru: 'Дыхательные техники, которые снижают стресс и улучшают сон.', uz: 'Stressni kamaytiradigan va uyquni yaxshilaydigan nafas usullari.', en: 'Breathing techniques that lower stress and improve sleep.' },
    40, 12),
  contrast: t(
    { ru: 'Контрастное восстановление', uz: 'Kontrast tiklanish', en: 'Contrast recovery' },
    { ru: 'Сауна, холодная купель и отдых — классический цикл восстановления.', uz: 'Sauna, sovuq hovuz va dam olish — tiklanishning klassik sikli.', en: 'Sauna, cold plunge and rest: the classic recovery cycle.' },
    60, 8),
};
