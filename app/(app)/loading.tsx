export default function Loading() {
  return (
    <div className="p-6" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded-md bg-stone-200" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200/70" />
        ))}
      </div>
    </div>
  );
}
