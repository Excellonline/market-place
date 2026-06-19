// Re-export categories that the renderer needs to populate dropdowns.
// We mirror the main-process constants here as plain JS arrays so they bundle into the renderer
// without crossing the main↔renderer boundary at runtime.

export const FACEBOOK_CATEGORIES = [
  'Antiques & Collectibles',
  'Arts & Crafts',
  'Auto Parts',
  'Baby Products',
  'Bags & Luggage',
  'Books, Movies & Music',
  'Cell Phones & Accessories',
  "Children's Clothing & Shoes",
  'Electronics',
  'Furniture',
  'Garage Sale',
  'Garden & Outdoor',
  'Health & Beauty',
  'Home Goods',
  'Home Improvement',
  'Home Sales',
  'Household',
  'Jewelry & Accessories',
  "Men's Clothing & Shoes",
  'Miscellaneous',
  'Musical Instruments',
  'Office Supplies',
  'Pet Supplies',
  'Sporting Goods',
  'Toys & Games',
  'Vehicles',
  'Video Games & Consoles',
  "Women's Clothing & Shoes",
] as const;

export const FACEBOOK_CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'] as const;

export const KIJIJI_CATEGORIES: Array<{ label: string; path: string[] }> = [
  { label: 'Furniture — Other Furniture', path: ['Buy & Sell', 'Furniture', 'Other Furniture'] },
  { label: 'Furniture — Sofas, Futons & Loveseats', path: ['Buy & Sell', 'Furniture', 'Couches & Futons'] },
  { label: 'Furniture — Chairs & Recliners', path: ['Buy & Sell', 'Furniture', 'Chairs & Recliners'] },
  { label: 'Furniture — Dining Tables & Sets', path: ['Buy & Sell', 'Furniture', 'Dining Tables & Sets'] },
  { label: 'Furniture — Desks', path: ['Buy & Sell', 'Furniture', 'Desks'] },
  { label: 'Furniture — Bookcases & Shelves', path: ['Buy & Sell', 'Furniture', 'Bookcases & Shelves'] },
  { label: 'Furniture — Dressers & Wardrobes', path: ['Buy & Sell', 'Furniture', 'Dressers & Wardrobes'] },
  { label: 'Electronics — Computers', path: ['Buy & Sell', 'Computers', 'Desktop Computers'] },
  { label: 'Electronics — Laptops', path: ['Buy & Sell', 'Computers', 'Laptops'] },
  { label: 'Electronics — Cell Phones', path: ['Buy & Sell', 'Cell Phones', 'Cell Phones'] },
  { label: 'Electronics — TVs', path: ['Buy & Sell', 'TVs & Video', 'TVs'] },
  { label: 'Home — Home Appliances', path: ['Buy & Sell', 'Home Appliances'] },
  { label: 'Home — Home Décor & Accents', path: ['Buy & Sell', 'Home Décor & Accents'] },
  { label: 'Tools — Tools', path: ['Buy & Sell', 'Tools', 'Other Tools'] },
  { label: 'Sports — Bikes', path: ['Buy & Sell', 'Bikes', 'Other'] },
  { label: 'Baby — Strollers, Carriers & Car Seats', path: ['Buy & Sell', 'Baby Items', 'Strollers, Carriers & Car Seats'] },
  { label: 'Books — Books', path: ['Buy & Sell', 'Books', 'Other'] },
  { label: 'Toys & Games — Toys & Games', path: ['Buy & Sell', 'Toys & Games', 'Other'] },
  { label: 'Clothing — Women', path: ['Buy & Sell', "Women's Shoes", 'Other'] },
  { label: 'Clothing — Men', path: ['Buy & Sell', "Men's Shoes", 'Other'] },
];

export const KIJIJI_CONDITIONS = ['New', 'Used'] as const;
