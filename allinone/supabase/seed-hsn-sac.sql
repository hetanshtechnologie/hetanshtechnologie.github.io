-- Comprehensive HSN/SAC master data for all 22 ERP industries
-- Each HSN/SAC appears only once (no duplicates allowed in single INSERT)
-- GST rates: cgst + sgst = igst

INSERT INTO gst_rates (hsn_code, description, cgst, sgst, igst, cess, effective_from, effective_to) VALUES
-- Agriculture (0% / 5%)
('1001','Wheat and meslin',0,0,0,0,'2017-07-01','9999-12-31'),
('1005','Maize (corn)',0,0,0,0,'2017-07-01','9999-12-31'),
('1006','Rice',0,0,0,0,'2017-07-01','9999-12-31'),
('1201','Soya beans',0,0,0,0,'2017-07-01','9999-12-31'),
('3101','Animal or vegetable fertilisers',0,0,0,0,'2017-07-01','9999-12-31'),
('3102','Mineral or chemical fertilisers, nitrogenous',0,0,0,0,'2017-07-01','9999-12-31'),
('3808','Insecticides, fungicides, herbicides',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('8201','Hand tools for agriculture',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('8432','Agricultural machinery',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Auto Parts (18%)
('8408','Diesel engines',9,9,18,0,'2017-07-01','9999-12-31'),
('8409','Engine parts',9,9,18,0,'2017-07-01','9999-12-31'),
('8483','Transmission parts',9,9,18,0,'2017-07-01','9999-12-31'),
('8708','Vehicle parts and accessories',9,9,18,0,'2017-07-01','9999-12-31'),
('8714','Motorcycle parts',9,9,18,0,'2017-07-01','9999-12-31'),
('4011','New pneumatic tyres',9,9,18,0,'2017-07-01','9999-12-31'),
('4013','Inner tubes',9,9,18,0,'2017-07-01','9999-12-31'),
('8512','Lighting/signalling equipment for vehicles',9,9,18,0,'2017-07-01','9999-12-31'),
('9029','Speedometers/tachometers',9,9,18,0,'2017-07-01','9999-12-31'),

-- Books & Publishing (0% / 5% / 12%)
('4901','Printed books',0,0,0,0,'2017-07-01','9999-12-31'),
('4902','Newspapers/journals',0,0,0,0,'2017-07-01','9999-12-31'),
('4903','Children picture books',0,0,0,0,'2017-07-01','9999-12-31'),
('4904','Sheet music',0,0,0,0,'2017-07-01','9999-12-31'),
('4911','Other printed matter',6,6,12,0,'2017-07-01','9999-12-31'),

-- Building Material / Cement (28% / 18%)
('2523','Portland cement',14,14,28,0,'2017-07-01','9999-12-31'),
('6802','Building stone',14,14,28,0,'2017-07-01','9999-12-31'),
('6805','Abrasive powder',9,9,18,0,'2017-07-01','9999-12-31'),
('6904','Bricks',14,14,28,0,'2017-07-01','9999-12-31'),
('6910','Ceramic sinks/basins',9,9,18,0,'2017-07-01','9999-12-31'),
('7005','Float glass',14,14,28,0,'2017-07-01','9999-12-31'),
('7210','Steel sheets',9,9,18,0,'2017-07-01','9999-12-31'),
('7308','Steel structures',9,9,18,0,'2017-07-01','9999-12-31'),

-- Chemicals (18%)
('2804','Hydrogen/rare gases',9,9,18,0,'2017-07-01','9999-12-31'),
('2810','Boron oxides',9,9,18,0,'2017-07-01','9999-12-31'),
('2815','Sodium hydroxide',9,9,18,0,'2017-07-01','9999-12-31'),
('2827','Chlorides',9,9,18,0,'2017-07-01','9999-12-31'),
('2902','Cyclic hydrocarbons',9,9,18,0,'2017-07-01','9999-12-31'),
('2905','Acyclic alcohols',9,9,18,0,'2017-07-01','9999-12-31'),
('3402','Washing preparations',9,9,18,0,'2017-07-01','9999-12-31'),
('3815','Chemical catalysts',9,9,18,0,'2017-07-01','9999-12-31'),

-- Computer Hardware & Mobile Store (18%)
('8443','Printers/gaming printers',9,9,18,0,'2017-07-01','9999-12-31'),
('8471','Computers, laptops and tablets',9,9,18,0,'2017-07-01','9999-12-31'),
('8473','Computer parts and accessories',9,9,18,0,'2017-07-01','9999-12-31'),
('8523','Storage media',9,9,18,0,'2017-07-01','9999-12-31'),
('8528','Monitors and projectors',9,9,18,0,'2017-07-01','9999-12-31'),
('8542','Electronic integrated circuits',9,9,18,0,'2017-07-01','9999-12-31'),

-- E-commerce / Retail (mixed rates 5% / 12% / 18%)
('6109','T-shirts and vests',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6204','Women suits and clothing',6,6,12,0,'2017-07-01','9999-12-31'),
('8517','Smartphones, mobile phones',9,9,18,0,'2017-07-01','9999-12-31'),
('9503','Toys and games',6,6,12,0,'2017-07-01','9999-12-31'),
('3304','Cosmetics, skincare and beauty',9,9,18,0,'2017-07-01','9999-12-31'),

-- Electrical (18%)
('8536','Electrical switches and fuses',9,9,18,0,'2017-07-01','9999-12-31'),
('8537','Control panels',9,9,18,0,'2017-07-01','9999-12-31'),
('8544','Insulated wire and cable',9,9,18,0,'2017-07-01','9999-12-31'),
('8414','Fans and ventilators',9,9,18,0,'2017-07-01','9999-12-31'),
('9405','Lighting fixtures and decorative lights',9,9,18,0,'2017-07-01','9999-12-31'),
('8504','Transformers and chargers',9,9,18,0,'2017-07-01','9999-12-31'),

-- Electronics (18%)
('8521','Video recording equipment',9,9,18,0,'2017-07-01','9999-12-31'),
('8522','Audio/video parts',9,9,18,0,'2017-07-01','9999-12-31'),
('8525','Transmission apparatus',9,9,18,0,'2017-07-01','9999-12-31'),
('8526','Radar/navigation',9,9,18,0,'2017-07-01','9999-12-31'),
('8527','Radio receivers',9,9,18,0,'2017-07-01','9999-12-31'),
('8518','Microphones, speakers and headsets',9,9,18,0,'2017-07-01','9999-12-31'),
('9504','Video game consoles and gaming',9,9,18,0,'2017-07-01','9999-12-31'),

-- FMCG / Grocery / Departmental (0% / 5% / 12% / 18%)
('0401','Milk, cream and dairy products',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('0405','Butter',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('0406','Cheese',6,6,12,0,'2017-07-01','9999-12-31'),
('1517','Edible oils',0,0,0,0,'2017-07-01','9999-12-31'),
('1905','Biscuits, bakery and confectionery',9,9,18,0,'2017-07-01','9999-12-31'),
('2105','Ice cream and frozen desserts',9,9,18,0,'2017-07-01','9999-12-31'),
('2202','Soft drinks and carbonated beverages',9,9,18,0,'2017-07-01','9999-12-31'),
('3401','Soap and detergents',9,9,18,0,'2017-07-01','9999-12-31'),
('2201','Bottled water',9,9,18,0,'2017-07-01','9999-12-31'),
('1701','Sugar',0,0,0,0,'2017-07-01','9999-12-31'),
('0901','Coffee and tea',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Food & Beverage / Restaurant (5% / 12% / 18%)
('2001','Vinegar-prepared vegetables',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('2009','Fruit juices',6,6,12,0,'2017-07-01','9999-12-31'),
('2103','Sauces, ketchup and condiments',9,9,18,0,'2017-07-01','9999-12-31'),
('2106','Food preparations not elsewhere specified',9,9,18,0,'2017-07-01','9999-12-31'),
('2208','Alcoholic beverages',NULL,NULL,18,0,'2017-07-01','9999-12-31'),

-- Furniture (5%)
('9401','Seats and chairs',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('9403','Wooden furniture',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('9404','Mattresses and cushions',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Garments / Footwear (5% / 12%)
('6101','Men wool coats',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6102','Women wool coats',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6103','Men suits and trousers',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6104','Women suits and dresses',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6105','Men shirts',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6106','Women blouses',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6107','Men underwear',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6108','Women lingerie',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6111','Baby garments',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6201','Men overcoats',6,6,12,0,'2017-07-01','9999-12-31'),
('6202','Women overcoats',6,6,12,0,'2017-07-01','9999-12-31'),
('6203','Men suits (higher value)',6,6,12,0,'2017-07-01','9999-12-31'),
('6205','Men shirts (higher value)',6,6,12,0,'2017-07-01','9999-12-31'),
('6206','Women shirts (higher value)',6,6,12,0,'2017-07-01','9999-12-31'),

-- Grocery / Spices (0% / 5%)
('0701','Potatoes',0,0,0,0,'2017-07-01','9999-12-31'),
('0702','Tomatoes',0,0,0,0,'2017-07-01','9999-12-31'),
('0709','Other vegetables',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('0803','Bananas',0,0,0,0,'2017-07-01','9999-12-31'),
('0804','Dates and pineapples',0,0,0,0,'2017-07-01','9999-12-31'),
('0904','Pepper and spices',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('0910','Ginger, saffron and turmeric',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('1007','Grain sorghum',0,0,0,0,'2017-07-01','9999-12-31'),
('1101','Wheat flour',0,0,0,0,'2017-07-01','9999-12-31'),
('1507','Soya bean oil',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('1508','Groundnut oil',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('1704','Confectionery',9,9,18,0,'2017-07-01','9999-12-31'),
('1806','Chocolate and cocoa preparations',9,9,18,0,'2017-07-01','9999-12-31'),
('1902','Pasta and noodles',9,9,18,0,'2017-07-01','9999-12-31'),
('1904','Cereal preparations',9,9,18,0,'2017-07-01','9999-12-31'),
('2005','Other prepared vegetables',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('2710','Petroleum crude',NULL,NULL,NULL,0,'2017-07-01','9999-12-31'),

-- Jewellery (0.5% / 3% / 5%)
('7108','Gold (unwrought/semi-manufactured)',1.5,1.5,3,0,'2017-07-01','9999-12-31'),
('7109','Gold coin',1.5,1.5,3,0,'2017-07-01','9999-12-31'),
('7110','Platinum',1.5,1.5,3,0,'2017-07-01','9999-12-31'),
('7113','Gold jewellery',1.5,1.5,3,0,'2017-07-01','9999-12-31'),
('7114','Silver jewellery',1.5,1.5,3,0,'2017-07-01','9999-12-31'),
('7106','Silver bar',1.5,1.5,3,0,'2017-07-01','9999-12-31'),
('7102','Diamonds (unworked)',0.25,0.25,0.5,0,'2017-07-01','9999-12-31'),
('7101','Pearls and precious stones',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Mobile Accessories (18%)
('3926','Mobile cases, covers and plastic articles',9,9,18,0,'2017-07-01','9999-12-31'),

-- Paint (18%)
('3208','Paints and varnishes (oil-based)',9,9,18,0,'2017-07-01','9999-12-31'),
('3209','Paints (water-based)',9,9,18,0,'2017-07-01','9999-12-31'),
('3210','Other paints and enamels',9,9,18,0,'2017-07-01','9999-12-31'),
('3814','Paint thinners and solvents',9,9,18,0,'2017-07-01','9999-12-31'),
('9603','Paint brushes and rollers',6,6,12,0,'2017-07-01','9999-12-31'),

-- Paper Mill (12%)
('4802','Uncoated writing/printing paper',6,6,12,0,'2017-07-01','9999-12-31'),
('4804','Kraft paper',6,6,12,0,'2017-07-01','9999-12-31'),
('4811','Specialty coated paper',6,6,12,0,'2017-07-01','9999-12-31'),
('4819','Paperboard packaging',6,6,12,0,'2017-07-01','9999-12-31'),
('4823','Other paper products',6,6,12,0,'2017-07-01','9999-12-31'),

-- Pharmacy / Medical (5% / 12%)
('3001','Human blood and animal blood',6,6,12,0,'2017-07-01','9999-12-31'),
('3002','Vaccines and medicaments',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('3003','Bulk medicines',6,6,12,0,'2017-07-01','9999-12-31'),
('3004','Pharmaceuticals and pet medicines',6,6,12,0,'2017-07-01','9999-12-31'),
('3005','Wadding and bandages',6,6,12,0,'2017-07-01','9999-12-31'),
('3006','Pharmaceutical accessories',6,6,12,0,'2017-07-01','9999-12-31'),
('9018','Surgical and medical instruments',6,6,12,0,'2017-07-01','9999-12-31'),
('9019','Ayurvedic and herbal preparations',6,6,12,0,'2017-07-01','9999-12-31'),
('9021','Orthopaedic appliances',6,6,12,0,'2017-07-01','9999-12-31'),

-- Real Estate (SAC services — 5% / 18%)
('SAC-9954','Construction services (residential)',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('SAC-9955','Real estate services (commission)',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9972','Leasing and rental services',9,9,18,0,'2017-07-01','9999-12-31'),

-- Stationery (0% / 5% / 12%)
('4820','Notebooks and exercise books',0,0,0,0,'2017-07-01','9999-12-31'),
('9608','Ballpoint pens',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('9609','Pencils',0,0,0,0,'2017-07-01','9999-12-31'),
('9610','Chalkboards',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('9611','Office stamps',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('9612','Typewriter ribbons',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Travel & Transport (SAC — 0% / 5% / 12%)
('SAC-9964','Transport of passengers',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('SAC-9965','Goods transport services',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('SAC-9966','Rental of transport vehicles',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9974','Travel agent and tour operator',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Food & Beverage / Restaurant (SAC)
('SAC-9963','Restaurant and catering services',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- General Services (SAC — 18%)
('SAC-9983','Hotel and inn services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9985','Beauty and wellness services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9986','Health and fitness services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9991','IT, software and cyber cafe services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9992','Telecommunication services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9993','Financial and insurance services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9997','Rental and sharing services',9,9,18,0,'2017-07-01','9999-12-31'),
('SAC-9999','Other services not elsewhere classified',9,9,18,0,'2017-07-01','9999-12-31'),

-- Sports / Pet Shop (12%)
('9506','Sports and pet toys equipment',6,6,12,0,'2017-07-01','9999-12-31'),
('9507','Fishing rods and tackle',6,6,12,0,'2017-07-01','9999-12-31'),
('9502','Dolls and toy animals',12,12,24,0,'2017-07-01','9999-12-31'),

-- Footwear (5% / 12% / 18%)
('6402','Footwear (value below Rs 1000)',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6403','Leather footwear',6,6,12,0,'2017-07-01','9999-12-31'),
('6404','Sports and canvas footwear',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6405','Other footwear including slippers',9,9,18,0,'2017-07-01','9999-12-31'),

-- Pet Shop (0% / 5% / 12%)
('2309','Pet food and animal feed',0,0,0,0,'2017-07-01','9999-12-31'),
('4201','Dog and cat collars',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('4421','Pet cages and carriers',2.5,2.5,5,0,'2017-07-01','9999-12-31'),

-- Home Decor (5% / 12% / 18%)
('6702','Artificial flowers and foliage',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
('6913','Decorative ceramics and figurines',6,6,12,0,'2017-07-01','9999-12-31'),
('7018','Glass decorative items and beads',9,9,18,0,'2017-07-01','9999-12-31'),
('8306','Brass statues, ornaments and trophies',6,6,12,0,'2017-07-01','9999-12-31'),

-- Retail / Departmental Store (mixed) 
('6911','Tableware and kitchenware',6,6,12,0,'2017-07-01','9999-12-31'),
('7323','Steel and iron household items',6,6,12,0,'2017-07-01','9999-12-31'),
('3924','Plastic kitchenware and tableware',6,6,12,0,'2017-07-01','9999-12-31'),
('4818','Tissue paper and sanitary paper',6,6,12,0,'2017-07-01','9999-12-31'),

-- FMCG - Personal Care (18%)
('3305','Shampoo and hair preparations',9,9,18,0,'2017-07-01','9999-12-31')
ON CONFLICT (hsn_code) DO UPDATE SET
  description = EXCLUDED.description,
  cgst = EXCLUDED.cgst,
  sgst = EXCLUDED.sgst,
  igst = EXCLUDED.igst,
  cess = EXCLUDED.cess;
