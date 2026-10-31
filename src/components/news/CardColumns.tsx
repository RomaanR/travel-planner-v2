import { Children, type ReactNode } from "react";

/**
 * Two independent columns on wide screens, one list on phones.
 *
 * A CSS grid shares one height per row, so expanding a card leaves a gap under its neighbour.
 * Here items alternate between two columns (1, 3, 5 | 2, 4, 6), so a card only ever pushes the
 * cards below it. On small screens the column wrappers use `display: contents` and each item
 * keeps its original position through `order`, so reading order is unchanged.
 */
export default function CardColumns({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const cols: ReactNode[][] = [[], []];
  items.forEach((item, i) => {
    cols[i % 2].push(
      <div key={i} style={{ order: i }} className="md:!order-none min-w-0">
        {item}
      </div>,
    );
  });

  return (
    <div className="flex flex-col md:flex-row md:items-start gap-4">
      {cols.map((col, c) => (
        <div key={c} className="contents md:flex md:flex-col md:flex-1 md:min-w-0 md:gap-4">
          {col}
        </div>
      ))}
    </div>
  );
}
