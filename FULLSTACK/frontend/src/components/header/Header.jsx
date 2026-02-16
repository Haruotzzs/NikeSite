import "./header.css";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";

import logo from "./img/nike_logo.svg";

function Header() {
  const [activeSection, setActiveSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSectionClick = (section) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setActiveSection(null);
  };

  const handleMenu = (e) => {
    if (e) e.preventDefault();
    setIsMenuOpen((prev) => {
      const newState = !prev;
      document.body.style.overflow = newState ? "hidden" : "auto";
      return newState;
    });
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = "auto";
  };

  return (
    <Container>
      <div className={`side-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="menu-header">
           <span className="material-symbols-outlined close-btn" onClick={handleMenu}>
             close
           </span>
        </div>
        
        <nav className="menu-content">
          <Link to="/" className="menu-link" onClick={closeMenu}>New</Link>
          <Link to="/men" className="menu-link" onClick={closeMenu}>Men</Link>
          <Link to="/women" className="menu-link" onClick={closeMenu}>Women</Link>
          <Link to="/kids" className="menu-link" onClick={closeMenu}>Kids</Link>
          <Link to="/jordan" className="menu-link" onClick={closeMenu}>Jordan</Link>
          <Link to="/sport" className="menu-link" onClick={closeMenu}>Sport</Link>
        </nav>
      </div>

      {/* Оверлей (затемнення фону при відкритті) */}
      {isMenuOpen && <div className="menu-overlay" onClick={handleMenu}></div>}

      {/* --- ОСНОВНА НАВІГАЦІЯ --- */}
      <div className="main">
        <div className="overNav">
          <Link to="/find-a-store" className="nav-link">Find a Store</Link>
          <Link to="/help" className="nav-link">Help</Link>
          <Link to="/join" className="nav-link">Join Us</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
        </div>

        <div className="navigation">
          <Link to="/">
            <img src={logo} alt="Logo" className="logo" />
          </Link>
        
          {/* На десктопі посилання зазвичай залишають у центрі, 
              тому я залишив порожній контейнер для вашого CSS */}
          <span className="fonts">
            {/* На десктопі вони тут, на мобілці - в side-menu */}
          </span>
          
          <div className="icons">
            <div className="searchbar">
              <span
                className="material-symbols-outlined search-icon"
                onClick={() => handleSectionClick("search")}
              >
                search
              </span>

              {activeSection === "search" && (
                <form onSubmit={handleSearch}>
                  <input
                    id="searchbar"
                    type="text"
                    placeholder="Search..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </form>
              )}
            </div>

            <Link className="noneLink" to="/favorites">
              <span className="material-symbols-outlined nav-link">favorite</span>
            </Link>
            <Link className="noneLink" to="/shopping_bag">
              <span className="material-symbols-outlined nav-link">shopping_bag</span>
            </Link>
            
            <span 
              onClick={handleMenu} 
              className="material-symbols-outlined nav-link noneLink"
            >
              menu
            </span>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default Header;