import "./userprofile.css";
import "../../styles.css";
import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../server/firebase.js"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ProductContext } from "../../../Context.jsx";

// Імпорт компонентів
import Orders from "./bar/Orders.jsx";
import Comments from "./bar/Comments.jsx";

// Імпорт Bootstrap та медіа
import Container from "react-bootstrap/Container";
import NoneAvatarImg from "./none_avatar.jpg";

function UserProfile() {
  const navigate = useNavigate();
  const products = useContext(ProductContext);

  // Основні стейти користувача
  const [username, setUsername] = useState("Loading...");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState("orders");
  
  // Стейти для адреси
  const [address, setAddress] = useState("Add delivery address");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressDetails, setAddressDetails] = useState({
    country: "Ukraine",
    region: "",
    city: "",
    street: "",
    house: "",
    apartment: ""
  });

  // Стейти для контактної інформації (виправлено назви під БД)
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactDetails, setContactDetails] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: ""
  });

  // Спостереження за авторизацією та завантаження даних
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();

            // 1. ПІДТЯГУЄМО АДРЕСУ
            if (data.addressDetails) {
              setAddressDetails(data.addressDetails);
              const d = data.addressDetails;
              if (d.city && d.street) {
                setAddress(`${d.city}, ${d.street} ${d.house || ""}`);
              }
            }

            // 2. ПІДТЯГУЄМО КОНТАКТИ (firstName, lastName, phone з вашої БД)
            if (data.contactDetails) {
              const c = data.contactDetails;
              setContactDetails({
                firstName: c.firstName || "",
                lastName: c.lastName || "",
                phone: c.phone || "",
                email: c.email || user.email || ""
              });
              
              // Формуємо ім'я для привітання
              const dbName = `${c.firstName || ""} ${c.lastName || ""}`.trim();
              setUsername(dbName || user.displayName || user.email?.split('@')[0] || "User");
            } else {
              setUsername(user.displayName || user.email?.split('@')[0] || "User");
            }
          }
        } catch (err) {
          console.error("Firestore error:", err);
        }
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Логіка зміни полів
  const handleInputChange = (e, setter) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
  };

  // Збереження адреси
  const handleSaveAddress = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid), {
        addressDetails: addressDetails
      }, { merge: true });
      setAddress(`${addressDetails.city}, ${addressDetails.street} ${addressDetails.house}`);
      setShowAddressModal(false);
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  // Збереження контактів (виправлено ключі)
  const handleSaveContact = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid), {
        contactDetails: {
          firstName: contactDetails.firstName,
          lastName: contactDetails.lastName,
          phone: contactDetails.phone,
          email: contactDetails.email || currentUser.email
        }
      }, { merge: true });
      
      const newName = `${contactDetails.firstName} ${contactDetails.lastName}`.trim();
      if (newName) setUsername(newName);
      
      setShowContactModal(false);
    } catch (error) {
      console.error("Error saving contacts:", error);
    }
  };

  // Розрахунок статистики відгуків
  const userStats = useMemo(() => {
    if (!products || !currentUser) return { count: 0, avg: 0, reviews: [] };
    const myReviews = [];
    products.forEach((product) => {
      if (product.reviews && Array.isArray(product.reviews)) {
        const found = product.reviews
          .filter((r) => r.userId === currentUser.uid)
          .map((r) => ({ 
            ...r, 
            productName: product.tovarName, 
            productId: product.id,
            productImg: product.productImg 
          }));
        myReviews.push(...found);
      }
    });
    const totalRating = myReviews.reduce((sum, r) => sum + Number(r.rating), 0);
    const average = myReviews.length > 0 ? (totalRating / myReviews.length).toFixed(1) : 0;
    return { count: myReviews.length, avg: average, reviews: myReviews };
  }, [products, currentUser]);

  return (
    <Container>
      <div className="profile-wrapper">
        
        {/* Модалка адреси */}
        {showAddressModal && (
          <div className="address-modal-overlay" onClick={() => setShowAddressModal(false)}>
            <div className="address-modal-content wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h3>Delivery Details</h3>
                <button className="close-btn" onClick={() => setShowAddressModal(false)}>×</button>
              </div>
              <div className="modal-body-grid">
                <div className="input-group-full">
                  <label>Country</label>
                  <input name="country" value={addressDetails.country} onChange={(e) => handleInputChange(e, setAddressDetails)} />
                </div>
                <div className="input-group-half">
                  <label>Region</label>
                  <input name="region" value={addressDetails.region} onChange={(e) => handleInputChange(e, setAddressDetails)} />
                </div>
                <div className="input-group-half">
                  <label>City</label>
                  <input name="city" value={addressDetails.city} onChange={(e) => handleInputChange(e, setAddressDetails)} />
                </div>
                <div className="input-group-full">
                  <label>Street</label>
                  <input name="street" value={addressDetails.street} onChange={(e) => handleInputChange(e, setAddressDetails)} />
                </div>
                <div className="input-group-half">
                  <label>House</label>
                  <input name="house" value={addressDetails.house} onChange={(e) => handleInputChange(e, setAddressDetails)} />
                </div>
                <div className="input-group-half">
                  <label>Apartment</label>
                  <input name="apartment" value={addressDetails.apartment} onChange={(e) => handleInputChange(e, setAddressDetails)} />
                </div>
              </div>
              <div className="modal-footer-custom">
                <button className="cancel-btn" onClick={() => setShowAddressModal(false)}>Cancel</button>
                <button className="save-btn-custom" onClick={handleSaveAddress}>Save Details</button>
              </div>
            </div>
          </div>
        )}

        {/* Модалка контактів (Виправлено input name) */}
        {showContactModal && (
          <div className="address-modal-overlay" onClick={() => setShowContactModal(false)}>
            <div className="address-modal-content wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h3>Contact Information</h3>
                <button className="close-btn" onClick={() => setShowContactModal(false)}>×</button>
              </div>
              <div className="modal-body-grid">
                <div className="input-group-full">
                  <label>Phone Number</label>
                  <input name="phone" value={contactDetails.phone} onChange={(e) => handleInputChange(e, setContactDetails)} placeholder="+380..." />
                </div>
                <div className="input-group-half">
                  <label>First Name</label>
                  <input name="firstName" value={contactDetails.firstName} onChange={(e) => handleInputChange(e, setContactDetails)} />
                </div>
                <div className="input-group-half">
                  <label>Last Name</label>
                  <input name="lastName" value={contactDetails.lastName} onChange={(e) => handleInputChange(e, setContactDetails)} />
                </div>
              </div>
              <div className="modal-footer-custom">
                <button className="cancel-btn" onClick={() => setShowContactModal(false)}>Cancel</button>
                <button className="save-btn-custom" onClick={handleSaveContact}>Save Contacts</button>
              </div>
            </div>
          </div>
        )}

        <header className="profile-header">
          <div className="profile-main-info">
            <div className="avatar-container">
              <img src={currentUser?.photoURL || NoneAvatarImg} alt="Profile" className="modern-avatar" />
            </div>
            <div className="user-text-details">
              <h1 className="user-greeting">Hello, {username}</h1>
              <div className="user-meta">
                <span className="meta-item address-trigger" onClick={() => setShowContactModal(true)}>
                  <span className="material-symbols-outlined">phone</span> 
                  {contactDetails.phone || "Add phone number"}
                </span>
                <span className="meta-item address-trigger" onClick={() => setShowAddressModal(true)}>
                  <span className="material-symbols-outlined">location_on</span>
                  <span className="address-text">{address}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="stats-container">
            <div className="stat-card">
              <span className="stat-value">{userStats.count}</span>
              <span className="stat-label">Reviews</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{userStats.avg} ★</span>
              <span className="stat-label">Rating</span>
            </div>
          </div>
        </header>

        <main className="profile-body">
          <nav className="modern-tabs">
            <button className={`tab-btn ${activeSection === "orders" ? "active" : ""}`} onClick={() => setActiveSection("orders")}>
              <span className="material-symbols-outlined">package_2</span> My Orders
            </button>
            <button className={`tab-btn ${activeSection === "comments" ? "active" : ""}`} onClick={() => setActiveSection("comments")}>
              <span className="material-symbols-outlined">chat_bubble</span> My Reviews
            </button>
          </nav>

          <section className="section-content">
            {activeSection === "orders" ? <Orders /> : <Comments reviews={userStats.reviews} />}
          </section>
        </main>
      </div>
    </Container>
  );
}

export default UserProfile;