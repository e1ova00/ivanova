'use strict';

/**
 * Игровые данные «Машулика». Всё — JSON-совместимые объекты.
 *
 * Шкалы растений:
 *   lightNeed / waterNeed / humidityNeed: 1 — низкая, 2 — средняя, 3 — высокая
 *   difficulty: 1 — очень просто … 5 — для профи
 *   rarity: 1 — обычное, 2 — необычное, 3 — редкое, 4 — очень редкое
 *   g — род короткого названия (f/m/n) для склонений в диалогах
 */
const PLANT_DATA = [
  {
    id: 'monstera_deliciosa', name: 'Монстера деликатесная', latinName: 'Monstera deliciosa',
    short: 'монстера', acc: 'монстеру', g: 'f', family: 'monstera',
    rarity: 1, purchasePrice: 1200, recommendedPrice: 2290, unlockLevel: 1,
    waterNeed: 2, lightNeed: 2, humidityNeed: 2, difficulty: 1, petSafe: false,
    size: 'l', flowering: false, trailing: false, patterned: false,
    description: 'Та самая монстера с резными листьями. Растёт быстро и прощает ошибки.',
    careTip: 'Поливай, когда верхние 3 см земли подсохнут. Любит яркий рассеянный свет.',
  },
  {
    id: 'monstera_adansonii', name: 'Монстера Адансона', latinName: 'Monstera adansonii',
    short: 'монстера Адансона', acc: 'монстеру Адансона', g: 'f', family: 'monstera',
    rarity: 2, purchasePrice: 700, recommendedPrice: 1390, unlockLevel: 3,
    waterNeed: 2, lightNeed: 2, humidityNeed: 2, difficulty: 2, petSafe: false,
    size: 'm', flowering: false, trailing: true, patterned: false,
    description: 'Листья в «дырочку», как кружево. Красиво свисает с полки.',
    careTip: 'Любит опору или кашпо на высоте. Не пересушивай.',
  },
  {
    id: 'monstera_thai', name: 'Монстера Thai Constellation', latinName: 'Monstera deliciosa ‘Thai Constellation’',
    short: 'Thai Constellation', acc: 'Thai Constellation', g: 'f', family: 'monstera',
    rarity: 4, purchasePrice: 7500, recommendedPrice: 12900, unlockLevel: 10,
    waterNeed: 2, lightNeed: 3, humidityNeed: 2, difficulty: 3, petSafe: false,
    size: 'l', flowering: false, trailing: false, patterned: true,
    description: 'Кремовые «созвездия» на каждом листе. Мечта любого коллекционера.',
    careTip: 'Кремовым участкам нужен яркий свет, иначе лист станет зеленее.',
  },
  {
    id: 'monstera_albo', name: 'Монстера Albo', latinName: 'Monstera deliciosa ‘Albo Variegata’',
    short: 'монстера Albo', acc: 'монстеру Albo', g: 'f', family: 'monstera',
    rarity: 4, purchasePrice: 9000, recommendedPrice: 14900, unlockLevel: 14,
    waterNeed: 2, lightNeed: 3, humidityNeed: 3, difficulty: 4, petSafe: false,
    size: 'l', flowering: false, trailing: false, patterned: true,
    description: 'Белоснежная вариегатность половинками листа. Жемчужина магазина.',
    careTip: 'Белые участки легко обгорают — только рассеянный свет и высокая влажность.',
  },
  {
    id: 'alocasia_polly', name: 'Алоказия Полли', latinName: 'Alocasia ‘Polly’',
    short: 'алоказия Полли', acc: 'алоказию Полли', g: 'f', family: 'alocasia',
    rarity: 1, purchasePrice: 900, recommendedPrice: 1690, unlockLevel: 1,
    waterNeed: 2, lightNeed: 2, humidityNeed: 3, difficulty: 3, petSafe: false,
    size: 'm', flowering: false, trailing: false, patterned: true,
    description: 'Тёмные стреловидные листья с белыми прожилками. Немного драматичная.',
    careTip: 'Не любит сквозняки и холодную воду. Влажность — её всё.',
  },
  {
    id: 'alocasia_frydek', name: 'Алоказия Frydek', latinName: 'Alocasia micholitziana ‘Frydek’',
    short: 'алоказия Frydek', acc: 'алоказию Frydek', g: 'f', family: 'alocasia',
    rarity: 3, purchasePrice: 2200, recommendedPrice: 3400, unlockLevel: 5,
    waterNeed: 2, lightNeed: 2, humidityNeed: 3, difficulty: 3, petSafe: false,
    size: 'm', flowering: false, trailing: false, patterned: true,
    description: 'Бархатный тёмно-зелёный лист и светлые прожилки. Любовь Маши.',
    careTip: 'Протирай листья мягкой тканью — бархат собирает пыль.',
  },
  {
    id: 'alocasia_black_velvet', name: 'Алоказия Black Velvet', latinName: 'Alocasia reginula ‘Black Velvet’',
    short: 'Black Velvet', acc: 'Black Velvet', g: 'f', family: 'alocasia',
    rarity: 3, purchasePrice: 2000, recommendedPrice: 3290, unlockLevel: 5,
    waterNeed: 1, lightNeed: 1, humidityNeed: 3, difficulty: 4, petSafe: false,
    size: 's', flowering: false, trailing: false, patterned: true,
    description: 'Компактная, почти чёрная, с серебряными венами. Маленькая звезда.',
    careTip: 'Корни боятся перелива: лучше недолить, чем перелить.',
  },
  {
    id: 'alocasia_dragon_scale', name: 'Алоказия Dragon Scale', latinName: 'Alocasia baginda ‘Dragon Scale’',
    short: 'Dragon Scale', acc: 'Dragon Scale', g: 'f', family: 'alocasia',
    rarity: 3, purchasePrice: 3200, recommendedPrice: 5490, unlockLevel: 8,
    waterNeed: 2, lightNeed: 2, humidityNeed: 3, difficulty: 4, petSafe: false,
    size: 'm', flowering: false, trailing: false, patterned: true,
    description: 'Серебристо-зелёные листья с фактурой драконьей чешуи.',
    careTip: 'Рыхлый ароидный грунт и влажный воздух — и дракон будет счастлив.',
  },
  {
    id: 'alocasia_silver_dragon', name: 'Алоказия Silver Dragon', latinName: 'Alocasia baginda ‘Silver Dragon’',
    short: 'Silver Dragon', acc: 'Silver Dragon', g: 'f', family: 'alocasia',
    rarity: 4, purchasePrice: 4200, recommendedPrice: 6990, unlockLevel: 14,
    waterNeed: 1, lightNeed: 2, humidityNeed: 3, difficulty: 4, petSafe: false,
    size: 's', flowering: false, trailing: false, patterned: true,
    description: 'Почти лунный, серебряный оттенок листа. Редкость даже для коллекций.',
    careTip: 'Поливай аккуратно, после подсыхания субстрата.',
  },
  {
    id: 'ficus_elastica', name: 'Фикус каучуконосный', latinName: 'Ficus elastica',
    short: 'фикус', acc: 'фикус', g: 'm', family: 'ficus',
    rarity: 1, purchasePrice: 900, recommendedPrice: 1690, unlockLevel: 1,
    waterNeed: 2, lightNeed: 3, humidityNeed: 1, difficulty: 1, petSafe: false,
    size: 'l', flowering: false, trailing: false, patterned: false,
    description: 'Глянцевые тёмные листья и характер стойкого оловянного солдатика.',
    careTip: 'Протирай листья и поворачивай горшок к свету раз в пару недель.',
  },
  {
    id: 'ficus_lyrata', name: 'Фикус лировидный', latinName: 'Ficus lyrata',
    short: 'фикус лировидный', acc: 'фикус лировидный', g: 'm', family: 'ficus',
    rarity: 2, purchasePrice: 1600, recommendedPrice: 2990, unlockLevel: 4,
    waterNeed: 2, lightNeed: 3, humidityNeed: 2, difficulty: 3, petSafe: false,
    size: 'l', flowering: false, trailing: false, patterned: false,
    description: 'Огромные листья-скрипки. Звезда интерьерных журналов.',
    careTip: 'Не переставляй его лишний раз — он обижается и сбрасывает листья.',
  },
  {
    id: 'zamioculcas', name: 'Замиокулькас', latinName: 'Zamioculcas zamiifolia',
    short: 'замиокулькас', acc: 'замиокулькас', g: 'm', family: 'zz',
    rarity: 1, purchasePrice: 700, recommendedPrice: 1290, unlockLevel: 1,
    waterNeed: 1, lightNeed: 1, humidityNeed: 1, difficulty: 1, petSafe: false,
    size: 'm', flowering: false, trailing: false, patterned: false,
    description: '«Долларовое дерево». Переживёт отпуск, переезд и даже понедельник.',
    careTip: 'Поливай редко: клубни сами запасают воду.',
  },
  {
    id: 'sansevieria', name: 'Сансевиерия', latinName: 'Sansevieria trifasciata',
    short: 'сансевиерия', acc: 'сансевиерию', g: 'f', family: 'sansevieria',
    rarity: 1, purchasePrice: 600, recommendedPrice: 1090, unlockLevel: 1,
    waterNeed: 1, lightNeed: 1, humidityNeed: 1, difficulty: 1, petSafe: false,
    size: 'm', flowering: false, trailing: false, patterned: true,
    description: '«Тёщин язык»: строгие вертикальные листья. Почти неубиваемая.',
    careTip: 'Раз в 2–3 недели полить — и забыть. Перелив — единственный враг.',
  },
  {
    id: 'spathiphyllum', name: 'Спатифиллум', latinName: 'Spathiphyllum wallisii',
    short: 'спатифиллум', acc: 'спатифиллум', g: 'm', family: 'spathiphyllum',
    rarity: 1, purchasePrice: 550, recommendedPrice: 990, unlockLevel: 1,
    waterNeed: 3, lightNeed: 1, humidityNeed: 3, difficulty: 2, petSafe: false,
    size: 'm', flowering: true, trailing: false, patterned: false,
    description: '«Женское счастье» с белыми парусами-цветками. Сам скажет, что хочет пить.',
    careTip: 'Опустил листья — пора поливать. Через час он снова бодрый.',
  },
  {
    id: 'calathea', name: 'Калатея', latinName: 'Calathea ornata',
    short: 'калатея', acc: 'калатею', g: 'f', family: 'calathea',
    rarity: 2, purchasePrice: 800, recommendedPrice: 1490, unlockLevel: 2,
    waterNeed: 3, lightNeed: 1, humidityNeed: 3, difficulty: 3, petSafe: true,
    size: 'm', flowering: false, trailing: false, patterned: true,
    description: 'Листья с розовыми штрихами, которые на ночь складываются «в молитве».',
    careTip: 'Мягкая отстоянная вода и влажный воздух. Без прямого солнца.',
  },
  {
    id: 'phalaenopsis', name: 'Орхидея фаленопсис', latinName: 'Phalaenopsis',
    short: 'орхидея', acc: 'орхидею', g: 'f', family: 'orchid',
    rarity: 2, purchasePrice: 900, recommendedPrice: 1590, unlockLevel: 3,
    waterNeed: 1, lightNeed: 2, humidityNeed: 2, difficulty: 2, petSafe: true,
    size: 's', flowering: true, trailing: false, patterned: false,
    description: 'Нежные цветки-бабочки на изогнутом цветоносе. Цветёт месяцами.',
    careTip: 'Полив погружением раз в 7–10 дней, когда корни станут серебристыми.',
  },
  {
    id: 'anthurium', name: 'Антуриум', latinName: 'Anthurium andraeanum',
    short: 'антуриум', acc: 'антуриум', g: 'm', family: 'anthurium',
    rarity: 2, purchasePrice: 900, recommendedPrice: 1690, unlockLevel: 4,
    waterNeed: 2, lightNeed: 2, humidityNeed: 3, difficulty: 2, petSafe: false,
    size: 'm', flowering: true, trailing: false, patterned: false,
    description: 'Глянцевые цветки-сердечки. «Мужское счастье» и отличный подарок.',
    careTip: 'Любит тепло и влажность. Цветёт почти круглый год.',
  },
  {
    id: 'epipremnum', name: 'Эпипремнум', latinName: 'Epipremnum aureum',
    short: 'эпипремнум', acc: 'эпипремнум', g: 'm', family: 'epipremnum',
    rarity: 1, purchasePrice: 400, recommendedPrice: 790, unlockLevel: 1,
    waterNeed: 2, lightNeed: 1, humidityNeed: 2, difficulty: 1, petSafe: false,
    size: 'm', flowering: false, trailing: true, patterned: true,
    description: 'Золотистые плети-лианы. Растёт везде, где есть хоть немного света.',
    careTip: 'Подрезай плети — будет гуще. Черенки легко укореняются в воде.',
  },
  {
    id: 'hoya', name: 'Хойя', latinName: 'Hoya carnosa',
    short: 'хойя', acc: 'хойю', g: 'f', family: 'hoya',
    rarity: 2, purchasePrice: 500, recommendedPrice: 990, unlockLevel: 2,
    waterNeed: 1, lightNeed: 2, humidityNeed: 2, difficulty: 2, petSafe: true,
    size: 's', flowering: true, trailing: true, patterned: false,
    description: 'Восковой плющ с ароматными цветками-звёздочками.',
    careTip: 'Не срезай отцветшие цветоносы — на них цветёт снова.',
  },
  {
    id: 'cactus', name: 'Кактус Цереус', latinName: 'Cereus peruvianus',
    short: 'кактус', acc: 'кактус', g: 'm', family: 'cactus',
    rarity: 1, purchasePrice: 250, recommendedPrice: 490, unlockLevel: 1,
    waterNeed: 1, lightNeed: 3, humidityNeed: 1, difficulty: 1, petSafe: true,
    size: 's', flowering: true, trailing: false, patterned: false,
    description: 'Колючий, но добрый. Любит солнце и забывчивых хозяев.',
    careTip: 'Зимой почти не поливать. Летом — раз в 2 недели.',
  },
];

