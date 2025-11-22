export type Collection = {
  id: number;
  title: string;
  count?: number;
  photo?: {
    sizes?: Array<{
      type: string;
      url: string;
      width: number;
      height: number;
    }>;
  };
};

export type Product = {
  id: number;
  title: string;
  description: string;
  price: {
    text: string;
    amount?: number | string;
    currency?: {
      id?: number;
      name?: string;
      title?: string;
    };
  };
  thumb_photo?: string;
  thumb?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  photos?: Array<{
    photo_604?: string;
    photo_1280?: string;
    photo_2560?: string;
    id?: number;
  }> | {
    photo_604?: string;
    photo_1280?: string;
    photo_2560?: string;
    id?: number;
  };
  sizes?: string[];
};

export type User = {
  id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_premium: boolean;
  photo_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
  first_seen_readable: string;
  last_seen_readable: string;
};








