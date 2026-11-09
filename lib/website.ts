// Public website content (app/page.tsx), edited in Admin → Website and stored as the
// "website" setting. The defaults are the text and photos the site shipped with, so the
// page looks the same until someone edits it.
//
// In the lead texts {company} becomes the company name and {sizes} the cylinder sizes
// from Masters → Products (e.g. "19 kg and 47.5 kg").

export interface WebsiteProduct {
  name: string;
  tag: string;
  image: string;
  text: string;
}

export interface WebsiteStep {
  title: string;
  text: string;
}

export interface WebsiteContent {
  hero: { headline: string; lead: string; image: string; imageAlt: string; emergencyNote: boolean };
  products: { show: boolean; title: string; lead: string; banner: string; items: WebsiteProduct[] };
  cylinders: { show: boolean; title: string; lead: string };
  ordering: { show: boolean; title: string; lead: string; steps: WebsiteStep[] };
  audience: { show: boolean; ticker: boolean; title: string; lead: string; items: string[] };
  safety: { show: boolean; title: string; lead: string; tips: WebsiteStep[] };
  inquiry: { show: boolean; title: string; lead: string; steps: WebsiteStep[] };
  contact: { show: boolean; title: string; lead: string };
}

/** The Indane range banner; the hero crops its cylinders out of it. */
export const DEFAULT_HERO_IMAGE = '/site/indane-family-range.webp';

export const DEFAULT_WEBSITE: WebsiteContent = {
  hero: {
    headline: 'Commercial LPG that arrives before you run out',
    lead: '{company} supplies {sizes} cylinders to kitchens and factories. Order on WhatsApp or by phone, and we deliver, collect the empties and send the bill to your phone.',
    image: DEFAULT_HERO_IMAGE,
    imageAlt: 'Indane cylinders we supply: XtraTej, Nanocut, Jumbo, Xtralite, the 5 kg Chhotu and domestic cylinders',
    emergencyNote: true,
  },
  products: {
    show: true,
    title: 'The full Indane range',
    lead: 'We are an Indane distributor, so you get IndianOil cylinders, cutting gas and safety hoses from one supplier.',
    banner: '/site/indane-family-range.webp',
    items: [
      { name: 'Indane XtraTej', tag: 'Commercial kitchens', image: '/site/xtratej.webp', text: 'High-flame LPG for hotels, restaurants and dhabas. Flame runs at least 65°C hotter, cooking time drops by at least 14% and gas use by at least 5%.' },
      { name: 'Indane Nanocut', tag: 'Metal cutting', image: '/site/nanocut.webp', text: 'Hi-therm cutting gas for fabrication shops and factories. It cuts your cost, your cutting time and your risk.' },
      { name: 'Chhotu Master', tag: '5 kg with cooktop', image: '/site/chhotu-master.webp', text: 'The 5 kg Chhotu with a burner that sits right on the cylinder. No pipe to connect, easy to set up, holds up to 20 kg of cookware and is BIS certified.' },
      { name: 'Suraksha Hose', tag: 'Safety', image: '/site/suraksha-hose.webp', text: 'Replace an old rubber pipe with the Suraksha Hose. Order it from us or book it on the Indane IVRS at 77189 55555 and it is delivered to your door.' },
      { name: 'Chhotu 5 kg home delivery', tag: '5 kg free trade LPG', image: '/site/chhotu-home-delivery.webp', text: 'The 5 kg Chhotu cylinder now comes to your door. Indane customers can also book it on the IVRS at 77189 55555.' },
      { name: 'Chhotu, no address proof', tag: 'For students and migrants', image: '/site/chhotu-no-address-proof.webp', text: 'No address proof is needed to get a Chhotu FTL cylinder, so it suits students, workers and anyone new to the city.' },
    ],
  },
  cylinders: {
    show: true,
    title: 'Cylinders we supply',
    lead: 'Every cylinder is checked for its seal and weight before it leaves the godown. A refundable security deposit is taken once for each cylinder you keep with you.',
  },
  ordering: {
    show: true,
    title: 'How an order reaches you',
    lead: 'Your regular cylinders and rates are saved with us, so a repeat order is one message.',
    steps: [
      { title: 'Place the order', text: 'Send a WhatsApp message, call us, or order from your customer login. Tell us the cylinders and the day.' },
      { title: 'We confirm it', text: 'The order is checked and given to the delivery boy who covers your area.' },
      { title: 'Cylinders arrive', text: 'Full cylinders are delivered and the empties are collected in the same visit.' },
      { title: 'Bill on your phone', text: 'The invoice and payment receipt reach you on WhatsApp, so your accounts stay clean.' },
    ],
  },
  audience: {
    show: true,
    ticker: true,
    title: 'Who we deliver to',
    lead: 'Kitchens and plants that cannot stop for a gas shortage.',
    items: ['Hotels', 'Restaurants', 'Hospitals', 'Factories', 'Hostels', 'Canteens', 'Caterers', 'Sweet shops'],
  },
  safety: {
    show: true,
    title: 'Using LPG safely',
    lead: 'A clean blue flame means the gas is burning right. Simple habits keep it that way.',
    tips: [
      { title: 'If you smell gas,', text: 'close the regulator and the burners, open doors and windows, and do not touch any switch, flame or phone near the spot. Then call 1906 or us.' },
      { title: 'Keep cylinders standing up', text: 'in an airy place, away from heat, drains and direct sunlight. Never lay a full cylinder on its side.' },
      { title: 'Check at delivery', text: 'that the seal is intact and the valve does not hiss. Do not accept a cylinder that smells of gas.' },
      { title: 'Use ISI-marked regulators and hoses,', text: 'and replace a hose that is cracked, hard or older than its printed expiry.' },
      { title: 'Close the regulator', text: 'when the kitchen shuts for the night.' },
    ],
  },
  inquiry: {
    show: true,
    title: 'Send an inquiry',
    lead: 'Tell us what you need and we will call you back with rates and a delivery plan.',
    steps: [
      { title: 'Fill the form', text: '— name, mobile and what you need.' },
      { title: 'We call you back', text: 'with rates for your cylinders and area.' },
      { title: 'Supply starts', text: '— order any time on WhatsApp after that.' },
    ],
  },
  contact: {
    show: true,
    title: 'Talk to us',
    lead: 'For a new connection, a regular supply plan or an urgent refill.',
  },
};

/** Fill {company} / {sizes} in a lead text. */
export const fillWebsiteText = (text: string, vars: { company: string; sizes: string }) =>
  text.replace(/\{company\}/g, vars.company).replace(/\{sizes\}/g, vars.sizes);

/**
 * Uploaded photos are stored privately (/api/files/…); the public site shows the ones
 * picked in Admin → Website through /api/site-image/… (lib/server/websiteImages).
 */
export const publicSiteImage = (url: string) => (url.startsWith('/api/files/') ? `/api/site-image/${url.slice('/api/files/'.length)}` : url);

/** Every photo the website content uses (the public image route serves only these). */
export const websiteImages = (w: WebsiteContent) => [w.hero.image, w.products.banner, ...w.products.items.map((p) => p.image)].filter(Boolean);