const RARITY_NAMES = { 1: 'обычное', 2: 'необычное', 3: 'редкое', 4: 'очень редкое' };
const LEVEL_NAMES3 = { 1: 'низкая', 2: 'средняя', 3: 'высокая' };

/** Стартовый склад Дня 1 */
const START_STOCK = {
  monstera_deliciosa: 2, alocasia_polly: 2, zamioculcas: 2, sansevieria: 2,
  spathiphyllum: 2, epipremnum: 2, cactus: 3, ficus_elastica: 1,
};

/** Допродажи у кассы */
const UPSELLS = [
  { id: 'soil_aroid', name: 'грунт для ароидных', price: 490, cost: 180, families: ['monstera', 'alocasia', 'anthurium', 'epipremnum'], minLevel: 1 },
  { id: 'soil_cactus', name: 'грунт для кактусов', price: 290, cost: 100, families: ['cactus', 'zz', 'sansevieria'], minLevel: 1 },
  { id: 'bark', name: 'кору для орхидей', price: 390, cost: 140, families: ['orchid'], minLevel: 1 },
  { id: 'fert', name: 'мягкое удобрение', price: 350, cost: 120, families: null, minLevel: 1 },
  { id: 'pot_cream', name: 'керамический горшок', price: 690, cost: 260, families: null, minLevel: 2 },
  { id: 'pot_premium', name: 'дизайнерское кашпо', price: 1890, cost: 700, families: null, minLevel: 8, minRarity: 3 },
];

