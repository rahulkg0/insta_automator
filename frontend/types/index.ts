export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  industry?: string;
  target_audience?: string;
  brand_personality?: string;
  brand_tone?: string;
  visual_style?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  cta_style?: string;
  content_rules?: string;
  logo_rules?: string;
  hashtag_rules?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandAsset {
  id: string;
  brand_id: string;
  user_id: string;
  asset_type: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  meta_info?: any;
  created_at: string;
  updated_at: string;
}

export interface CarouselSlide {
  slide_number: number;
  title: string;
  body?: string;
}

export interface GeneratedContent {
  content_type: string;
  hook: string;
  headline: string;
  body: string;
  cta: string;
  caption: string;
  hashtags: string[];
  visual_concept: string;
  template_type: string;
  carousel_slides?: CarouselSlide[];
}

export interface PostResponse {
  id: string;
  user_id: string;
  brand_id: string;
  social_account_id?: string;
  brief_prompt: string;
  content_type: string;
  post_objective?: string;
  target_audience?: string;
  product_info?: string;
  cta?: string;
  generated_content?: GeneratedContent;
  generated_design?: any;
  rendered_image_url?: string;
  status: string;
  current_version: number;
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InstagramAccount {
  id: string;
  brand_id: string;
  instagram_user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  facebook_page_name?: string;
  is_connected: boolean;
  last_synced_at?: string;
}

export interface InstagramAuthUrlResponse {
  auth_url: string;
  is_mock: boolean;
  state: string;
}

