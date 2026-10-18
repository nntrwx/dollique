import { Link } from 'react-router-dom';

import { HeaderLace } from './Lace';

function Footer() {
  return (
    <footer className="footer">
      <HeaderLace />
      <div className="footer__inner">
        <Link to="/" className="footer__brand" aria-label="Dollique, go to the feed">
          <img src="/logo.svg" alt="Dollique" />
        </Link>
        <span>Questions and answers for doll people</span>
        <nav className="footer__links">
          <Link to="/">Feed</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/users">Users</Link>
        </nav>
        <span className="footer__copy">
          {`© ${new Date().getFullYear()} Dollique · USOF`}
        </span>
      </div>
    </footer>
  );
}

export default Footer;
