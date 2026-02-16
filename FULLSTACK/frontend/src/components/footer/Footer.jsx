import "./footer.css"
import "../styles.css";

import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";

function Footer() {
 return (
<Container>
    <div className="main1">
    <div className="footer">
      
        <div>
          <div className="container1"> <Link to="/store" className="nav-link Link">Privacy & Terms</Link></div>
          <div className="container1"><Link to="/store" className="nav-link Link">Find a Store</Link></div>
          <div className="container1"><Link to="/help" className="nav-link Link">Help</Link></div>
          <div className="container1"><Link to="https://www.instagram.com/nike/" className="nav-link Link">Join Us</Link></div>
          <div className="container1"><Link to="/Login" className="nav-link Link">Sign In</Link></div>
        </div>

        <p style={{ paddingBottom: '20px', paddingTop: '30px', fontSize: '14px' }}>
            © 2024 Nike, Inc. All Rights Reserved
        </p>
</div>
</div>
</Container>
 );
};

export default Footer;