/** Требования покупателей. Критерии сравниваются с параметрами растения. */
const REQUESTS = [
  { id: 'north_cat', text: 'У меня северные окна, и дома живёт кот. Я новичок. Что мне лучше взять?', crit: { maxLight: 1, petSafe: true, maxDifficulty: 3 }, ctx: 'кот и мало света' },
  { id: 'big_living', text: 'Мне нужно большое растение для светлой гостиной. Чтобы прям «вау».', crit: { size: 'l', minLight: 2 }, ctx: 'большое растение' },
  { id: 'forget', text: 'Я постоянно забываю поливать растения. Совсем. Даже не спрашивай.', crit: { maxWater: 1, maxDifficulty: 2 }, ctx: 'засухоустойчивое' },
  { id: 'unusual', text: 'Хочу что-нибудь необычное. Цена не важна.', crit: { minRarity: 3 }, ctx: 'что-то редкое', minLevel: 5 },
  { id: 'bathroom', text: 'Мне нужно растение для ванной комнаты. Там влажно и света совсем немного.', crit: { minHumidity: 3, maxLight: 1 }, ctx: 'для ванной' },
  { id: 'gift_noob', text: 'Хочу подарок человеку, который вообще не умеет ухаживать за растениями.', crit: { maxDifficulty: 1, maxWater: 1 }, ctx: 'подарок новичку' },
  { id: 'cactus_killer', text: 'В прошлый раз я {умудрилась|умудрился} убить кактус. Да. Кактус. Не спрашивай.', crit: { maxDifficulty: 1, minWater: 2 }, ctx: 'прощающее перелив' },
  { id: 'survive_me', text: 'Мне нужно растение, которое переживёт мои навыки садовода.', crit: { maxDifficulty: 1 }, ctx: 'неубиваемое' },
  { id: 'bloom_mom', text: 'Хочу, чтобы цвело! Это подарок маме на день рождения.', crit: { flowering: true }, ctx: 'цветущее' },
  { id: 'desk', text: 'Ищу что-то на рабочий стол. Маленькое и неприхотливое.', crit: { size: 's', maxDifficulty: 2 }, ctx: 'на рабочий стол' },
  { id: 'dog', text: 'У меня собака, которая пробует на вкус абсолютно всё. Что будет безопасно?', crit: { petSafe: true }, ctx: 'безопасное для питомцев' },
  { id: 'independent', text: 'Мне нужно что-нибудь максимально самостоятельное. Как я.', crit: { maxDifficulty: 1, maxWater: 1 }, ctx: 'самостоятельное' },
  { id: 'dream_alocasia', text: 'Я мечтаю об алоказии! Но немного боюсь, что не справлюсь…', crit: { family: 'alocasia' }, ctx: 'алоказия' },
  { id: 'internet_monstera', text: 'Хочу монстеру. Ну, ту самую, с дырочками, как во всех интерьерах.', crit: { family: 'monstera' }, ctx: 'монстера' },
  { id: 'south', text: 'Окна на юг, солнце жарит целый день. Кто такое выдержит?', crit: { minLight: 3 }, ctx: 'светолюбивое' },
  { id: 'bedroom', text: 'Ищу растение в спальню. Там полутень, и я не очень {внимательная|внимательный}.', crit: { maxLight: 2, maxDifficulty: 2 }, ctx: 'для спальни' },
  { id: 'student', text: 'Нужно что-то недорогое, до тысячи. Я {студентка|студент}, сами понимаете.', crit: { maxPrice: 1000 }, ctx: 'недорогое' },
  { id: 'trailing', text: 'Хочу ампельное растение, чтобы красиво свисало с полки.', crit: { trailing: true }, ctx: 'ампельное' },
  { id: 'promise', text: 'Я {обещала|обещал} себе завести растение. Буду поливать! Ну… постараюсь.', crit: { maxDifficulty: 2 }, ctx: 'первое растение' },
  { id: 'patterns', text: 'Хочу что-нибудь с необычными листьями — узоры, полоски, вот это всё.', crit: { patterned: true }, ctx: 'узорные листья' },
  { id: 'collector', text: 'Я коллекционирую ароидные. Удивите меня чем-нибудь редким.', crit: { minRarity: 3, families: ['monstera', 'alocasia'] }, ctx: 'редкие ароидные', only: ['collector'] },
  { id: 'vip', text: 'Мне нужен эффектный акцент для лобби отеля. Что-нибудь по-настоящему редкое.', crit: { minRarity: 4 }, ctx: 'очень редкое', only: ['vip'] },
  { id: 'hard_office', text: 'Офис, лампы дневного света, кондиционер и коллеги, которые всё поливают кофе. Что выживет?', crit: { maxLight: 1, maxDifficulty: 1, maxHumidity: 2 }, ctx: 'офисное', only: ['hard'] },
  { id: 'hard_cat_bloom', text: 'Хочу цветущее, безопасное для кошки и чтобы не капризничало. Это много?', crit: { flowering: true, petSafe: true, maxDifficulty: 2 }, ctx: 'цветущее для кошки', only: ['hard'] },
];

