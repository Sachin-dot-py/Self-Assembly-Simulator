import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

function Navigation() {
  return (
    <>
      <Navbar bg="primary" data-bs-theme="dark">
        <Container>
          <Navbar.Brand href="/">Materials Marvels</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="/ketcher">Ionic Bonding</Nav.Link>
            <Nav.Link href="/visualization?visualId=13">Visualization</Nav.Link>
            <Nav.Link href="/example">Example 1</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
}

export default Navigation;