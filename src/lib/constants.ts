// College domain for email restriction
export const COLLEGE_DOMAIN = '@stu.upes.ac.in';

// App name
export const APP_NAME = 'GoodsMandi';

// Minimum bid percentage (70% of asking price)
export const MIN_BID_PERCENTAGE = 0.70;

// Max photos per listing
export const MAX_PHOTOS_PER_LISTING = 5;

// Listing categories
export const LISTING_CATEGORIES = [
  'Books & Study Material',
  'Electronics & Gadgets',
  'Furniture & Room Essentials',
  'Cycles & Transport',
  'Appliances',
  'Clothing & Misc',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

// Product age brackets
export const PRODUCT_AGE_BRACKETS = [
  'Under 6 months',
  '6-12 months',
  '1-2 years',
  '2+ years',
] as const;

export type ProductAgeBracket = (typeof PRODUCT_AGE_BRACKETS)[number];

// Extra dropdown choice that lets the seller type their own product age
export const PRODUCT_AGE_OTHER = 'Others';
export const PRODUCT_AGE_CUSTOM_MAX_LENGTH = 40;

// Report categories
export const REPORT_CATEGORIES = [
  'No-show',
  'Harassment',
  'Fake/Prohibited item',
  'Scam',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

// Listing statuses
export const LISTING_STATUSES = ['active', 'sold', 'removed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

// Bid statuses
export const BID_STATUSES = ['pending', 'selected', 'rejected'] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

// Report statuses
export const REPORT_STATUSES = ['pending', 'confirmed', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Prohibited keywords for listing content moderation
export const PROHIBITED_KEYWORDS = [
  'alcohol', 'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'rum',
  'tobacco', 'cigarette', 'vape', 'e-cigarette',
  'drug', 'marijuana', 'weed', 'cannabis', 'cocaine', 'heroin',
  'weapon', 'gun', 'knife', 'sword', 'firearm', 'ammunition',
  'stolen', 'counterfeit', 'fake id', 'forged',
  'exam paper', 'leaked exam', 'answer key', 'cheat sheet',
  'pharmaceutical', 'prescription', 'controlled substance',
];

// Category tag style. One neutral style for every category keeps the cards calm.
const CATEGORY_TAG = 'bg-slate-900 text-slate-300';

export const CATEGORY_COLORS: Record<ListingCategory, string> = {
  'Books & Study Material': CATEGORY_TAG,
  'Electronics & Gadgets': CATEGORY_TAG,
  'Furniture & Room Essentials': CATEGORY_TAG,
  'Cycles & Transport': CATEGORY_TAG,
  'Appliances': CATEGORY_TAG,
  'Clothing & Misc': CATEGORY_TAG,
};