/** «Самостоятельный выбор» — покупатель уже присмотрел растение. */
const SELF_CHOICE = [
  { q: 'Как думаешь, [она|он|оно] подойдёт для спальни, где совсем мало света?', crit: { maxLight: 1 } },
  { q: 'У меня дома кот. С ним всё будет в порядке?', crit: { petSafe: true } },
  { q: 'Я часто уезжаю в командировки. [Она|Он|Оно] выдержит?', crit: { maxWater: 1 } },
  { q: 'Я совсем {новенькая|новенький} в растениях. Справлюсь с [ней|ним|ним]?', crit: { maxDifficulty: 2 } },
  { q: 'Хочу поставить [её|его|его] в ванную. Подойдёт?', crit: { minHumidity: 3 } },
  { q: 'У меня окно на солнечную сторону. [Ей|Ему|Ему] там будет хорошо?', crit: { minLight: 3 } },
];

/** Второй вопрос покупателя и варианты ответа */
const QUESTIONS = {
  water: {
    q: 'А как часто [её|его|его] поливать?',
    answers: {
      1: 'Редко: только когда земля полностью просохнет',
      2: 'Когда верхний слой земли подсохнет',
      3: 'Часто: земля должна быть слегка влажной',
    },
    wrong: ['Каждый день по стакану — для надёжности'],
    key: 'waterNeed',
  },
  light: {
    q: '[Ей|Ему|Ему] нужен яркий свет?',
    answers: {
      1: 'Нет, хватит полутени — хоть у северного окна',
      2: 'Яркий, но рассеянный свет, без прямого солнца',
      3: 'Да, очень много света, можно даже солнце',
    },
    wrong: [],
    key: 'lightNeed',
  },
  humidity: {
    q: '[Ей|Ему|Ему] нужна высокая влажность?',
    answers: {
      1: 'Нет, обычный комнатный воздух подойдёт',
      2: 'Средняя: иногда можно опрыскивать',
      3: 'Да, очень! Лучше поставить рядом увлажнитель',
    },
    wrong: [],
    key: 'humidityNeed',
  },
  pet: {
    q: 'А [она|он|оно] безопасн[а|ен|о] для кота?',
    answers: { true: 'Да, [она|он|оно] безопасн[а|ен|о] для питомцев', false: 'Нет, лучше держать подальше от питомцев' },
    wrong: [],
    key: 'petSafe',
  },
  fert: {
    q: 'Нужно ли [её|его|его] удобрять?',
    answers: { yes: 'Весной и летом раз в 2–4 недели, зимой — отдых' },
    wrong: ['Каждый день — чем больше, тем лучше', 'Никогда, удобрения только вредят'],
    key: null,
  },
};

