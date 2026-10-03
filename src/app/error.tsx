'use client';
export default function Error({reset}:{reset:()=>void}){return <main id="main" className="privacy-page panel"><h1>No pudimos abrir esta página</h1><p>Revisá tu conexión e intentá nuevamente.</p><button className="primary" onClick={reset}>Volver a intentar</button><a href="/" className="secondary">Ir al inicio</a></main>}
