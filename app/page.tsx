import { Fragment, type CSSProperties } from 'react';
import type { Metadata } from 'next';
import { Big_Shoulders, Instrument_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { ROLE_HOME, type Role } from '@/lib/permissions';
import { getSetting } from '@/lib/server/settings';
import { SESSION_COOKIE, verifySession } from '@/lib/server/sessionToken';
import { Cylinder } from '@/components/site/Cylinder';
import { Flame, Gauge, HeroTruck } from '@/components/site/Graphics';
import { OrderRoad } from '@/components/site/OrderRoad';
import { SiteMotion } from '@/components/site/SiteMotion';
import styles from '@/components/site/site.module.css';

// The distributor's public website. Name, phone, address and GSTIN come from
// Settings → Company and the cylinder sizes from Masters → Products, so the page
// stays true without editing code. The ERP itself starts at /login.

export const dynamic = 'force-dynamic';

const display = Big_Shoulders({ subsets: ['latin'], variable: '--font-site-display', weight: ['700', '800'] });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-site-body' });

const TENANT = process.env.DEFAULT_TENANT_ID || 'default';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getSetting(TENANT, 'company');
  return {
    title: `${company.name} — Commercial and industrial LPG supply`,
    description: `${company.name} delivers commercial and industrial LPG cylinders to hotels, restaurants, hospitals and factories. Order by phone or WhatsApp.`,
  };
}

/** Who each cylinder size is for, and its colour, by weight. */
function sizeInfo(kg: number) {
  if (kg <= 6) return { use: 'Small cylinder for stalls, carts and shops with one burner.', color: '#c61f2a' };
  if (kg <= 16) return { use: 'Household-size cylinder for small kitchens and offices.', color: '#c61f2a' };
  if (kg <= 25) return { use: 'Hotels, restaurants, dhabas, canteens and sweet shops.', color: '#c61f2a' };
  if (kg <= 60) return { use: 'Large kitchens, hospitals, hostels and workshops that run burners all day.', color: '#1e5ba8' };
  return { use: 'Bulk supply for factories, furnaces and industrial heating.', color: '#5b6b77' };
}

const kgOf = (p: { name: string; weightVolume: number | null; weightUnit: string | null }) => {
  if (p.weightVolume && (!p.weightUnit || p.weightUnit.toUpperCase() === 'KG')) return p.weightVolume;
  const m = p.name.match(/(\d+(?:\.\d+)?)\s*kg/i);
  return m ? Number(m[1]) : null;
};

const digits = (v: string) => v.replace(/\D/g, '');
/** wa.me needs the number with the country code. */
const waNumber = (v: string) => {
  const d = digits(v);
  return d.length === 10 ? `91${d}` : d;
};
/** Stagger delay for a revealed item. */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

const HEADLINE = 'Commercial LPG that arrives before you run out';

const STEPS = [
  { title: 'Place the order', text: 'Send a WhatsApp message, call us, or order from your customer login. Tell us the cylinders and the day.' },
  { title: 'We confirm it', text: 'The order is checked and given to the delivery boy who covers your area.' },
  { title: 'Cylinders arrive', text: 'Full cylinders are delivered and the empties are collected in the same visit.' },
  { title: 'Bill on your phone', text: 'The invoice and payment receipt reach you on WhatsApp, so your accounts stay clean.' },
];