/** Архетипы покупателей */
const ARCHETYPES = [
  { id: 'student', title: 'Студент', minLevel: 1, genders: ['f', 'm'], priceSens: 1.3, patience: 1.0,
    looks: { skin: ['#f2c7a5', '#e8b48e', '#c98d66'], hair: ['#2b1d16', '#7a4a2a', '#d6a35c', '#1c1c1c'], top: ['#7aa0c4', '#e6d36a', '#9bc49a'], bottom: ['#3d4a66', '#4a4040'], style: ['short', 'pony', 'long'], acc: ['backpack', 'none', 'headphones'] } },
  { id: 'office', title: 'Офисный работник', minLevel: 1, genders: ['f', 'm'], priceSens: 1.0, patience: 0.9,
    looks: { skin: ['#f2c7a5', '#e0a982', '#b07850'], hair: ['#2b1d16', '#4a3020', '#8a6a4a'], top: ['#e8e4dc', '#9fb3c8', '#c8a0a8'], bottom: ['#2e3340', '#3c3c44'], style: ['short', 'bob', 'side'], acc: ['glasses', 'none', 'bag'] } },
  { id: 'granny', title: 'Бабушка-садовод', minLevel: 1, genders: ['f'], priceSens: 1.2, patience: 1.4,
    looks: { skin: ['#f0c9ad', '#e3b593'], hair: ['#d8d4cf', '#bdb8b2'], top: ['#b05a6a', '#8a6aa8', '#6a8a6a'], bottom: ['#5a4a5a', '#4a4a3a'], style: ['bun'], acc: ['glasses', 'scarf'] } },
  { id: 'blogger', title: 'Блогер', minLevel: 1, genders: ['f'], priceSens: 0.9, patience: 0.8,
    looks: { skin: ['#f5d0b5', '#e8b48e', '#8a5a3c'], hair: ['#e7a3b6', '#f0e0b0', '#a07ad0', '#2b1d16'], top: ['#f4f0e8', '#f1b8c8', '#222222'], bottom: ['#e8d8c8', '#3a3a4a'], style: ['long', 'bun', 'pony'], acc: ['phone', 'earrings'] } },
  { id: 'mom', title: 'Молодая мама', minLevel: 1, genders: ['f'], priceSens: 1.1, patience: 0.9,
    looks: { skin: ['#f2c7a5', '#d9a07a'], hair: ['#5a3a22', '#2b1d16', '#c08a4a'], top: ['#a8c8b8', '#e8c0a0', '#c8b8e0'], bottom: ['#4a5a7a', '#5a4a4a'], style: ['pony', 'bob'], acc: ['bag', 'none'] } },
  { id: 'it', title: 'Айтишник', minLevel: 1, genders: ['m'], priceSens: 0.9, patience: 1.0,
    looks: { skin: ['#f2c7a5', '#e0a982', '#a87048'], hair: ['#2b1d16', '#6a4a2a', '#1c1c1c'], top: ['#4a4a5a', '#3a5a4a', '#6a4a6a'], bottom: ['#2e3340', '#3a3a3a'], style: ['short', 'messy'], acc: ['glasses', 'beard', 'headphones'] } },
  { id: 'retiree', title: 'Пенсионер', minLevel: 3, genders: ['m'], priceSens: 1.2, patience: 1.3,
    looks: { skin: ['#f0c9ad', '#d8a888'], hair: ['#cfcac4', '#9a948e'], top: ['#7a6a5a', '#5a6a7a'], bottom: ['#4a4a4a', '#5a4a3a'], style: ['bald', 'short'], acc: ['cap', 'glasses'] } },
  { id: 'hard', title: 'Сложный покупатель', minLevel: 9, genders: ['f', 'm'], priceSens: 1.25, patience: 1.35,
    looks: { skin: ['#f2c7a5', '#c98d66'], hair: ['#1c1c1c', '#5a3a22'], top: ['#5a5a6a', '#7a3a3a'], bottom: ['#2a2a2a'], style: ['bob', 'short'], acc: ['glasses', 'bag'] } },
  { id: 'collector', title: 'Коллекционер', minLevel: 11, genders: ['f', 'm'], priceSens: 0.7, patience: 1.0,
    looks: { skin: ['#f2c7a5', '#b07850'], hair: ['#3a2a1a', '#8a8a8a'], top: ['#3f5f4a', '#6a5a3a'], bottom: ['#3a3a2a'], style: ['side', 'long'], acc: ['glasses', 'bag'] } },
  { id: 'vip', title: 'VIP-гость', minLevel: 12, genders: ['f', 'm'], priceSens: 0.55, patience: 0.9,
    looks: { skin: ['#f5d0b5', '#c98d66'], hair: ['#1c1c1c', '#e8d090'], top: ['#1e1e28', '#f4ece0'], bottom: ['#1e1e28'], style: ['side', 'bob'], acc: ['sunglasses', 'earrings'] } },
];

