/**
 * İlker Teker VIP Transfer - Location Catalog
 *
 * Why: Customers know hotel names, not districts. This catalog maps every
 *      searchable place (airport, region, hotel) to a PRICING region key
 *      used in main.js.
 * What: Exposes window.TransferLocations (frozen).
 *   - AIRPORT_NAME: default pickup label.
 *   - LOCATIONS: array of { name, kind, region, aliases }.
 *       kind    : 'airport' | 'region' | 'hotel'
 *       region  : PRICING key (null for airport)
 *       aliases : extra search terms (common spellings, neighbourhoods)
 *
 * To add a hotel: append { name, kind: 'hotel', region } to HOTELS below.
 */
(function (global) {
  'use strict';

  var AIRPORT_NAME = 'Antalya Havalimanı (AYT)';

  var AIRPORT = {
    name: AIRPORT_NAME,
    kind: 'airport',
    region: null,
    aliases: ['havalimani', 'havaalani', 'havalimanı', 'havaalanı', 'airport', 'ayt', 'antalya airport', 'antalya havaalani']
  };

  /* Region entries: region = PRICING key. */
  var REGIONS = [
    { name: 'Antalya Merkez', region: 'antalya merkez', aliases: ['antalya', 'şehir merkezi', 'muratpaşa', 'meltem', 'falezler'] },
    { name: 'Lara', region: 'lara', aliases: ['lara plajı', 'güzeloba'] },
    { name: 'Kundu', region: 'kundu', aliases: ['aksu'] },
    { name: 'Konyaaltı', region: 'konyaaltı', aliases: ['konyaalti plajı', 'liman'] },
    { name: 'Kaleiçi', region: 'kaleiçi', aliases: ['kaleici', 'old town', 'eski şehir'] },
    { name: 'Belek', region: 'belek', aliases: ['kadriye'] },
    { name: 'Boğazkent', region: 'boğazkent', aliases: ['bogazkent'] },
    { name: 'Serik', region: 'serik', aliases: [] },
    { name: 'Kemer', region: 'kemer', aliases: ['kemer merkez'] },
    { name: 'Göynük', region: 'göynük', aliases: ['goynuk'] },
    { name: 'Beldibi', region: 'beldibi', aliases: [] },
    { name: 'Çamyuva', region: 'çamyuva', aliases: ['camyuva'] },
    { name: 'Kiriş', region: 'kiriş', aliases: ['kiris'] },
    { name: 'Tekirova', region: 'tekirova', aliases: [] },
    { name: 'Side', region: 'side', aliases: ['side antik kenti'] },
    { name: 'Manavgat', region: 'manavgat', aliases: [] },
    { name: 'Sorgun', region: 'sorgun', aliases: [] },
    { name: 'Çolaklı', region: 'çolaklı', aliases: ['colakli'] },
    { name: 'Evrenseki', region: 'evrenseki', aliases: [] },
    { name: 'Kumköy', region: 'kumköy', aliases: ['kumkoy'] },
    { name: 'Gündoğdu', region: 'gündoğdu', aliases: ['gundogdu'] },
    { name: 'Titreyengöl', region: 'titreyengöl', aliases: ['titreyengol'] },
    { name: 'Denizyaka', region: 'denizyaka', aliases: [] },
    { name: 'Kızılot', region: 'kızılot', aliases: ['kizilot'] },
    { name: 'Kızılağaç', region: 'kızılağaç', aliases: ['kizilagac'] },
    { name: 'Okurcalar', region: 'okurcalar', aliases: [] },
    { name: 'Avsallar', region: 'avsallar', aliases: [] },
    { name: 'İncekum', region: 'incekum', aliases: ['incekum'] },
    { name: 'Çenger', region: 'çenger', aliases: ['cenger'] },
    { name: 'Konaklı', region: 'konaklı', aliases: ['konakli'] },
    { name: 'Türkler', region: 'türkler', aliases: ['turkler'] },
    { name: 'Alanya', region: 'alanya', aliases: ['alanya merkez'] },
    { name: 'Olimpos', region: 'olimpos', aliases: ['olympos', 'çıralı', 'cirali'] },
    { name: 'Adrasan', region: 'adrasan', aliases: [] },
    { name: 'Mahmutlar', region: 'mahmutlar', aliases: [] },
    { name: 'Kargıcak', region: 'kargıcak', aliases: ['kargicak'] },
    { name: 'Kestel', region: 'kestel', aliases: [] },
    { name: 'Kaş', region: 'kaş', aliases: ['kas'] },
    { name: 'Kalkan', region: 'kalkan', aliases: [] }
  ];

  /* Hotel entries: region = PRICING key of the area the hotel is located in. */
  var HOTELS = [
    /* Antalya Merkez / Lara / Kundu / Konyaaltı / Kaleiçi */
    { name: 'Rixos Downtown Antalya', region: 'antalya merkez' },
    { name: 'Sheraton Voyager Antalya', region: 'antalya merkez' },
    { name: 'Dedeman Antalya', region: 'antalya merkez' },
    { name: 'Hillside Su Hotel', region: 'konyaaltı' },
    { name: 'Best Western Plus Khan Hotel', region: 'kaleiçi' },
    { name: 'Tuvana Hotel', region: 'kaleiçi' },
    { name: 'Mediterra Art Hotel', region: 'kaleiçi' },
    { name: 'Titanic Beach Lara', region: 'lara' },
    { name: 'Delphin Imperial', region: 'lara' },
    { name: 'Delphin Palace', region: 'lara' },
    { name: 'Lara Barut Collection', region: 'lara' },
    { name: 'Kremlin Palace', region: 'lara' },
    { name: 'Mirada del Mar', region: 'lara' },
    { name: 'Concorde De Luxe Resort', region: 'lara' },
    { name: 'Royal Seginus', region: 'lara' },
    { name: 'Limak Lara Deluxe', region: 'lara' },
    { name: 'Wow Topkapi Palace', region: 'lara' },
    { name: 'Sherwood Breezes Resort', region: 'lara' },
    { name: 'Sherwood Exclusive Lara', region: 'kundu' },
    { name: 'Mardan Palace', region: 'kundu' },
    { name: 'IC Hotels Santai', region: 'kundu' },
    { name: 'IC Hotels Green Palace', region: 'kundu' },
    { name: 'IC Hotels Residence', region: 'kundu' },
    { name: 'Kervansaray Kundu', region: 'kundu' },

    /* Belek / Boğazkent / Serik */
    { name: 'Regnum Carya', region: 'belek' },
    { name: 'Rixos Premium Belek', region: 'belek' },
    { name: 'Rixos Park Belek', region: 'belek' },
    { name: 'Gloria Golf Resort', region: 'belek' },
    { name: 'Gloria Serenity Resort', region: 'belek' },
    { name: 'Gloria Verde Resort', region: 'belek' },
    { name: 'Maxx Royal Belek Golf Resort', region: 'belek' },
    { name: 'Titanic Deluxe Belek', region: 'belek' },
    { name: 'Titanic Deluxe Golf Belek', region: 'belek' },
    { name: 'Sueno Hotels Beach Belek', region: 'belek' },
    { name: 'Sueno Hotels Deluxe Belek', region: 'belek' },
    { name: 'Voyage Belek Golf & Spa', region: 'belek' },
    { name: 'Kaya Palazzo Golf Resort', region: 'belek' },
    { name: 'Papillon Belvil', region: 'belek' },
    { name: 'Papillon Zeugma', region: 'belek' },
    { name: 'Papillon Ayscha', region: 'belek' },
    { name: 'Calista Luxury Resort', region: 'belek' },
    { name: 'Cullinan Belek', region: 'belek' },
    { name: 'Cornelia Diamond Golf Resort', region: 'belek' },
    { name: 'Cornelia De Luxe Resort', region: 'belek' },
    { name: 'Ela Excellence Resort Belek', region: 'belek' },
    { name: 'Ela Quality Resort Belek', region: 'belek' },
    { name: 'Susesi Luxury Resort', region: 'belek' },
    { name: 'Land of Legends', region: 'belek' },
    { name: 'Nirvana Lagoon Villas Suites & Spa', region: 'belek' },
    { name: 'Granada Luxury Belek', region: 'belek' },
    { name: 'Bellis Deluxe Hotel', region: 'belek' },
    { name: 'Adam & Eve Hotel', region: 'belek' },
    { name: 'Delphin Diva Premiere', region: 'belek' },
    { name: 'Alva Donna Exclusive Hotel', region: 'belek' },
    { name: 'Sirene Belek', region: 'belek' },
    { name: 'Limak Atlantis Deluxe Resort', region: 'belek' },
    { name: 'Xanadu Resort', region: 'belek' },
    { name: 'Sherwood Dreams Resort', region: 'belek' },
    { name: 'Selectum Luxury Resort Belek', region: 'belek' },
    { name: 'Crystal Tat Beach Golf Resort', region: 'belek' },
    { name: 'Kempinski Hotel The Dome', region: 'belek' },
    { name: 'Crystal Waterworld Resort', region: 'boğazkent' },
    { name: 'Crystal Palace Luxury Resort', region: 'boğazkent' },

    /* Kemer / Göynük / Beldibi / Çamyuva / Kiriş / Tekirova */
    { name: 'Rixos Beldibi', region: 'beldibi' },
    { name: 'Maxx Royal Kemer Resort', region: 'göynük' },
    { name: 'Kilikya Palace Göynük', region: 'göynük' },
    { name: 'Kilikya Resort Çamyuva', region: 'çamyuva' },
    { name: 'Club Med Kemer', region: 'kemer' },
    { name: 'Crystal Flora Beach Resort', region: 'kemer' },
    { name: 'Crystal De Luxe Resort', region: 'kemer' },
    { name: 'Mirage Park Resort', region: 'kemer' },
    { name: 'Orange County Resort Kemer', region: 'kemer' },
    { name: 'Limak Limra Hotel', region: 'kiriş' },
    { name: 'Rixos Premium Tekirova', region: 'tekirova' },
    { name: 'Amara Dolce Vita', region: 'tekirova' },
    { name: 'Amara Prestige Elite', region: 'tekirova' },
    { name: 'Amara Premier Palace', region: 'tekirova' },
    { name: 'Club Hotel Phaselis Rose', region: 'tekirova' },
    { name: 'Queens Park Resort Tekirova', region: 'tekirova' },

    /* Side / Manavgat / Sorgun / Çolaklı / Evrenseki / Kızılağaç */
    { name: 'Barut Hemera', region: 'sorgun' },
    { name: 'Barut Acanthus & Cennet', region: 'sorgun' },
    { name: 'Ali Bey Resort Sorgun', region: 'sorgun' },
    { name: 'Ali Bey Club Manavgat', region: 'manavgat' },
    { name: 'Kamelya Collection Hotels', region: 'sorgun' },
    { name: 'Sunmelia Beach Resort', region: 'side' },
    { name: 'Alarcha Hotels & Resort', region: 'side' },
    { name: 'Club Calimera Serra Palace', region: 'side' },
    { name: 'Selectum Family Resort Side', region: 'side' },
    { name: 'Nashira Resort', region: 'side' },
    { name: 'Gold Island Hotel', region: 'kızılağaç' },

    /* Alanya çevresi */
    { name: 'Granada Luxury Resort & Spa', region: 'okurcalar' },
    { name: 'Delphin Deluxe Resort', region: 'okurcalar' },
    { name: 'Aydinbey Famous Resort', region: 'okurcalar' },
    { name: 'Miracle Resort', region: 'konaklı' },
    { name: 'Long Beach Resort Hotel', region: 'konaklı' },
    { name: 'Utopia World Hotel', region: 'alanya' },
    { name: 'Alaaddin Beach Hotel', region: 'alanya' }
  ];

  function withKind(items, kind) {
    return items.map(function (item) {
      return {
        name: item.name,
        kind: kind,
        region: item.region,
        aliases: item.aliases || []
      };
    });
  }

  var LOCATIONS = [AIRPORT].concat(withKind(REGIONS, 'region'), withKind(HOTELS, 'hotel'));

  global.TransferLocations = Object.freeze({
    AIRPORT_NAME: AIRPORT_NAME,
    LOCATIONS: Object.freeze(LOCATIONS)
  });
})(window);
