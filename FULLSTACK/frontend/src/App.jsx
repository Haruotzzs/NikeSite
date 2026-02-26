import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

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


import Addproduct from "./components/pages/admin/Addproduct.jsx";
import Admin from "./components/pages/admin/Admin.jsx";
import Orders from "./components/pages/admin/Orders.jsx";
import Consumers from "./components/pages/admin/Consumers.jsx";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <>
      <ScrollToTop />
      
      <Routes>
        {/* Help (ai) */}
        <Route
          path="/help"
          element={
            <>
              <Header />
              <Help />
              <Footer />
            </>
          }
        />

        {/* main page */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <Bottom />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  padding: "10px",
                }}
              >
                <div>
                  <h1
                    style={{
                      width: "185vh",
                      display: "flex",
                      textAlign: "center",
                      marginBottom: "20px",
                      justifyContent: "center",
                    }}
                  >
                    {" "}
                    New positions{" "}
                  </h1>
                </div>
                <Card style={{ padding: "10px" }} />
              </div>
              <Footer />
            </>
          }
        />

        {/* Favorites page */}
        <Route
          path="/favorites"
          element={
            <>
              <Header />
              <Bottom />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  padding: "10px",
                }}
              >
                <h1
                  style={{
                    width: "185vh",
                    display: "flex",
                    textAlign: "center",
                    marginBottom: "20px",
                    justifyContent: "center",
                  }}
                >
                  {" "}
                  Your Favorites
                </h1>
                <LkeCard style={{ padding: "10px" }} />
              </div>
              <Footer />
            </>
          }
        />

        {/* checkout */}
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


        {/* search */}
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

        <Route
          path="/find-a-store"
          element={
            <>
              <Header />
              <Map />
              
            </>
          }
        />

        {/* profile */}
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

        {/* autorithation */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<Forgot />} />



        {/* admin page */}
        <Route path="/admin-page" element={<Admin />} />
        <Route path="/admin-page/add-product" element={<Addproduct />} />
        <Route path="/admin-page/orders" element={<Orders />} />
        <Route path="/admin-page/users" element={<Consumers />} />





        {/* bag */}
        <Route
          path="/shopping_bag"
          element={
            <>
              <Header />
              <Bottom />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  padding: "10px",
                }}
              >
                <div>
                  <h1
                    style={{
                      display: "flex",
                      textAlign: "center",
                      marginBottom: "20px",
                      justifyContent: "center",
                    }}
                  >
                    {" "}
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

        {/* products page */}
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

        {/* 404 error */}
        <Route path="*" element={<Error />} />
      </Routes>
    </>
  );
}

export default App;