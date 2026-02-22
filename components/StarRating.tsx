'use client'

interface Props {
  value: number
  max?: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
  readonly?: boolean
}

export default function StarRating({ value, max = 5, onChange, size = 'md', readonly = false }: Props) {
  const sz = size === 'sm' ? 'text-base' : 'text-xl'

  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${sz} leading-none transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${star <= value ? 'text-amber-400' : 'text-slate-200'}`}
          aria-label={`${star}점`}
        >
          ★
        </button>
      ))}
    </span>
  )
}
