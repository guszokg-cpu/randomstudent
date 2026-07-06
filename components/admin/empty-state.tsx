export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-amber-50 text-2xl">⭐</div>
      <p className="font-extrabold text-slate-950">{title}</p>
      {detail ? <p className="mt-1 text-sm font-medium text-slate-500">{detail}</p> : null}
    </div>
  );
}
