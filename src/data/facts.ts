// facts.ts — the corpus. Real, documented conspiracy theories and fringe
// beliefs about what hangs in the sky, told as camp and never asserted as
// true. The `filedUnder` tag is mandatory and always rendered: who proposed
// it, when, and its actual status — the wink that keeps the app honest.
//
// Authoring rules (enforced by src/data/integrity.test.ts + review):
// - every filedUnder origin (person/year/publication) was fetch-verified at
//   authoring time; if an attribution couldn't be confirmed, the entry was cut
// - celestial-mechanical camp only: nothing that targets real people or
//   groups, nothing tragedy-adjacent, nothing medical
// - claims whose real origins are uglier than their fun surface were cut
//   (no Black Sun occultism, no Hörbiger ice-moon — Nazi-adopted, no
//   moon-matrix — Icke lineage)

export type BodyId = 'sun' | 'moon';

export interface Fact {
  id: string;
  body: BodyId;
  /** The headline — the fun bit, phrased with relish. */
  claim: string;
  /** 2–3 sentences telling the theory like a classified dossier enjoying itself. */
  lore: string;
  /** The reality tag — one honest line: origin, year, actual status. */
  filedUnder: string;
  tones: readonly string[];
}

export const BODY_IDS = ['sun', 'moon'] as const satisfies readonly BodyId[];

