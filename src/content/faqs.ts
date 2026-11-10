// FAQ content, shared by the FAQ page and its structured data (src/app/faq/layout.tsx).
// Answers may contain simple HTML links; the structured data strips tags.

export type FaqItem = { q: string; a: string };
export type FaqSection = { category: string; items: FaqItem[] };

export const FAQS: FaqSection[] = [
  {
    category: "The Service",
    items: [
      {
        q: "What exactly is TravalBee?",
        a: "TravalBee is a bespoke travel curation service. You tell us your destination, dates, travel party, pace, budget, dietary needs, and interests, and we produce a complete, day-by-day itinerary in around 2 minutes. Each itinerary includes activities, restaurant recommendations with real GPS coordinates, transit times between stops, hotel suggestions, and a hidden gem per day that 95% of tourists never find.",
      },
      {
        q: "Who is behind TravalBee?",
        a: "TravalBee is a product built and operated by <a href=\"https://opsisx.com\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-emerald-accent hover:text-ink transition-colors\">OpsisX LLC</a>. OpsisX is the company behind the service, the data controller for your account, and the contracting party in our Terms of Service.",
      },
      {
        q: "How long does it take to generate an itinerary?",
        a: "Typically around 2 minutes. Everything, including activities, meals, maps, transit estimates, and hotel recommendations, is generated and enriched in a single pass. There are no follow-up loading states or second requests.",
      },
      {
        q: "What destinations are supported?",
        a: "Any destination in the world. The curation engine reasons about geography, neighbourhood coherence, and real place data, so it works equally well for Tokyo, Tangier, or Tbilisi. We currently support itineraries of 1–5 days.",
      },
      {
        q: "Can I customise the itinerary after it's generated?",
        a: "Not within the app. Itineraries are generated holistically. Each day is planned as a geographically coherent unit, so swapping a single activity without re-generating the full day would break the spatial logic and the map. If the result isn't right, regenerate with adjusted preferences: it only takes around 2 minutes.",
      },
      {
        q: "How accurate is the information?",
        a: "Place names, locations, ratings, and photos come from established third-party place data sources and are refreshed regularly. Opening hours are estimated from that data. That said, venues change, so we always recommend verifying reservations and hours directly before you travel. Our Terms of Service cover this in detail.",
      },
    ],
  },
  {
    category: "Features",
    items: [
      {
        q: "Does it work offline?",
        a: "Yes. Once an itinerary is generated and saved, it is stored locally in your browser. Your archive at /trips is fully accessible without an internet connection: maps, transit times, hotel cards, and all. TravalBee is a Progressive Web App (PWA) and can be installed to your home screen.",
      },
      {
        q: "Can I save my itineraries?",
        a: "Yes. Create a free account and hit Save after generation. Your itineraries are stored in your private archive at /trips and synced across devices. They're also cached locally for offline access.",
      },
      {
        q: "Can I share my itinerary with someone?",
        a: "Yes. Every saved itinerary has a unique shareable link (/shared/[id]) that works without an account. Share it via the native share sheet on mobile, or copy the link to clipboard. Shared itineraries are read-only.",
      },
      {
        q: "Can I export to PDF?",
        a: "Yes. Open any saved itinerary and hit Export PDF. The full itinerary, including all days, timeline, activities, meals, and transit, prints cleanly with your browser's native print dialog. Maps, affiliate cards, and interactive elements are excluded from the print output.",
      },
      {
        q: "What is the hidden gem?",
        a: "Each day ends with a hidden gem: a locally beloved spot, viewpoint, neighbourhood, or experience that rarely appears in mainstream travel guides. These are deliberately obscure: think a ceramics workshop in a residential alley, a rooftop bar known only to regulars, or a temple reachable only by a 10-minute walk off the tourist trail.",
      },
      {
        q: "How do the hotel recommendations work?",
        a: "When you indicate you need accommodation, we recommend six hotels across three tiers: Boutique, Premium, and Luxury, each with a neighbourhood description and an affiliate booking link. You can filter by tier using the slider. If you already have a hotel booked, you can enter it and we'll use it as the geographic anchor for all activity clustering.",
      },
    ],
  },
  {
    category: "Account & Billing",
    items: [
      {
        q: "Is there a free tier?",
        a: "Yes. The free tier includes <strong>5 AI-generated itineraries per month</strong>, trips of up to 3 days, Basic PDF Export, and Standard Transit Modes. No credit card required. Sign up to save itineraries to your archive.",
      },
      {
        q: "What does the paid plan include?",
        a: "The <strong>Premium plan</strong> gives you 10 itinerary generations per month, trips of up to 14 days, Advanced Transit modes (Car &amp; Regional), and a Dedicated AI Concierge for personalised travel enquiries. Credits reset on your monthly billing date.",
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, at any time from your account settings. You keep access until the end of your current billing period. No penalties, no questions asked.",
      },
      {
        q: "What is your refund policy?",
        a: "We offer a 7-day satisfaction guarantee on all paid plans. If you're not happy for any reason within 7 days of your first charge, email us and we'll issue a full refund. Full details are in our Refund Policy.",
      },
      {
        q: "How do I delete my account and data?",
        a: "Email <a href=\"mailto:contact@opsisx.com\" class=\"text-emerald-accent hover:text-ink transition-colors\">contact@opsisx.com</a> with the subject line &ldquo;Account Deletion Request&rdquo;. All personal data and saved itineraries will be permanently removed from our database within 30 days.",
      },
    ],
  },
  {
    category: "Privacy & Data",
    items: [
      {
        q: "Do you track me with cookies?",
        a: "No. We use only a strictly necessary session cookie for sign-in and browser storage for your offline itineraries. We do not use advertising pixels or any cross-site tracking, and our analytics are cookieless and privacy-friendly by design.",
      },
      {
        q: "Are my travel preferences shared with anyone?",
        a: "Your preferences (destination, dates, pace, dietary needs, interests) are transmitted to our curation engine to generate your itinerary, and to place-data providers to enrich venue details. They are never sold to third parties or used for advertising. See our Privacy Policy for the full picture.",
      },
      {
        q: "Does the curation engine learn from my data?",
        a: "No. Your data is not used to train any model. Our technology providers are contractually restricted from using your inputs to train their models, and we do not opt in to any such programme.",
      },
    ],
  },
];
