/**
 * Facebook Marketplace top-level item categories.
 * Captured manually from facebook.com/marketplace/create/item — verify on first real run.
 *
 * The value is what you type into FB's category typeahead; FB matches it to the canonical
 * category and offers it as an option you then click.
 */
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

export const FACEBOOK_CONDITIONS = [
  'New',
  'Used - Like New',
  'Used - Good',
  'Used - Fair',
] as const;

export type FacebookCategory = (typeof FACEBOOK_CATEGORIES)[number];
export type FacebookCondition = (typeof FACEBOOK_CONDITIONS)[number];
