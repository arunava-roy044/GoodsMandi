// Example products shown on the home page so it never looks empty.
// They are always labelled "Example" and never link to a real listing page.
// Remove or trim this list once there are enough real listings.

export type SampleListing = {
  id: string;
  title: string;
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
      title: 'Engineering Mathematics by B.S. Grewal',
      asking_price: 350,
      category: 'Books & Study Material',
      product_age: '1 year',
      photos: [],
      created_at: hoursAgo(3),
      seller: seller('Aarav S.', 4.8),
    },
    {
      id: 'sample-2',
      title: 'Hero Sprint 26T cycle, gears work fine',
      asking_price: 4200,
      category: 'Cycles & Transport',
      product_age: '2 years',
      photos: [],
      created_at: hoursAgo(9),
      seller: seller('Priya K.', 4.6),
    },
    {
      id: 'sample-3',
      title: 'Casio fx-991ES Plus scientific calculator',
      asking_price: 600,
      category: 'Electronics & Gadgets',
      product_age: '6 months',
      photos: [],
      created_at: hoursAgo(20),
      seller: seller('Rohan M.', 0),
    },
    {
      id: 'sample-4',
      title: 'Study table with drawer',
      asking_price: 1500,
      category: 'Furniture & Room Essentials',
      product_age: '1 year',
      photos: [],
      created_at: hoursAgo(30),
      seller: seller('Sneha T.', 4.9),
    },
    {
      id: 'sample-5',
      title: 'Electric kettle, 1.5 L',
      asking_price: 450,
      category: 'Appliances',
      product_age: '8 months',
      photos: [],
      created_at: hoursAgo(44),
      seller: seller('Kabir J.', 4.5),
    },
    {
      id: 'sample-6',
      title: 'Lab coat, size M, worn twice',
      asking_price: 200,
      category: 'Clothing & Misc',
      product_age: '3 months',
      photos: [],
      created_at: hoursAgo(60),
      seller: seller('Ananya R.', 0),
    },
    {
      id: 'sample-7',
      title: 'Logitech wireless mouse and keyboard',
      asking_price: 900,
      category: 'Electronics & Gadgets',
      product_age: '1 year',
      photos: [],
      created_at: hoursAgo(75),
      seller: seller('Dev P.', 4.7),
    },
    {
      id: 'sample-8',
      title: 'Data Structures notes, 2nd semester',
      asking_price: 150,
      category: 'Books & Study Material',
      product_age: '1 year',
      photos: [],
      created_at: hoursAgo(96),
      seller: seller('Ishita G.', 5),
    },
  ];
}
