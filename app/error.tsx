'use client';

export default function Error({ error }: { error: Error }) {
  console.error("App crashed:", error);
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
    </div>
  );
}
