import type { FC } from 'react';
import { useEffect } from 'react';

type Props = { title: string; description: string; path?: string; type?: 'website' | 'article' };

const ensureMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attribute, key); document.head.appendChild(el); }
  el.content = content;
};
const ensureLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
};
const ensureJsonLd = (key: string, value: Record<string, unknown>) => {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-privasec-jsonld="${key}"]`);
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.dataset.privasecJsonld = key; document.head.appendChild(el); }
  el.textContent = JSON.stringify(value);
};

export const SEOHead: FC<Props> = ({ title, description, path = '/', type = 'website' }) => {
  useEffect(() => {
    const pathname = path.startsWith('/') ? path : `/${path}`;
    const url = `${window.location.origin}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
    document.title = title;
    ensureMeta('name', 'description', description);
    ensureMeta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    ensureMeta('property', 'og:title', title);
    ensureMeta('property', 'og:description', description);
    ensureMeta('property', 'og:type', type);
    ensureMeta('property', 'og:url', url);
    ensureMeta('property', 'og:site_name', 'PrivaSec');
    ensureMeta('name', 'twitter:card', 'summary');
    ensureMeta('name', 'twitter:title', title);
    ensureMeta('name', 'twitter:description', description);
    ensureLink('canonical', url);
    ensureJsonLd('page', { '@context':'https://schema.org', '@type': type === 'article' ? 'Article' : 'WebPage', name:title, description, url, isPartOf:{'@type':'WebSite',name:'PrivaSec',url:window.location.origin} });
    ensureJsonLd('website', { '@context':'https://schema.org', '@type':'WebSite', name:'PrivaSec', url:window.location.origin, description:'Free privacy, browser, IP, HTTP header and website exposure auditing.' });
  }, [description, path, title, type]);
  return null;
};
