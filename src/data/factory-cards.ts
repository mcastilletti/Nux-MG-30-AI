import type { Genre, SoundType } from '@/lib/genres';

/**
 * Schede dei 128 preset di fabbrica, scritte a mano a partire dalla catena reale di ogni preset
 * (ampli, cab, pedali, effetti). Restano agganciate al preset: sono indicizzate per slot e
 * `presetName` è il nome di fabbrica per cui sono state scritte (un test controlla che coincida).
 *
 * `altRock`: il suono funziona bene per Oasis / Britpop e alternative rock anni 90–2000.
 */
export interface FactoryCard {
  presetName: string;
  soundType: SoundType;
  genres: Genre[];
  /** Band o artisti di esempio: il tipo di suono che ci si può aspettare. */
  bands: string[];
  notes: string;
  altRock: boolean;
}

const R: Genre = 'Rock';
const HR: Genre = 'Hard rock';
const M: Genre = 'Metal';
const B: Genre = 'Blues';
const P: Genre = 'Pop';
const F: Genre = 'Funk';
const J: Genre = 'Jazz';
const C: Genre = 'Country';
const IA: Genre = 'Indie / Alternative';
const G: Genre = 'Grunge';
const AM: Genre = 'Ambient / Post-rock';
const FU: Genre = 'Fusion';
const S: Genre = 'Soul / R&B';
const CA: Genre = 'Cantautorato / Acustico';
const BP: Genre = 'Britpop';

const CL: SoundType = 'Clean';
const CR: SoundType = 'Crunch';
const DR: SoundType = 'Drive';
const HG: SoundType = 'High gain';
const LE: SoundType = 'Lead';
const AC: SoundType = 'Acustico';
const BA: SoundType = 'Basso';
const AE: SoundType = 'Ambient / Effetti';

type Row = [slot: number, presetName: string, soundType: SoundType, genres: Genre[], bands: string, notes: string, altRock?: true];