const NAMES = {
  f: ['Алина', 'Вера', 'Ксения', 'Полина', 'Ольга', 'Марина', 'Юля', 'Таня', 'Аня', 'Ева', 'Мила', 'Света'],
  m: ['Илья', 'Миша', 'Олег', 'Дима', 'Сергей', 'Артём', 'Костя', 'Гоша', 'Паша'],
  granny: ['Галина Петровна', 'Тамара Ивановна', 'Зоя Павловна'],
  retiree: ['Пётр Иваныч', 'Виктор Семёныч'],
};

/** Постоянные клиенты — возвращаются и помнят прошлые советы */
const REGULARS = [
  { name: 'Соня', gender: 'f', look: { skin: '#f5d0b5', hair: '#c4553c', top: '#f1b8c8', bottom: '#5a6a8a', style: 'long', acc: 'earrings' } },
  { name: 'Катя', gender: 'f', look: { skin: '#f2c7a5', hair: '#2b1d16', top: '#a8c8a0', bottom: '#3d4a66', style: 'bob', acc: 'glasses' } },
  { name: 'Антон', gender: 'm', look: { skin: '#e0a982', hair: '#4a3020', top: '#6a8ab0', bottom: '#2e3340', style: 'messy', acc: 'beard' } },
  { name: 'Лиза', gender: 'f', look: { skin: '#f5d0b5', hair: '#e8c070', top: '#e8e0f0', bottom: '#8a6a8a', style: 'pony', acc: 'headphones' } },
  { name: 'Нина', gender: 'f', look: { skin: '#a87048', hair: '#1c1c1c', top: '#e6a35a', bottom: '#4a3a3a', style: 'bun', acc: 'earrings' } },
  { name: 'Даша', gender: 'f', look: { skin: '#f2c7a5', hair: '#8a5a3a', top: '#f4f0e8', bottom: '#5a7a6a', style: 'side', acc: 'bag' } },
];

