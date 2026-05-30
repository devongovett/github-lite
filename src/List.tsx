import { Collection, ListBox, ListBoxItem, ListBoxLoadMoreItem, Text } from 'react-aria-components';
import { Virtualizer, ListLayout } from 'react-aria-components/Virtualizer';
import { ReactNode } from 'react';

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
  hasMore?: boolean;
  onLoadMore: () => void;
  children: (item: T) => ReactNode;
  header?: ReactNode;
}

export function List<T extends object>({
  'aria-label': ariaLabel,
  items,
  selectedKeys,
  isLoading,
  isLoadingMore,
  hasMore = true,
  onLoadMore,
  children,
  header
}: ListProps<T>) {
  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-daw-white rounded-xl shadow-card my-2">
      {header}
      <div className="flex-1 overflow-hidden">
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
            renderEmptyState={() => isLoading && (
              <div className="flex justify-center items-center h-full">
                <div className="w-5 h-5 border-2 border-daw-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}>
            <Collection items={items}>
              {children}
            </Collection>
            {!isLoading && hasMore && (
              <ListBoxLoadMoreItem isLoading={isLoadingMore} onLoadMore={onLoadMore}>
                <div className="flex justify-center items-center h-12">
                  <div className="w-5 h-5 border-2 border-daw-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              </ListBoxLoadMoreItem>
            )}
          </ListBox>
        </Virtualizer>
      </div>
    </div>
  );
}

export interface ListItemProps {
  id: string;
  href: string;
  textValue: string;
  onHoverStart?: () => void;
  icon?: ReactNode;
  label: ReactNode;
  description: ReactNode;
  trailingIcon?: ReactNode;
}

export function ListItem({id, href, textValue, onHoverStart, icon, label, description, trailingIcon}: ListItemProps) {
  return (
    <ListBoxItem
      id={id}
      href={href}
      textValue={textValue}
      onHoverStart={onHoverStart}
      style={{
        gridTemplateColumns: [icon ? 'auto' : null, '1fr', trailingIcon ? 'auto' : null].filter(Boolean).join(' ')
      }}
      className={`group grid gap-y-0.5 gap-x-3 items-baseline rounded-md cursor-default px-3 py-2 hover:bg-daw-gray-200 selected:bg-daw-gray-900 hover:aria-selected:bg-daw-gray-900 selected:text-daw-white outline-none focus-visible:outline-2 outline-blue-600 outline-offset-2`}>
      {icon && <div className="col-start-1">{icon}</div>}
      <Text slot="label" style={{gridColumnStart: icon ? 2 : 1}} className="col-start-2 col-span-2 text-sm font-medium line-clamp-2">{label}</Text>
      <Text slot="description" style={{gridColumnStart: icon ? 2 : 1}} className="self-center text-xs text-daw-gray-600 group-aria-selected:text-daw-gray-300 truncate">{description}</Text>
      {trailingIcon != null && <div style={{gridColumnStart: icon ? 3 : 2}} className="row-start-2 self-center">{trailingIcon}</div>}
    </ListBoxItem>
  );
}
