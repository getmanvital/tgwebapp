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