/** Реплики */
const LINES = {
  greet: [
    'Здравствуйте! Можно с вами посоветоваться?',
    'Привет! Ой, как у вас тут уютно…',
    'Добрый день! Мне нужна помощь специалиста.',
    'Здравствуйте! Я тут уже всё рассмотрел{а|}, и теперь совсем запутал{ась|ся}.',
  ],
  returnGood: [
    'Машулик! [Та|Тот|То] {short} прекрасно растёт! Я теперь по утрам с [ней|ним|ним] здороваюсь.',
    'Привет-привет! Помнишь {acc}? Даёт новый лист каждую неделю! Я снова к тебе.',
  ],
  returnBad: [
    'Помнишь {acc}? Кажется, мы с [ней|ним|ним] друг друга не поняли… Давай попробуем ещё раз?',
    'Привет… {short} у меня загрустил[а||о]. Может, я что-то не то выбрал{а|}? Хочу ещё попытку.',
  ],
  perfect: ['Ой, [она|он|оно] прекрас[на|ен|но]! Беру!', 'Да! Это ровно то, что я искал{а|}.', 'Какая красота… Всё, я влюбил{ась|ся}.'],
  good: ['Хм, неплохо! Думаю, подойдёт.', 'Ладно, доверюсь тебе.', 'Окей, звучит разумно.'],
  bad: ['Хм… Не уверен{а|}, что это то, что я просил{а|}.', 'Эм… ну, допустим. Хотя я не совсем об этом.', 'Странный выбор, но ладно…'],
  answerRight: ['Ага, запомнил{а|}! Спасибо!', 'О, понятно! Сразу видно — профи.', 'Записываю в заметки!'],
  answerWrong: ['Правда? Хм, в интернете писали по-другому…', 'Ой… ну хорошо, попробую.', 'Звучит подозрительно, но ладно.'],
  cheap: ['Ого, как недорого! Отлично!', 'Так дёшево? Беру, пока не передумали!'],
  fair: ['Цена нормальная.', 'Хорошо, по цене подходит.'],
  pricey: ['Хм, дороговато… но ладно, раз уж так понравилось.', 'Кусается… но [она|он|оно] того стоит.'],
  priceyRefuse: ['Нет, для меня это всё-таки дороговато. Извини.', 'Хм… пожалуй, подумаю ещё. Дороговато.'],
  expensiveRefuse: ['{price}? Это {short} или первоначальный взнос за квартиру?', 'Сколько?! Нет-нет, я лучше пойду.'],
  expensiveBuy: ['Ох… {price}. Ладно. Я буду есть гречку, но [она|он|оно] будет моим.'],
  upsellYes: ['А давай! Раз ты советуешь.', 'О, точно, мне как раз нужно!', 'Хорошая идея, добавь.'],
  upsellNo: ['Нет, спасибо, у меня всё есть.', 'В другой раз!'],
  leaveAngry: 'Кажется, сегодня здесь слишком занято. Я зайду в другой раз.',
  thanks: ['Спасибо, Машулик! До встречи!', 'Спасибо! Обязательно вернусь!', 'Ура, у меня новое растение!'],
  refuseLeave: ['Ладно, может, в другой раз.', 'Я ещё подумаю. Пока!'],
  selfPick: 'Мне очень понравил[ась|ся|ось] {name}!',
};

/** Отзывы — подставляются в зависимости от событий дня */
const REVIEWS = {
  5: [
    'Маша помогла выбрать {acc}. Я влюбил{ась|ся}!',
    'Самый уютный магазин в городе. И консультация — огонь!',
    'Пришёл{а|} за одним растением, ушёл{а|} с советами на год вперёд.',
    'Машулик — это любовь. {short} уже дома, и мы счастливы.',
  ],
  4: [
    'Очень красивый магазин. Немного пришлось подождать.',
    'Хорошие растения и милая хозяйка. Вернусь!',
    'Купил{а|} {acc}, всё понравилось. Цены — терпимо.',
  ],
  3: [
    'Неплохо, но совет был не совсем про меня.',
    'Растения красивые, но цены кусаются.',
    'Нормально. Ожидал{а|} чуть большего.',
  ],
  2: [
    'Хорошие растения, но цены кусаются.',
    'Мне посоветовали что-то не то… Посмотрим, выживет ли.',
    'Долго ждал{а|}, так ничего и не купил{а|}.',
  ],
  1: [
    'Ушёл{а|} без покупки. Слишком долго ждать.',
    'Цены как в ювелирном. Не моё.',
  ],
};

