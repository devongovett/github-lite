import { Collection, ListBox, ListBoxItem, ListBoxLoadMoreItem, Text } from 'react-aria-components';
import { Virtualizer, ListLayout } from 'react-aria-components/Virtualizer';
import { ReactNode } from 'react';

export function Spinner() {
  return (
    <div className="flex justify-center items-center h-12">
      <div className="w-5 h-5 border-2 border-daw-gray-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

export function EmptyDetail({text}: {text: string}) {
  return (
    <div className="flex items-center justify-center h-full text-lg text-neutral-700 dark:text-neutral-300 font-semibold">
      {text}
    </div>
  );
}

export interface ListProps<T extends object> {
  'aria-label': string;
  items: T[];
  selectedKeys: Iterable<string | number>;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  children: (item: T) => ReactNode;
}

export function List<T extends object>({
  'aria-label': ariaLabel,
  items,
  selectedKeys,
  isLoading,
  isLoadingMore,
  onLoadMore,
  children
}: ListProps<T>) {
  return (
    <div className="w-[280px] border-r border-daw-gray-300 overflow-hidden shrink-0">
      <Virtualizer layout={ListLayout} layoutOptions={{estimatedRowSize: 56, padding: 8, gap: 4}}>
        <ListBox
          aria-label={ariaLabel}
          selectionMode="single"
          selectionBehavior="replace"
          // @ts-ignore
          linkBehavior="selection"
          selectedKeys={selectedKeys}
          disallowEmptySelection
          className="h-full overflow-auto"
          style={{display: 'block', padding: 0}}
          renderEmptyState={() => isLoading && <Spinner />}>
          <Collection items={items}>
            {children}
          </Collection>
          <ListBoxLoadMoreItem isLoading={isLoadingMore} onLoadMore={onLoadMore}>
            <Spinner />
          </ListBoxLoadMoreItem>
        </ListBox>
      </Virtualizer>
    </div>
  );
}

export interface ListItemProps {
  id: string;
  href: string;
  textValue: string;
  onHoverStart?: () => void;
  icon: ReactNode;
  label: ReactNode;
  description: ReactNode;
}

export function ListItem({id, href, textValue, onHoverStart, icon, label, description}: ListItemProps) {
  return (
    <ListBoxItem
      id={id}
      href={href}
      textValue={textValue}
      className="group grid grid-cols-[auto_1fr] gap-y-0.5 gap-x-3 items-baseline rounded-md cursor-default px-3 py-2 hover:bg-daw-gray-200 selected:bg-daw-gray-900 hover:aria-selected:bg-daw-gray-900 selected:text-daw-white outline-none focus-visible:outline-2 outline-blue-600 outline-offset-2">
      {({isHovered}) => {
        if (isHovered) onHoverStart?.();
        return <>
          <div className="col-start-1">{icon}</div>
          <Text slot="label" className="col-start-2 text-sm font-medium line-clamp-2">{label}</Text>
          <Text slot="description" className="text-xs col-start-2 text-daw-gray-600 group-aria-selected:text-daw-gray-300 truncate">{description}</Text>
        </>;
      }}
    </ListBoxItem>
  );
}
