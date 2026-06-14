import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://nexalabs.my.id'

  const platforms = [
    'tiktok', 'youtube', 'instagram', 'twitter', 'facebook', 'pinterest', 'bstation'
  ];

  const platformRoutes: MetadataRoute.Sitemap = platforms.map((platform) => ({
    url: `${baseUrl}/${platform}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    ...platformRoutes,
  ];
}
