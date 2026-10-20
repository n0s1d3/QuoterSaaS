import type { MouseEventHandler } from 'react'

/** Shared platform identity; business branding is managed separately. */
export default function Brand({ onClick }: { onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return <a className="brand" href="/" aria-label="Quoter · Inicio" onClick={onClick}>
    <img className="brand-symbol" src="/brand/conecta.svg" width="48" height="32" alt="" aria-hidden="true"/>
    <b>Quoter</b>
  </a>
}
