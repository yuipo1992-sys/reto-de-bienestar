import Image from 'next/image';

const artwork = [
  { src: '/mascotas-collage.png', alt: 'Recuerdos de la infancia con mascotas' },
  { src: '/detalle-sorpresa.png', alt: 'Compañeros compartiendo un detalle sorpresa' },
  { src: '/reconocimiento.png', alt: 'Un equipo reconociendo y agradeciendo a una compañera' },
  { src: '/talentos-ocultos.png', alt: 'Compañeros compartiendo sus talentos de pintura y música' },
  { src: '/bingo-humano.png', alt: 'Compañeros conociéndose a través de un bingo humano' },
];

export function ChallengeArt({day, compact=false}:{day:number;compact?:boolean}) {
  const art=artwork[day-1];
  if(!art)return null;
  return <div className={`challenge-art${compact?' compact-art':''}`}><Image src={art.src} alt={compact?'':art.alt} fill sizes={compact?'(max-width: 760px) 100px, 180px':'(max-width: 760px) 140px, 420px'} style={{objectFit:'contain'}}/></div>;
}
