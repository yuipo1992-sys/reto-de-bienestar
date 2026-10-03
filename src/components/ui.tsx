'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Heart, X, LockKeyhole, CircleCheck, LockKeyholeOpen, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
export function Brand(){return <a href="/" className="brand"><Image className="institutional-logo" src="/logo-institucional.png" alt="COOPEBANACIO R.L." width={211} height={65} priority/><span><strong>Reto de Bienestar</strong><small>SEMANA DEL BIENESTAR</small></span></a>}
export function StateBadge({completed,unlocked}:{completed:boolean;unlocked:boolean}) { const Icon=completed?CircleCheck:unlocked?LockKeyholeOpen:LockKeyhole;return <span className={`badge ${completed?'complete':unlocked?'available':'locked'}`}><Icon size={14}/>{completed?'Completado':unlocked?'Disponible':'Bloqueado'}</span>}
export function Loading(){return <div className="loading" role="status"><LoaderCircle className="spin"/> Cargando tu experiencia…</div>}
export function Notice({children,error=false}:{children:ReactNode;error?:boolean}){return <div className={`notice ${error?'error':''}`} role={error?'alert':'status'}>{children}</div>}
export function Footer(){return <footer><span><Heart size={14}/> Pequeños pasos. Grandes conexiones.</span><a href="/privacidad">Privacidad</a><a href="/admin">Acceso administrativo</a></footer>}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;const previous=document.activeElement as HTMLElement;el?.showModal();const prior=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prior;previous?.focus();};},[]);
 return <dialog ref={ref} className="glass modal" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}}><button className="icon-button close" onClick={onClose} aria-label="Cerrar ventana"><X/></button>{children}</dialog>;
}