const ROWS: Row[] = [
  [1, 'CT-RectoBeast', DR, [HR, M, R], 'Foo Fighters, Queens of the Stone Age, Alter Bridge', 'Dual Rectifier a gain basso con Tube Screamer usato come tightener: riff serrati e moderni, cab 2x12 utente.'],
  [2, 'CT-DriveJCM', DR, [R, HR, BP], 'Oasis, AC/DC, Stereophonics', 'Marshall JCM800 a gain alto con un velo di hall: il muro di chitarre rock britannico.', true],
  [3, 'CT-AmbientClean', AE, [AM, P], 'Coldplay, U2, Sigur Rós', 'Deluxe pulito con chorus CE-2, delay doppio e shimmer: arpeggi che si aprono in un tappeto.'],
  [4, 'CT-PlexiLead', LE, [R, B, BP], 'Oasis (assoli), Led Zeppelin, Pink Floyd', 'Plexi 100W con Blues Driver, pan delay e hall: assolo caldo e cantabile, perfetto per le melodie di Noel.', true],
  [5, 'PeteT 80\'s Clean', CL, [P, R], 'The Police, U2, The Cure', 'Super Reverb con compressore, chorus e delay in tempo: il pulito scintillante anni 80.'],
  [6, 'PeteT Plexi Lead', LE, [HR, R], 'AC/DC, Whitesnake, Deep Purple', 'Marshall JMP 1987X con Tube Screamer di spinta e delay: assolo hard rock pieno e a fuoco.'],
  [7, 'PeteT Raw BE', CR, [HR, R], 'Guns N\' Roses, Aerosmith, Foo Fighters', 'Friedman BE a gain medio: crunch aperto e aggressivo per riff e accordi.'],
  [8, 'PeteT Rotorgrind', DR, [B, R], 'Jimi Hendrix, Robin Trower, Pink Floyd', 'Super Reverb leggermente sporco, Blues Driver, rotary e hall: blues psichedelico a Leslie.'],
  [9, 'LT 80\'s CLEAN', CL, [P, R], 'Simple Minds, Duran Duran, The Police', 'Twin Reverb con compressore, detune e riverbero lungo: pulito ampio e brillante.'],
  [10, 'LT BLUES DELUXE', CR, [B, R], 'Stevie Ray Vaughan, Robin Trower, John Mayer', 'Deluxe Reverb sul punto di rottura con U-Vibe: blues caldo che morde quando si pizzica forte.'],
  [11, 'LT PLEXI CRUNCH', CR, [R, BP, HR], 'Oasis, The Stone Roses, Led Zeppelin', 'Plexi 100W spinto da Tube Screamer con phaser e hall: crunch classico britannico, ottimo per accordi pieni.', true],
  [12, 'LT UBER CHUNK', HG, [M], 'Metallica, Machine Head, Alter Bridge', 'Bogner Überschall con Tube Screamer: riff pesanti e compressi, medio scavato.'],
  [13, 'Hermans Clean An', CL, [IA, P, R], 'Coldplay, Radiohead, U2', 'Deluxe pulito con boost, delay analogico e hall: pulito profondo per accordi aperti.', true],
  [14, 'Hermans Cleanish', CR, [B, R, C], 'Tom Petty, Eric Clapton, John Mayer', 'Deluxe con Morning Drive e spring: quasi pulito che si sporca col tocco.'],
  [15, 'Hermans Crunchy', CR, [R, B, BP], 'Ocean Colour Scene, Eric Clapton (Bluesbreakers), Oasis', 'Brit Blues con compressore K e spring: crunch britannico dinamico per ritmica e riff.', true],
  [16, 'Hermans Lead', LE, [R, HR, BP], 'Oasis, Led Zeppelin, Deep Purple', 'Plexi 100W con AC Boost, delay analogico e hall: assolo aperto, lungo e cantabile.', true],
  [17, 'VT Blues Lead', LE, [B], 'Stevie Ray Vaughan, Gary Moore, Joe Bonamassa', 'Vibro King a gain medio con delay analogico e spring: assolo blues grasso e bagnato.'],
  [18, 'VT Clean Chorus', CL, [G, P], 'Nirvana (Come as You Are), The Police, Metallica (intro)', 'Super Reverb con Katana come boost, chorus, pan delay e plate: il pulito col chorus delle ballate anni 90.', true],
  [19, 'VT Clean', CL, [P, B, R], 'Fleetwood Mac, Dire Straits, Eagles', 'Super Reverb pulito con pan delay e hall: suono neutro e brillante.'],
  [20, 'VT Dist Lead', LE, [HR, R], 'Foo Fighters, Alter Bridge, Metallica', 'Dual Rectifier con pan delay e hall: assolo distorto, compresso e sostenuto.'],
  [21, 'A. Barrero Atmos', AE, [AM], 'U2 (The Edge), Sigur Rós, Explosions in the Sky', 'Deluxe con boost, CE-1, delay doppio e hall lungo: paesaggi sonori con note che sfumano.'],
  [22, 'A. Barrero Clean', CL, [P, S, IA], 'John Mayer, Coldplay, Jeff Buckley', 'Deluxe con compressore Rose, chorus leggero e delay analogico: pulito morbido e cantabile.'],
  [23, 'A. Barrero Lead', LE, [HR, R], 'Gary Moore, Scorpions, Whitesnake', 'JMP 1987X con Dist One, delay digitale e room: assolo hard rock caldo e legato.'],
  [24, 'A. Barrero Tweed', DR, [B, R, IA], 'Neil Young, The Black Keys, Jack White', 'Tweedy a manopole al massimo: suono tweed sporco, grezzo e dinamico.'],
  [25, 'KitTang Lead', LE, [R, HR], 'Led Zeppelin, Whitesnake, Gary Moore', 'Plexi 100W con Red Dirt, delay doppio e spring: assolo ricco di sustain.'],
  [26, 'KitTang Mid Gain', DR, [R, B], 'Deep Purple, Free, Eric Clapton', 'Plexi con Blues Driver e compressore: overdrive medio per riff e fraseggi.'],
  [27, 'AG Sim S.Coil', AC, [CA, P], 'Ed Sheeran, James Taylor, Tracy Chapman', 'Simulazione acustica per single coil (cab Martin D-45): suono da acustica in strumenti elettrici.'],
  [28, 'British Clean', CL, [BP, P, R], 'Oasis, Blur, Travis', 'Class A 30 (Vox AC30) con chorus CE-2 e room: il pulito britannico brillante e leggermente frizzante.', true],
  [29, 'SF Chug Monster', HG, [M], 'Pantera, Metallica, Slipknot', 'Überschall con bassi al massimo: palm mute e accordature ribassate.'],
  [30, 'SF Shred or Die', HG, [M, HR], 'Megadeth, Dream Theater, Avenged Sevenfold', 'Dual Rectifier con Tube Screamer al massimo e delay: assoli veloci con molta compressione.'],
  [31, 'SFHairNation-800', DR, [HR], 'Mötley Crüe, Skid Row, Guns N\' Roses', 'JCM800 spinto da Tube Screamer con room: hard rock anni 80, ricco e aggressivo.'],
  [32, 'SF Space Ocean', AE, [AM], 'Sigur Rós, Radiohead, Explosions in the Sky', 'Super Reverb con detune, delay a modulazione e hall con pre-delay: effetti spaziali e ambientali.'],
  [33, 'LeoGibson Bass', BA, [R, P], 'Foo Fighters, Queens of the Stone Age, Pearl Jam', 'Ampli basso AGL su cab 8x10, nessun effetto: basso rock pieno e diretto.'],
  [34, 'LeoGibson Clean', CL, [P, R], 'Coldplay, Tom Petty, Fleetwood Mac', 'Deluxe con chorus CE-2 e pan delay: pulito rotondo con un po\' di movimento.'],
  [35, 'LeoGibson Crunch', CR, [R, HR, BP], 'Oasis, AC/DC, Foo Fighters', 'JCM800 a gain medio senza effetti: crunch britannico asciutto, ottimo per Oasis.', true],
  [36, 'LeoGibson Solo', LE, [HR, R], 'Aerosmith, Whitesnake, Dream Theater', 'Soldano SLO 100 con pan delay: assolo saturo, compresso e rotondo.'],
  [37, 'MAY P CLEAN SOLO', BA, [P, F, S], 'Motown (James Jamerson), Red Hot Chili Peppers', 'Basso pulito AGL con compressore e hall: melodie di basso con sustain e presenza.'],
  [38, 'MAY P CLEAN', BA, [R, P, BP], 'Oasis, Motown, Fleetwood Mac', 'AGL pulito su cab 8x10 con EQ a 10 bande: basso da plettro pieno e rotondo, per accompagnare.', true],
  [39, 'MAY P DIST', BA, [R, G, IA], 'Muse, Royal Blood, Motörhead', 'Basso AGL con Eat Dist: distorsione sporca e aggressiva per riff in primo piano.'],
  [40, 'MAY P SLAP DIST', BA, [F, R], 'Red Hot Chili Peppers, Primus, Rage Against the Machine', 'AGL con Eat Dist e medio scavato: slap sporco, brillante e percussivo.'],
  [41, 'Emir BLUES', DR, [B, R], 'Gary Moore, Eric Clapton, Joe Bonamassa', 'Plexi 45 con Tube Screamer, compressore e spring: blues ricco di sustain.'],
  [42, 'Emir CLEAN', CL, [AM, P], 'Coldplay, John Mayer, Pat Metheny', 'Deluxe pulito con compressore, chorus stereo, delay e shimmer: pulito largo e luminoso.'],
  [43, 'Emir LEAD', LE, [FU, HR, R], 'Joe Satriani, Steve Vai, Dream Theater', 'Diezel VH4 con compressore, boost e delay: assolo fluido e brillante.'],
  [44, 'Emir METAL', HG, [M], 'Metallica, Pantera, Lamb of God', 'Überschall con boost e EQ a 10 bande: metal moderno con grande definizione.'],
  [45, 'JL-Super RVD', CL, [AM], 'Mogwai, Slowdive, Sigur Rós', 'Super Reverb scuro con hall lunghissimo: pulito immerso nel riverbero.'],
  [46, 'JL-Warm Lead', LE, [R, FU], 'Pink Floyd, Dire Straits, Joe Satriani', 'Dual Rectifier a gain minimo con AC Boost e delay: lead caldo e rotondo, senza spigoli.'],
  [47, 'JL-PLEXI', CR, [R, HR, BP], 'Led Zeppelin, The Who, Oasis', 'Plexi 100W a pieno volume con hall: crunch classico, vicino al suono di un ampli spinto.', true],
  [48, 'JL-Heavy', HG, [M], 'Pantera, Metallica', 'Überschall con Tube Screamer a livello alto: heavy compatto e potente.'],
  [49, 'JL-Bassman', CR, [B, R, C], 'Stevie Ray Vaughan, Buddy Guy, The Black Keys', 'Fender Bassman (tweed) a volume pieno: blues tweed grasso con compressione naturale.'],
  [50, 'JL-JC120', CL, [J, P, IA], 'The Cure, Pat Metheny, The Smiths', 'Jazz Clean (JC-120) con detune e delay: pulito cristallino con effetto chorus stereo.'],
  [51, 'JL-L. Kravitz', CR, [F, R, S], 'Lenny Kravitz, Jimi Hendrix, Prince', 'JMP 1987X con gain basso e alti aperti: crunch vintage per riff funky.'],
  [52, 'JL-Slash', CR, [HR, R], 'Guns N\' Roses, Aerosmith, Velvet Revolver', 'JMP 1987X con medio al massimo: crunch aperto e cantabile alla Slash.'],
  [53, 'JCordy 30', DR, [R, IA, C], 'Kings of Leon, Tom Petty, Wilco', 'Matchless con Red Dirt e pan delay: overdrive caldo e spaziale per rock indie.', true],
  [54, 'JCordy TS', DR, [B, R], 'Stevie Ray Vaughan, John Mayer, The Black Crowes', 'Vibro King spinto dal Tube Screamer con vibrato e delay: blues dinamico e vibrante.'],
  [55, 'JCordy Eric Lead', LE, [R, IA, G], 'Eric Clapton (Cream), Smashing Pumpkins, Jimi Hendrix', 'Plexi al massimo con Muff Fuzz e delay: fuzz grasso e sostenuto, perfetto per assoli.', true],
  [56, 'JCordy Clean', CL, [B, P, C], 'Mark Knopfler, John Mayer, Chris Isaak', 'Vibro King pulito con pan delay e hall: pulito caldo con eco stereo.'],
  [57, 'JCordy Lead', LE, [R, HR], 'Aerosmith, Bon Jovi, Slash', 'Friedman BE con pan delay e hall: assolo rock saturo e cantabile.'],
  [58, 'JCordy Lead 2', LE, [R, FU], 'Carlos Santana, Alter Bridge, Journey', 'Cali Crunch con Dist Plus e delay: lead morbido, tondo e sostenuto.'],
  [59, 'MK AG Sim Mag', AC, [CA, BP, P], 'Oasis (parti acustiche), Ed Sheeran, Jack Johnson', 'Simulazione acustica per pickup magnetici (cab Gibson Hummingbird): acustica corposa e brillante.', true],
  [60, 'MK Santana Europ', LE, [FU, R], 'Carlos Santana, Gary Moore, Mark Knopfler', 'Cali Crunch con Red Dirt, delay e plate: lead lungo e vocale in stile Europa.'],
  [61, 'Joko Bounce', HG, [HR, M], 'Metallica, Alter Bridge, Disturbed', 'Überschall con Tube Screamer: riff pesanti e potenti con bassi presenti.'],
  [62, 'Joko Funko', CL, [F, S], 'Chic, Red Hot Chili Peppers, Prince', 'Twin Reverb al limite con compressore e chorus S.C.F.: pulito funk che morde.'],
  [63, 'Joko HG Lead', LE, [HR, M], 'Alter Bridge, Dream Theater, Joe Satriani', 'Diezel VH4 con Tube Screamer, delay e hall: lead high gain definito.'],
  [64, 'Joko Krunch', CR, [R, BP], 'Oasis, Stereophonics, Kasabian', 'JCM800 con gain moderato, pan delay e hall: crunch pieno e aperto per riff e accordi.', true],
  [65, 'Joko Ocean View', AE, [AM, P], 'Coldplay, U2, Sigur Rós', 'Twin con compressore, pan delay e hall lungo: pulito aperto e spaziale.'],
  [66, 'Joko Space Lead', LE, [FU, AM, R], 'Pink Floyd, Muse, Joe Satriani', 'Diezel VH4 con Tube Screamer, delay doppio e hall: lead spaziale e sostenuto.'],
  [67, 'Joko Sunny Side', DR, [R, B], 'The Black Crowes, Eric Clapton, Rival Sons', 'Plexi 45 con Red Dirt e Tube Screamer: overdrive stratificato e caldo.'],
  [68, 'Joko Time Trip', CR, [IA, R, BP], 'Oasis (Champagne Supernova), The Verve, Radiohead', 'JCM800 morbido con CE-1, delay digitale e hall: suono sognante tipico di Noel.', true],
  [69, 'JonK\'s Clean', CL, [P, C, B], 'Tom Petty, Mark Knopfler, Eric Clapton', 'Deluxe con compressore Rose e hall: pulito morbido e dolce.'],
  [70, 'JonK\'s Drive', DR, [R, HR, BP], 'AC/DC, Guns N\' Roses, Oasis', 'JCM800 con compressore K e room: overdrive pieno e compatto.', true],
  [71, 'JonK\'s SemiClean', CR, [R, B, P], 'John Mayer, Eric Clapton, Tom Petty', 'Deluxe al limite con compressore e delay digitale: semi-pulito dinamico.'],
  [72, 'JonK\'s Solo', LE, [HR, FU], 'Joe Satriani, Gary Moore, Dream Theater', 'Diezel VH4 con hall: lead saturo senza altri effetti.'],
  [73, 'RL - Ambience', AE, [AM, P], 'The Cure, Radiohead, U2', 'Jazz Clean con chorus, pan delay e hall lunghissimo: pulito ambient e morbido.'],
  [74, 'RL - Calm', AE, [AM], 'Sigur Rós, Explosions in the Sky, Coldplay', 'Twin con chorus, pan delay e shimmer: pulito etereo e rilassato.'],
  [75, 'RL - Mariana', AE, [AM, P], 'Sigur Rós, Mogwai, Brian May', 'Jazz Clean con armonizzatore, delay a modulazione e hall: pulito con voci armonizzate.'],
  [76, 'RL - Quartz', AE, [AM, IA], 'Mazzy Star, Chris Isaak, Cigarettes After Sex', 'Jazz Clean con tremolo e shimmer: pulito ondeggiante e onirico.'],
  [77, 'GY Bluesy Man', DR, [B, R], 'The Black Keys, Eric Clapton, Gary Moore', 'Bassman con Blues Driver e spring: overdrive blues grasso e caldo.'],
  [78, 'GY Funky Stummin', CL, [F, P], 'Chic, Prince, Red Hot Chili Peppers', 'Super Reverb con compressore e detune: ritmica funk pulita e scattante.'],
  [79, 'GY I\'m Bassist', BA, [F, R, FU], 'Red Hot Chili Peppers, Primus, Victor Wooten', 'Bassguy con compressore e armonizzatore: basso moderno in primo piano.'],
  [80, 'GY So Tight Dly', HG, [M, HR], 'Metallica, Pantera, Megadeth', 'Diezel VH4 con delay corto e EQ parametrico: high gain stretto e preciso.'],
  [81, 'TAMESHIBIKI CLN', CL, [P, J], 'John Mayer, Coldplay, Tom Petty', 'Twin con hall e EQ a 10 bande su cab Dumble 1x12: pulito brillante e ampio.'],
  [82, 'TAMESHIBIKI DS', DR, [R, HR, IA], 'Foo Fighters, Alter Bridge, Muse', 'Diezel VH4 a gain medio su cab 4x12 Marbow: distorsione rock moderna e compatta.', true],
  [83, 'TAMESHIBIKI OD', DR, [B, R], 'Stevie Ray Vaughan, John Mayer, The Black Keys', 'Twin spinto da Tube Screamer su cab Dumble: overdrive blues morbido.'],
  [84, 'TAMESHIBIKI PLEX', CR, [R, HR, BP], 'Led Zeppelin, The Who, Oasis', 'Plexi 45 a gain medio su cab 4x12 Marbow: crunch classico, grosso e cremoso.', true],
  [85, 'MF EVH-ISH', DR, [HR], 'Van Halen, Mötley Crüe, Whitesnake', 'Plexi 100W con Morning Drive: il "brown sound", ricco e saturo.'],
  [86, 'MF GILMOUR-ISH', LE, [R, AM], 'Pink Floyd, David Gilmour, Porcupine Tree', 'HiWire con Muff Fuzz, tape echo e compressore: lead fuzz lungo e vocale.'],
  [87, 'MF MAYER-ISH', DR, [B, P, S], 'John Mayer, Eric Clapton, Gary Clark Jr.', 'Deluxe con Katana come boost e spring: overdrive blues morbido.'],
  [88, 'MF SLASH-ISH', DR, [HR, R], 'Guns N\' Roses, Velvet Revolver', 'JCM800 con master al massimo e bassi alti: crunch grosso e dinamico.'],
  [89, 'RG ANGUS 87X', DR, [HR, R], 'AC/DC, Airbourne, Rose Tattoo', 'JMP 1987X con RC Boost: il suono AC/DC, ritmica e assolo.'],
  [90, 'RG SLASH', DR, [HR, R], 'Guns N\' Roses, Velvet Revolver, Aerosmith', 'JCM800 con hall: overdrive aperto per riff e assoli.'],
  [91, 'RG GMoore Blues', LE, [B, R, HR], 'Gary Moore, Thin Lizzy, Eric Clapton', 'Plexi 100W a gain alto con hall: lead blues espressivo e sostenuto.'],
  [92, 'RG Jimi Fuzz', LE, [B, R, G], 'Jimi Hendrix, Smashing Pumpkins, The Black Keys', 'Plexi 45 con Muff Fuzz e U-Vibe: fuzz psichedelico e vibrante.', true],
  [93, 'LX BLUE DAY ST', DR, [B, R], 'Stevie Ray Vaughan, Robert Cray, John Mayer', 'Super Reverb con Blues Driver e hall: blues da Stratocaster, pulito che si sporca.'],
  [94, 'LX DuskCL LP', CL, [J, FU, S], 'Pat Metheny, George Benson, Larry Carlton', 'Jazz Clean con compressore, tremolo e delay: pulito jazz morbido e profondo.'],
  [95, 'LX Fever', AE, [B, R], 'Jimi Hendrix, Robin Trower, John Mayer', 'Deluxe con U-Vibe, delay analogico e hall: blues psichedelico e ondeggiante.'],
  [96, 'LX Funky NowST', CL, [F, P], 'Nile Rodgers, Red Hot Chili Peppers, Prince', 'Deluxe con compressore e chorus CE-1: ritmica funk percussiva e brillante.'],
  [97, 'LX HMJassLP', CL, [J, FU], 'Wes Montgomery, Pat Metheny, George Benson', 'Jazz Clean con compressore, armonizzatore leggero e plate: pulito jazz caldo e rotondo.'],
  [98, 'LX LOST IN DUO', AE, [AM, P], 'U2 (The Edge), Coldplay, Explosions in the Sky', 'Deluxe con delay doppio al massimo e hall: arpeggi con ripetizioni ritmiche.'],
  [99, 'LX Mid-Night ST', AE, [B, AM], 'Pink Floyd, Dire Straits, Chris Rea', 'Deluxe con AC Boost, chorus CE-1, delay analogico e hall: pulito notturno e avvolgente.'],
  [100, 'LX MN CS ST', CL, [P, B], 'Mark Knopfler, Chris Rea, John Mayer', 'Vibro King con chorus stereo, delay e plate: pulito liquido e luminoso.'],
  [101, 'LX OD Melody ST', LE, [B, R], 'Stevie Ray Vaughan, Gary Moore, Eric Johnson', 'Super Reverb con Tube Screamer spinto, delay e spring: melodie legate e sostenute.'],
  [102, 'LX SWT OD LP', DR, [R, B, S], 'The Black Crowes, Joe Bonamassa, Free', 'Matchless con bassi pieni, delay analogico e hall: overdrive dolce e rotondo.'],
  [103, 'LX The ROCK LP', CR, [R, HR], 'AC/DC, Led Zeppelin, Rival Sons', 'JMP 1987X con hall: crunch rock classico asciutto.'],
  [104, 'LX Lenny FD', DR, [R, F, S], 'Lenny Kravitz, Jimi Hendrix, Prince', 'Super Reverb con Tube Screamer e delay analogico: rock vintage con groove.'],
  [105, 'LX RS LP', CL, [R, B], 'Pink Floyd, Jimi Hendrix (Little Wing), The Beatles', 'Jazz Clean con rotary, tape echo e hall: pulito ruotante tipo Leslie.'],
  [106, 'LX SadButTrueLP', CL, [M, HR], 'Metallica (Fade to Black), Pantera (Cemetery Gates), Iron Maiden', 'Überschall a gain minimo con chorus e hall: arpeggi puliti da ballata metal.'],
  [107, 'LX Sunset', DR, [B, R, P], 'The Black Keys, Chris Isaak, Mark Knopfler', 'Super Reverb con Tube Screamer leggero, tremolo e delay: tramonto rilassato e vibrante.'],
  [108, 'LX What kindWMST', DR, [B, R, S], 'The Black Keys, Neil Young, Tom Petty', 'Tweedy con Tube Screamer e room: overdrive tweed essenziale e diretto.'],
  [109, 'TT Clean Single', CL, [P, C, B], 'Tom Petty, Fleetwood Mac, John Mayer', 'Deluxe pulito con Tube Screamer di spinta e spring: brillante e dinamico.'],
  [110, 'TT 1987X JMP', DR, [R, HR], 'Foo Fighters, AC/DC, Queens of the Stone Age', 'JMP 1987X con Tube Screamer, detune e room: crunch moderno, cab utente BOGV30.', true],
  [111, 'TT DJENTIE', HG, [M], 'Periphery, TesseracT, Meshuggah', 'Friedman BE con compressore e Tube Screamer: ritmiche tight moderne.'],
  [112, 'TT TY', DR, [B, R, IA], 'The Black Keys, Jack White, Creedence Clearwater Revival', 'Bassman con Blues Driver, tremolo e delay: blues tweed sporco e vibrante.'],
  [113, 'MK Grooving AD', CL, [P, F], 'The Police, U2, Coldplay', 'Twin con chorus CE-1, delay analogico e shimmer: pulito ritmico e brillante.'],
  [114, 'MK Shim Dly', AE, [AM, P], 'U2, Sigur Rós, Coldplay', 'Super Reverb con chorus, delay doppio e shimmer: pulito con riverbero scintillante.'],
  [115, 'MK Slap Root', DR, [C, R], 'Elvis Presley, Stray Cats, Chris Isaak', 'Deluxe con Morning Drive, tape echo corto e spring: slapback da rockabilly.'],
  [116, 'MK Cristal Clean', CL, [BP, P, IA], 'Oasis, Coldplay, Travis', 'Class A 30 con chorus CE-2 e room: pulito vox brillante per ballate e arpeggi.', true],
  [117, 'MK Pop Clean', CL, [P], 'Coldplay, Maroon 5, Taylor Swift', 'Jazz Clean con compressore, chorus, delay e spring: pulito pop levigato.'],
  [118, 'MK Pop Crunch', CR, [P, R], 'Foo Fighters, Green Day, Coldplay', 'Friedman BE a gain basso con RC Boost e room: crunch leggero e aperto.', true],
  [119, 'MK Pop Drive', DR, [P, R, B], 'Tom Petty, Kings of Leon, The Black Keys', 'Tweedy con Red Dirt, compressore e room: overdrive pop caldo.'],
  [120, 'MK Pop Lead', LE, [P, R], 'U2, Coldplay, Maroon 5', 'Dual Rectifier a gain basso con Katana, delay doppio e spring: lead pop pulito e brillante.'],
  [121, 'MK Europe Final', LE, [HR], 'Europe (The Final Countdown), Whitesnake, Scorpions', 'JMP 1987X con AC Boost e plate: lead hard rock anni 80.'],
  [122, 'MK Masaru Night', LE, [FU, R], 'Carlos Santana, Larry Carlton, Joe Satriani', 'Cali Crunch con Morning Drive, delay a modulazione e shimmer: lead morbido e notturno.'],
  [123, 'MK Namewee Wubai', LE, [R, BP], 'Oasis, Foo Fighters, Stereophonics', 'JCM800 con compressore, RC Boost, tape echo e room: lead rock spinto e cantabile.', true],
  [124, 'MK BJovi Always', CR, [R, HR, P], 'Bon Jovi, Aerosmith, Def Leppard', 'Brit 2000 con vibrato, delay analogico e hall: crunch da power ballad.'],
  [125, 'MK Asato Poetic', CL, [P, S, CA], 'Jeff Buckley, John Mayer, Ed Sheeran', 'Vibro King pulito con compressore, delay e spring: pulito espressivo da ballata.'],
  [126, 'MK Hotel CA', CL, [R, P, C], 'Eagles (Hotel California), Fleetwood Mac, Santana', 'Super Reverb con compressore, flanger e spring: pulito liquido da ballata rock.'],
  [127, 'MK RCHP Can\'t St', CL, [F, R, IA], 'Red Hot Chili Peppers, Incubus, Pearl Jam', 'Plexi a gain minimo con compressore e spring: pulito funk-rock alla Frusciante.', true],
  [128, 'MK Nirvana', CR, [G, IA, R], 'Nirvana, Foo Fighters, Pearl Jam', 'Class A 30 con spring: pulito che si sporca, ottimo per le strofe grunge.', true],
];

export const FACTORY_CARDS: Record<number, FactoryCard> = Object.fromEntries(
  ROWS.map(([slot, presetName, soundType, genres, bands, notes, altRock]) => [
    slot,
    { presetName, soundType, genres, bands: bands.split(', '), notes, altRock: altRock === true } satisfies FactoryCard,
  ]),
);
