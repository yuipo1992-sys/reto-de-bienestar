import { notFound } from 'next/navigation';
import AdminApp from '@/components/admin-app';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['desbloqueo','reportes','retos','participantes'].includes(section))notFound();return <AdminApp section={section}/>}
