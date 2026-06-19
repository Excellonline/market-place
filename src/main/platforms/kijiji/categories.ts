/**
 * Kijiji uses a deep category tree. Rather than reproduce thousands of leaves, we ship the most
 * common ones as known paths; users with rarer categories can enter a custom path that the
 * adapter walks step-by-step in the cascade.
 *
 * Format: each entry is the cascade you'd click on /p-post-ad.html in order.
 */
export const KIJIJI_CATEGORIES: ReadonlyArray<{ label: string; path: readonly string[] }> = [
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
  { label: 'Clothing — Women', path: ["Buy & Sell", "Women's Shoes", 'Other'] },
  { label: 'Clothing — Men', path: ['Buy & Sell', "Men's Shoes", 'Other'] },
] as const;

export const KIJIJI_CONDITIONS = ['New', 'Used'] as const;

export type KijijiCondition = (typeof KIJIJI_CONDITIONS)[number];
