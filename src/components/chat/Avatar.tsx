type AvatarProps = {
  name: string;
  photo: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function Avatar({ name, photo, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`${SIZES[size]} shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center font-medium text-slate-300`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
