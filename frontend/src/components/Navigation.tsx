"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [['/', 'Network'], ['/order-pooling', 'Order pooling'], ['/recycling', 'Exchange'], ['/warehouses', 'Storage']];
export default function Navigation() {
 const pathname = usePathname();
 return <header className="site-header"><div className="site-nav"><Link href="/" className="brand">SupplyMash<span aria-hidden="true">.</span></Link><nav aria-label="Main navigation">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}</nav><Link className="join-link" href="/register">Register business</Link></div></header>;
}
