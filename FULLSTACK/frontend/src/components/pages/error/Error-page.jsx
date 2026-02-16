import "./error-page.css";
import "../../styles.css";

import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";


function Error() {
  return (
<Container>
  <div className="error-page">
    <h1>Sorry, we can't load this page due to some issues</h1>
    <p>Please try again later or go back to the <Link to="/">homepage</Link>.</p>
  </div>
</Container>

  );
}

export default Error;