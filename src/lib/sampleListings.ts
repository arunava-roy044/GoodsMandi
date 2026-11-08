// Example products shown on the home page so it never looks empty.
// Photos are public-domain stock images in public/samples (see SOURCES.md).
// They are always labelled "Example" and never link to a real listing page.
// Remove or trim this list once there are enough real listings.

export type SampleListing = {
  id: string;
  title: string;
  description?: string;
  asking_price: number;
  category: string;
  product_age: string;
  photos: string[];
  created_at: string;
  seller: { id: string; name: string; profile_photo_url: string; rating_avg: number };
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const seller = (name: string, rating: number) => ({
  id: `sample-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  profile_photo_url: '',
  rating_avg: rating,
});

export function getSampleListings(): SampleListing[] {
  return [
    {
      id: 'sample-1',
      title: 'Programming and Web textbooks, set of 3',
      description: 'No highlighting, all pages intact. Selling together only.',
      asking_price: 650,
      category: 'Books & Study Material',
      product_age: '1 year',
      photos: ['/samples/textbooks.jpg'],
      created_at: hoursAgo(3),
      seller: seller('Aarav S.', 4.8),
    },
    {
      id: 'sample-2',
      title: 'Red city cycle, smooth ride, new tyres',
      description: 'Tyres changed last month. Comes with a lock. Can meet at the main gate.',
      asking_price: 4200,
      category: 'Cycles & Transport',
      product_age: '2 years',
      photos: ['/samples/cycle.jpg'],
      created_at: hoursAgo(9),
      seller: seller('Priya K.', 4.6),
    },
    {
      id: 'sample-3',
      title: 'Casio fx-991ES Plus scientific calculator',
      description: 'Works perfectly, allowed in exams. Cover included.',
      asking_price: 600,
      category: 'Electronics & Gadgets',
      product_age: '6 months',
      photos: ['/samples/calculator.jpg'],
      created_at: hoursAgo(20),
      seller: seller('Rohan M.', 0),
    },
    {
      id: 'sample-4',
      title: 'Adjustable study lamp',
      asking_price: 400,
      category: 'Furniture & Room Essentials',
      product_age: '1 year',
      photos: ['/samples/desk-lamp.jpg'],
      created_at: hoursAgo(30),
      seller: seller('Sneha T.', 4.9),
    },
    {
      id: 'sample-5',
      title: 'College backpack, barely used',
      description: 'Fits a 15 inch laptop. Used for one semester.',
      asking_price: 550,
      category: 'Clothing & Misc',
      product_age: '4 months',
      photos: ['/samples/backpack.jpg'],
      created_at: hoursAgo(44),
      seller: seller('Ananya R.', 0),
    },
    {
      id: 'sample-6',
      title: 'Keyboard and mouse combo',
      asking_price: 900,
      category: 'Electronics & Gadgets',
      product_age: '1 year',
      photos: ['/samples/keyboard-mouse.jpg'],
      created_at: hoursAgo(60),
      seller: seller('Dev P.', 4.7),
    },
    {
      id: 'sample-7',
      title: 'Data Structures notes, 2nd semester',
      description: 'Handwritten, covers the full syllabus with solved PYQs.',
      asking_price: 150,
      category: 'Books & Study Material',
      product_age: '1 year',
      photos: ['/samples/notes.jpg'],
      created_at: hoursAgo(75),
      seller: seller('Ishita G.', 5),
    },
    {
      id: 'sample-8',
      title: 'Koss Porta Pro headphones',
      asking_price: 1800,
      category: 'Electronics & Gadgets',
      product_age: '8 months',
      photos: ['/samples/headphones.jpg'],
      created_at: hoursAgo(96),
      seller: seller('Kabir J.', 4.5),
    },
  ];
}
