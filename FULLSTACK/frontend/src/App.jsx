import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// --- COMPONENT IMPORTS ---
import Footer from "./components/footer/Footer.jsx";
import Header from "./components/header/Header.jsx";
import Card from "./components/card/Card.jsx";
import LkeCard from "./components/card/LkeCard.jsx";
import Error from "./components/pages/error/Error-page.jsx";
import Login from "./components/pages/log-in/Log-in.jsx";
import Register from "./components/pages/log-in/register/Register.jsx";
import Forgot from "./components/pages/log-in/forgot-password/ForgotPass.jsx";
import Bagcard from "./components/pages/bag/Bag-card.jsx";
import Checkout from "./components/pages/checkout/Checkout.jsx";
import Help from "./components/pages/Help/Help.jsx";
import Product from "./components/pages/product/Product.jsx";
import Profile from "./components/pages/UserProfile/UserProfile.jsx";
import Bottom from "./components/HeaderBottom.jsx";
import Map from "./components/stores-map/Map.jsx";
import SearchPage from "./components/pages/SearchResults.jsx";

// --- ADMIN PANEL IMPORTS ---
import Addproduct from "./components/pages/admin/Addproduct.jsx";
import Admin from "./components/pages/admin/Admin.jsx";
import Orders from "./components/pages/admin/Orders.jsx";
import Consumers from "./components/pages/admin/Consumers.jsx";
import Products from "./components/pages/admin/Products.jsx";

/**
 * ScrollToTop Component
 * Ensures that whenever the user navigates to a new route, 
 * the window scrolls back to the top of the page.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]); // Triggers every time the URL path changes

  return null;
};

function App() {
  return (
    <>
      {/* Utility to reset scroll position on navigation */}
      <ScrollToTop />
      
      <Routes>
        {/* --- HELP / AI CHAT PAGE --- */}
        <Route
          path="/help"
          element={
            <>
              <Header />
              <Help />
            </>
          }
        />

        {/* --- HOME PAGE --- */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <Bottom />
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", padding: "10px" }}>
                <div>
                  <h1 style={{ width: "185vh", display: "flex", textAlign: "center", marginBottom: "20px", justifyContent: "center" }}>
                    New positions
                  </h1>
                </div>
                <Card style={{ padding: "10px" }} />
              </div>
              <Footer />
            </>
          }
        />

        {/* --- FAVORITES / WISHLIST PAGE --- */}
        <Route
          path="/favorites"
          element={
            <>
              <Header />
              <Bottom />
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", padding: "10px" }}>
                <h1 style={{ width: "185vh", display: "flex", textAlign: "center", marginBottom: "20px", justifyContent: "center" }}>
                  Your Favorites
                </h1>
                <LkeCard style={{ padding: "10px" }} />
              </div>
              <Footer />
            </>
          }
        />

        {/* --- CHECKOUT FLOW --- */}
        <Route
          path="/checkout"
          element={
            <>
              <Header />
              <Bottom />
              <Checkout />
              <Footer />
            </>
          }
        />

        {/* --- SEARCH RESULTS PAGE --- */}
        <Route
          path="/search"
          element={
            <>
              <Header />
              <Bottom />
              <SearchPage />
              <Footer />
            </>
          }
        />

        {/* --- STORE LOCATOR (MAPBOX) --- */}
        <Route
          path="/find-a-store"
          element={
            <>
              <Header />
              <Map />
            </>
          }
        />

        {/* --- USER PROFILE & SETTINGS --- */}
        <Route
          path="/profile"
          element={
            <>
              <Header />
              <Bottom />
              <Profile />
              <Footer />
            </>
          }
        />

        {/* --- AUTHENTICATION ROUTES --- 
            Note: These usually omit the global Header/Footer for a cleaner login UI
        */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<Forgot />} />

        {/* --- ADMIN DASHBOARD ROUTES --- */}
        <Route path="/admin-page" element={<Admin />} />
        <Route path="/admin-page/products" element={<Products />} />
        <Route path="/admin-page/add-product" element={<Addproduct />} />
        <Route path="/admin-page/orders" element={<Orders />} />
        <Route path="/admin-page/users" element={<Consumers />} />

        {/* --- SHOPPING BAG PAGE --- */}
        <Route
          path="/shopping_bag"
          element={
            <>
              <Header />
              <Bottom />
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", padding: "10px" }}>
                <div>
                  <h1 style={{ display: "flex", textAlign: "center", marginBottom: "20px", justifyContent: "center" }}>
                    Your Shopping Bag
                  </h1>
                  <Bagcard />
                </div>
              </div>
              <Bottom />
              <Footer />
            </>
          }
        />

        {/* --- INDIVIDUAL PRODUCT DETAILS PAGE --- 
            Uses URL parameters ( :id ) to fetch specific product data
        */}
        <Route
          path="/product/:id"
          element={
            <>
              <Header />
              <Product />
              <Footer />
            </>
          }
        />

        {/* --- 404 NOT FOUND --- 
            The asterisk (*) acts as a catch-all for any undefined URLs
        */}
        <Route path="*" element={<Error />} />
      </Routes>
    </>
  );
}

export default App;