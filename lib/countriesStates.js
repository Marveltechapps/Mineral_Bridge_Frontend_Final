/**
 * States/regions by country code for delivery address.
 * Used with lib/countries.js (same codes). If a country has no list, UI can show free text.
 */
export const STATES_BY_COUNTRY = {
  US: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'],
  IN: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'],
  GB: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  CH: ['Zurich', 'Bern', 'Lucerne', 'Uri', 'Schwyz', 'Obwalden', 'Nidwalden', 'Glarus', 'Zug', 'Solothurn', 'Basel-Stadt', 'Basel-Landschaft', 'Schaffhausen', 'St. Gallen', 'Graubünden', 'Aargau', 'Thurgau', 'Ticino', 'Vaud', 'Valais', 'Neuchâtel', 'Geneva', 'Jura'],
  DE: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'],
  FR: ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Hauts-de-France', 'Provence-Alpes-Côte d\'Azur', 'Grand Est', 'Pays de la Loire', 'Brittany', 'Normandy', 'Bourgogne-Franche-Comté', 'Centre-Val de Loire', 'Corsica'],
  CA: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
  AU: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Northern Territory', 'Australian Capital Territory'],
  IT: ['Abruzzo', 'Aosta Valley', 'Apulia', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Sardinia', 'Sicily', 'Trentino-Alto Adige', 'Tuscany', 'Umbria', 'Veneto'],
  ES: ['Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands', 'Cantabria', 'Castile and León', 'Castilla-La Mancha', 'Catalonia', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencian Community'],
  NL: ['Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'North Brabant', 'North Holland', 'Overijssel', 'South Holland', 'Utrecht', 'Zeeland'],
  BE: ['Antwerp', 'East Flanders', 'Flemish Brabant', 'Limburg', 'Walloon Brabant', 'West Flanders', 'Hainaut', 'Liège', 'Luxembourg', 'Namur', 'Brussels'],
  AT: ['Burgenland', 'Carinthia', 'Lower Austria', 'Upper Austria', 'Salzburg', 'Styria', 'Tyrol', 'Vorarlberg', 'Vienna'],
  AE: ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'],
  SG: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
  JP: ['Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa', 'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'],
  AO: ['Bengo', 'Benguela', 'Bíe', 'Cabinda', 'Cuando Cobango', 'Cuanza Norte', 'Cunene', 'Huambo', 'Huíla', 'Kwanza Sul', 'Luanda', 'Luanda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'],
  BF: ['Boucle du Mouhoun', 'Cascades Region', 'Centre', 'Centre-Est', 'Centre-Nord', 'Centre-Ouest', 'Centre-Sud', 'Est', 'Hauts-Bassins', 'Nord', 'Plateau-Central', 'Sahel', 'Sud-Ouest'],
  BI: ['Bubanza', 'Bujumbura Mairie', 'Bujumbura Rural', 'Bururi', 'Cankuzo', 'Cibitoke', 'Gitega', 'Kayanza', 'Kirundo', 'Makamba', 'Muramvya', 'Muyinga', 'Ngozi', 'Rumonge', 'Rutana', 'Ruyigi'],
  BJ: ['Alibori', 'Atakora', 'Atlantique', 'Borgou', 'Collines', 'Donga', 'Kouffo', 'Littoral', 'Mono', 'Ouémé', 'Plateau', 'Zou'],
  BW: ['Central', 'Chobe', 'City of Francistown', 'Gaborone', 'Ghanzi', 'Jwaneng', 'Kgalagadi', 'Kgatleng', 'Kweneng', 'Lobatse', 'Ngwaketsi', 'North-East', 'North-West', 'Selibe Phikwe', 'South-East', 'Sowa Town'],
  CD: ['Bas-Congo', 'Bas-Uele', 'East Kasai', 'Équateur', 'Haut-Katanga', 'Haut-Lomami', 'Haut-Uele', 'Ituri', 'Kasai', 'Kasai-Central', 'Kinshasa', 'Kwango', 'Kwilu', 'Lomami', 'Lualaba', 'Mai-Ndombe', 'Maniema', 'Mongala', 'Nord-Ubangi', 'North Kivu', 'Sankuru', 'South Kivu', 'Sud-Ubangi', 'Tanganyika', 'Tshopo', 'Tshuapa'],
  CF: ['Bamingui-Bangoran', 'Bangui', 'Basse-Kotto', 'Haut-Mbomou', 'Haute-Kotto', 'Kémo', 'Lim-Pendé', 'Lobaye', 'Mambéré', 'Mambéré-Kadéï', 'Mbomou', 'Nana-Grébizi', 'Nana-Mambéré', 'Ombella-M\'Poko', 'Ouaka', 'Ouham', 'Ouham-Fafa', 'Ouham-Pendé', 'Sangha-Mbaéré', 'Vakaga'],
  CG: ['Bouenza', 'Brazzaville', 'Cuvette', 'Cuvette-Ouest', 'Kouilou', 'Lékoumou', 'Likouala', 'Niari', 'Plateaux', 'Pointe-Noire', 'Pool', 'Sangha'],
  CI: ['Abidjan Autonomous District', 'Bas-Sassandra District', 'Comoé District', 'Denguélé District', 'Gôh-Djiboua', 'Lacs District', 'Lagunes District', 'Montagnes', 'Sassandra-Marahoué', 'Savanes District', 'Vallée du Bandama District', 'Woroba', 'Yamoussoukro', 'Zanzan District'],
  CM: ['Adamaoua', 'Centre', 'East', 'Far North', 'Littoral', 'North', 'North-West', 'South', 'South-West', 'West'],
  CV: ['Boa Vista', 'Brava', 'Maio', 'Mosteiros', 'Paul', 'Porto Novo', 'Praia', 'Ribeira Brava', 'Ribeira Grande', 'Ribeira Grande de Santiago', 'Sal', 'Santa Catarina', 'Santa Catarina do Fogo', 'Santa Cruz', 'São Domingos', 'São Filipe', 'São Lourenço dos Órgãos', 'São Miguel', 'São Salvador do Mundo', 'São Vicente', 'Tarrafal', 'Tarrafal de São Nicolau'],
  DJ: ['Ali Sabieh', 'Arta', 'Dikhil', 'Djibouti', 'Obock', 'Tadjourah'],
  DZ: ['Adrar', 'Aïn Defla', 'Aïn Témouchent', 'Algiers', 'Annaba', 'Batna', 'Béchar', 'Béjaïa', 'Beni Abbes', 'Biskra', 'Blida', 'Bordj Badji Mokhtar', 'Bordj Bou Arréridj', 'Bouira', 'Boumerdes', 'Chlef', 'Constantine', 'Djanet', 'Djelfa', 'El Bayadh', 'El Menia', 'El Mghair', 'El Oued', 'El Tarf', 'Ghardaia', 'Guelma', 'Illizi', 'In Guezzam', 'In Salah', 'Jijel', 'Khenchela', 'Laghouat', 'Mascara', 'Medea', 'Mila', 'Mostaganem', 'M\'Sila', 'Naama', 'Oran', 'Ouargla', 'Ouled Djellal', 'Oum el Bouaghi', 'Relizane', 'Saida', 'Sétif', 'Sidi Bel Abbès', 'Skikda', 'Souk Ahras', 'Tamanrasset', 'Tébessa', 'Tiaret', 'Timimoun', 'Tindouf', 'Tipaza', 'Tissemsilt', 'Tizi Ouzou', 'Tlemcen', 'Touggourt'],
  EG: ['Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suweif', 'Cairo', 'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr el-Sheikh', 'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez'],
  ER: ['Anseba', 'Debub', 'Gash-Barka', 'Maekel', 'Northern Red Sea', 'Southern Red Sea'],
  ET: ['Addis Ababa', 'Āfar', 'Amhara', 'Bīnshangul Gumuz', 'Central Ethiopia Regional State', 'Dire Dawa', 'Gambela', 'Harari', 'Oromiya', 'Sidama Region', 'Somali', 'South Ethiopia Regional State', 'South West Ethiopia Peoples\' Region', 'Tigray'],
  GA: ['Estuaire', 'Haut-Ogooué', 'Moyen-Ogooué', 'Ngouni', 'Nyanga', 'Ogooué-Ivindo', 'Ogooué-Lolo', 'Ogooué-Maritime', 'Woleu-Ntem'],
  GH: ['Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta', 'Western', 'Western North'],
  GM: ['Banjul', 'Central River', 'Lower River', 'North Bank', 'Upper River', 'Western'],
  GN: ['Boké Region', 'Conakry', 'Faranah', 'Kankan Region', 'Kindia', 'Labé Region', 'Mamou Region', 'Nzérékoré Region'],
  GQ: ['Annobon', 'Bioko Norte', 'Bioko Sur', 'Centro Sur', 'Djibloho', 'Kié-Ntem', 'Litoral', 'Wele-Nzas'],
  GW: ['Bafatá', 'Biombo', 'Bissau', 'Bolama', 'Cacheu', 'Gabú', 'Oio', 'Quinara', 'Tombali'],
  KE: ['Baringo', 'Bomet County', 'Bungoma County', 'Busia County', 'Elegeyo-Marakwet', 'Embu County', 'Garissa County', 'Homa Bay County', 'Isiolo County', 'Kajiado County', 'Kakamega County', 'Kericho County', 'Kiambu County', 'Kilifi County', 'Kirinyaga County', 'Kisii County', 'Kisumu County', 'Kitui County', 'Kwale County', 'Laikipia', 'Lamu', 'Machakos County', 'Makueni County', 'Mandera County', 'Marsabit County', 'Meru County', 'Migori County', 'Mombasa County', 'Murang\'A', 'Nairobi County', 'Nakuru County', 'Nandi', 'Narok County', 'Nyamira county', 'Nyandarua County', 'Nyeri County', 'Samburu County', 'Siaya County', 'Taita Taveta', 'Tana River County', 'Tharaka - Nithi', 'Trans Nzoia', 'Turkana County', 'Uasin Gishu County', 'Vihiga County', 'Wajir County', 'West Pokot County'],
  KM: ['Anjouan', 'Grande Comore', 'Mohéli'],
  LR: ['Bomi County', 'Bong County', 'Gbarpolu County', 'Grand Bassa County', 'Grand Cape Mount County', 'Grand Gedeh County', 'Grand Kru County', 'Lofa County', 'Margibi County', 'Maryland County', 'Montserrado County', 'Nimba', 'River Cess County', 'River Gee County', 'Sinoe County'],
  LS: ['Berea', 'Butha-Buthe', 'Leribe', 'Mafeteng District', 'Maseru District', 'Mohale\'s Hoek District', 'Mokhotlong District', 'Qacha\'s Nek District', 'Quthing', 'Thaba-Tseka'],
  LY: ['Al Buţnān', 'Al Jabal al Akhḑar', 'Al Jafārah', 'Al Jufrah', 'Al Kufrah', 'Al Marj', 'Al Marqab', 'Al Wāḩāt', 'An Nuqāţ al Khams', 'Ash Shāţiʼ', 'Az Zāwiyah', 'Banghāzī', 'Darnah', 'Ghāt', 'Jabal al Gharbi', 'Mişrātah', 'Murzuq District', 'Nālūt', 'Sabha District', 'Surt', 'Tripoli', 'Wādī al Ḩayāt'],
  MA: ['Béni Mellal-Khénifra', 'Casablanca-Settat', 'Dakhla-Oued Ed-Dahab', 'Drâa-Tafilalet', 'Fès-Meknès', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Marrakesh-Safi', 'Oriental', 'Rabat-Salé-Kénitra', 'Souss-Massa', 'Tanger-Tetouan-Al Hoceima'],
  MG: ['Alaotra Mangoro', 'Amoron\'i Mania', 'Analamanga', 'Analanjirofo', 'Androy', 'Anosy', 'Atsimo-Andrefana', 'Atsimo-Atsinanana', 'Atsinanana', 'Betsiboka', 'Boeny', 'Bongolava', 'Diana', 'Fitovinany Region', 'Ihorombe', 'Itasy', 'Melaky', 'Menabe', 'Sava', 'Sofia', 'Upper Matsiatra', 'Vakinankaratra', 'Vatovavy Region'],
  ML: ['Bamako', 'Gao', 'Kayes', 'Kidal', 'Koulikoro', 'Ménaka', 'Mopti', 'Ségou', 'Sikasso', 'Taoudénit', 'Tombouctou'],
  MR: ['Adrar', 'Assaba', 'Brakna', 'Dakhlet Nouadhibou', 'Gorgol', 'Guidimaka', 'Hodh Ech Chargi', 'Hodh El Gharbi', 'Inchiri', 'Nouakchott Nord', 'Nouakchott Ouest', 'Nouakchott Sud', 'Tagant', 'Tiris Zemmour', 'Trarza'],
  MU: ['Agalega Islands', 'Black River', 'Cargados Carajos', 'Flacq', 'Grand Port', 'Moka', 'Pamplemousses', 'Plaines Wilhems', 'Port Louis', 'Rivière du Rempart', 'Rodrigues', 'Savanne'],
  MW: ['Central Region', 'Northern Region', 'Southern Region'],
  MZ: ['Cabo Delgado Province', 'Gaza Province', 'Inhambane Province', 'Manica', 'Maputo City', 'Maputo Province', 'Nampula', 'Niassa Province', 'Sofala', 'Tete', 'Zambezia Province'],
  NA: ['Erongo Region', 'Hardap Region', 'Karas Region', 'Kavango East', 'Kavango West', 'Khomas Region', 'Kunene Region', 'Ohangwena Region', 'Omaheke Region', 'Omusati Region', 'Oshana Region', 'Oshikoto Region', 'Otjozondjupa Region', 'Zambezi Region'],
  NE: ['Agadez', 'Diffa', 'Dosso Region', 'Maradi Region', 'Niamey', 'Tahoua Region', 'Tillabéri Region', 'Zinder Region'],
  NG: ['Abia State', 'Adamawa', 'Akwa Ibom State', 'Anambra', 'Bauchi', 'Bayelsa State', 'Benue State', 'Borno State', 'Cross River State', 'Delta', 'Ebonyi State', 'Edo State', 'Ekiti State', 'Enugu State', 'FCT', 'Gombe State', 'Imo State', 'Jigawa State', 'Kaduna State', 'Kano State', 'Katsina State', 'Kebbi', 'Kogi State', 'Kwara State', 'Lagos', 'Nasarawa State', 'Niger State', 'Ogun State', 'Ondo State', 'Osun State', 'Oyo State', 'Plateau State', 'Rivers State', 'Sokoto', 'Taraba State', 'Yobe State', 'Zamfara State'],
  RW: ['Eastern Province', 'Kigali', 'Northern Province', 'Southern Province', 'Western Province'],
  SC: ['Anse-aux-Pins', 'Anse Boileau', 'Anse Etoile', 'Anse Royale', 'Au Cap', 'Baie Lazare', 'Baie Sainte Anne', 'Beau Vallon', 'Bel Air', 'Bel Ombre', 'Cascade', 'Glacis', 'Grand Anse Mahe', 'Grand Anse Praslin', 'Ile Perseverance I', 'Ile Perseverance II', 'La Digue and Inner Islands', 'La Rivière Anglaise', 'Les Mamelles', 'Mont Buxton', 'Mont Fleuri', 'Outer Islands', 'Plaisance', 'Pointe La Rue', 'Port Glaud', 'Roche Caiman', 'Saint Louis', 'Takamaka'],
  SD: ['Al Jazirah', 'Al Qaḑārif', 'Blue Nile', 'Central Darfur', 'Eastern Darfur', 'Kassala', 'Khartoum', 'North Kordofan', 'Northern Darfur', 'Northern State', 'Red Sea', 'River Nile', 'Sennar', 'Southern Darfur', 'Southern Kordofan', 'West Kordofan', 'Western Darfur', 'White Nile'],
  SL: ['Eastern Province', 'North West', 'Northern Province', 'Southern Province', 'Western Area'],
  SN: ['Dakar', 'Diourbel Region', 'Fatick', 'Kaffrine', 'Kaolack', 'Kédougou', 'Kolda', 'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda', 'Thiès', 'Ziguinchor'],
  SO: ['Awdal', 'Bakool', 'Banaadir', 'Bari', 'Bay', 'Galguduud', 'Gedo', 'Hiiraan', 'Lower Juba', 'Lower Shabeelle', 'Middle Juba', 'Middle Shabele', 'Mudug', 'Nugaal', 'Sanaag', 'Sool', 'Togdheer', 'Woqooyi Galbeed'],
  SS: ['Central Equatoria', 'Eastern Equatoria', 'Jonglei', 'Lakes', 'Northern Bahr al Ghazal', 'Unity', 'Upper Nile', 'Warrap', 'Western Bahr al Ghazal', 'Western Equatoria'],
  ST: ['Príncipe', 'São Tomé Island'],
  SZ: ['Hhohho Region', 'Lubombo Region', 'Manzini Region', 'Shiselweni'],
  TD: ['Barh el Gazel', 'Batha', 'Borkou', 'Chari-Baguirmi', 'Ennedi-Est', 'Ennedi-Ouest', 'Guéra', 'Hadjer-Lamis', 'Kanem', 'Lac', 'Logone Occidental', 'Logone Oriental', 'Mandoul', 'Mayo-Kebbi Est', 'Mayo-Kebbi Ouest', 'Moyen-Chari', 'N\'Djaména', 'Ouadaï', 'Salamat', 'Sila', 'Tandjilé', 'Tibesti', 'Wadi Fira'],
  TG: ['Centrale', 'Kara', 'Maritime', 'Plateaux', 'Savanes'],
  TN: ['Ariana Governorate', 'Béja Governorate', 'Ben Arous Governorate', 'Bizerte Governorate', 'Gabès Governorate', 'Gafsa', 'Jendouba Governorate', 'Kairouan', 'Kasserine Governorate', 'Kebili Governorate', 'Kef Governorate', 'Mahdia Governorate', 'Manouba', 'Medenine Governorate', 'Monastir Governorate', 'Nabeul Governorate', 'Sfax Governorate', 'Sidi Bouzid Governorate', 'Siliana Governorate', 'Sousse Governorate', 'Tataouine', 'Tozeur Governorate', 'Tunis Governorate', 'Zaghouan Governorate'],
  TZ: ['Arusha', 'Dar es Salaam Region', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Zanzibar Central/South', 'Zanzibar North', 'Zanzibar Urban/West'],
  UG: ['Central Region', 'Eastern Region', 'Northern Region', 'Western Region'],
  ZA: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'],
  ZM: ['Central Province', 'Copperbelt', 'Eastern Province', 'Luapula Province', 'Lusaka Province', 'Muchinga', 'North-Western', 'Northern Province', 'Southern Province', 'Western Province'],
  ZW: ['Bulawayo', 'Harare', 'Manicaland', 'Mashonaland Central', 'Mashonaland East Province', 'Mashonaland West', 'Masvingo Province', 'Matabeleland North', 'Matabeleland South Province', 'Midlands Province'],
  MX: ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'],
  BR: ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'],
};

/**
 * Get states/regions for a country code (e.g. 'US', 'CH').
 * Returns array of state names, or empty array if not in map (use free text).
 */
export function getStatesForCountry(countryCode) {
  if (!countryCode) return [];
  const code = String(countryCode).toUpperCase();
  return STATES_BY_COUNTRY[code] || [];
}

/**
 * Simple postal code validation by country code (format/length).
 * Returns { valid: boolean, message?: string }.
 */
export function validatePostalCode(postalCode, countryCode) {
  const raw = (postalCode || '').trim();
  if (!raw) return { valid: false, message: 'Postal code is required' };
  const code = (countryCode || '').toUpperCase();
  // Basic rules per country (length and pattern)
  const rules = {
    US: { minLen: 5, pattern: /^\d{5}(-\d{4})?$/ },
    GB: { minLen: 5 },
    CH: { minLen: 4, pattern: /^\d{4}$/ },
    DE: { minLen: 5, pattern: /^\d{5}$/ },
    IN: { minLen: 6, pattern: /^\d{6}$/ },
    CA: { minLen: 6, pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i },
    AU: { minLen: 4, pattern: /^\d{4}$/ },
    FR: { minLen: 5, pattern: /^\d{5}$/ },
    NL: { minLen: 6, pattern: /^\d{4}\s?[A-Z]{2}$/i },
    JP: { minLen: 7, pattern: /^\d{3}-?\d{4}$/ },
    SG: { minLen: 6, pattern: /^\d{6}$/ },
  };
  const rule = rules[code];
  if (rule) {
    if (raw.length < rule.minLen) return { valid: false, message: 'Postal code too short' };
    if (rule.pattern && !rule.pattern.test(raw.replace(/\s/g, ''))) return { valid: false, message: `Invalid postal format for this country` };
  }
  return { valid: true };
}
