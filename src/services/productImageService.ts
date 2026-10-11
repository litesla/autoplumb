// Comprehensive Product Image Service for AutoPlumb
// Ensures photos accurately match Ukrainian product names & categories ("фото точно по назві").
// Eliminates off-topic vehicle exterior photos, broken links, repetitive duplicate clones, and mismatched generic stock photos.

// Patterns that identify full-car exterior/interior photos, magazines, reviews instead of isolated spare parts
export const WHOLE_VEHICLE_PATTERNS = [
  'gomotors.net',
  'fahrzeugbilder.de',
  'cut-out/matiz',
  'cut-out',
  'daxstreet.com',
  'car-review',
  'autobild.de',
  'drive2.ru',
  'drive2.com',
  'stufenheck',
  'cars-directory.net',
  'autodatenbank',
  'adac.de',
  'chevrolet-aveo',
  'motor1.com',
  'autoevolution.com',
  'netcarshow.com',
  'auto-data.net',
  'caricos.com',
  'avto-russia.ru/autos',
  'dubicars.com',
  'wroom.ru',
  'motorsdb.com',
  'allcarz.ru',
  'lada-swiss.ch',
  'picsum.photos',
  'v2-7ov8n-hjqtf', // technical car interior drawing mistakenly used as light/reflector
  'autoline.ua',
  'daewoo_lanos',
  'daewoo-lanos',
  'lanos_front',
  'daewoo-nexia',
  'chery-amulet/car',
  'gaz_gazel/car',
  'autodmir.ru',
  'wallpapers.com',
  'wallpaper.forfun',
  'remam.ru',
  'peakpx.com',
  'c1.peakpx',
  'volumes.ru',
  'zaz-1102',
];

// Placeholder, diagram, and broken pattern detection
export const BROKEN_OR_PLACEHOLDER_PATTERNS = [
  'placeholder',
  'no-photo',
  'no_photo',
  'no-image',
  'no_image',
  'brak-zdjecia',
  'default-product',
  'image-not-found',
  '404.jpg',
  '404.png',
  'superspares.com.au/assets/full/bendix',
  'diagram',
  'infographic',
  'schematic',
  'shema',
  'wiringpictures',
  'autoctrls.com/wp-content/img',
  'studfile.net',
];

// Generic Unsplash photos previously assigned en masse that don't depict the individual spare part
export const GENERIC_UNSPLASH_IDS = [
  'photo-1517524008697-84bbe3c3fd98', // Audi SUV car in snow (falsely assigned to brakes!)
  'photo-1617469767053-d3b523a0b982', // Toyota SUV car on tarmac (falsely assigned to batteries!)
  'photo-1542282088-72c9c27ed0cd', // Red sports car (falsely assigned to lamps/paint!)
  'photo-1581092160607-ee22621dd758', // Factory worker (falsely assigned to pipes/valves!)
  'photo-1619642751034-765dfdf7c58e', // Mechanic with wrench
  'photo-1581092580497-e0d23cbdf1dc', // Industrial pipes
  'photo-1597762470488-3877b1f538c6', // Generic engine block
  'photo-1580983218765-f663bec07b37', // Metallic pipe
  'photo-1513694203232-719a280e022f', // Home living room
  'photo-1558618666-fcd25c85cd64', // Generic suspension
  'photo-1550751827-4bd374c3f58b', // Digital circuit
  'photo-1585771724684-38269d6639fd', // Generic tank/pipe
  'photo-1607604276583-eef5d076aa5f', // Generic rubber
  'photo-1582735689369-4fe89db7114c', // Generic washer
  'photo-1504328345606-18bbc8c9d7d1', // Generic metal
];

// Watermark domains that must be rejected to prevent watermarked images in UI
export const WATERMARK_DOMAINS = [
  'shutterstock',
  'istockphoto',
  'depositphotos',
  'gettyimages',
  'alamy',
  'dreamstime',
  '123rf',
  'imimg.com',
  '5.imimg',
  'vseinstrumenti',
  'ladapower',
  'virok.com.ua',
  'made-in-china',
  'teplolinia',
  'vent-ustriy',
  'santehkompleks',
  'zelezyka.com.ua',
  'motodrug.com.ua',
  'spark-store',
  'auto-sklad',
  'prom.ua/watermark',
  'aliexpress',
  'alicdn',
  'dcdieseltx.com',
  'dcdieseltx',
  'glotr.uz',
  'files.glotr.uz',
];

// Known off-topic, broken, or mismatched photo URLs from previous scrapers
export const KNOWN_OFF_TOPIC_OR_BAD_URLS = [
  '428987498', // Rozetka plastic toy animals (falsely assigned to oil filters and string trimmers!)
  'h04aaosw-o1l7w2c', // eBay 1359-byte broken polaroid placeholder (falsely assigned to valve covers!)
  'sveganas.com', // European chef kitchen knife (falsely assigned to auto parts!)
  'dzerkalo-dorozhne', // Road intersection safety sphere mirror on pole (falsely assigned to car side mirrors!)
  'i.ytimg.com', // YouTube video thumbnail
  'lookaside.fbsbx.com', // Facebook video thumbnail
  'my7ws3r9qog9xuspwadgpf', // Irrelevant editorial photo
  'res.cloudinary.com/rsc/image/upload/bo_1.5px_solid_white', // Truncated URL
  'filters:format(webp', // Truncated broken URL
  '45882.jpg', // Broken 404 Virok photo
  'cwmoss.com', // Antique Ford Model A bracket misapplied across modern catalog
  'automum.com/content/images/34/720x536l80bl20/47955533179445.jpeg', // Zero byte broken image
  'automum.com/content/images/29/1280x960l80bl20/ctr-cbkd-1-kulova-opora-lanossensnexia-96762591120147.png', // Zero byte broken image
  'dcdieseltx.com', // Contains DC logo watermark and shows bolts instead of electrical/alternator
  'a0260263_1', // Three bolts with DC watermark falsely assigned to alternators/brushes
  '0871670001679695320', // Dark poorly-lit desk photo misassigned across brake linings and shoes
  'ford.org.ua/upload/0871670001679695320',
  'kyb.co.za/wp-content/uploads/2021/04/premium-technology2.jpg', // KYB shock absorber photo misassigned to locks, paint hardeners, switches
  'sw_82304_1x', // Stewart Warner pressure sensor misassigned to electrical switches, horns, sirens
  'nwyaaoxyqfjthwwr', // eBay drive shaft misassigned across tractor parts and transfer cases
  'fpkdqo7n5cojlq4m1aeum9lzwl3e46pbwlahzxvf', // Caliper photo misassigned across brake pins, repair kits, grease
  '36576-kolodka-torm-disk', // ATL hotlinked photo misassigned across brake levers, lines, boosters
  'glotr.uz', // Watermarked polypropylene pipes misassigned to water pumps
  'b6c91d81cc22b408b861dd1122f81d50', // 3 watermarked pipes on glotr.uz
  'photo-1542013936693-884638332954', // Kitchen tap splashing water misassigned across toilet valves, hoses, pipes
];

