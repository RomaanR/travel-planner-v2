/** Small country flag. Decorative: the country name is always printed next to it. */
export default function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    // Plain <img>: tiny self-hosted SVGs in /public/flags, no optimisation needed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${code.toLowerCase()}.png`}
      alt=""
      width={20}
      height={14}
      loading="lazy"
      className={`inline-block w-5 h-[14px] object-cover border border-ink/15 shrink-0 ${className}`}
    />
  );
}
