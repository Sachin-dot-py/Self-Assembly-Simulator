import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { FaHome, FaAtom, FaFlask, FaMarker } from 'react-icons/fa'; // Importing icons from react-icons

function Navigation() {
  return (
    <>
      <Navbar bg="primary" data-bs-theme="dark">
        <Container>
        <Navbar.Brand href="/">
            <img
                alt=""
                src="/static/ucsdlogo.png"
                width="60"
                height="30"
                className="d-inline-block align-top"
              />{' '}
          </Navbar.Brand>
          <Navbar.Brand href="/">
            <img
                alt=""
                src="/static/Logo_Transparent.png"
                width="30"
                height="30"
                className="d-inline-block align-top"
              />{' '}
              Materials Marvels
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="/" style={{ display: 'flex', alignItems: 'center' }}><FaHome style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Home</Nav.Link>
            <Nav.Link href="/ionic-bonding" style={{ display: 'flex', alignItems: 'center' }}><FaAtom style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Ionic Bonding</Nav.Link>
            <Nav.Link href="/gold-nanoparticles" style={{ display: 'flex', alignItems: 'center' }}><FaFlask style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Gold Nanoparticles</Nav.Link>
            <Nav.Link href="/feedback" style={{ display: 'flex', alignItems: 'center' }}><FaMarker style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Submit Feedback</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
}

export default Navigation;