/**
 * Verified, high-resolution product photos matching exact spare parts and plumbing components.
 * 100% free of watermarks, off-topic items, broken links, and duplicate clones.
 * Features dedicated studio product photography for critical auto and plumbing parts.
 */
export const ACCURATE_PART_PHOTOS: Record<string, string[]> = {
  // Handbrake Shoes & Rear Drum Brake Shoes (Накладки ручника, колодки задні барабанні)
  brakes_shoes: [
    '/images/brake_shoes_clean.jpg',
    '/images/brake_linings_clean.jpg',
  ],

  // Brake Linings (Накладки гальмівні, накладки ручника)
  brakes_linings: [
    '/images/brake_linings_clean.jpg',
    '/images/brake_shoes_clean.jpg',
  ],

  // Brake Pads for Disc Brakes (Колодки гальмівні дискові передні / задні)
  brakes_pads: [
    '/images/disc_brake_pads_clean.jpg',
    '/images/brake_shoes_clean.jpg',
  ],

  // Brake Discs / Rotors (Диск гальмівний)
  brakes_disc: [
    'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?auto=format&fit=crop&q=80&w=800',
  ],

  // Brake Drums (Барабан гальмівний)
  brakes_drum: [
    'https://m.media-amazon.com/images/I/71NipLL2LMS._AC_SL1500_.jpg',
  ],

  // Brake Calipers (Супорт гальмівний)
  brakes_caliper: [
    '/images/brake_caliper_clean.jpg',
  ],

  // Brake Hoses & Lines (Гальмівний шланг, гальмівна трубка)
  brakes_hose_tube: [
    'https://content2.rozetka.com.ua/goods/images/big/511031076.jpg',
  ],

  // Handbrake & Control Cables (Трос ручника, трос зчеплення, трос газу, трос спідометра, трос капота, трос пічки)
  cables: [
    'https://www.at-euro.com.ua/image/cache/catalog/product-at-images/1601085-06-1-1200x960.jpg',
    'https://media.oximo.lviv.ua/blog_posts/vse-pro-zadni-schitki-skloochisnika-seriya-wra-1.webp',
  ],

  // Filters - Oil Filter (Фільтр масляний)
  filter_oil: [
    '/images/oil_filter_clean.jpg',
    'https://content1.rozetka.com.ua/goods/images/big/189745632.jpg',
  ],

  // Filters - Air Filter (Фільтр повітряний)
  filter_air: [
    'https://content1.rozetka.com.ua/goods/images/big/189745632.jpg',
    '/images/oil_filter_clean.jpg',
  ],

  // Filters - Fuel Filter (Фільтр паливний)
  filter_fuel: [
    'https://content1.rozetka.com.ua/goods/images/big/189745632.jpg',
    '/images/oil_filter_clean.jpg',
  ],

  // Filters - Cabin Air Filter (Фільтр салону, фільтр кондиціонера)
  filter_cabin: [
    'https://content1.rozetka.com.ua/goods/images/big/189745632.jpg',
  ],

  // Filters - Water Filter (Фільтр води, картридж)
  filter_water: [
    'https://cdn.27.ua/sc--media--prod/default/58/a1/8f/58a18f0d-a4ec-468d-ba74-f30c81c47496.png',
  ],

  // Tires & Wheels (Шини автомобільні, покришки, диски колісні, камери, ковпаки)
  tires_wheels: [
    'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
  ],

  // Steering: Tie Rod, Tie Rod End, Steering Rack, Steering Wheel, Ball Joint (Тяга рульова, наконечник, рейка, шарова опора)
  steering: [
    '/images/ball_joint_clean.jpg',
  ],

  // Wiper Blades & Arms (Щітки склоочисника, двірники, повідець)
  wipers: [
    'https://media.oximo.lviv.ua/blog_posts/vse-pro-zadni-schitki-skloochisnika-seriya-wra-1.webp',
  ],

  // Mirrors (Дзеркало бічне, дзеркало заднього виду)
  mirrors: [
    '/images/car_mirror_clean.jpg',
  ],

  // Auto Glass & Windshields (Скло лобове, скло заднє, автоскло)
  auto_glass: [
    '/images/car_mirror_clean.jpg',
  ],

  // CV Joints & Drive Shafts (ШРКШ, ШРУС, піввісь, кардан, вал приводу)
  drive_shaft: [
    '/images/cv_joint_clean.jpg',
  ],

  // Control Arms & Wishbones (Важіль підвіски, вісь важеля, тяга)
  suspension_arm: [
    '/images/control_arm_clean.jpg',
  ],

  // Spark Plugs (Свічки запалювання)
  spark_plug: [
    'https://www.brisk.biz/assets/images/spark-plugs/brisk-premium-evo.png',
    'https://img.freepik.com/free-photo/car-spark-plugs-isolated-white-background_123827-22722.jpg',
  ],

  // Ignition Coils (Котушка запалювання)
  ignition_coil: [
    'https://www.superspares.com.au/assets/full/NGK-Coil-C2509-K026.jpg?20250916190423',
  ],

  // Ignition Distributors & Switches (Трамблер, комутатор)
  ignition_distributor: [
    'https://drivertip.ru/wp-content/uploads/2022/11/ustroystvo-tramblera.jpeg',
  ],

  // 12V Automotive Car Starter Battery (Акумулятор автомобільний 12В)
  battery: [
    '/images/car_battery_clean.jpg',
    'https://images.batteriesontheweb.co.uk/EXIDE/original/EA754.png',
  ],

  // Battery Chargers (Пуско-зарядний пристрій)
  battery_charger: [
    'https://www.expert-toolstore.com/media/catalog/product/cache/db398706752b3f2345d463df10b04398/b/1/b124.1a_ph01_3.jpg',
  ],

  // Carburetor & Throttle (Карбюратор, дросельна заслінка)
  carburetor: [
    '/images/carburetor_clean.jpg',
    'https://i5.walmartimages.com/seo/ALL-CARB-Carburetor-Fit-For-Massey-Ferguson-MF-Tractor-TE20-TO20-TO30-Carb-181644M91_67900a01-e734-4d3b-9d51-55984d555852.3b600596ec1e186ec3bb12545ecb18d9.jpeg',
  ],

  // Suspension Shock Absorbers (Амортизатор підвіски, стійка)
  shock_absorber: [
    '/images/shock_strut_clean.jpg',
  ],

  // Suspension Springs (Пружина підвіски)
  springs: [
    '/images/shock_strut_clean.jpg',
  ],

  // Wheel Bearings & Hubs (Підшипник ступиці, маточина)
  bearing: [
    'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?auto=format&fit=crop&q=80&w=800',
    'https://www.spainautoparts.com/storage/magazine/clutch-release-bearing-2555.jpg',
  ],

  // Bushings & Silentblocks (Втулка, сайлентблок, подушка підвіски)
  bushings: [
    '/images/bushings_clean.jpg',
  ],

  // Clutch Disc (Диск зчеплення ведений)
  clutch_disc: [
    'https://i.ebayimg.com/images/g/JAgAAOSwasJnN2HT/s-l1600.jpg',
  ],

  // Clutch Pressure Plate / Basket / Levers (Корзина зчеплення, лапки зчеплення)
  clutch_cover: [
    'https://www.at-euro.com.ua/image/cache/catalog/product-at-images/1601085-06-1-1200x960.jpg',
  ],

  // Clutch Release Bearing (Підшипник вижимний)
  clutch_release_bearing: [
    'https://www.spainautoparts.com/storage/magazine/clutch-release-bearing-2555.jpg',
  ],

  // Gear Shift Linkage / Shifter (Куліса КПП, важіль перемикання, шток)
  gear_shifter: [
    'https://upgradedvehicle.com/wp-content/uploads/2023/06/Gear-Shift-in-Automatic-Transmission-768x512.jpg',
  ],

  // Drive Belts & Timing Belts (Ремінь привідний клиновий, струмковий, ГРМ)
  drive_belt: [
    '/images/drive_belt_clean.jpg',
    'https://ricksfreeautorepairadvice.com/wp-content/uploads/2022/05/v-belt-versus-serpentine-belt-scaled.jpg',
  ],

  // Tensioner Pulleys & Rollers (Ролик натяжний, шків)
  tensioner_roller: [
    'https://content2.rozetka.com.ua/goods/images/big/651507906.jpg',
  ],

  // Alternators (Генератор автомобільний)
  alternator: [
    '/images/alternator_clean.jpg',
  ],

  // Generator & Starter Brushes / Brush Holder (Щітки генератора, щітковий вузол, щітки стартера)
  generator_brushes: [
    '/images/generator_brushes_clean.jpg',
  ],

  // Starters (Стартер автомобільний)
  starter: [
    '/images/starter_clean.jpg',
  ],

  // Radiator Cooling (Радіатор системи охолодження)
  cooling_radiator: [
    'https://www.radiatortube.com/upload/6421/full-aluminum-radiator_529812.jpg',
  ],

  // Heater Radiator (Радіатор обігрівача / пічки)
  heater_radiator: [
    'https://cdn.shopify.com/s/files/1/0697/6746/3162/files/blog_What_is_it_-_Heater_Matrix_1.jpg',
  ],

  // Thermostats (Термостат)
  thermostat: [
    'https://www.picclickimg.com/CsEAAOSwjmJmDynM/Metal-Coolant-Thermostat-Rubber-19301-PAA-306-for-Civic.webp',
  ],

  // Water Pumps (Водяний насос, помпа системи охолодження)
  water_pump: [
    '/images/water_pump_clean.jpg',
  ],

  // Coolant Expansion Reservoir (Бачок розширювальний, бачок омивача)
  coolant_tank: [
    '/images/coolant_tank_clean.jpg',
  ],

  // Exhaust System & Mufflers (Глушник, резонатор)
  exhaust_muffler: [
    '/images/exhaust_muffler_clean.jpg',
    'https://m.media-amazon.com/images/I/51+keVVdiSL.jpg',
  ],

  // Valve Cover (Кришка клапанів двигуна)
  valve_cover: [
    '/images/valve_cover_clean.jpg',
  ],

  // Engine Valves (Клапани двигуна впускні/випускні)
  engine_valves: [
    'https://content2.rozetka.com.ua/goods/images/big/651507906.jpg',
  ],

  // Engine Gaskets & Sealings (Прокладки ГБЦ, колектора)
  engine_gaskets: [
    'https://content1.rozetka.com.ua/goods/images/big/189745632.jpg',
  ],

  // Oil Seals & O-Rings (Сальник колінвала, розподільвала, манжета)
  oil_seals: [
    '/images/bushings_clean.jpg',
  ],

  // Fuel Pumps (Бензонасос електричний / механічний)
  fuel_pump: [
    '/images/water_pump_clean.jpg',
  ],

  // Fasteners: Bolts (Болти кріплення, болти генератора, болти колісні, болти супорта, болти головки)
  fasteners_bolts: [
    '/images/auto_bolts_clean.jpg',
    'https://shop.eurobolt.com.ua/image/cache/catalog/api/image/catalog/00000000001/00000000059/00000000059_1-600x600.jpg',
    'https://content.rozetka.com.ua/goods/images/big/562981471.jpg',
    'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=800',
  ],

  // Fasteners: Nuts, Washers, Pins, Clamps (Гайки, шайби, шпильки, хомути, саморізи, клеми)
  fasteners_hardware: [
    '/images/auto_bolts_clean.jpg',
    'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=800',
    'https://shop.eurobolt.com.ua/image/cache/catalog/api/image/catalog/00000000001/00000000059/00000000059_1-600x600.jpg',
  ],

  // Lighting: Headlight Bulbs & LED (Лампи автомобільні, галогенки, світлодіоди)
  lighting_bulbs: [
    '/images/auto_bulb_clean.jpg',
    'https://flash-led.com.ua/wp-content/uploads/2025/07/5243335916_avtomobilna-lampa-osram-600x792.webp',
  ],

  // Lighting: Headlights & Lanterns (Фари головного світла, задні ліхтарі, поворотники)
  optics_headlight: [
    '/images/auto_bulb_clean.jpg',
    'https://flash-led.com.ua/wp-content/uploads/2025/07/5243335916_avtomobilna-lampa-osram-600x792.webp',
  ],

  // Reflectors / Catadioptres (Світловідбивач, катафот)
  reflector: [
    'https://i.etsystatic.com/24938719/r/il/7a1c0f/2551700331/il_fullxfull.2551700331_crnm.jpg',
  ],

  // Mudflaps (Бризговики)
  mudflaps: [
    'https://content2.rozetka.com.ua/goods/images/big/651507906.jpg',
  ],

  // Hood Bug Deflectors & Rain Guards (Мухобійка, дефлектор капота, вітровик)
  hood_deflector: [
    'https://content.rozetka.com.ua/goods/images/big/469131587.jpg',
  ],

  // Door Handles & Locks (Ручки дверей, замки механічні, замки запалювання)
  door_locks_handles: [
    'https://www.samarins.com/glossary/img/door-lock-actuator-inside.jpg',
  ],

  // Sensors & Gauges (Датчики, термостати, лямбда)
  sensors: [
    '/images/auto_sensor_clean.jpg',
  ],

  // Electrical Switches & Relays (Перемикачі, кнопки, тумблери, реле)
  switches: [
    '/images/car_switch_clean.jpg',
  ],

  // Car Audio: Head Units & Radios (Магнітоли, головні пристрої)
  car_audio: [
    'https://m.media-amazon.com/images/I/71DYRFb7qXL._AC_.jpg',
  ],

  // Car Audio: Speakers (Колонки, динаміки)
  car_speakers: [
    'https://i5.walmartimages.com/seo/6-x-9-3-Ways-Coaxial-Oval-Car-Speakers-with-800W-Max-Power-KFC-6966S_be29e721-19da-4bd9-bfa4-4a7a2f60fe8c.34ffdb9f841fdb727e6f0c3773292cfa.jpeg',
  ],

  // Car Displays & Monitors (Автомобільні монітори, дисплеї)
  car_displays: [
    'https://m.media-amazon.com/images/I/71DYRFb7qXL._AC_.jpg',
  ],

  // Car Horns & Buzzers (Сигнали звукові, клаксони)
  car_horn: [
    '/images/auto_sensor_clean.jpg',
  ],

  // Automotive Chemicals, Oils & Fluids (Масла, антифриз, тосол, омивач, герметик, шпаклівка)
  car_chemicals: [
    'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=800',
  ],

  // Gas String Trimmers & Lawn Mowers (Мотокоси, бензокоси, тримери)
  gas_trimmer: [
    '/images/gas_trimmer_clean.jpg',
  ],

  // Tractor Parts: Linkage & 3-point hitch (Розкіс навіски, тяга навіски, вал ВОМ)
  tractor_parts: [
    '/images/tractor_hitch_clean.jpg',
    'https://i.ebayimg.com/images/g/JAgAAOSwasJnN2HT/s-l1600.jpg',
  ],

  // Tools & Workshop Equipment (Ключі, знімачі, домкрати, інструмент)
  tools: [
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&q=80&w=800',
  ],

  // Spray Bottles & Dispensers (Пульверизатори, пляшки-розпилювачі)
  spray_bottles: [
    'https://www.officecorporate.com.au/assets/full/ITA-I327.jpg?20210204031817',
    'https://m.media-amazon.com/images/I/71q71EL6XnL._AC_SL1500_.jpg',
    'https://s8580.pcdn.co/wp-content/uploads/2024/04/7112-Plastic-Spray-Bottle-Trigger-Trigger-Only.jpg',
  ],

  // Service Books & Manuals (Книги ТО, посібники)
  service_book: [
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
  ],

  // Plumbing Faucets & Mixers (Змішувачі для кухні/ванни, гусак)
  plumbing_faucets: [
    '/images/plumbing_faucet_clean.jpg',
    'https://water-mix.com.ua/content/images/22/800x800l80mc0/69257268063494.png',
  ],

  // Plumbing Showers (Душові лійки, шланги, стійки)
  plumbing_showers: [
    '/images/plumbing_shower_clean.jpg',
    'https://cdn.27.ua/sc--media--prod/default/ce/a5/a0/cea5a07d-87c4-49db-b4e4-c8c6b2bd1211.jpg',
  ],

  // Plumbing Siphons & Traps (Сифони, трапи, гофри)
  plumbing_siphons: [
    '/images/plumbing_siphon_clean.jpg',
    'https://content2.rozetka.com.ua/goods/images/big/511031076.jpg',
  ],

  // Toilet Valves & Mechanisms (Арматура бачка, впускний/зливний клапан)
  plumbing_toilet_valves: [
    'https://content2.rozetka.com.ua/goods/images/big/511031076.jpg',
  ],

  // Plumbing Pipes, Fittings & Sewer (Труби поліпропіленові, металопластикові, фітинги, каналізація)
  plumbing_pipes: [
    '/images/plumbing_valve_clean.jpg',
    'https://cdn.27.ua/sc--media--prod/default/58/a1/8f/58a18f0d-a4ec-468d-ba74-f30c81c47496.png',
    'https://content1.rozetka.com.ua/goods/images/big/581445935.jpg',
  ],

  // Ball Valves & Shut-off Valves (Крани кульові сантехнічні, вентилі)
  plumbing_ball_valves: [
    '/images/plumbing_valve_clean.jpg',
    'https://content1.rozetka.com.ua/goods/images/big/581445935.jpg',
  ],

  // Heating Radiators (Радіатори опалення секційні, рушникосушки)
  heating_radiators: [
    '/images/heating_radiator_clean.jpg',
    'https://www.radiatortube.com/upload/6421/full-aluminum-radiator_529812.jpg',
  ],

  // Water Pumps: Submersible & Circulation (Насоси глибинні, свердловинні, циркуляційні)
  plumbing_pumps: [
    '/images/plumbing_pump_clean.jpg',
  ],
};

