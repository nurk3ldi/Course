import { useInView } from '../hooks/useInView'

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ScrollReveal({ children, className = '', id, ...props }: ScrollRevealProps) {
  const { ref, isInView } = useInView()

  return (
    <div
      ref={ref}
      id={id}
      className={`scroll-reveal ${isInView ? 'scroll-reveal--visible' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
