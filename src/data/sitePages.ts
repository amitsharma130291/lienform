// One crawlable directory for guides and the products that actually exist.
export const SITE_URL = 'https://mechanicslienform.com';
export const statePages = [
  { name: 'Arizona', slug: 'arizona', generator: true, topic: 'Completion, 20-day notice, and 120/60-day recording periods' },
  { name: 'California', slug: 'california', generator: true, topic: 'Project completion, preliminary notices, and owner service' },
  { name: 'Colorado', slug: 'colorado', generator: false, topic: 'Ten-day notice of intent and separate recording and enforcement clocks' },
  { name: 'Florida', slug: 'florida', generator: false, topic: 'Notice to Owner, 90-day recording, and shortened enforcement periods' },
  { name: 'Georgia', slug: 'georgia', generator: true, topic: '90-day recording and two-business-day delivery' },
  { name: 'Illinois', slug: 'illinois', generator: false, topic: 'Subcontractor notices and four-month third-party protection' },
  { name: 'Michigan', slug: 'michigan', generator: true, topic: '90-day recording and 15-day service on the owner or designee' },
  { name: 'New York', slug: 'new-york', generator: false, topic: 'Four/eight-month filing and proof of owner service' },
  { name: 'North Carolina', slug: 'north-carolina', generator: false, topic: 'Lien agents, liens upon funds, and 120/180-day deadlines' },
  { name: 'Ohio', slug: 'ohio', generator: true, topic: 'Property classification and 60/75-day recording periods' },
  { name: 'Texas', slug: 'texas', generator: true, topic: 'Month-based filing, monthly notices, and retainage' },
  { name: 'Washington', slug: 'washington', generator: true, topic: '90-day recording, owner service, and eight-month enforcement' },
];
export const documentPages = [
  { name: 'Mechanics lien form checklist', path: '/mechanics-lien/form/' },
  { name: 'Florida Notice to Owner', path: '/notice-to-owner/florida/' },
  { name: 'California preliminary notice', path: '/preliminary-notice/california/' },
  { name: 'Conditional lien waiver', path: '/lien-waiver/conditional/' },
  { name: 'Notice of intent to lien', path: '/notice-of-intent-to-lien/' },
  { name: 'Mechanics lien release', path: '/mechanics-lien/release/' },
];
export const indexablePaths = ['/', '/mechanics-lien/', ...statePages.map(s => `/mechanics-lien/${s.slug}/`), ...documentPages.map(p => p.path), '/about/', '/contact/', '/privacy-policy/', '/terms-of-service/'];
