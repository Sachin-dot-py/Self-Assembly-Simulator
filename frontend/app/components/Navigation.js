import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

function Navigation() {
  return (
    <>
      <Navbar bg="primary" data-bs-theme="dark">
        <Container>
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
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="/ionic-bonding">Ionic Bonding</Nav.Link>
            <Nav.Link href="/gold-nanoparticles">Gold Nanoparticles</Nav.Link>
            {/* <Nav.Link href="/visualization?visualId=40490db3-9ddc-4978-a7c6-0505e00beb30">Example Visualization</Nav.Link> */}
          </Nav>
        </Container>
      </Navbar>
    </>
  );
}

export default Navigation;