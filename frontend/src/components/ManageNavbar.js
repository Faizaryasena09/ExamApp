import { NavLink, useParams } from 'react-router-dom';
import styled from 'styled-components';

const NavContainer = styled.nav`
  display: flex;
  gap: 1.5rem; /* Jarak antar link */
  border-bottom: 1px solid #e2e8f0; /* Warna border yang lebih lembut */
  margin-bottom: 1.5rem;
`;

const StyledNavLink = styled(NavLink)`
  padding: 0.75rem 0.25rem;
  text-decoration: none;
  font-weight: 500;
  color: #4a5568; /* Warna teks yang lebih lembut */
  border-bottom: 2px solid transparent; /* Border bawah transparan untuk menjaga layout */
  transition: all 0.2s ease-in-out; /* Transisi halus */

  &:hover {
    color: #2b6cb0;
  }

  &.active {
    color: #2b6cb0;
    font-weight: 600;
    border-bottom-color: #2b6cb0;
  }
`;

export default function SubNavbar() {
  const { id } = useParams();

  return (
    <NavContainer>
      <StyledNavLink to={`/courses/${id}/manage`}>
        Manage
      </StyledNavLink>
      <StyledNavLink to={`/courses/${id}/analytics`}>
        Analytics
      </StyledNavLink>
    </NavContainer>
  );
}