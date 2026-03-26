import type { Ad } from '../types';

const MOCK_ADS: Ad[] = [
  {
    ad_id: 'ad-1',
    title: 'Boost Your Freelance Career',
    description: 'Join thousands of freelancers who have leveled up their skills with our premium courses and mentorship programs.',
    image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    link_url: 'https://example.com',
    advertiser_id: 'adv-1',
    category: 'Development',
    is_active: true,
    start_date: '2025-01-01',
    end_date: '2027-12-31',
    impressions: 0,
    clicks: 0,
  },
  {
    ad_id: 'ad-2',
    title: 'Design Tools for Professionals',
    description: 'Get access to industry-leading design tools and templates. Create stunning visuals in minutes, not hours.',
    image_url: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
    link_url: 'https://example.com',
    advertiser_id: 'adv-2',
    category: 'Design',
    is_active: true,
    start_date: '2025-01-01',
    end_date: '2027-12-31',
    impressions: 0,
    clicks: 0,
  },
  {
    ad_id: 'ad-3',
    title: 'Write Better, Faster',
    description: 'AI-powered writing assistant trusted by over 50,000 content creators worldwide. Try it free for 30 days.',
    image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
    link_url: 'https://example.com',
    advertiser_id: 'adv-3',
    category: 'Writing',
    is_active: true,
    start_date: '2025-01-01',
    end_date: '2027-12-31',
    impressions: 0,
    clicks: 0,
  },
  {
    ad_id: 'ad-4',
    title: 'Grow Your Brand Online',
    description: 'Data-driven marketing solutions that help businesses scale. From SEO to social media, we have you covered.',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    link_url: 'https://example.com',
    advertiser_id: 'adv-4',
    category: 'Marketing',
    is_active: true,
    start_date: '2025-01-01',
    end_date: '2027-12-31',
    impressions: 0,
    clicks: 0,
  },
];

export async function getActiveAds(): Promise<Ad[]> {
  return MOCK_ADS;
}
