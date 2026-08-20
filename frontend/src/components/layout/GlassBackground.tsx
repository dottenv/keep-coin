/**
 * Фоновые цветные пятна для стеклянных поверхностей (light/dark).
 * Прозрачные «шары» размыты и плавно дрейфуют — стекло под ними
 * приобретает глубину. Вызывается один раз на уровне всего приложения.
 */
export function GlassBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl animate-float dark:bg-brand-500/20" />
      <div
        className="absolute -bottom-36 -right-20 h-[28rem] w-[28rem] rounded-full bg-brand-300/20 blur-3xl animate-float dark:bg-emerald-400/10"
        style={{ animationDelay: '-3.5s' }}
      />
      <div
        className="absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl animate-float dark:bg-sky-500/10"
        style={{ animationDelay: '-1.5s' }}
      />
      <div
        className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl animate-float dark:bg-brand-400/10"
        style={{ animationDelay: '-5s' }}
      />
      <div
        className="absolute left-1/5 bottom-1/4 h-56 w-56 rounded-full bg-violet-300/15 blur-3xl animate-float dark:bg-violet-500/[0.08]"
        style={{ animationDelay: '-2.2s' }}
      />
    </div>
  )
}