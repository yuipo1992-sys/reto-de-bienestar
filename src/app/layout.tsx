import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Reto de Bienestar | COOPEBANACIO R.L.',description:'Cinco días para conectar, compartir y sumar bienestar con tus compañeros.',icons:{icon:'/favicon.svg'},robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-CR"><body><a href="#main" className="skip-link">Saltar al contenido</a>{children}</body></html>}