/** Indane products we sell, shown with the IndianOil campaign creatives in /public/site. */
const PRODUCTS = [
  {
    name: 'Indane XtraTej',
    tag: 'Commercial kitchens',
    img: '/site/xtratej.webp', w: 1600, h: 532,
    alt: 'Chef Sanjeev Kapoor with an Indane XtraTej cylinder: Kitchen ka Kaptaan',
    text: 'High-flame LPG for hotels, restaurants and dhabas. Flame runs at least 65°C hotter, cooking time drops by at least 14% and gas use by at least 5%.',
  },
  {
    name: 'Indane Nanocut',
    tag: 'Metal cutting',
    img: '/site/nanocut.webp', w: 1600, h: 516,
    alt: 'Indane Nanocut cutting gas cylinder with a cutting torch',
    text: 'Hi-therm cutting gas for fabrication shops and factories. It cuts your cost, your cutting time and your risk.',
  },
  {
    name: 'Chhotu Master',
    tag: '5 kg with cooktop',
    img: '/site/chhotu-master.webp', w: 1400, h: 875,
    alt: 'Chhotu Master: a 5 kg Indane cylinder with a cooktop fitted on top',
    text: 'The 5 kg Chhotu with a burner that sits right on the cylinder. No pipe to connect, easy to set up, holds up to 20 kg of cookware and is BIS certified.',
  },
  {
    name: 'Suraksha Hose',
    tag: 'Safety',
    img: '/site/suraksha-hose.webp', w: 1200, h: 675,
    alt: 'Suraksha LPG hose booked by phone through the Indane IVRS',
    text: 'Replace an old rubber pipe with the Suraksha Hose. Order it from us or book it on the Indane IVRS at 77189 55555 and it is delivered to your door.',
  },
  {
    name: 'Chhotu 5 kg home delivery',
    tag: '5 kg free trade LPG',
    img: '/site/chhotu-home-delivery.webp', w: 1400, h: 701,
    alt: 'Chhotu 5 kg cylinder, now home delivered',
    text: 'The 5 kg Chhotu cylinder now comes to your door. Indane customers can also book it on the IVRS at 77189 55555.',
  },
  {
    name: 'Chhotu, no address proof',
    tag: 'For students and migrants',
    img: '/site/chhotu-no-address-proof.webp', w: 1400, h: 467,
    alt: 'No address proof required to get your Chhotu FTL cylinder',
    text: 'No address proof is needed to get a Chhotu FTL cylinder, so it suits students, workers and anyone new to the city.',
  },
];

const SEGMENTS = ['Hotels', 'Restaurants', 'Hospitals', 'Factories', 'Hostels', 'Canteens', 'Caterers', 'Sweet shops'];

const TIPS: [string, string][] = [
  ['If you smell gas,', 'close the regulator and the burners, open doors and windows, and do not touch any switch, flame or phone near the spot. Then call 1906 or us.'],
  ['Keep cylinders standing up', 'in an airy place, away from heat, drains and direct sunlight. Never lay a full cylinder on its side.'],
  ['Check at delivery', 'that the seal is intact and the valve does not hiss. Do not accept a cylinder that smells of gas.'],
  ['Use ISI-marked regulators and hoses,', 'and replace a hose that is cracked, hard or older than its printed expiry.'],
  ['Close the regulator', 'when the kitchen shuts for the night.'],
];

const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3Z" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);

