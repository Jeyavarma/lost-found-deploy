'use client';

import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

interface VirtualizedListProps {
  items: any[];
  height: number;
  itemHeight: number;
  renderItem: ({ index, style }: { index: number; style: React.CSSProperties }) => React.ReactNode;
}

const VirtualizedList = memo(({ items, height, itemHeight, renderItem }: VirtualizedListProps) => {
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
    >
      {renderItem}
    </List>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

export default VirtualizedList;