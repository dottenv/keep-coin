/**
 * Фоновые цветные пятна для стеклянных поверхностей (light/dark/ultra).
 * Прозрачные «шары» размыты и плавно дрейфуют — стекло под ними
 * приобретает глубину. Вызывается один раз на уровне всего приложения.
 */
export function GlassBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl animate-float dark:bg-brand-500/20 ultra:bg-emerald-400/35 ultra:blur-[80px]" />
      <div
        className="absolute -bottom-36 -right-20 h-[28rem] w-[28rem] rounded-full bg-brand-300/25 blur-3xl animate-float dark:bg-emerald-400/10 ultra:bg-teal-400/25 ultra:blur-[90px]"
        style={{ animationDelay: '-3.5s' }}
      />
      <div
        className="absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl animate-float dark:bg-sky-500/10 ultra:bg-emerald-300/25 ultra:blur-[80px]"
        style={{ animationDelay: '-1.5s' }}
      />
      <div
        className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl animate-float dark:bg-brand-400/10 ultra:bg-teal-300/25 ultra:blur-[80px]"
        style={{ animationDelay: '-5s' }}
      />
      <div
        className="absolute left-1/5 bottom-1/4 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl animate-float dark:bg-violet-500/[0.08] ultra:bg-emerald-500/20 ultra:blur-[70px]"
        style={{ animationDelay: '-2.2s' }}
      />
    </div>
  )
}
