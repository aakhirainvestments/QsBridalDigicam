// "Qudsiyyah's Fairy Garden Bridal Shower" -> big script first word, spaced caps for the rest
export default function EventTitle({ name, size = 'lg' }: { name: string; size?: 'lg' | 'sm' }) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const big = size === 'lg';
  return (
    <h1 className="text-center">
      <span className={`block font-script leading-none ${big ? 'text-7xl' : 'text-5xl'}`}>{first}</span>
      {rest.length > 0 && (
        <span
          className={`block font-sans font-light uppercase tracking-[0.25em] mt-2 ${
            big ? 'text-sm' : 'text-[10px]'
          }`}
        >
          {rest.join(' ')}
        </span>
      )}
    </h1>
  );
}
