'use client';
import Script from 'next/script';
import { useCallback, useEffect, useRef } from 'react';
declare global { interface Window { turnstile?: {render:(element:HTMLElement,options:Record<string,unknown>)=>string; remove:(id:string)=>void} } }
export function Captcha({onToken}:{onToken:(token:string)=>void}) {
 const target=useRef<HTMLDivElement>(null),widget=useRef<string|undefined>(undefined);
 const sitekey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 const render=useCallback(()=>{if(sitekey&&target.current&&window.turnstile&&widget.current===undefined) widget.current=window.turnstile.render(target.current,{sitekey,callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')});},[sitekey,onToken]);
 useEffect(()=>{render();return()=>{if(widget.current&&window.turnstile){window.turnstile.remove(widget.current);widget.current=undefined;}}},[render]);
 if(!sitekey)return null;
 return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render}/><div ref={target}/></>;
}
