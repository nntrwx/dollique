import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <span className="footer__brand">Dollique</span>
        <span>Questions and answers for doll customizers</span>
        <nav className="footer__links">
          <Link to="/">Feed</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/users">Users</Link>
        </nav>
        <span className="footer__copy">
          ©
          {' '}
          {new Date().getFullYear()}
          {' '}
          USOF
        </span>
      </div>
    </footer>
  );
}

export default Footer;