export const FACTS = [
  // ── SUN ────────────────────────────────────────────────────────────────────
  {
    id: 'sun-herschel',
    body: 'sun',
    claim: 'The sun is inhabited, and its people live in the shade.',
    lore: 'William Herschel — discoverer of Uranus, greatest telescope man of his age — reasoned that sunspots are openings in a luminous cloud layer, windows onto a cool, solid surface below. Down there, shielded from the glare, live the solar citizens. He considered this the most probable reading of the evidence.',
    filedUnder:
      'William Herschel, Philosophical Transactions, 1795. Status: the sun has no floor; sincerity, however, confirmed.',
    tones: ['sincere-astronomer', 'georgian'],
  },
  {
    id: 'sun-rowbotham',
    body: 'sun',
    claim: 'The sun is three thousand miles away, tops.',
    lore: 'Zetetic astronomy holds that the earth is a flat disc and the sun a small local lamp circling a few thousand miles overhead, spotlighting the day like a desk light on a map. Sunsets are the lamp simply wandering out of range. Measurements were taken; conviction was total.',
    filedUnder:
      'Samuel Rowbotham ("Parallax"), Zetetic Astronomy: Earth Not a Globe, 1865. Status: the sun remains 93 million miles away.',
    tones: ['flat-earth', 'victorian'],
  },
  {
    id: 'sun-vulcan',
    body: 'sun',
    claim: 'A hidden planet rides inside the sunlight, and it has a name.',
    lore: "Mercury's orbit wobbled in a way Newton couldn't excuse, so the man who discovered Neptune with pure mathematics prescribed a second dose: an unseen planet, Vulcan, hiding in the sun's glare. A country doctor duly reported watching it cross the sun, and for decades respectable astronomers hunted it during eclipses.",
    filedUnder:
      "Urbain Le Verrier, 1859, on Edmond Lescarbault's observation. Status: dissolved by general relativity, 1915 — the wobble was Einstein's.",
    tones: ['sincere-astronomer', 'hidden-body'],
  },
  {
    id: 'sun-nemesis',
    body: 'sun',
    claim: 'The sun has a dark twin that mails us an extinction every 26 million years.',
    lore: 'The fossil record seems to die on a schedule, so physicists proposed a companion: Nemesis, a dim dwarf star on a vast orbit that periodically rakes the comet cloud and sends the debris our way. It was a real paper in a real journal, and telescopes genuinely went looking for the sun\'s "death star."',
    filedUnder:
      'Davis, Hut & Muller, Nature, 1984. Status: infrared sky surveys found no twin; the lore adopted it anyway.',
    tones: ['real-science-gone-lore', 'ominous'],
  },
  {
    id: 'sun-antichthon',
    body: 'sun',
    claim: 'There is a Counter-Earth, and it is always exactly where you cannot look.',
    lore: 'The Pythagoreans taught that the earth, the sun, and everything else circle a Central Fire we never see — and opposite us, forever hidden behind the flame, orbits a second world: Antichthon. The sun, in this system, is merely a mirror passing the fire\'s light along. The bookkeeping required ten heavenly bodies, so a tenth was invented.',
    filedUnder:
      'Philolaus of Croton, 5th century BCE. Status: geometry retired the Counter-Earth; the "hidden planet behind the sun" never quite left.',
    tones: ['ancient', 'hidden-body'],
  },
  {
    id: 'sun-teed',
    body: 'sun',
    claim: 'You live INSIDE the earth, and the sun is the appliance at the center.',
    lore: "Cyrus Teed — physician, alchemist, and after a laboratory revelation, messiah — announced the universe is a closed cell: we live on the concave inner shell, the cosmos hangs in the hollow, and the sun at the center is a half-light, half-dark battery on a 24-year cycle. His followers surveyed a Florida beach and pronounced the earth's curve officially inward.",
    filedUnder:
      'Cyrus Teed (Koresh), The Cellular Cosmogony, 1898. Status: the survey flattered its instrument; the commune is now a Florida state park.',
    tones: ['cult-cosmology', 'gilded-age'],
  },
  {
    id: 'sun-electric',
    body: 'sun',
    claim: 'The sun is a bulb on a galactic power grid.',
    lore: 'The Electric Sun model holds that our star does not burn from within: it glows like a discharge lamp, fed by vast currents flowing through the galaxy. Fusion is a bureaucratic fiction; the sun is a cathode enjoying its circuit. The idea still tours the internet under the banner of the Electric Universe.',
    filedUnder:
      'Ralph Juergens, Pensée, 1972. Status: neutrino counts confirm the furnace is internal — the sun is off-grid.',
    tones: ['fringe-physics', 'seventies'],
  },
  {
    id: 'sun-cruisers',
    body: 'sun',
    claim: 'Ships the size of planets refuel at the sun.',
    lore: "In March 2012, NASA's own solar observatory footage showed a black sphere the size of a world, moored to the sun by a dark umbilical — then casting off in a flare of plasma. Watchers of the live feeds declared it a refueling stop for something enormous. NASA sent a solar physicist to explain, which naturally settled nothing.",
    filedUnder:
      'SOHO/SDO footage lore, March 2012; NASA\'s C. Alex Young explained the filament channel. Status: a plasma prominence viewed down its own tunnel.',
    tones: ['nasa-feed', 'internet-age'],
  },
  {
    id: 'sun-simulator',
    body: 'sun',
    claim: 'The original sun is gone. This one is the replacement fixture.',
    lore: 'The sun-simulator file holds that the light overhead is an artificial rig — an orbital lamp array standing in for a star that dimmed, died, or was decommissioned. Adherents cite patents for "solar simulators" as receipts, the way one might cite a hardware-store catalog as proof the moon is a lampshade.',
    filedUnder:
      'Flat-earth video lore, late 2010s; the cited patents are test equipment and telescopes. Status: same sun, new paranoia.',
    tones: ['flat-earth', 'internet-age'],
  },
  {
    id: 'sun-warden',
    body: 'sun',
    claim: 'A secret human space fleet patrols the sun\'s estate: SOLAR WARDEN.',
    lore: 'A Scottish hacker wandering unsecured Pentagon and NASA machines on a dial-up modem reported finding a spreadsheet titled "Non-Terrestrial Officers" and tabs of fleet-to-fleet transfers between ships no registry lists. UFO culture supplied the fleet a name, a mission, and a budget. The phrase, everyone agrees, was too good to waste.',
    filedUnder:
      "Gary McKinnon's hack testimony, 2001–02; he later allowed it might be a war-game document. Status: no fleet has reported for duty.",
    tones: ['black-budget', 'internet-age'],
  },
  {
    id: 'sun-jevons',
    body: 'sun',
    claim: 'Sunspots run the economy.',
    lore: 'William Stanley Jevons — a founding father of modern economics — charted commercial crises against the sunspot cycle and found them suspiciously in step. Solar maxima ripen harvests, harvests move credit, credit moves panic: therefore the business cycle is written on the face of the sun. He defended the timetable in Nature.',
    filedUnder:
      'W. S. Jevons, "Commercial Crises and Sun-Spots," Nature, 1878. Status: the correlation dissolved; economists still tease each other with it.',
    tones: ['sincere-scientist', 'victorian'],
  },
  {
    id: 'sun-killshot',
    body: 'sun',
    claim: 'The sun had the apocalypse booked for December 2012.',
    lore: 'As the Maya long-count calendar rolled over, the lore converged on a solar finale: a kill-shot flare timed to a galactic alignment, civilization off at the breaker. NASA received enough worried mail that it published an official page explaining why the world had, on inspection, not ended.',
    filedUnder:
      'The 2012 phenomenon; NASA\'s "Beyond 2012" rebuttal page. Status: December 22nd, 2012 arrived on schedule.',
    tones: ['apocalypse-that-wasnt', 'internet-age'],
  },
  {
    id: 'sun-mandela',
    body: 'sun',
    claim: 'The sun used to be yellow. Someone changed it.',
    lore: 'Thousands of people distinctly remember a yellower sun — crayon yellow, Superman\'s "yellow sun" yellow — and report that the white glare overhead feels like a substitution. The Mandela-effect files treat it as evidence of a timeline splice; the mundane suspects are camera color balance and childhood art supplies.',
    filedUnder:
      'Mandela-effect communities, 2010s (the yellow-sun thread made Rolling Stone). Status: sunlight was always white; the crayons were always yellow.',
    tones: ['mandela-effect', 'internet-age'],
  },
  {
    id: 'sun-conscious',
    body: 'sun',
    claim: 'The sun may be conscious, and this was argued in a journal.',
    lore: 'If awareness is a basic property of self-organizing systems, a philosopher-biologist reasoned, then the sun — a vast, integrated electromagnetic system — qualifies as a candidate mind. The paper asks, in effect, what the sun might be paying attention to. Solar flares, under this reading, acquire a certain mood.',
    filedUnder:
      'Rupert Sheldrake, "Is the Sun Conscious?", Journal of Consciousness Studies, 2021. Status: a live philosophical provocation, not an observation.',
    tones: ['panpsychist', 'contemporary'],
  },
  {
    id: 'sun-chizhevsky',
    body: 'sun',
    claim: 'Revolutions keep the sunspot schedule.',
    lore: 'A Soviet polymath tabulated two and a half millennia of riots, wars, and upheavals against the solar cycle and announced that mass excitability peaks with the sunspots — history as space weather. He divided every eleven-year cycle into four civic seasons, from apathy to uprising and back.',
    filedUnder:
      'Alexander Chizhevsky, The Physical Factors of the Historical Process, 1924. Status: the correlations don\'t replicate; his air-ionization work was real science.',
    tones: ['soviet', 'grand-theory'],
  },
  {
    id: 'sun-sitchin',
    body: 'sun',
    claim: 'The solar system is a pantheon, and the gods kept office hours.',
    lore: 'By his own translation of Sumerian tablets, Zecharia Sitchin found the solar system fully staffed: every celestial body a deity, plus an unlisted twelfth member — Nibiru — swinging by every 3,600 years so its occupants could check on the help. Mainstream Assyriologists have never once managed to reproduce his readings, which believers consider proof of tenure.',
    filedUnder:
      'Zecharia Sitchin, The 12th Planet, 1976. Status: the tablets say otherwise; Nibiru remains unlisted.',
    tones: ['archaeoastronomy', 'paperback-era'],
  },

  // ── MOON ───────────────────────────────────────────────────────────────────
  {
    id: 'moon-spaceship',
    body: 'moon',
    claim: 'The moon is a ship, parked.',
    lore: 'Two members of the Soviet Academy of Sciences proposed, in print, that the moon is an artificial hull: a planetoid hollowed by unknown engineers, its rock melted and slagged onto the outside as armor, then steered into orbit around us. The interior, they noted, would be quite roomy.',
    filedUnder:
      'Michael Vasin & Alexander Shcherbakov, "Is the Moon the Creation of Alien Intelligence?", Sputnik, 1970. Status: not a ship; the essay was real.',
    tones: ['soviet', 'classic'],
  },
  {
    id: 'moon-bell',
    body: 'moon',
    claim: 'They struck the moon, and it rang like a bell for an hour.',
    lore: "Apollo 12's crew threw their spent lunar module back at the surface as a seismic experiment. The shudder built, peaked, and kept reverberating for the better part of an hour, and the mission's own scientist reached for a churchbell metaphor at the press conference. The hollow-moon file has never willingly closed since.",
    filedUnder:
      'Apollo 12 seismic experiment, November 1969; the bell line is Maurice Ewing\'s. Status: solid, bone-dry rock rings; nothing is hollow.',
    tones: ['apollo-era', 'quote-that-launched-a-thousand-theories'],
  },
  {
    id: 'moon-hoax-1835',
    body: 'moon',
    claim: 'The newspapers found bat-people on the moon in 1835.',
    lore: 'The New York Sun ran a six-part scientific bulletin: Sir John Herschel, from his observatory at the Cape, had resolved lunar forests, sapphire temples, herds of bison, and a civilization of winged humanoids — Vespertilio-homo. Circulation soared. The astronomer himself learned about his discoveries later, with mixed feelings.',
    filedUnder:
      'Richard Adams Locke, The Sun (New York), August 1835. Status: a circulation stunt — the original moon hoax.',
    tones: ['newspaper-age', 'classic'],
  },
  {
    id: 'moon-wallwerk',
    body: 'moon',
    claim: 'An astronomer mapped a walled city on the moon and named it.',
    lore: 'Franz von Paula Gruithuisen — Munich astronomer, also a urologist — observed a lattice of ramparts and avenues north of the Schröter crater and published his findings: distinct traces of lunar inhabitants, including one of their colossal buildings. He called the city Wallwerk. Colleagues with bigger telescopes kept failing to be invited.',
    filedUnder:
      'F. von P. Gruithuisen, observed 1822, published 1824. Status: low sun angles draw convincing ruins; he still got a professorship.',
    tones: ['sincere-astronomer', 'romantic-era'],
  },
  {
    id: 'moon-kaysing',
    body: 'moon',
    claim: 'We never went. The moon happened in a studio.',
    lore: 'A former rocket-company technical writer self-published the founding text: the landings were staged, the crews were actors, the rocks were props. The evidence was a connoisseurship of shadows, flags, and missing stars — every item since answered, none ever retired. It remains the industry standard of moon denial.',
    filedUnder:
      'Bill Kaysing, We Never Went to the Moon, 1976. Status: we went; the retroreflectors still bounce lasers on request.',
    tones: ['hoax-canon', 'seventies'],
  },
  {
    id: 'moon-kubrick',
    body: 'moon',
    claim: 'Kubrick shot the landings, and confessed in frame.',
    lore: 'The auteur wing of moon denial holds that only the director of 2001 had the eye — and the front-screen projection rig — to fake Apollo, and that he salted The Shining with confessions for the attentive. A French mockumentary later staged the whole "revelation" with a straight face, and clips of it still circulate as evidence.',
    filedUnder:
      'Hoax-lore canon; William Karel\'s Dark Side of the Moon (2002) satirized it into legend. Status: satire, doing numbers as testimony.',
    tones: ['cinema', 'hoax-canon'],
  },
  {
    id: 'moon-hologram',
    body: 'moon',
    claim: 'The moon is a projection, and sometimes the projector glitches.',
    lore: 'A skywatcher\'s telescope videos show a ripple crossing the lunar face — the "lunar wave" — read as a refresh artifact in a planetary-scale hologram. The files hold that whatever is really up there, we are shown a screensaver of a moon instead. Full moons, notably, are when the projector works hardest.',
    filedUnder:
      'Crrow777\'s "lunar wave" videos, YouTube, 2013 onward. Status: atmospheric shimmer and camera artifacts; the moon persists when filmed by anyone else.',
    tones: ['internet-age', 'simulation'],
  },
  {
    id: 'moon-apollo20',
    body: 'moon',
    claim: 'A secret Apollo found a derelict ship and a sleeping pilot.',
    lore: 'Videos posted by "retiredafb" testified that Apollo 20 launched in secret from Vandenberg in 1976, jointly with the Soviets, to board a colossal derelict spacecraft lying on the far side — and recovered its pilot, a woman in suspended animation the internet named Mona Lisa. The footage toured the world before being claimed by a French artist.',
    filedUnder:
      'The Apollo 20 hoax, YouTube, April 2007; creation claimed by Thierry Speth. Status: art project, promoted to legend.',
    tones: ['internet-age', 'derelict-ship'],
  },
  {
    id: 'moon-cheese',
    body: 'moon',
    claim: 'The moon is made of green cheese — the oldest file in this cabinet.',
    lore: 'Five centuries ago the proverb was already a test of gullibility: only a fool believes the moon is a fresh, unripened cheese, round and pale in the sky\'s larder. Nobody ever quite believed it, which makes it the rarest thing here — a conspiracy theory with zero believers and total name recognition.',
    filedUnder:
      'Proverbial; John Heywood\'s proverb collection, 1546. Status: basalt, regolith, no rind.',
    tones: ['folklore', 'proverb'],
  },
  {
    id: 'moon-abian',
    body: 'moon',
    claim: 'A mathematics professor formally proposed blowing up the moon.',
    lore: 'Alexander Abian of Iowa State announced that most weather, and with it most human misery, is the moon\'s fault: remove it — he suggested a deep shaft and atomic charges — and the earth stops wobbling, the seasons relax, and paradise ensues. He defended the program for years with total serenity.',
    filedUnder:
      'Alexander Abian, Iowa State campus press, 1991. Status: the moon stabilizes the wobble; demolition inadvisable.',
    tones: ['professor-emeritus-of-chaos', 'nineties'],
  },
  {
    id: 'moon-bridge',
    body: 'moon',
    claim: 'In 1953 the moon briefly had a bridge.',
    lore: "The science editor of the New York Herald Tribune trained his telescope on Mare Crisium and found a gigantic natural arch — a land bridge miles long, light streaming beneath it. The head of the British lunar section confirmed it, shadow and all, on the BBC. Bigger telescopes later checked; the bridge had been a trick of light the whole time.",
    filedUnder:
      "John J. O'Neill, July 1953; endorsed by H. P. Wilkins, then retracted. Status: chiaroscuro — though real small lunar arches were later found elsewhere.",
    tones: ['sincere-astronomer', 'fifties'],
  },
  {
    id: 'moon-r277',
    body: 'moon',
    claim: 'NASA keeps a catalog of lights moving on the moon.',
    lore: 'Technical Report R-277 is real: a NASA-published chronology of over five hundred reported lunar events — glows, mists, flashes, colors — logged by three hundred observers across four centuries. The lore reads it as an activity register for somebody\'s far-side operations; the authors read it as geology being shy.',
    filedUnder:
      'Middlehurst, Burley, Moore & Welther, NASA TR R-277, 1968. Status: real catalog; outgassing and observer effects, not traffic.',
    tones: ['real-document', 'apollo-era'],
  },
  {
    id: 'moon-chatelain',
    body: 'moon',
    claim: 'Every Apollo was followed — and the crews knew.',
    lore: 'An Apollo-era communications engineer wrote that the missions were shadowed by intelligent craft, that astronauts reported them on channels the public never heard, and that a code word existed for the escorts. The book folded the moon into a much older story about who taught us astronomy in the first place.',
    filedUnder:
      'Maurice Chatelain, Our Ancestors Came from Outer Space, 1978 (US edition). Status: mission transcripts contain no escorts.',
    tones: ['apollo-era', 'insider-testimony'],
  },
  {
    id: 'moon-older',
    body: 'moon',
    claim: 'The moon is older than everything, and it arrived recently.',
    lore: 'The hollow-moon paperbacks did the arithmetic with relish: early rock datings were read to make the moon billions of years senior to the earth — one author settled on twenty billion, comfortably predating the universe — while lore about missing ancient moon-records had it parking overhead within human memory. A very old ship, recently docked.',
    filedUnder:
      'Don Wilson, Our Mysterious Spaceship Moon, 1975. Status: the moon is 4.5 billion years old and has excellent references.',
    tones: ['paperback-era', 'hollow-moon'],
  },
  {
    id: 'moon-selflit',
    body: 'moon',
    claim: 'Moonlight is the moon\'s own, and it is not borrowed.',
    lore: 'Zetetic astronomy ruled that the moon shines by its own cold light — a semi-transparent, self-luminous disc a few thousand miles up, through which stars occasionally show. Later devotees ran thermometer experiments to prove moonlight chills what it touches. The sun, under this filing, has no employee named the moon.',
    filedUnder:
      'Samuel Rowbotham ("Parallax"), Zetetic Astronomy, 1865. Status: reflected sunlight; the thermometers were measuring clear night sky.',
    tones: ['flat-earth', 'victorian'],
  },
  {
    id: 'moon-horizon',
    body: 'moon',
    claim: 'The US Army designed a moon fort. This one is real.',
    lore: 'Project Horizon, 1959: a formal Army study for a twelve-soldier lunar outpost by 1966 — launch schedules, habitat drawings, budgets, and the case for claiming the high ground before anyone else. It reads exactly like the documents the lore keeps inventing, except it is declassified and you can read it.',
    filedUnder:
      'US Army, Project Horizon study, 1959, declassified. Status: never built — the fake-sounding one that happens to be true.',
    tones: ['real-document', 'cold-war'],
  },
  {
    id: 'moon-clarion',
    body: 'moon',
    claim: 'A planet named Clarion is parked behind the moon.',
    lore: 'A road-construction foreman napping in the Mojave woke aboard a saucer captained by Aura Rhanes of Clarion — a pleasant world that avoids detection by keeping the moon precisely between itself and every telescope on earth. Its crew dropped by eleven times, mostly to chat. Orbital mechanics has filed multiple objections.',
    filedUnder:
      'Truman Bethurum, Aboard a Flying Saucer, 1954. Status: nothing hides behind the moon; the orbit doesn\'t work even slightly.',
    tones: ['contactee', 'fifties'],
  },
] as const satisfies readonly Fact[];

export function factsFor(body: BodyId): readonly Fact[] {
  return FACTS.filter((f) => f.body === body);
}
