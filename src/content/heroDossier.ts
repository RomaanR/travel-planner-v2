// Hero dossier content — real days from the sample trip (/sample), stored as
// static data so the hero costs nothing to render (no AI or Google calls).
// Ratings and walking times come from that trip; photos are self-hosted under
// public/sample/ so they never expire. To refresh, re-read the sample trip.

export type DossierStop = {
  time:     string;
  name:     string;
  kind:     string;  // Breakfast / Museum / Lunch …
  rating?:  number;
  price?:   string;  // $$ … $$$$
  reserve?: boolean;
  photo:    string;
  walkNext?: number; // minutes to the NEXT stop
};

export type DossierDay = {
  title: string;
  stops: DossierStop[];
  gem:   { name: string; note: string };
};

export type Dossier = {
  city:  string;
  days:  number;     // length of the full trip
  issue: string;     // "Nº 03"
  href:  string;     // full itinerary this was taken from
  pages: DossierDay[];
};

export const PARIS_DOSSIER: Dossier = {
  city:  "Paris",
  days:  3,
  issue: "Nº 03",
  href:  "/sample",
  pages: [
    {
      title: "Left Bank Icons & Culinary Grandeur",
      stops: [
        { time: "08:30", name: "Café de Flore",   kind: "Breakfast", rating: 3.9, price: "$$",   photo: "/sample/paris-01.jpg", walkNext: 9 },
        { time: "09:30", name: "Musée d’Orsay",   kind: "Museum",    rating: 4.8,                 photo: "/sample/paris-02.jpg", walkNext: 16 },
        { time: "12:30", name: "Lapérouse",       kind: "Lunch",     rating: 4.4, price: "$$$$", reserve: true, photo: "/sample/paris-03.jpg" },
      ],
      gem: { name: "Arènes de Lutèce", note: "A 2nd-century Roman amphitheatre tucked inside a residential block of the 5th." },
    },
    {
      title: "Right Bank Grandeur, Art & Shopping",
      stops: [
        { time: "08:30", name: "Angelina",             kind: "Breakfast",   rating: 4.3, price: "$$$", photo: "/sample/paris-07.jpg", walkNext: 10 },
        { time: "09:30", name: "Musée du Louvre",      kind: "Museum",      rating: 4.7, reserve: true,  photo: "/sample/paris-08.jpg", walkNext: 4 },
        { time: "12:15", name: "Palais-Royal Gardens", kind: "Sightseeing", rating: 4.7,                  photo: "/sample/paris-09.jpg" },
      ],
      gem: { name: "Galerie Véro-Dodat", note: "An 1826 covered passage with original mahogany columns that almost no visitor enters." },
    },
  ],
};
