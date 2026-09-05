import type { ReactNode } from 'react'

type Props = {
  hero: ReactNode
  headline: string
  eyebrow?: string
  body?: string
  children?: ReactNode
  variant?: 'default' | 'manifesto'
}

export function Slide({
  hero,
  headline,
  eyebrow,
  body,
  children,
  variant = 'default',
}: Props) {
  return (
    <section className={`slide slide--${variant}`}>
      <div className="slide__hero">{hero}</div>
      <div className="slide__text">
        <h1 className="slide__headline">{headline}</h1>
        {eyebrow && <p className="slide__eyebrow">{eyebrow}</p>}
        {body && <p className="slide__body">{body}</p>}
        {children}
      </div>
    </section>
  )
}
