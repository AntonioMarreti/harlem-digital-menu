export type Category = {
  id: string;
  name: string;
};

export type MenuChoice = {
  label: string;
  description?: string;
  group?: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  tags?: string[];
  source?: 'harlem' | 'craft_beery';
  sourceLabel?: string;
  choices?: MenuChoice[];
};

export type Table = {
  id: string;
  name: string;
  number: number;
  qrSlug?: string;
};

export const categories: Category[] = [
  { id: 'cat_hookah', name: 'Кальяны' },
  { id: 'cat_drinks', name: 'Напитки' },
  { id: 'cat_tea', name: 'Чай / кофе' },
  { id: 'cat_snacks', name: 'Закуски' },
  { id: 'cat_desserts', name: 'Десерты' },
  { id: 'cat_food', name: 'Еда Craft Beery' },
  { id: 'cat_cider', name: 'Сидр' },
];

export const menuItems: MenuItem[] = [
  // Harlem / Кальяны
  {
    id: 'item_1',
    categoryId: 'cat_hookah',
    name: 'Кальян',
    description: 'Классический кальян.',
    price: 999,
    isAvailable: true,
    tags: ['классика'],
    source: 'harlem',
    sourceLabel: 'Харлем',
  },
  {
    id: 'item_2',
    categoryId: 'cat_hookah',
    name: 'Кальян премиум',
    description: 'На табаках Trofimoff\'s и Tangiers.',
    price: 1299,
    isAvailable: true,
    tags: ['премиум', 'Trofimoff\'s', 'Tangiers'],
    source: 'harlem',
    sourceLabel: 'Харлем',
  },

  // Harlem / Напитки
  { id: 'dr_1', categoryId: 'cat_drinks', name: 'Кола Добрый 0,5', description: '', price: 170, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_2', categoryId: 'cat_drinks', name: 'Кола Добрый 0,33', description: '', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_3', categoryId: 'cat_drinks', name: 'Кола оригинальная 0,33', description: '', price: 190, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_4', categoryId: 'cat_drinks', name: 'Кола Добрый без сахара 0,5', description: '', price: 170, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_5', categoryId: 'cat_drinks', name: 'Кола Добрый без сахара 0,33', description: '', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_6', categoryId: 'cat_drinks', name: 'Фанта Добрый 0,5', description: '', price: 170, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_7', categoryId: 'cat_drinks', name: 'Фанта Добрый 0,33', description: '', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_8', categoryId: 'cat_drinks', name: 'Спрайт Добрый 0,5', description: '', price: 170, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_9', categoryId: 'cat_drinks', name: 'Спрайт Добрый 0,33', description: '', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_10', categoryId: 'cat_drinks', name: 'Сок в ассортименте', description: '', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_11', categoryId: 'cat_drinks', name: 'Чай Rich в ассортименте 0,5', description: '', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_12', categoryId: 'cat_drinks', name: 'Вода газированная 0,5', description: '', price: 100, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_13', categoryId: 'cat_drinks', name: 'Вода без газа 0,5', description: '', price: 100, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_14', categoryId: 'cat_drinks', name: 'Ред Бул 0,25', description: '', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_15', categoryId: 'cat_drinks', name: 'Адреналин 0,45', description: '', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_16', categoryId: 'cat_drinks', name: 'Берн 0,45', description: '', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_17', categoryId: 'cat_drinks', name: 'Лит Энерджи 0,45', description: '', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },

  // Harlem / Лимонады (added to Напитки)
  { id: 'dr_18', categoryId: 'cat_drinks', name: 'Мохито Очаково 0,45', description: 'вкусы: лимон-лайм, виноград-алоэ, клубника, черника-голубика, манго, гранат.', price: 190, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_19', categoryId: 'cat_drinks', name: 'Лаймон Фреш 0,33', description: 'вкусы: лимон-лайм, клубника-огурец, лайм-лимон-мята.', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'dr_20', categoryId: 'cat_drinks', name: 'Лит Энерджи 0,33', description: 'вкусы: клубника-арбуз, черничный донат, фейхоа.', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },

  // Harlem / Сидр
  { id: 'cid_1', categoryId: 'cat_cider', name: 'Chester’s 0,45 · 5,0%', description: '', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем', choices: [
    { label: 'вишня' }, { label: 'груша' }, { label: 'лесные ягоды' }, { label: 'яблоко' }, { label: 'грейпфрут' }
  ] },
  { id: 'cid_2', categoryId: 'cat_cider', name: 'Chester’s 0,45 · 7,0%', description: '', price: 270, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем', choices: [
    { label: 'малина-крыжовник' }, { label: 'ежевика-мята' }, { label: 'персик-абрикос' }, { label: 'кокос-клубника' }
  ] },
  { id: 'cid_3', categoryId: 'cat_cider', name: 'White Phoenix 0,45 · 5,6%', description: '', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем', choices: [
    { label: 'виноград-мандарин' }, { label: 'гранат-малина' }, { label: 'кокос-цитрус' }, { label: 'манго-цитрус' }, { label: 'маракуя-вишня' }
  ] },

  // Harlem / Чай / кофе
  { id: 'tea_1', categoryId: 'cat_tea', name: 'Чай 500 мл', description: '', price: 200, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем', choices: [
    { label: 'Эрл Грей', description: 'смесь китайских, цейлонских и индийских чаёв, ароматизированная натуральными маслами бергамота.', group: 'Чёрный чай' },
    { label: 'Горный Чабрец', description: 'чёрный цейлонский чай, чабрец.', group: 'Чёрный чай' },
    { label: 'Дикая вишня', description: 'смесь цейлонских и индийских чаёв с клюквой и листьями грецкого ореха; густой сладкий аромат спелой вишни.', group: 'Чёрный чай' },
    { label: 'Черное золото', description: 'сладко-сдобный кондитерский аромат с шоколадными и медовыми оттенками; мягкий вкус с нотками жжёной карамели, печёных фруктов и кофе.', group: 'Чёрный чай' },
    { label: 'Таёжный сбор', description: 'чёрный чай с брусникой, черноплодкой, ежевикой, календулой, васильком и брусничным листом.', group: 'Чёрный чай' },
    { label: 'Барбарисовый', description: 'цейлонский чёрный чай, ягоды годжи и клубники, розовый перец, гомфрена и сафлор.', group: 'Чёрный чай' },
    { label: 'Леди земляника', description: 'чёрный цейлонский чай с ягодами и листьями земляники; насыщенный ягодный вкус с лёгким сливочным оттенком.', group: 'Чёрный чай' },
    { label: 'Ройбуш Калахари', description: 'ройбуш, лимонная трава, лепестки василька и цитрусовый аромат.', group: 'Тёмный чай и ройбуш' },
    { label: 'Пу Эр дворцовый', description: 'мягкий цветочно-фруктовый аромат с сухофруктами; древесный пуэрный вкус.', group: 'Тёмный чай и ройбуш' },
    { label: 'Да хун пао', description: 'китайский тёмный чай с нотами цветов и мёда.', group: 'Тёмный чай и ройбуш' },
    { label: 'Малиновый улун', description: 'улун с ягодами малины; яркий аромат и мягкий освежающий вкус с лёгкой ягодной кислинкой.', group: 'Зелёный чай и улун' },
    { label: 'Меч самурая', description: 'Ганпаудер, вишня, лимонная трава, цедра апельсина, миндаль; яркий лимонный вкус с цветочными и ягодными нотками.', group: 'Зелёный чай и улун' },
    { label: 'Те Гуань Инь', description: 'китайский полуферментированный чай с цветочным ароматом и лёгким медовым послевкусием.', group: 'Зелёный чай и улун' },
    { label: 'Сян Люй Ча', description: 'зелёный чай с нежным ароматом и мягким насыщенным вкусом с цветочными нотами.', group: 'Зелёный чай и улун' },
    { label: 'Молочный Улун', description: 'китайский улун с ароматом молока.', group: 'Зелёный чай и улун' },
    { label: 'Жасмин', description: 'китайский чай со свежими бутонами жасмина, нежный цветочный аромат и сладковатый вкус.', group: 'Зелёный чай и улун' },
    { label: 'Сенча', description: 'зелёный японский чай со вкусом свежескошенной травы и цветочно-терпким ароматом.', group: 'Зелёный чай и улун' }
  ] },
  { id: 'tea_2', categoryId: 'cat_tea', name: 'Чай 900 мл', description: '', price: 280, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем', choices: [
    { label: 'Эрл Грей', description: 'смесь китайских, цейлонских и индийских чаёв, ароматизированная натуральными маслами бергамота.', group: 'Чёрный чай' },
    { label: 'Горный Чабрец', description: 'чёрный цейлонский чай, чабрец.', group: 'Чёрный чай' },
    { label: 'Дикая вишня', description: 'смесь цейлонских и индийских чаёв с клюквой и листьями грецкого ореха; густой сладкий аромат спелой вишни.', group: 'Чёрный чай' },
    { label: 'Черное золото', description: 'сладко-сдобный кондитерский аромат с шоколадными и медовыми оттенками; мягкий вкус с нотками жжёной карамели, печёных фруктов и кофе.', group: 'Чёрный чай' },
    { label: 'Таёжный сбор', description: 'чёрный чай с брусникой, черноплодкой, ежевикой, календулой, васильком и брусничным листом.', group: 'Чёрный чай' },
    { label: 'Барбарисовый', description: 'цейлонский чёрный чай, ягоды годжи и клубники, розовый перец, гомфрена и сафлор.', group: 'Чёрный чай' },
    { label: 'Леди земляника', description: 'чёрный цейлонский чай с ягодами и листьями земляники; насыщенный ягодный вкус с лёгким сливочным оттенком.', group: 'Чёрный чай' },
    { label: 'Ройбуш Калахари', description: 'ройбуш, лимонная трава, лепестки василька и цитрусовый аромат.', group: 'Тёмный чай и ройбуш' },
    { label: 'Пу Эр дворцовый', description: 'мягкий цветочно-фруктовый аромат с сухофруктами; древесный пуэрный вкус.', group: 'Тёмный чай и ройбуш' },
    { label: 'Да хун пао', description: 'китайский тёмный чай с нотами цветов и мёда.', group: 'Тёмный чай и ройбуш' },
    { label: 'Малиновый улун', description: 'улун с ягодами малины; яркий аромат и мягкий освежающий вкус с лёгкой ягодной кислинкой.', group: 'Зелёный чай и улун' },
    { label: 'Меч самурая', description: 'Ганпаудер, вишня, лимонная трава, цедра апельсина, миндаль; яркий лимонный вкус с цветочными и ягодными нотками.', group: 'Зелёный чай и улун' },
    { label: 'Те Гуань Инь', description: 'китайский полуферментированный чай с цветочным ароматом и лёгким медовым послевкусием.', group: 'Зелёный чай и улун' },
    { label: 'Сян Люй Ча', description: 'зелёный чай с нежным ароматом и мягким насыщенным вкусом с цветочными нотами.', group: 'Зелёный чай и улун' },
    { label: 'Молочный Улун', description: 'китайский улун с ароматом молока.', group: 'Зелёный чай и улун' },
    { label: 'Жасмин', description: 'китайский чай со свежими бутонами жасмина, нежный цветочный аромат и сладковатый вкус.', group: 'Зелёный чай и улун' },
    { label: 'Сенча', description: 'зелёный японский чай со вкусом свежескошенной травы и цветочно-терпким ароматом.', group: 'Зелёный чай и улун' }
  ] },
  { id: 'tea_3', categoryId: 'cat_tea', name: 'Саган дайля', description: 'добавка к чаю.', price: 120, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'tea_4', categoryId: 'cat_tea', name: 'Добавка к чаю', description: 'мята горная, чабрец, мята свежая, лимон, мёд или сироп.', price: 40, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'tea_5', categoryId: 'cat_tea', name: 'Эспрессо', description: '50 мл.', price: 120, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'tea_6', categoryId: 'cat_tea', name: 'Американо', description: '150 мл.', price: 120, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'tea_7', categoryId: 'cat_tea', name: 'Капучино', description: '300 мл.', price: 200, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },

  // Harlem / Закуски
  { id: 'sn_1', categoryId: 'cat_snacks', name: 'Арахис солёный', description: '100 г.', price: 120, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'sn_2', categoryId: 'cat_snacks', name: 'Арахис в хрустящей корочке', description: '100 г.', price: 130, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'sn_3', categoryId: 'cat_snacks', name: 'Фисташки', description: '50 г.', price: 170, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'sn_4', categoryId: 'cat_snacks', name: 'Чипсы в ассортименте', description: '50 г.', price: 120, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'sn_5', categoryId: 'cat_snacks', name: 'Гренки в ассортименте', description: '100 г.', price: 160, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'sn_6', categoryId: 'cat_snacks', name: 'Сыр косичка', description: '100 г.', price: 300, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },

  // Harlem / Десерты
  { id: 'ds_1', categoryId: 'cat_desserts', name: 'Торт в ассортименте', description: '', price: 270, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'ds_2', categoryId: 'cat_desserts', name: 'Шоколад Alpen Gold', description: '80 г.', price: 200, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'ds_3', categoryId: 'cat_desserts', name: 'Шоколад Milka', description: '80 г.', price: 250, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },
  { id: 'ds_4', categoryId: 'cat_desserts', name: 'Шоколад Ritter Sport', description: '100 г.', price: 330, isAvailable: true, source: 'harlem', sourceLabel: 'Харлем' },

  // Craft Beery / Еда
  { id: 'cb_1', categoryId: 'cat_food', name: 'Северная копчёная оленина', description: '40 г.', price: 370, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_2', categoryId: 'cat_food', name: 'Бастурма из говядины', description: '40 г.', price: 370, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_3', categoryId: 'cat_food', name: 'Пастрами', description: 'копчёная грудинка из мраморной говядины, 40 г.', price: 370, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_4', categoryId: 'cat_food', name: 'Суджук из оленины', description: '40 г.', price: 370, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_5', categoryId: 'cat_food', name: 'Фритес с беконом', description: 'хрустящий картофель фри с беконом, огурцом из бочки и сырным соусом. 190 г / 40 г.', price: 410, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_6', categoryId: 'cat_food', name: 'Клаб-сэндвич с цыплёнком', description: 'хрустящий тост, грудка цыплёнка на гриле, яйцо, свежие огурцы, помидор, сыр чеддер. 280 г / 40 г.', price: 430, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_7', categoryId: 'cat_food', name: 'Куриные стрипсы', description: 'мясо курицы в кляре с сырным соусом. 180 г / 40 г.', price: 430, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_8', categoryId: 'cat_food', name: 'Жареный сулугуни', description: 'с авторским ягодным соусом. 230 г.', price: 410, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_9', categoryId: 'cat_food', name: 'Луковые кольца', description: 'в панировке, с кисло-сладким соусом. 100 г / 40 г.', price: 320, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_10', categoryId: 'cat_food', name: 'Куриные крылышки хот-чили', description: 'обжаренные крылышки со свежими овощами и сметанным соусом. 260 г / 60 г.', price: 490, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_11', categoryId: 'cat_food', name: 'Кольца кальмара', description: 'в хрустящей панировке, с соусом сладкий чили. 150 г / 40 г.', price: 430, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_12', categoryId: 'cat_food', name: 'Жареная моцарелла', description: 'с ягодным соусом. 100 г / 40 г.', price: 410, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_13', categoryId: 'cat_food', name: 'Домашние чесночные гренки', description: 'с сырным соусом. 150 г / 40 г.', price: 250, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_14', categoryId: 'cat_food', name: 'Креветки в темпуре', description: 'тигровые креветки с соусом сладкий чили манго. 140 г / 40 г.', price: 640, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_15', categoryId: 'cat_food', name: 'Креветки на гриле', description: 'тигровые креветки на гриле с соусом сладкий чили. 160 г / 40 г.', price: 690, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_16', categoryId: 'cat_food', name: 'Шаурма с цыплёнком', description: 'филе бедра куры, салат, помидор, огурец, лук фри, пряно-томатный соус. 320 г.', price: 440, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_17', categoryId: 'cat_food', name: 'Шаурма со свининой', description: 'свинина, салат, помидор, огурец, лук фри, пряно-томатный соус. 320 г.', price: 440, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_18', categoryId: 'cat_food', name: 'Фиш энд чипс', description: 'филе трески в пивном кляре, картофель айдахо, соус тар-тар. 270 г / 40 г.', price: 640, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_19', categoryId: 'cat_food', name: 'Картофель по-деревенски спайси', description: 'в остром сырном соусе с халапеньо и пармезаном. 200 г.', price: 390, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_20', categoryId: 'cat_food', name: 'Дядя Сэм', description: 'котлета из мраморной говядины, чеддер, BBQ, солёный огурец, лук шалот, салат. 350 г.', price: 590, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_21', categoryId: 'cat_food', name: 'Дядя Сэм Кукареку', description: 'куриная котлета, сыр чеддер, соус карри, солёный огурец, салат, лук. 230 г.', price: 550, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_22', categoryId: 'cat_food', name: 'Бургер с вишнёвым BBQ', description: 'мраморная говядина, чеддер, карамелизированный бекон, лук шалот, салат, вишнёвый BBQ. 350 г.', price: 700, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_23', categoryId: 'cat_food', name: 'Бургер Мексиканский', description: 'мраморная говядина, чеддер, сальса, халапеньо, лук шалот, салат. 350 г.', price: 660, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_24', categoryId: 'cat_food', name: 'Бургер с яйцом и беконом', description: 'мраморная говядина, чеддер, солёный огурец, яйцо, бекон, салат, сальса. 350 г.', price: 670, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_25', categoryId: 'cat_food', name: 'Бургер с грибами', description: 'мраморная говядина, грибное рагу с трюфельным маслом, бекон, моцарелла, карамелизированный лук, сырный соус. 350 г.', price: 670, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_26', categoryId: 'cat_food', name: 'Дубль колбасок с картофелем фри', description: '2 колбаски ручной работы на выбор, грузинская капуста, солёный огурец, картофель фри, BBQ и горчичный соус. 300 г / 40 г.', price: 790, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_27', categoryId: 'cat_food', name: 'Греческий', description: 'сезонные овощи, сыр Фета, зелень, заправка на основе соевого соуса. 230 г.', price: 420, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_28', categoryId: 'cat_food', name: 'Оливье с пастрами', description: 'оливье с копчёным пастрами и луком фри. 250 г.', price: 540, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_29', categoryId: 'cat_food', name: 'Цезарь с цыплёнком', description: 'цыплёнок гриль, романо, черри, гренки, заправка Цезарь. 270 г.', price: 540, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_30', categoryId: 'cat_food', name: 'Цезарь с креветками', description: 'тигровые креветки гриль, романо, черри, гренки, заправка Цезарь. 270 г.', price: 630, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_31', categoryId: 'cat_food', name: 'Стейк из свинины', description: 'на гриле, с картофелем айдахо и грибами в горчичном соусе. 320 г.', price: 780, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_32', categoryId: 'cat_food', name: 'Строганов с курицей', description: 'филе цыплёнка в сметанном соусе с грибами и картофелем фри. 300 г / 40 г.', price: 620, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_33', categoryId: 'cat_food', name: 'Соба с цыплёнком в устричном соусе', description: 'гречневая лапша с филе цыплёнка, овощами и шампиньонами. 330 г.', price: 520, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_34', categoryId: 'cat_food', name: 'Удон с морепродуктами в соусе терияки', description: 'лапша с кальмарами, тигровыми креветками, осьминогами и овощами. 330 г.', price: 650, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_35', categoryId: 'cat_food', name: 'Курица сычуань', description: 'филе курицы в тайском соусе с овощами и рисом. 160 г / 100 г.', price: 630, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_36', categoryId: 'cat_food', name: 'Жарёха со свининой', description: 'свинина с морковью, сладким перцем и картофелем айдахо в томатном соусе. 360 г.', price: 640, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_37', categoryId: 'cat_food', name: 'Фрайд райс', description: 'тайский жареный рис с овощами и морепродуктами. 320 г.', price: 630, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_38', categoryId: 'cat_food', name: 'Айдахо в специях', description: '150 г.', price: 260, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_39', categoryId: 'cat_food', name: 'Картофель фри', description: '150 г.', price: 230, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_40', categoryId: 'cat_food', name: 'Соус ручной работы', description: 'томатный, BBQ, вишнёвый BBQ, пряный томатный, сладкий чили, сырный, тар-тар. 40 г.', price: 90, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_41', categoryId: 'cat_food', name: 'Тарелка Микс для друзей', description: 'кальмар, луковые кольца, гренки, чипсы куриные, чипсы из телятины, моцарелла, фри, 3 соуса. 450 г / 120 г.', price: 1090, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_42', categoryId: 'cat_food', name: 'Завтрак «Пиволюба»', description: 'крылышки, куриные стрипсы, жареная моцарелла, картофель айдахо фри, чесночные гренки и три соуса. 590 г / 120 г.', price: 1290, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_43', categoryId: 'cat_food', name: 'Хот-дог ХРЮ', description: 'свиная колбаска, медово-горчичный соус, майонез, маринованный лук, айсберг, перец, лук фри. 350 г.', price: 450, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_44', categoryId: 'cat_food', name: 'Хот-дог биф', description: 'говяжья колбаска, релиш огуречный, сальса, ширача, халапеньо, маринованный огурец, лук фри. 350 г.', price: 450, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' },
  { id: 'cb_45', categoryId: 'cat_food', name: 'Хот-дог чикен', description: 'куриная колбаска, сырный соус, цезарь, свежий огурец, помидор, фриллис. 330 г.', price: 450, isAvailable: true, source: 'craft_beery', sourceLabel: 'Craft Beery' }
];

