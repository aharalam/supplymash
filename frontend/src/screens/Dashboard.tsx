'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { businessApi, listingsApi, matchesApi, orderPoolsApi } from '../api';
type Listing = { id:string; title:string; businessName:string; quantity:number; unit:string; status:string; type:string; materialCategory:string };
type Match = { id:string; material:string; offeringBusiness:string; requestingBusiness:string; compatibilityScore:number; status:string };
type Pool = { id:string; title:string; supplier:string; status:string; members:unknown[]; location:{city:string} };
function Arrow() { return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>; }
export default function Dashboard() {
 const [data,setData]=useState<{businesses:number;listings:Listing[];matches:Match[];pools:Pool[]}|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState('');
 const load=useCallback(async()=>{
  try { const [b,l,m,p]=await Promise.all([businessApi.list(),listingsApi.list(),matchesApi.list(),orderPoolsApi.list()]); setData({businesses:b.length,listings:l,matches:m,pools:p});setError(''); }
  catch {setError('Unable to connect to the network. Check your connection and retry.');}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function run(){setBusy(true);try{const r=await matchesApi.run();setResult(`${r.matched} new matches found.`);await load();}catch{setError('Matching could not finish. Please try again.');}finally{setBusy(false);}}
 const listings=data?.listings.filter(l=>l.status==='active')??[];
 const pools=data?.pools.filter(p=>['open','forming'].includes(p.status))??[];
 const matches=data?.matches.filter(m=>m.status==='pending')??[];
 return <div className="workspace">
  <header className="workspace-heading"><div><h1>Your Michigan network</h1><p>Buy together. Find a use for surplus. Make room for what’s next.</p></div><Link href="/order-pooling" className="solid-button">Explore order pools<Arrow /></Link></header>
  {error && <div className="network-error" role="alert">{error} <button onClick={()=>void load()}>Retry connection</button></div>}
  <dl className="overview-facts">{[['Businesses',data?.businesses],['Open order pools',data?pools.length:undefined],['Active listings',data?listings.length:undefined],['Matches to review',data?matches.length:undefined]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'—'}</dd></div>)}</dl>
  <div className="overview-columns"><section className="pool-overview"><div className="workspace-section-title"><h2>Buy with your neighbors</h2><Link href="/order-pooling">All pools<Arrow /></Link></div><p className="section-intro">Join an open order and share the delivery cost.</p><div className="pool-directory">{pools.slice(0,3).map(p=><Link className="pool-directory-row" key={p.id} href="/order-pooling"><div><span className="quiet-label">{p.supplier}</span><h3>{p.title}</h3><p>{p.location.city} · {p.members.length} participating businesses</p></div><Arrow /></Link>)}{!pools.length&&<p className="empty-message">{data?'No open pools right now. Create one to bring your next order together.':'Loading order pools…'}</p>}</div></section>
  <aside className="review-panel"><div className="workspace-section-title"><h2>Material connections</h2><span className="count-label">{data?matches.length:'—'}</span></div><p>Compare surplus with what other businesses need.</p>{matches.slice(0,2).map(m=><Link href="/recycling" className="connection" key={m.id}><div><h3>{m.material}</h3><span>{m.compatibilityScore}% fit</span></div><p>{m.offeringBusiness}<br />{m.requestingBusiness}</p></Link>)}{data&&!matches.length&&<p className="empty-message">No pending matches. Run a check to find compatible listings.</p>}<button className="solid-button" onClick={()=>void run()} disabled={busy||!data}>{busy?'Checking listings…':'Find matches'}<Arrow /></button><p className="matching-method">Matches compare material categories and quantities.</p><p role="status" className="action-result">{result}</p></aside></div>
  <section className="available-materials"><div className="workspace-section-title"><div><h2>On the exchange</h2><p className="section-intro">Materials available and requests from the network.</p></div><Link href="/recycling">Browse exchange<Arrow /></Link></div><div className="material-list">{listings.slice(0,5).map(l=><Link className="material-row" href="/recycling" key={l.id}><span className="material-category">{l.materialCategory.replaceAll('_',' ')}</span><div><h3>{l.title}</h3><p>{l.businessName}</p></div><span className="quantity">{l.quantity.toLocaleString()} {l.unit}</span><span className={`listing-status ${l.type==='offering'?'available':'needed'}`}>{l.type==='offering'?'Available':'Requested'}</span><Arrow /></Link>)}{!listings.length&&<p className="empty-message">{data?'No active listings. Add an offering or request in the exchange.':'Loading materials…'}</p>}</div></section>
  <section className="storage-callout"><div><h2>Space for your next move.</h2><p>Find shared storage for materials, inventory, and equipment.</p></div><Link href="/warehouses" className="text-button">Explore storage<Arrow /></Link></section>
 </div>;
}