/** Уровни развития магазина */
const LEVELS = [
  { level: 1, title: 'Маленький магазин', unlock: 'Маленький магазин и мечта' },
  { level: 2, title: 'Первые улыбки', unlock: 'Новые горшки · Калатея и Хойя' },
  { level: 3, title: 'Своё местечко', unlock: 'Больше покупателей · Орхидея и Монстера Адансона' },
  { level: 4, title: 'Зелёный уголок', unlock: 'Новый стеллаж · Антуриум и Фикус лировидный' },
  { level: 5, title: 'Уютная лавка', unlock: 'Редкие алоказии · Гирлянда' },
  { level: 6, title: 'Модная точка', unlock: 'Новый декор и постеры' },
  { level: 7, title: 'Опытная хозяйка', unlock: 'Вредители (осматривай растения!)' },
  { level: 8, title: 'Бутик-лайт', unlock: 'Премиальные горшки · Dragon Scale' },
  { level: 9, title: 'Знаток', unlock: 'Сложные покупатели' },
  { level: 10, title: 'Зона редкостей', unlock: 'Редкие монстеры · Витрина редкостей' },
  { level: 11, title: 'Клуб ароидных', unlock: 'Коллекционеры' },
  { level: 12, title: 'Для своих', unlock: 'VIP-гости' },
  { level: 13, title: 'Премиум', unlock: 'Премиальная зона' },
  { level: 14, title: 'Легенда района', unlock: 'Очень редкие растения: Albo и Silver Dragon' },
  { level: 15, title: 'Лучший магазин года', unlock: 'Золотая табличка «Лучший магазин растений года»' },
];

/** XP до следующего уровня */
const XP_TO_NEXT = (level) => 180 + (level - 1) * 10;

/** Ежедневные задания */
const QUESTS = [
  { id: 'sell', text: 'Продать {n} растения', stat: 'sales', n: [3, 4, 5], xp: 60, money: 500 },
  { id: 'five', text: 'Получить {n} пятизвёздочных отзыва', stat: 'fiveStars', n: [2, 3], xp: 70, money: 600 },
  { id: 'aloc', text: 'Продать {n} алоказии', stat: 'alocasias', n: [2], xp: 70, money: 700, minLevel: 1 },
  { id: 'nolose', text: 'Не потерять ни одного покупателя', stat: 'lost', n: [0], xp: 60, money: 500, inverse: true },
  { id: 'earn', text: 'Заработать {n} ₽ выручки', stat: 'revenue', n: [6000, 8000, 12000], xp: 70, money: 600 },
  { id: 'consult', text: 'Правильно проконсультировать {n} покупателей', stat: 'goodConsults', n: [3, 4], xp: 70, money: 500 },
  { id: 'care', text: 'Полить или удобрить {n} растений', stat: 'careActions', n: [4, 6], xp: 40, money: 300 },
  { id: 'upsell', text: 'Сделать {n} допродажи', stat: 'upsells', n: [2, 3], xp: 50, money: 400 },
];

/** Достижения */
const ACHIEVEMENTS = [
  { id: 'first_sale', name: 'Первая продажа', desc: 'Продать первое растение', icon: 'coin' },
  { id: 'green_hands', name: 'Зелёные руки', desc: 'Поухаживать за растениями 25 раз', icon: 'can' },
  { id: 'five_stars', name: 'Пять звёзд', desc: 'Получить первый отзыв ★★★★★', icon: 'star' },
  { id: 'collector', name: 'Коллекционер', desc: 'Держать на складе 12 разных видов одновременно', icon: 'pots' },
  { id: 'alocasia_queen', name: 'Королева алоказий', desc: 'Продать 8 алоказий', icon: 'alocasia' },
  { id: 'rare_find', name: 'Редкая находка', desc: 'Продать редкое растение', icon: 'gem' },
  { id: 'business_lady', name: 'Бизнес-леди', desc: 'Накопить 50 000 ₽ на балансе', icon: 'bag' },
  { id: 'all_happy', name: 'Все довольны', desc: 'Закончить день, где все покупатели довольны (от 4 человек)', icon: 'heart' },
  { id: 'monstera_lover', name: 'Любитель монстер', desc: 'Продать 8 монстер', icon: 'monstera' },
  { id: 'regular', name: 'Свои люди', desc: 'Встретить вернувшегося постоянного клиента', icon: 'door' },
  { id: 'sharp_eye', name: 'Зоркий глаз', desc: 'Найти и вылечить вредителей', icon: 'glass' },
  { id: 'dream_owner', name: 'Хозяйка мечты', desc: 'Достичь 15 уровня и получить главную награду', icon: 'trophy' },
];

const TUTORIAL_TEXT = {
  hello: 'Доброе утро, Маша! Перед открытием проверим растения. Нажми на монстеру.',
  walking: 'Маша идёт к монстере…',
  dry: 'Кажется, земля сухая. Попробуй полить её.',
  watered: 'Отлично! Теперь можно открывать магазин — кнопка «Открыть» наверху.',
  firstCustomer: 'Пришёл первый покупатель! Подожди, пока он осмотрится, а потом нажми на него.',
  toCheckout: 'Покупатель идёт к кассе. Нажми на кассу, чтобы рассчитать его.',
  afterSale: 'Первая продажа! Загляни в компьютер слева — там каталог поставщика.',
  done: '',
};