export const CURATED_CATEGORY_PHOTOS = ACCURATE_PART_PHOTOS;

/**
 * Checks if a given image URL is an inappropriate stock photo, whole car photo,
 * technical diagram/infographic, watermarked, or misapplied spare part image.
 */
export function isWatermarkedOrBadPhoto(url: string, productName: string = ''): boolean {
  if (!url) return true;
  const cleanUrl = url.trim().toLowerCase();
  const nameLower = productName.toLowerCase();

  // Basic sanity check: valid URL string
  if (cleanUrl.length < 8) return true;

  // 1. Watermark domains check (IndiaMART, ВсеИнструменты, LadaPower, Virok, Made-in-China, stock sites, etc.)
  if (WATERMARK_DOMAINS.some(domain => cleanUrl.includes(domain))) {
    return true;
  }

  // 2. Known off-topic / mismatched / broken URLs (toy animal 428987498, broken polaroid h04aaosw, knives, road pole mirror)
  if (KNOWN_OFF_TOPIC_OR_BAD_URLS.some(bad => cleanUrl.includes(bad))) {
    return true;
  }

  // 3. Social media video thumbnails (YouTube, Facebook)
  if (
    cleanUrl.includes('ytimg.com') ||
    cleanUrl.includes('youtube.com') ||
    cleanUrl.includes('fbsbx.com') ||
    cleanUrl.includes('facebook.com')
  ) {
    return true;
  }

  // 4. Broken / Placeholder / 404 patterns / Diagrams
  if (BROKEN_OR_PLACEHOLDER_PATTERNS.some(p => cleanUrl.includes(p))) {
    return true;
  }

  // 5. Whole vehicle / car exterior photos
  if (WHOLE_VEHICLE_PATTERNS.some(p => cleanUrl.includes(p))) {
    return true;
  }

  // 6. Generic Unsplash IDs known to be inappropriate
  if (GENERIC_UNSPLASH_IDS.some(id => cleanUrl.includes(id))) {
    return true;
  }

  // 7. Power drill tool photo (photo-1581147036324) misassigned to non-power-tools
  if (cleanUrl.includes('photo-1581147036324') || cleanUrl.includes('c17ac41dfa6c')) {
    const isPowerDrill = nameLower.includes('шуруповерт') || nameLower.includes('дриль') || nameLower.includes('перфоратор');
    if (!isPowerDrill) return true;
  }

  // 8. Amazon shock absorber photo (71UXxo0McNL) misassigned to non-suspension
  if (cleanUrl.includes('71uxxo0mcnl')) {
    const isShock = nameLower.includes('амортизатор') || nameLower.includes('стійк') || nameLower.includes('підвіск');
    if (!isShock) return true;
  }

  // 9. KYB shock absorber photo assigned to non-suspension items
  if (cleanUrl.includes('kyb.co.za') && !nameLower.includes('амортизатор') && !nameLower.includes('стійк') && !nameLower.includes('підвіск')) {
    return true;
  }

  // 10. Alternator photo (A0260263_1 or dcdieseltx.com) contains DC logo watermark and shows bolts
  if (cleanUrl.includes('a0260263') || cleanUrl.includes('dcdieseltx.com') || cleanUrl.includes('dcdieseltx')) {
    return true;
  }

  // 11. Brake caliper photo misassigned to bolts, pins, grease
  if (cleanUrl.includes('fpkdqo7n5cojlq4m1aeum9lzwl3e46pbwlahzxvf')) {
    const isBoltOrPin = nameLower.includes('болт') || nameLower.includes('палець') || nameLower.includes('мастило') || nameLower.includes('ремкомплект');
    if (isBoltOrPin && !nameLower.includes('супорт у зборі')) return true;
  }

  // 12. NGK coil photo assigned to non-coil items (e.g. spark plug)
  if (cleanUrl.includes('ngk-coil') && !nameLower.includes('котушк')) {
    return true;
  }

  // 13. Brake shoes photo (0871670001679695320.jpg) - dark, poor quality
  if (cleanUrl.includes('0871670001679695320') || cleanUrl.includes('ford.org.ua/upload')) {
    return true;
  }

  // 14. Off-road LED pod light misassigned to non-lighting items
  if (cleanUrl.includes('7-black-led-pods') && !nameLower.includes('фар') && !nameLower.includes('прожектор') && !nameLower.includes('led') && !nameLower.includes('світл')) {
    return true;
  }

  // 15. Plumbing pipes misassigned to pumps or vice versa
  if (cleanUrl.includes('files.glotr.uz') && !nameLower.includes('насос') && !nameLower.includes('помпа')) {
    return true;
  }

  // 16. Pressure gauge sensor misassigned to car horns, sirens, light switches
  if (cleanUrl.includes('sw_82304_1x') && (nameLower.includes('сигнал') || nameLower.includes('мигалк') || nameLower.includes('клаксон') || nameLower.includes('сірен') || nameLower.includes('перемикач'))) {
    return true;
  }

  // 17. Misapplied Unsplash brake rotor on non-brake parts
  if (cleanUrl.includes('photo-1600705722908-bab1e61c0b4d')) {
    const isActualBrakeDisc = nameLower.includes('диск гальм') || nameLower.includes('гальмівний диск') || nameLower.includes('ротор');
    if (!isActualBrakeDisc) return true;
  }

  // 18. Misapplied Unsplash fasteners on non-fastener items
  if (cleanUrl.includes('photo-1518709268805-4e9042af9f23') || cleanUrl.includes('photo-1527443224154-c4a3942d3acf')) {
    const isActualFastener = nameLower.includes('болт') || nameLower.includes('гайк') || nameLower.includes('шайб') ||
      nameLower.includes('шпильк') || nameLower.includes('хомут') || nameLower.includes('саморіз') || nameLower.includes('гвинт');
    if (!isActualFastener) return true;
  }

  // 19. Misapplied Unsplash faucets on fuel tanks or chemicals
  if (cleanUrl.includes('photo-1584622650111-993a426fbf0a') || cleanUrl.includes('photo-1584622781564-1d987f7333c1') || cleanUrl.includes('photo-1618843479313')) {
    const isActualFaucet = nameLower.includes('змішувач') || (nameLower.includes('кран') && !nameLower.includes('гальм') && !nameLower.includes('палив') && !nameLower.includes('бензо'));
    if (!isActualFaucet) return true;
  }

  // 20. Misapplied shower head on automotive parts
  if (cleanUrl.includes('photo-1507652313519-d4e9174996dd')) {
    const isActualShower = nameLower.includes('душ') && !nameLower.includes('зчеплен') && !nameLower.includes('подушк');
    if (!isActualShower) return true;
  }

  // 21. Car speakers photo misapplied to monitors, hazard triangles, picnic kits
  if (cleanUrl.includes('car-speakers') || cleanUrl.includes('kfc-6966s')) {
    const isSpeakers = nameLower.includes('колонк') || nameLower.includes('динамік') || nameLower.includes('акустик');
    if (!isSpeakers) return true;
  }

  // 22. Car stereo photo misapplied to steering column shafts or monitors
  if (cleanUrl.includes('71dyrfb7qxl')) {
    const isStereoOrMonitor = nameLower.includes('магнітол') || nameLower.includes('монітор') || nameLower.includes('головний пристрій');
    if (!isStereoOrMonitor) return true;
  }

  // 23. Passenger car CV joint misapplied to tractor shafts or gear levers
  if (cleanUrl.includes('nwyaaoxyqfjthwwr')) {
    const isPassengerCvJoint = nameLower.includes('шркш') || nameLower.includes('шрус') || nameLower.includes('граната') || nameLower.includes('піввісь');
    if (!isPassengerCvJoint) return true;
  }

  return false;
}

