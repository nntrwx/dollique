import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Footer from './Footer';
import Header from './Header';

// Which dotted drawings peek out from behind the glass on this page.
function glowFor(pathname) {
  if (/^\/(login|register|password-reset|confirm-email)/.test(pathname)) return 'auth';
  if (pathname.startsWith('/users/')) return 'profile';
  if (pathname.startsWith('/posts/')) return 'post';
  return 'feed';
}

// SVG filters that make clean shapes look drawn by hand (buttons, circles, lace lines).
function HandDrawnFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="wobble" x="-10%" y="-40%" width="120%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="2" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" />
      </filter>
      <filter id="wobble2" x="-10%" y="-40%" width="120%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4" />
      </filter>
    </svg>
  );
}

function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="layout">
      <HandDrawnFilters />
      <div className={`glow glow--${glowFor(pathname)}`} aria-hidden="true">
        <i className="g-flourish" />
        <i className="g-bunny" />
        <i className="g-wings" />
        <i className="g-bow" />
        <i className="g-hearts" />
      </div>
      <Header />
      <main className="layout__main">
        {/* a page opened for the first time is still loading: keep the header and footer meanwhile */}
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
