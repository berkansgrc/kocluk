import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // Buraya kendi alan adınızı eklemeyi unutmayın
  const baseUrl = 'https://berkanhoca.online'; 

  const staticRoutes = [
    '/',
    '/reports',
    '/achievements',
    '/resources',
    '/zaman-yonetimi',
    '/deneme-analizi',
  ];

  const sitemapRoutes = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '/' ? 1 : 0.8,
  }));

  return sitemapRoutes;
}