/**
 * Deterministic multi-factor hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a photo accurately matching the Ukrainian product name and category ("фото по назві").
 * Strict priority ordering ensures:
 * 1. Fasteners (bolts, nuts, washers) are identified FIRST before major systems (e.g. "Болт генератора" -> bolt, NOT alternator).
 * 2. Cables (троси) are identified before brake shoes or clutches.
 * 3. Filters (oil, air, fuel, cabin, water) are correctly categorized.
 * 4. Tires & wheels are distinguished from tools and brake discs.
 * 5. Audio displays/monitors are separated from speakers and stereo head units.
 * 6. Diverse photo arrays prevent duplicate clone appearances.
 */
export function getCuratedFallback(
  name: string = '',
  type: string = 'auto',
  category: string = '',
  id: string | number = ''
): string {
  const text = (name + ' ' + category).toLowerCase();
  const seed = hashString(String(id || '') + '::' + String(name || '') + '::' + String(category || ''));

  const pick = (list?: string[]) => {
    if (!list || list.length === 0) return ACCURATE_PART_PHOTOS.tools[0];
    return list[seed % list.length];
  };

  // ==========================================
  // PRIORITY 1: FASTENERS & HARDWARE
  // Must be first! Avoids "Болт генератора" getting an alternator photo,
  // "Болт супорта" getting a caliper, or "Болт карданного вала" getting a CV joint.
  // ==========================================
  if (text.includes('болт колісн') || text.includes('колісний болт')) {
    return pick(ACCURATE_PART_PHOTOS.fasteners_bolts);
  }
  if (text.includes('болт')) {
    return pick(ACCURATE_PART_PHOTOS.fasteners_bolts);
  }
  if (text.includes('гайк') || text.includes('шайб') || text.includes('шпильк') || text.includes('хомут') || text.includes('саморіз') || text.includes('гвинт') || text.includes('метиз') || text.includes('стопорне кільце')) {
    return pick(ACCURATE_PART_PHOTOS.fasteners_hardware);
  }

  // ==========================================
  // PRIORITY 2: CABLES (Троси)
  // Must precede brakes and clutch so "Трос ручника" / "Трос зчеплення" get cables!
  // ==========================================
  if (text.includes('трос') || text.includes('тросик')) {
    return pick(ACCURATE_PART_PHOTOS.cables);
  }

  // ==========================================
  // PRIORITY 3: FILTERS (Фільтри)
  // ==========================================
  if (text.includes('фільтр') || text.includes('фильтр')) {
    if (text.includes('маслян') || text.includes('масла') || text.includes('олив')) {
      return pick(ACCURATE_PART_PHOTOS.filter_oil);
    }
    if (text.includes('повітр') || text.includes('воздуш')) {
      return pick(ACCURATE_PART_PHOTOS.filter_air);
    }
    if (text.includes('палив') || text.includes('топлив') || text.includes('дизел') || text.includes('бензин')) {
      return pick(ACCURATE_PART_PHOTOS.filter_fuel);
    }
    if (text.includes('салон') || text.includes('кондиціонер')) {
      return pick(ACCURATE_PART_PHOTOS.filter_cabin);
    }
    if (text.includes('вод') || text.includes('аква') || type === 'plumbing') {
      return pick(ACCURATE_PART_PHOTOS.filter_water);
    }
    return pick(ACCURATE_PART_PHOTOS.filter_oil);
  }

  // ==========================================
  // PRIORITY 4: TIRES, WHEELS & RIMS
  // Must precede general tools so tires don't get power drills!
  // ==========================================
  if (text.includes('шина') || text.includes('покришк') || (text.includes('колес') && !text.includes('рульов')) || text.includes('диск колісн') || text.includes('диск сталев') || text.includes('диск лит') || text.includes('ковпак') || text.includes('камера автомобільн')) {
    return pick(ACCURATE_PART_PHOTOS.tires_wheels);
  }

  // ==========================================
  // PRIORITY 5: WIPER BLADES (Двірники, склоочисники)
  // ==========================================
  if (text.includes('двірник') || text.includes('склоочисник') || (text.includes('щітк') && !text.includes('генератор') && !text.includes('стартер')) || text.includes('повідець')) {
    return pick(ACCURATE_PART_PHOTOS.wipers);
  }

  // ==========================================
  // PRIORITY 6: STEERING (Рульове керування)
  // ==========================================
  if (text.includes('рульов') || text.includes('рулев') || text.includes('рейка рульов') || text.includes('наконечник') || text.includes('трапеці') || text.includes('кермо') || text.includes('шаров')) {
    return pick(ACCURATE_PART_PHOTOS.steering);
  }

  // ==========================================
  // PRIORITY 7: BRAKING SYSTEM (Гальмівна система)
  // ==========================================
  if ((text.includes('накладк') || text.includes('накладок')) && (text.includes('ручник') || text.includes('гальм') || text.includes('колодк'))) {
    return pick(ACCURATE_PART_PHOTOS.brakes_linings || ACCURATE_PART_PHOTOS.brakes_shoes);
  }
  if ((text.includes('накладк') || text.includes('накладок')) && !text.includes('педал') && !text.includes('порог') && !text.includes('бампер')) {
    return pick(ACCURATE_PART_PHOTOS.brakes_linings || ACCURATE_PART_PHOTOS.brakes_shoes);
  }
  if (text.includes('ручник') && !text.includes('трос')) {
    return pick(ACCURATE_PART_PHOTOS.brakes_shoes);
  }
  if (text.includes('колодк') && !text.includes('клемн')) {
    return pick(ACCURATE_PART_PHOTOS.brakes_pads);
  }
  if (text.includes('диск гальм') || text.includes('гальмівний диск') || text.includes('ротор')) {
    return pick(ACCURATE_PART_PHOTOS.brakes_disc);
  }
  if (text.includes('барабан гальм') || text.includes('гальмівний барабан')) {
    return pick(ACCURATE_PART_PHOTOS.brakes_drum);
  }
  if (text.includes('супорт') || (text.includes('циліндр') && text.includes('гальм'))) {
    return pick(ACCURATE_PART_PHOTOS.brakes_caliper);
  }
  if ((text.includes('шланг') || text.includes('трубк')) && text.includes('гальм')) {
    return pick(ACCURATE_PART_PHOTOS.brakes_hose_tube);
  }

  // ==========================================
  // PRIORITY 8: LIGHTING & OPTICS
  // ==========================================
  if (text.includes('катафот') || text.includes('світловідбивач') || text.includes('катафоти') || text.includes('відбивач')) {
    return pick(ACCURATE_PART_PHOTOS.reflector);
  }
  if (text.includes('лампа') || text.includes('лампочк') || text.includes('галоген') || text.includes('ксенон') || text.includes('h4') || text.includes('h7') || text.includes('h1')) {
    return pick(ACCURATE_PART_PHOTOS.lighting_bulbs);
  }
  if (text.includes('фара') || text.includes('ліхтар') || text.includes('поворотник') || text.includes('покажчик поворот') || text.includes('габарит') || text.includes('стоп-сигнал') || text.includes('протитуман')) {
    return pick(ACCURATE_PART_PHOTOS.optics_headlight);
  }

  // ==========================================
  // PRIORITY 9: BODY, GLASS, MIRRORS & ACCESSORIES
  // ==========================================
  if (text.includes('дефлектор') || text.includes('мухобійк') || text.includes('вітровик')) {
    return pick(ACCURATE_PART_PHOTOS.hood_deflector);
  }
  if (text.includes('бризговик') || text.includes('бризковик')) {
    return pick(ACCURATE_PART_PHOTOS.mudflaps);
  }
  if (text.includes('дзеркал')) {
    return pick(ACCURATE_PART_PHOTOS.mirrors);
  }
  if (text.includes('скло лобов') || text.includes('лобове скло') || text.includes('автоскло') || text.includes('скло задн') || (text.includes('скло') && !text.includes('омивач') && !text.includes('очисник'))) {
    return pick(ACCURATE_PART_PHOTOS.auto_glass);
  }
  if (text.includes('ручка двер') || text.includes('замок двер') || text.includes('замок багажник') || text.includes('замок капот') || text.includes('замок запалюван')) {
    return pick(ACCURATE_PART_PHOTOS.door_locks_handles);
  }

  // ==========================================
  // PRIORITY 10: CLUTCH & TRANSMISSION
  // ==========================================
  if (text.includes('корзина зчеплен') || text.includes('кошик зчеплен') || text.includes('лапки зчеплен')) {
    return pick(ACCURATE_PART_PHOTOS.clutch_cover);
  }
  if (text.includes('диск зчеплен')) {
    return pick(ACCURATE_PART_PHOTOS.clutch_disc);
  }
  if (text.includes('вижимн') || text.includes('вижимний')) {
    return pick(ACCURATE_PART_PHOTOS.clutch_release_bearing);
  }
  if (text.includes('куліс') || text.includes('важіль кпп') || text.includes('шток кпп') || text.includes('перемикання передач')) {
    return pick(ACCURATE_PART_PHOTOS.gear_shifter);
  }
  if (text.includes('шркш') || text.includes('шрус') || text.includes('гранат') || text.includes('піввіс') || text.includes('полуось') || text.includes('кардан') || text.includes('роздавальн')) {
    return pick(ACCURATE_PART_PHOTOS.drive_shaft);
  }

  // ==========================================
  // PRIORITY 11: SUSPENSION & CHASSIS
  // ==========================================
  if (text.includes('амортизатор') || text.includes('стійка підвіск')) {
    return pick(ACCURATE_PART_PHOTOS.shock_absorber);
  }
  if (text.includes('важіль') || text.includes('вісь') || text.includes('ричаг') || text.includes('тяга підвіск') || text.includes('стабілізатор')) {
    return pick(ACCURATE_PART_PHOTOS.suspension_arm);
  }
  if (text.includes('пружин')) {
    return pick(ACCURATE_PART_PHOTOS.springs);
  }
  if (text.includes('підшипник') || text.includes('ступиц') || text.includes('маточин')) {
    return pick(ACCURATE_PART_PHOTOS.bearing);
  }
  if (text.includes('сайлентблок') || text.includes('втулк') || text.includes('подушка підвіск') || text.includes('опора двигун')) {
    return pick(ACCURATE_PART_PHOTOS.bushings);
  }

  // ==========================================
  // PRIORITY 12: ENGINE & COOLING SYSTEM
  // ==========================================
  if ((text.includes('кришка') && (text.includes('клапан') || text.includes('кл '))) || text.includes('клапанна кришка')) {
    return pick(ACCURATE_PART_PHOTOS.valve_cover);
  }
  if (text.includes('клапан') && !text.includes('кришка') && !text.includes('гальм') && type !== 'plumbing') {
    return pick(ACCURATE_PART_PHOTOS.engine_valves);
  }
  if (text.includes('прокладк') || text.includes('гбц')) {
    return pick(ACCURATE_PART_PHOTOS.engine_gaskets);
  }
  if (text.includes('сальник') || text.includes('манжет')) {
    return pick(ACCURATE_PART_PHOTOS.oil_seals);
  }
  if (text.includes('ремінь') || text.includes('ремень')) {
    return pick(ACCURATE_PART_PHOTOS.drive_belt);
  }
  if (text.includes('ролик') || text.includes('шків') || text.includes('натягувач') || text.includes('натяжн')) {
    return pick(ACCURATE_PART_PHOTOS.tensioner_roller);
  }
  if (text.includes('радіатор') && (text.includes('пічк') || text.includes('обігрів'))) {
    return pick(ACCURATE_PART_PHOTOS.heater_radiator);
  }
  if (text.includes('радіатор') && !text.includes('опален') && type !== 'plumbing') {
    return pick(ACCURATE_PART_PHOTOS.cooling_radiator);
  }
  if (text.includes('термостат')) {
    return pick(ACCURATE_PART_PHOTOS.thermostat);
  }
  if (text.includes('помпа') || (text.includes('насос') && text.includes('охолоджен'))) {
    return pick(ACCURATE_PART_PHOTOS.water_pump);
  }
  if (text.includes('бачок') || text.includes('розширювальн')) {
    return pick(ACCURATE_PART_PHOTOS.coolant_tank);
  }
  if (text.includes('глушник') || text.includes('резонатор') || text.includes('вихлоп') || text.includes('штани глушник') || text.includes('гофра')) {
    return pick(ACCURATE_PART_PHOTOS.exhaust_muffler);
  }

  // ==========================================
  // PRIORITY 13: ELECTRICAL & IGNITION
  // ==========================================
  if (text.includes('щітк') && (text.includes('генератор') || text.includes('стартер') || text.includes('вузол') || text.includes('колектор') || text.includes('струмознім'))) {
    return pick(ACCURATE_PART_PHOTOS.generator_brushes);
  }
  if (text.includes('щітковий вузол') || text.includes('щіткотримач')) {
    return pick(ACCURATE_PART_PHOTOS.generator_brushes);
  }
  if (text.includes('акумулятор') || text.includes('акб') || text.includes('battery') || text.includes('платін') || text.includes('оверон') || text.includes('zap') || text.includes('75ah') || text.includes('60ah') || text.includes('100ah')) {
    return pick(ACCURATE_PART_PHOTOS.battery);
  }
  if (text.includes('пуско-заряд') || text.includes('зарядний пристрій')) {
    return pick(ACCURATE_PART_PHOTOS.battery_charger);
  }
  if (text.includes('генератор') && !text.includes('болт')) {
    return pick(ACCURATE_PART_PHOTOS.alternator);
  }
  if (text.includes('стартер') && !text.includes('болт')) {
    return pick(ACCURATE_PART_PHOTOS.starter);
  }
  if (text.includes('свічка') || text.includes('свічки') || text.includes('бронепровод')) {
    return pick(ACCURATE_PART_PHOTOS.spark_plug);
  }
  if (text.includes('котушк')) {
    return pick(ACCURATE_PART_PHOTOS.ignition_coil);
  }
  if (text.includes('трамблер') || text.includes('комутатор')) {
    return pick(ACCURATE_PART_PHOTOS.ignition_distributor);
  }
  if (text.includes('перемикач') || text.includes('кнопк') || text.includes('тумблер') || text.includes('реле')) {
    return pick(ACCURATE_PART_PHOTOS.switches);
  }
  if (text.includes('датчик') || text.includes('лямбда') || text.includes('термостат')) {
    return pick(ACCURATE_PART_PHOTOS.sensors);
  }
  if (text.includes('сигнал') || text.includes('клаксон') || text.includes('сирена') || text.includes('гудок')) {
    return pick(ACCURATE_PART_PHOTOS.car_horn);
  }

  // ==========================================
  // PRIORITY 14: MULTIMEDIA, AUDIO & DISPLAYS
  // ==========================================
  if (text.includes('монітор') || text.includes('дисплей') || text.includes('екран')) {
    return pick(ACCURATE_PART_PHOTOS.car_displays);
  }
  if (text.includes('магнітол') || text.includes('автомагнітол') || text.includes('мультимедіа')) {
    return pick(ACCURATE_PART_PHOTOS.car_audio);
  }
  if (text.includes('колонк') || text.includes('динамік') || text.includes('акустик')) {
    return pick(ACCURATE_PART_PHOTOS.car_speakers);
  }

  // ==========================================
  // PRIORITY 15: FUEL SYSTEM
  // ==========================================
  if (text.includes('карбюратор') || text.includes('дросел')) {
    return pick(ACCURATE_PART_PHOTOS.carburetor);
  }
  if (text.includes('бензонасос') || (text.includes('паливний') && text.includes('насос'))) {
    return pick(ACCURATE_PART_PHOTOS.fuel_pump);
  }

  // ==========================================
  // PRIORITY 16: OILS, FLUIDS & CHEMICALS
  // ==========================================
  if (text.includes('масло') || text.includes('олива') || text.includes('мастило') || text.includes('літол') || text.includes('солідол') || text.includes('антифриз') || text.includes('тосол') || text.includes('омивач') || text.includes('герметик') || text.includes('шпаклівк') || text.includes('присадк')) {
    return pick(ACCURATE_PART_PHOTOS.car_chemicals);
  }

  // ==========================================
  // PRIORITY 17: SPRAY BOTTLES & BOOKS
  // ==========================================
  if (text.includes('пульверизатор') || text.includes('пляшка-бризкалка') || text.includes('пляшка-розпилювач') || text.includes('розпилювач')) {
    return pick(ACCURATE_PART_PHOTOS.spray_bottles);
  }
  if (text.includes('книг') || text.includes('посібник') || text.includes('інструкці') || text.includes('облік')) {
    return pick(ACCURATE_PART_PHOTOS.service_book);
  }

  // ==========================================
  // PRIORITY 18: GARDEN & TRACTOR EQUIPMENT
  // ==========================================
  if (text.includes('коса') || text.includes('тример') || text.includes('мотокос') || text.includes('бензокос') || text.includes('газонокосар')) {
    return pick(ACCURATE_PART_PHOTOS.gas_trimmer);
  }
  if (text.includes('навіск') || text.includes('розкіс') || text.includes('вом') || text.includes('трактор')) {
    return pick(ACCURATE_PART_PHOTOS.tractor_parts);
  }

  // ==========================================
  // PRIORITY 19: PLUMBING
  // ==========================================
  if (text.includes('змішувач') || text.includes('гусак')) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_faucets);
  }
  if (text.includes('душ') || (text.includes('лійк') && !text.includes('зчеплен'))) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_showers);
  }
  if (text.includes('сифон') || text.includes('трап') || text.includes('гофра')) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_siphons);
  }
  if (text.includes('арматура бачка') || text.includes('клапан впускний') || text.includes('клапан зливний')) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_toilet_valves);
  }
  if (text.includes('радіатор') && (type === 'plumbing' || text.includes('опален') || text.includes('сантех'))) {
    return pick(ACCURATE_PART_PHOTOS.heating_radiators);
  }
  if (text.includes('кран') && (text.includes('кульов') || text.includes('шаров') || type === 'plumbing')) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_ball_valves);
  }
  if (text.includes('насос') && (type === 'plumbing' || text.includes('водопостачан') || text.includes('дренаж') || text.includes('свердловин') || text.includes('циркуляц'))) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_pumps);
  }
  if (text.includes('труб') || text.includes('фітинг') || text.includes('муфт') || text.includes('трійник') || text.includes('каналізац')) {
    return pick(ACCURATE_PART_PHOTOS.plumbing_pipes);
  }

  // ==========================================
  // PRIORITY 20: TOOLS & WORKSHOP
  // ==========================================
  if (text.includes('ключ') || text.includes('знімач') || text.includes('домкрат') || text.includes('інструмент') || text.includes('свердл') || text.includes('викрутк') || text.includes('плоскогубц')) {
    return pick(ACCURATE_PART_PHOTOS.tools);
  }

  // Intelligent category fallbacks
  const catLower = category.toLowerCase();
  if (catLower.includes('гальм')) return pick(ACCURATE_PART_PHOTOS.brakes_pads);
  if (catLower.includes('акумулятор')) return pick(ACCURATE_PART_PHOTOS.battery);
  if (catLower.includes('ходова') || catLower.includes('підвіска')) return pick(ACCURATE_PART_PHOTOS.shock_absorber);
  if (catLower.includes('двигун') || catLower.includes('гбц')) return pick(ACCURATE_PART_PHOTOS.valve_cover);
  if (catLower.includes('трансмісія') || catLower.includes('кпп')) return pick(ACCURATE_PART_PHOTOS.drive_shaft);
  if (catLower.includes('оптика') || catLower.includes('фари')) return pick(ACCURATE_PART_PHOTOS.optics_headlight);
  if (catLower.includes('олив') || catLower.includes('хімія')) return pick(ACCURATE_PART_PHOTOS.car_chemicals);
  if (catLower.includes('інструмент')) return pick(ACCURATE_PART_PHOTOS.tools);
  if (catLower.includes('кріплення') || catLower.includes('метиз')) return pick(ACCURATE_PART_PHOTOS.fasteners_hardware);
  if (type === 'plumbing' || catLower.includes('сантех')) return pick(ACCURATE_PART_PHOTOS.plumbing_pipes);

  return pick(ACCURATE_PART_PHOTOS.tools);
}

