import { Fragment, type CSSProperties } from 'react';
import type { Metadata } from 'next';
import { Big_Shoulders, Instrument_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { ROLE_HOME, type Role } from '@/lib/permissions';
import { getSetting } from '@/lib/server/settings';
import { SESSION_COOKIE, verifySession } from '@/lib/server/sessionToken';
import { DEFAULT_HERO_IMAGE, fillWebsiteText, publicSiteImage } from '@/lib/website';
import { Flame, Gauge } from '@/components/site/Graphics';
import { InquiryForm } from '@/components/site/InquiryForm';
import { OrderRoad } from '@/components/site/OrderRoad';
import { SiteMotion } from '@/components/site/SiteMotion';
import styles from '@/components/site/site.module.css';

// The distributor's public website. Name, phone, address and GSTIN come from
// Settings → Company, the cylinder sizes from Masters → Products, and every heading,
// text and photo from Admin → Website (lib/website.ts), so the page stays true without
// editing code. The ERP itself starts at /login.

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
/** 918988225521 → +91 89882 25521 */
const showNumber = (v: string) => {
  const d = waNumber(v);
  return d.length === 12 && d.startsWith('91') ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : v;
};
/** Stagger delay for a revealed item. */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

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
  const [company, msg91, site, productRows, cookieStore, waCompany] = await Promise.all([
    getSetting(TENANT, 'company'),
    getSetting(TENANT, 'msg91'),
    getSetting(TENANT, 'website'),
    prisma.product.findMany({ where: { tenantId: TENANT, active: true }, select: { id: true, name: true, weightVolume: true, weightUnit: true, category: true } }),
    cookies(),
    // The company WhatsApp number linked by QR (WhatsApp → Numbers).
    prisma.waSession.findFirst({ where: { tenantId: TENANT, isCompany: true, number: { not: null } }, select: { number: true } }),
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
  const wa = msg91.whatsappNumber || (waCompany?.number ? `+${waCompany.number}` : '') || phone;
  const waFor = (text: string) => (wa ? `https://wa.me/${waNumber(wa)}?text=${encodeURIComponent(`Hello ${company.name}, ${text}`)}` : null);
  const waLink = waFor('I want to order LPG cylinders.');
  const address = [company.address, [company.city, company.pincode].filter(Boolean).join(' - ')].filter(Boolean).join('\n');
  const sizes = cylinders.map((c) => `${c.kg} kg`);
  const sizeText = sizes.length > 1 ? `${sizes.slice(0, -1).join(', ')} and ${sizes[sizes.length - 1]}` : sizes[0] || 'commercial';
  const login = dashboard ? { href: dashboard, label: 'Open dashboard' } : { href: '/login', label: 'Customer login' };
  const fill = (text: string) => fillWebsiteText(text, { company: company.name, sizes: sizeText });

  const { hero, products, ordering, audience, safety, inquiry, contact } = site;
  const showCylinders = site.cylinders.show && cylinders.length > 0;
  const nav = [
    products.show && products.items.length > 0 && ['products', 'Products'],
    showCylinders && ['cylinders', 'Cylinders'],
    ordering.show && ['ordering', 'Ordering'],
    safety.show && ['safety', 'Safety'],
    inquiry.show && ['inquiry', 'Inquiry'],
    contact.show && ['contact', 'Contact'],
  ].filter(Boolean) as [string, string][];
  // The shipped hero photo is the range banner, cropped to its cylinders; any other photo fills the box.
  const heroImage = hero.image ? publicSiteImage(hero.image) : '';
  const heroCropped = hero.image === DEFAULT_HERO_IMAGE;

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
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`}>{label}</a>
            ))}
          </nav>
          <a href={login.href} className={`${styles.btn} ${styles.btnQuiet}`}>{login.label}</a>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <h1 className={`${styles.display} ${styles.heroTitle}`} aria-label={hero.headline}>
                {hero.headline.split(' ').map((w, i) => (
                  <Fragment key={i}>
                    <span className={styles.word} aria-hidden="true">
                      <span style={{ '--i': i } as CSSProperties}>{w}</span>
                    </span>{' '}
                  </Fragment>
                ))}
              </h1>
              {hero.lead && <p className={styles.heroLead}>{fill(hero.lead)}</p>}
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
              {hero.emergencyNote && (
                <p className={styles.heroNote}>
                  <span className={styles.pulseDot} aria-hidden="true" />
                  <span>
                    Gas leak? Call the LPG emergency helpline <a href="tel:1906" className={styles.contactLink}>1906</a>, any time.
                  </span>
                </p>
              )}
            </div>
            <div className={styles.heroSide}>
              {/* Quick inquiry for new customers; the full form is in #inquiry. */}
              <div className={styles.heroForm}>
                <InquiryForm compact sizes={(cylinders.length ? cylinders : lineup).map((c) => `${c.kg} kg`)} />
              </div>
              {heroImage && (
                <figure className={`${styles.heroPhoto} ${heroCropped ? '' : styles.heroPhotoFill}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImage} {...(heroCropped ? { width: 1704, height: 566 } : {})} alt={hero.imageAlt} fetchPriority="high" />
                </figure>
              )}
            </div>
          </div>
        </section>

        {audience.ticker && audience.items.length > 0 && (
          <div className={styles.marquee} aria-hidden="true">
            <div className={styles.marqueeTrack}>
              {[...audience.items, ...audience.items, ...audience.items, ...audience.items].map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {products.show && products.items.length > 0 && (
          <section id="products" className={`${styles.section} ${styles.howBand}`}>
            <div className={styles.wrap}>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{products.title}</h2>
              {products.lead && (
                <p data-reveal style={delay(80)} className={styles.sectionLead}>
                  {fill(products.lead)}
                </p>
              )}
              {products.banner && (
                // eslint-disable-next-line @next/next/no-img-element
                <img data-reveal style={delay(140)} className={styles.rangeBanner} src={publicSiteImage(products.banner)} alt={products.title} />
              )}
              <div className={styles.productGrid}>
                {products.items.map((p, i) => {
                  const ask = waFor(`I want to know about ${p.name}.`);
                  return (
                    <article key={`${p.name}-${i}`} data-reveal style={delay((i % 2) * 120)} className={styles.productCard}>
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={publicSiteImage(p.image)} alt={p.name} loading="lazy" decoding="async" />
                      )}
                      <div className={styles.productBody}>
                        {p.tag && <span className={styles.productTag}>{p.tag}</span>}
                        <h3 className={styles.display}>{p.name}</h3>
                        {p.text && <p>{fill(p.text)}</p>}
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
        )}

        {showCylinders && (
          <section id="cylinders" className={styles.section}>
            <div className={styles.wrap}>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{site.cylinders.title}</h2>
              {site.cylinders.lead && (
                <p data-reveal style={delay(80)} className={styles.sectionLead}>
                  {fill(site.cylinders.lead)}
                </p>
              )}
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

        {ordering.show && ordering.steps.length > 0 && (
          <section id="ordering" className={`${styles.section} ${styles.howBand}`}>
            <div className={styles.wrap}>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{ordering.title}</h2>
              {ordering.lead && (
                <p data-reveal style={delay(80)} className={styles.sectionLead}>
                  {fill(ordering.lead)}
                </p>
              )}
              <OrderRoad steps={ordering.steps} />
            </div>
          </section>
        )}

        {audience.show && audience.items.length > 0 && (
          <section className={styles.section}>
            <div className={styles.wrap}>
              <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{audience.title}</h2>
              {audience.lead && (
                <p data-reveal style={delay(80)} className={styles.sectionLead}>
                  {fill(audience.lead)}
                </p>
              )}
              <ul className={styles.segments}>
                {audience.items.map((s, i) => (
                  <li key={`${s}-${i}`} data-reveal style={delay(i * 60)}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {safety.show && (
          <section id="safety" className={`${styles.section} ${styles.safety}`}>
            <div className={`${styles.wrap} ${styles.safetyGrid}`}>
              <div>
                <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{safety.title}</h2>
                {safety.lead && (
                  <p data-reveal style={delay(80)} className={styles.sectionLead}>
                    {fill(safety.lead)}
                  </p>
                )}
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
                {safety.tips.map((t, i) => (
                  <li key={`${t.title}-${i}`} data-reveal style={delay(i * 90)}>
                    <b>{t.title}</b> {t.text}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {inquiry.show && (
          <section id="inquiry" className={`${styles.section} ${styles.howBand}`}>
            <div className={`${styles.wrap} ${styles.inquiryGrid}`}>
              <div>
                <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{inquiry.title}</h2>
                {inquiry.lead && (
                  <p data-reveal style={delay(80)} className={styles.sectionLead}>
                    {fill(inquiry.lead)}
                  </p>
                )}
                {inquiry.steps.length > 0 && (
                  <ol data-reveal style={delay(160)} className={styles.inquirySteps}>
                    {inquiry.steps.map((s, i) => (
                      <li key={`${s.title}-${i}`}>
                        <span>
                          <b>{s.title}</b> {s.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div data-reveal style={delay(120)}>
                <InquiryForm sizes={(cylinders.length ? cylinders : lineup).map((c) => `${c.kg} kg`)} />
              </div>
            </div>
          </section>
        )}

        {contact.show && (
          <section id="contact" className={styles.section}>
            <div className={`${styles.wrap} ${styles.contactGrid}`}>
              <div>
                <h2 data-reveal className={`${styles.display} ${styles.sectionTitle}`}>{contact.title}</h2>
                {contact.lead && (
                  <p data-reveal style={delay(80)} className={styles.sectionLead}>
                    {fill(contact.lead)}
                  </p>
                )}
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
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <a href="#top" className={styles.footerLogo}>
                {company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt="" />
                ) : (
                  <span className={styles.brandMark} aria-hidden="true" />
                )}
                {company.name}
              </a>
              {site.footer.about && <p>{fill(site.footer.about)}</p>}
              <div className={styles.footerCtas}>
                {phone && (
                  <a href={`tel:${digits(phone)}`} className={`${styles.btn} ${styles.btnPrimary}`}>
                    <PhoneIcon /> Call {phone}
                  </a>
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnWhatsapp}`}>
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
              </div>
            </div>

            <nav aria-label="Footer">
              <h3 className={styles.footerHead}>Quick links</h3>
              <ul className={styles.footerList}>
                {nav.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`}>{label}</a>
                  </li>
                ))}
                <li>
                  <a href={login.href}>{login.label}</a>
                </li>
              </ul>
            </nav>

            <div hidden={!phone && !waLink && !company.email && !address}>
              <h3 className={styles.footerHead}>Contact</h3>
              <ul className={styles.footerList}>
                {phone && (
                  <li>
                    <span className={styles.footerLabel}>Phone</span>
                    <a href={`tel:${digits(phone)}`}>{phone}</a>
                  </li>
                )}
                {company.phone && company.supportPhone && digits(company.phone) !== digits(company.supportPhone) && (
                  <li>
                    <span className={styles.footerLabel}>Office</span>
                    <a href={`tel:${digits(company.phone)}`}>{company.phone}</a>
                  </li>
                )}
                {waLink && wa && (
                  <li>
                    <span className={styles.footerLabel}>WhatsApp</span>
                    <a href={waLink} target="_blank" rel="noreferrer">{showNumber(wa)}</a>
                  </li>
                )}
                {company.email && (
                  <li>
                    <span className={styles.footerLabel}>Email</span>
                    <a href={`mailto:${company.email}`}>{company.email}</a>
                  </li>
                )}
                {address && (
                  <li>
                    <span className={styles.footerLabel}>Office and godown</span>
                    <span className={styles.footerAddress}>{address}</span>
                  </li>
                )}
              </ul>
            </div>

            <div>
              {site.footer.hours.length > 0 && (
                <>
                  <h3 className={styles.footerHead}>Working hours</h3>
                  <ul className={`${styles.footerList} ${styles.footerHours}`}>
                    {site.footer.hours.map((h, i) => (
                      <li key={`${h}-${i}`}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
              {site.footer.emergency && (
                <a href="tel:1906" className={styles.footerEmergency}>
                  <span>Gas leak? LPG emergency, 24 hours</span>
                  <b>1906</b>
                </a>
              )}
            </div>
          </div>

          {/* sized so the whole name fits on one line, however long it is */}
          <p className={styles.wordmark} aria-hidden="true" style={{ fontSize: `clamp(2.6rem, ${Math.min(13, 150 / Math.max(company.name.length, 1)).toFixed(2)}vw, 11rem)` }}>
            {company.name}
          </p>
          <div className={styles.footerRow}>
            <span>
              © {new Date().getFullYear()} {company.legalName || company.name}
            </span>
            {company.gstin && <span>GSTIN {company.gstin}</span>}
            <span>Authorised Indane LPG distributor</span>
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