export default async function Home() {
  const [company, msg91, productRows, cookieStore] = await Promise.all([
    getSetting(TENANT, 'company'),
    getSetting(TENANT, 'msg91'),
    prisma.product.findMany({ where: { tenantId: TENANT, active: true }, select: { id: true, name: true, weightVolume: true, weightUnit: true, category: true } }),
    cookies(),
  ]);
  const claims = verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  const dashboard = claims ? ROLE_HOME[claims.role as Role] : null;

  // Cylinders only, smallest first.
  const cylinders = productRows
    .map((p) => ({ ...p, kg: kgOf(p) }))
    .filter((p): p is typeof p & { kg: number } => !!p.kg && p.category !== 'Accessory')
    .sort((a, b) => a.kg - b.kg)
    .slice(0, 5);
  const lineup = (cylinders.length ? cylinders : [{ id: 'c19', kg: 19 }, { id: 'c47', kg: 47.5 }]).slice(0, 4);

  const phone = company.supportPhone || company.phone;
  const wa = msg91.whatsappNumber || phone;
  const waFor = (text: string) => (wa ? `https://wa.me/${waNumber(wa)}?text=${encodeURIComponent(`Hello ${company.name}, ${text}`)}` : null);
  const waLink = waFor('I want to order LPG cylinders.');
  const address = [company.address, [company.city, company.pincode].filter(Boolean).join(' - ')].filter(Boolean).join('\n');
  const sizes = cylinders.map((c) => `${c.kg} kg`);
  const sizeText = sizes.length > 1 ? `${sizes.slice(0, -1).join(', ')} and ${sizes[sizes.length - 1]}` : sizes[0] || 'commercial';
  const login = dashboard ? { href: dashboard, label: 'Open dashboard' } : { href: '/login', label: 'Customer login' };
  // The cylinders are unloaded once the truck has parked.
  const unloadAt = 1250;

  return (
    <div className={`${styles.page} ${display.variable} ${body.variable}`}>
      <SiteMotion />
      <header className={styles.header}>
        <div className={`${styles.wrap} ${styles.headerRow}`}>
          <a href="#top" className={styles.brand}>
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt="" />
            ) : (
              <span className={styles.brandMark} aria-hidden="true" />
            )}
            {company.name}
          </a>
          <nav className={styles.nav} aria-label="Sections">
            <a href="#products">Products</a>
            <a href="#cylinders">Cylinders</a>
            <a href="#ordering">Ordering</a>
            <a href="#safety">Safety</a>
            <a href="#contact">Contact</a>
          </nav>
          <a href={login.href} className={`${styles.btn} ${styles.btnQuiet}`}>{login.label}</a>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <h1 className={`${styles.display} ${styles.heroTitle}`} aria-label={HEADLINE}>
                {HEADLINE.split(' ').map((w, i) => (
                  <Fragment key={i}>
                    <span className={styles.word} aria-hidden="true">
                      <span style={{ '--i': i } as CSSProperties}>{w}</span>
                    </span>{' '}
                  </Fragment>
                ))}
              </h1>
              <p className={styles.heroLead}>
                {company.name} supplies {sizeText} cylinders to kitchens and factories. Order on WhatsApp or by phone, and we deliver, collect the empties and send the bill to your phone.
              </p>
              <div className={styles.ctaRow}>
                {phone && (
                  <a href={`tel:${digits(phone)}`} className={`${styles.btn} ${styles.btnPrimary}`}>
                    <PhoneIcon /> Call {phone}
                  </a>
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnWhatsapp}`}>
                    <WhatsAppIcon /> Order on WhatsApp
                  </a>
                )}
                {!phone && !waLink && (
                  <a href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>
                    Log in to order
                  </a>
                )}
              </div>
              <p className={styles.heroNote}>
                <span className={styles.pulseDot} aria-hidden="true" />
                <span>
                  Gas leak? Call the LPG emergency helpline <a href="tel:1906" className={styles.contactLink}>1906</a>, any time.
                </span>
              </p>
            </div>
            <div className={styles.scene}>
              <div className={styles.lineup} aria-label="Cylinder sizes we supply">
                {lineup.map((c, i) => (
                  <Cylinder key={c.id} label={`${c.kg} kg`} color={sizeInfo(c.kg).color} height={Math.round(Math.min(360, Math.max(160, 210 * Math.pow(c.kg / 19, 0.32))))} delay={unloadAt + i * 160} />
                ))}
              </div>
              <HeroTruck />
            </div>
          </div>
        </section>

        <div className={styles.marquee} aria-hidden="true">
          <div className={styles.marqueeTrack}>
            {[...SEGMENTS, ...SEGMENTS, ...SEGMENTS, ...SEGMENTS].map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </div>

        <section id="products" className={`${styles.section} ${styles.howBand}`}>
          <div className={styles.wrap}>
            <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>The full Indane range</h2>
            <p data-reveal style={delay(80)} className={styles.sectionLead}>
              We are an Indane distributor, so you get IndianOil cylinders, cutting gas and safety hoses from one supplier.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-reveal style={delay(140)} className={styles.rangeBanner} src="/site/indane-family-range.webp" width={1704} height={566} alt="The Indane cylinder family: XtraTej, Nanocut, Jumbo, Xtralite and the 5 kg Chhotu. One brand, many solutions." />
            <div className={styles.productGrid}>
              {PRODUCTS.map((p, i) => {
                const ask = waFor(`I want to know about ${p.name}.`);
                return (
                  <article key={p.name} data-reveal style={delay((i % 2) * 120)} className={styles.productCard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} width={p.w} height={p.h} alt={p.alt} loading="lazy" decoding="async" />
                    <div className={styles.productBody}>
                      <span className={styles.productTag}>{p.tag}</span>
                      <h3 className={styles.display}>{p.name}</h3>
                      <p>{p.text}</p>
                      {ask ? (
                        <a href={ask} target="_blank" rel="noreferrer" className={styles.contactLink}>Ask on WhatsApp</a>
                      ) : phone ? (
                        <a href={`tel:${digits(phone)}`} className={styles.contactLink}>Call {phone}</a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {cylinders.length > 0 && (
          <section id="cylinders" className={styles.section}>
            <div className={styles.wrap}>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>Cylinders we supply</h2>
              <p data-reveal style={delay(80)} className={styles.sectionLead}>
                Every cylinder is checked for its seal and weight before it leaves the godown. A refundable security deposit is taken once for each cylinder you keep with you.
              </p>
              <div className={styles.specList}>
                {cylinders.map((c, i) => (
                  <div key={c.id} data-reveal className={styles.specRow} style={{ ...delay(i * 90), '--row-color': sizeInfo(c.kg).color } as CSSProperties}>
                    <div className={styles.specSize}>
                      {c.kg}
                      <small>kg</small>
                    </div>
                    <div className={styles.specName}>{c.name}</div>
                    <div className={styles.specUse}>{sizeInfo(c.kg).use}</div>
                    <Gauge />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="ordering" className={`${styles.section} ${styles.howBand}`}>
          <div className={styles.wrap}>
            <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>How an order reaches you</h2>
            <p data-reveal style={delay(80)} className={styles.sectionLead}>
              Your regular cylinders and rates are saved with us, so a repeat order is one message.
            </p>
            <OrderRoad steps={STEPS} />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.wrap}>
            <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>Who we deliver to</h2>
            <p data-reveal style={delay(80)} className={styles.sectionLead}>Kitchens and plants that cannot stop for a gas shortage.</p>
            <ul className={styles.segments}>
              {SEGMENTS.map((s, i) => (
                <li key={s} data-reveal style={delay(i * 60)}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="safety" className={`${styles.section} ${styles.safety}`}>
          <div className={`${styles.wrap} ${styles.safetyGrid}`}>
            <div>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>Using LPG safely</h2>
              <p data-reveal style={delay(80)} className={styles.sectionLead}>A clean blue flame means the gas is burning right. Simple habits keep it that way.</p>
              <div data-reveal style={delay(160)}>
                <Flame />
                <div className={styles.emergency}>
                  <p>LPG emergency helpline, all India, 24 hours</p>
                  <a href="tel:1906" className={styles.emergencyNumber}>1906</a>
                  <p>Call it for any leak, even if you are not sure.</p>
                </div>
              </div>
            </div>
            <ul className={styles.tips}>
              {TIPS.map(([lead, rest], i) => (
                <li key={lead} data-reveal style={delay(i * 90)}>
                  <b>{lead}</b> {rest}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact" className={styles.section}>
          <div className={`${styles.wrap} ${styles.contactGrid}`}>
            <div>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>Talk to us</h2>
              <p data-reveal style={delay(80)} className={styles.sectionLead}>For a new connection, a regular supply plan or an urgent refill.</p>
              <dl data-reveal style={delay(160)} className={styles.contactList}>
                {phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd><a className={styles.contactLink} href={`tel:${digits(phone)}`}>{phone}</a></dd>
                  </div>
                )}
                {waLink && (
                  <div>
                    <dt>WhatsApp</dt>
                    <dd><a className={styles.contactLink} href={waLink} target="_blank" rel="noreferrer">Send us a message</a></dd>
                  </div>
                )}
                {company.email && (
                  <div>
                    <dt>Email</dt>
                    <dd><a className={styles.contactLink} href={`mailto:${company.email}`}>{company.email}</a></dd>
                  </div>
                )}
                {address && (
                  <div>
                    <dt>Office and godown</dt>
                    <dd>{address}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div data-reveal style={delay(120)} className={styles.portalBox}>
              <h3 className={styles.display}>{dashboard ? 'You are logged in' : 'Already a customer?'}</h3>
              <p>{dashboard ? 'Go back to your dashboard.' : 'Log in to order cylinders, see your bills and payments, and check the cylinders with you.'}</p>
              <a href={login.href} className={`${styles.btn} ${styles.btnPrimary}`}>{login.label}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          {/* sized so the whole name fits on one line, however long it is */}
          <p className={styles.wordmark} aria-hidden="true" style={{ fontSize: `clamp(2.6rem, ${Math.min(13, 150 / Math.max(company.name.length, 1)).toFixed(2)}vw, 11rem)` }}>
            {company.name}
          </p>
          <div className={styles.footerRow}>
            <span>
              © {new Date().getFullYear()} {company.legalName || company.name}
            </span>
            {company.gstin && <span>GSTIN {company.gstin}</span>}
            <a href={login.href}>{login.label}</a>
          </div>
        </div>
      </footer>

      {waLink && (
        <a href={waLink} target="_blank" rel="noreferrer" className={styles.floatWa} aria-label="Order on WhatsApp">
          <WhatsAppIcon size={28} />
        </a>
      )}
    </div>
  );
}