export const tables: Table[] = [
  { id: 'demo', name: 'Стол 1', number: 1 },
  { id: 't2', name: 'Window 1', number: 2 },
  { id: 't3', name: 'VIP Lounge', number: 3 },
];


export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'served' | 'closed';
export type CallStatus = 'new' | 'handled';

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  source: 'harlem' | 'craft_beery';
};

export type Order = {
  id: string;
  tableId: string;
  tableNumber: number;
  status: OrderStatus;
  items: OrderItem[];
  time: string;
  totalAmount: number;
};

export type StaffCall = {
  id: string;
  tableId: string;
  tableNumber: number;
  type: string;
  status: CallStatus;
  time: string;
};

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    tableId: 'demo',
    tableNumber: 1,
    status: 'new',
    time: '19:45',
    totalAmount: 1290,
    items: [
      { id: 'item_2', name: 'Кальян премиум', quantity: 1, price: 1290, source: 'harlem' }
    ]
  },
  {
    id: 'ORD-002',
    tableId: 't2',
    tableNumber: 2,
    status: 'preparing',
    time: '19:50',
    totalAmount: 700,
    items: [
      { id: 'tea_2', name: 'Чай 900 мл', quantity: 1, price: 280, source: 'harlem' },
      { id: 'cb_27', name: 'Греческий', quantity: 1, price: 420, source: 'craft_beery' }
    ]
  },
  {
    id: 'ORD-003',
    tableId: 't3',
    tableNumber: 3,
    status: 'accepted',
    time: '19:55',
    totalAmount: 1840,
    items: [
      { id: 'cb_20', name: 'Дядя Сэм', quantity: 2, price: 590, source: 'craft_beery' },
      { id: 'cb_39', name: 'Картофель фри', quantity: 2, price: 230, source: 'craft_beery' },
      { id: 'tea_6', name: 'Американо', quantity: 1, price: 120, source: 'harlem' },
      { id: 'tea_5', name: 'Эспрессо', quantity: 1, price: 120, source: 'harlem' }
    ]
  }
];

export const mockCalls: StaffCall[] = [
  {
    id: 'call_1',
    tableId: 't3',
    tableNumber: 3,
    type: 'Заменить угли',
    status: 'new',
    time: '19:52',
  },
  {
    id: 'call_2',
    tableId: 't2',
    tableNumber: 2,
    type: 'Позвать официанта',
    status: 'new',
    time: '19:58',
  },
  {
    id: 'call_3',
    tableId: 'demo',
    tableNumber: 1,
    type: 'Попросить счёт',
    status: 'handled',
    time: '19:30',
  }
];
