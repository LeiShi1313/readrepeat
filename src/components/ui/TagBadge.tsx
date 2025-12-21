interface TagBadgeProps {
  name: string;
  size?: 'sm' | 'md';
}

export function TagBadge({ name, size = 'sm' }: TagBadgeProps) {
  const sizeClasses =
    size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <span
      className={`inline-block ${sizeClasses} bg-gray-100 text-gray-600 rounded-full`}
    >
      {name}
    </span>
  );
}