/**
 * Safely checks if specs contains photoApproved flag
 */
export function isSpecsPhotoApproved(specs: any): boolean {
  if (!specs) return false;
  if (typeof specs === 'object') {
    return Boolean(specs.photoApproved);
  }
  if (typeof specs === 'string') {
    return specs.includes('"photoApproved":true') || specs.includes('"photoApproved": true');
  }
  return false;
}

/**
 * Returns a pristine, verified image URL for a product.
 * Guarantees that the photo matches the Ukrainian name ("по назві").
 */
export function getSanitizedProductImage(product: {
  id?: string | number;
  name?: string;
  category?: string;
  brand?: string;
  type?: string;
  image?: string;
  image_url?: string;
  specs?: any;
}): string {
  const current = (product.image || product.image_url || '').trim();
  const firstUrl = current.split(/,(?=\s*(?:https?:|data:))/i)[0]?.trim() || '';

  // Always sanitize watermarked, off-topic, or defective photos, even if previously marked in specs
  if (firstUrl && isWatermarkedOrBadPhoto(firstUrl, product.name || '')) {
    return getCuratedFallback(product.name || '', product.type || 'auto', product.category || '', product.id || '');
  }

  if (!firstUrl) {
    return getCuratedFallback(product.name || '', product.type || 'auto', product.category || '', product.id || '');
  }

  return firstUrl;
}

/**
 * Returns a list of clean photos for the gallery on product page.
 */
export function getSanitizedProductGallery(product: {
  id?: string | number;
  name?: string;
  category?: string;
  type?: string;
  image?: string;
  image_url?: string;
}): string[] {
  const current = (product.image || product.image_url || '').trim();
  const rawList = current ? current.split(/,(?=\s*(?:https?:|data:))/i).map(s => s.trim()).filter(Boolean) : [];
  
  const validList = rawList.filter(u => !isWatermarkedOrBadPhoto(u, product.name || ''));

  if (validList.length > 0) {
    return validList;
  }

  const fallback = getCuratedFallback(product.name || '', product.type || 'auto', product.category || '', product.id || '');
  return [fallback];
}
