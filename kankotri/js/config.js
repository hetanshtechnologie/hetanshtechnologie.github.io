export const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
export const EDGE_URL = `${SUPABASE_URL}/functions/v1`;
export const RAZORPAY_ENABLED = true;

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const CARD = {
  width: 1080,
  height: 1350,
  previewWidth: 540,
  previewHeight: 675
};

export const MAX_GUESTS = 10000;
export const PAGE_SIZE = 8;

export const CATEGORIES = [
  'Gujarati Wedding',
  'Hindu Wedding',
  'Reception',
  'Engagement',
  'Baby Shower',
  'House Warming',
  'Birthday'
];

export const STORAGE_KEYS = {
  theme: 'kankotri_theme',
  lang: 'kankotri_lang',
  font: 'kankotri_custom_font',
  lastTemplate: 'kankotri_last_template'
};

export const DEFAULT_DETAILS = {
  event_name: 'Wedding Celebration',
  bride_name: 'Riya',
  groom_name: 'Aarav',
  wedding_date: '',
  time: '7:00 PM onwards',
  venue: '',
  maps_url: '',
  message: 'With hearts full of joy, we invite you to share in the beginning of our forever.',
  family_details: '',
  language: 'gu',
  font_family: '',
  logo_url: '',
  show_qr: true
};

export const DEFAULT_DESIGN = {
  bg: ['#FFF8E7', '#F3DFC1'],
  accent: '#B76E79',
  gold: '#D4AF37',
  text: '#5A2A2A',
  border: 'mandala',
  ornament: 'ganesh',
  layout: 'classic',
  font: 'Cormorant Garamond'
};

export const FALLBACK_TEMPLATES = [
  { key: 'local-1', name: 'Ganesha Kankotri', category: 'Gujarati Wedding', is_premium: false, design: { bg: ['#FFF8E7', '#F3DFC1'], accent: '#B76E79', gold: '#D4AF37', text: '#5A2A2A', border: 'mandala', ornament: 'ganesh', layout: 'classic', font: 'Cormorant Garamond' } },
  { key: 'local-2', name: 'Marigold Mangal', category: 'Gujarati Wedding', is_premium: false, design: { bg: ['#FFF4DC', '#F7C873'], accent: '#C0392B', gold: '#D4AF37', text: '#6B1D1D', border: 'floral', ornament: 'floral', layout: 'royal', font: 'Playfair Display' } },
  { key: 'local-3', name: 'Rani Pink Garba', category: 'Gujarati Wedding', is_premium: true, design: { bg: ['#FFF0F5', '#F5B7C7'], accent: '#B76E79', gold: '#C9A227', text: '#7A1F3D', border: 'paisley', ornament: 'mandala', layout: 'classic', font: 'Cormorant Garamond' } },
  { key: 'local-4', name: 'Royal Maroon', category: 'Hindu Wedding', is_premium: true, design: { bg: ['#FFF8E7', '#E8C9A0'], accent: '#8B2E3F', gold: '#D4AF37', text: '#4A1A1A', border: 'double', ornament: 'om', layout: 'royal', font: 'Playfair Display' } },
  { key: 'local-5', name: 'Ivory Temple', category: 'Hindu Wedding', is_premium: false, design: { bg: ['#FFFDF6', '#EFE3C8'], accent: '#A0522D', gold: '#C9A227', text: '#4B3621', border: 'paisley', ornament: 'mandala', layout: 'classic', font: 'Cormorant Garamond' } },
  { key: 'local-6', name: 'Golden Reception', category: 'Reception', is_premium: true, design: { bg: ['#1E1B18', '#3A2E23'], accent: '#D4AF37', gold: '#F0D98C', text: '#FFF8E7', border: 'minimal', ornament: 'sparkle', layout: 'modern', font: 'Playfair Display' } },
  { key: 'local-7', name: 'Blush Reception', category: 'Reception', is_premium: false, design: { bg: ['#FFF6F2', '#F3D6D0'], accent: '#B76E79', gold: '#D4AF37', text: '#5A2A2A', border: 'floral', ornament: 'floral', layout: 'modern', font: 'Cormorant Garamond' } },
  { key: 'local-8', name: 'Ring Ceremony', category: 'Engagement', is_premium: true, design: { bg: ['#F7F3FF', '#DCD0F5'], accent: '#7B4B94', gold: '#D4AF37', text: '#3C2350', border: 'minimal', ornament: 'rings', layout: 'modern', font: 'Cormorant Garamond' } },
  { key: 'local-9', name: 'Sakura Engagement', category: 'Engagement', is_premium: false, design: { bg: ['#FFF8F9', '#F6D7DE'], accent: '#C46A7E', gold: '#C9A227', text: '#5A2A2A', border: 'floral', ornament: 'floral', layout: 'classic', font: 'Playfair Display' } },
  { key: 'local-10', name: 'Little Blessing', category: 'Baby Shower', is_premium: false, design: { bg: ['#F4FBF7', '#CDE8DA'], accent: '#5B8C6E', gold: '#D4AF37', text: '#274436', border: 'paisley', ornament: 'floral', layout: 'modern', font: 'Cormorant Garamond' } },
  { key: 'local-11', name: 'Griha Pravesh', category: 'House Warming', is_premium: false, design: { bg: ['#FFF8E7', '#EFD6A8'], accent: '#B76E79', gold: '#C9A227', text: '#5A2A2A', border: 'mandala', ornament: 'kalash', layout: 'classic', font: 'Cormorant Garamond' } },
  { key: 'local-12', name: 'Celebration Gold', category: 'Birthday', is_premium: true, design: { bg: ['#FFF9E8', '#F2D48A'], accent: '#B8860B', gold: '#D4AF37', text: '#4A3000', border: 'minimal', ornament: 'sparkle', layout: 'modern', font: 'Playfair Display' } }
];

export const PREMIUM_FONT_OPTIONS = [
  { value: '', label: 'Template default' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Great Vibes', label: 'Great Vibes (script)' },
  { value: 'Noto Serif Gujarati', label: 'Noto Serif Gujarati' },
  { value: 'Noto Sans Gujarati', label: 'Noto Sans Gujarati' }
];
