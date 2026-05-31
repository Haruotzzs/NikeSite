import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
// --- FIREBASE & CONTEXT IMPORTS ---
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { ProductContext } from "../../../Context.jsx"; // Додано контекст товарів
import "./checkout.css";
import "../../styles.css";

function Checkout() {
  const navigate = useNavigate();

  // Підключаємо глобальний каталог товарів
  const contextData = useContext(ProductContext);
  const allProducts = contextData?.products || [];

  // --- STATE MANAGEMENT ---
  const [bagElements, setBagElements] = useState([]); // Сирі дані з Firestore (id, size, count)
  const [enrichedBagElements, setEnrichedBagElements] = useState([]); // Збагачені дані з цінами та знижками
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // UI Feedback States
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState("");

  // Logic & Validation States
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [hasContactInfo, setHasContactInfo] = useState(false);
  const [hasAddressInfo, setHasAddressInfo] = useState(false);
  const [contactErrors, setContactErrors] = useState({});

  // Form Data (Pre-filled from profile or manual entry)
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    country: "Ukraine", city: "", region: "",
    street: "", house: "", apartment: "", postalCode: ""
  });

  // --- FORM VALIDATION HELPER ---
  const validateData = (data) => {
    const errors = {};
    if (!data.firstName || data.firstName.trim() === "") errors.firstName = "Required";
    if (!data.lastName || data.lastName.trim() === "") errors.lastName = "Required";
    if (!data.phone || data.phone.trim() === "") errors.phone = "Required";
    return errors;
  };

  // --- AUTH & DATA SYNC EFFECT ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // Слухаємо документ користувача для завантаження кошика та збережених даних
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBagElements(data.bagElements || []);
          
          // Контактні дані
          if (data.contactDetails) {
            const errors = validateData(data.contactDetails);
            const isValid = Object.keys(errors).length === 0;
            setHasContactInfo(isValid);
            setFormData(prev => ({
              ...prev,
              ...data.contactDetails,
              email: user.email || prev.email
            }));
            if (!isValid) setContactErrors(errors);
          }
          
          // Адреса доставки
          if (data.addressDetails) {
            const isAddrValid = data.addressDetails.city?.trim() && data.addressDetails.street?.trim();
            setHasAddressInfo(!!isAddrValid);
            setFormData(prev => ({
              ...prev,
              ...data.addressDetails
            }));
          }
        }
        setLoading(false);
      });
      return () => unsubscribeFirestore();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // --- DATA ENRICHMENT LOGIC ---
  // Поєднуємо ID з кошика користувача з повними об'єктами товарів із контексту
  useEffect(() => {
    const enriched = bagElements.map((bagItem) => {
      const fullProduct = allProducts.find(
        (p) => p._id === bagItem.id || p.id === bagItem.id
      );
      return {
        ...bagItem,
        ...fullProduct,
      };
    });
    setEnrichedBagElements(enriched);
  }, [bagElements, allProducts]);

  // --- INPUT HANDLER ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (contactErrors[name]) {
      setContactErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // --- CALCULATIONS ---
  const calculateSubtotal = () => {
    return enrichedBagElements.reduce((total, item) => {
      const price = Number(item.tovarPrice || item.price || 0);
      const quantity = item.bagProductCount || 1;
      return total + (price * quantity);
    }, 0).toFixed(2);
  };

  const calculateTotal = () => {
    return enrichedBagElements.reduce((total, item) => {
      const price = Number(item.tovarPrice || item.price || 0);
      const quantity = item.bagProductCount || 1;
      const discount = Number(item.discount || 0);

      const discountedPrice = price - (price * discount / 100);
      return total + (discountedPrice * quantity);
    }, 0).toFixed(2);
  };

  // --- UI FEEDBACK HANDLER ---
  const triggerSuccess = (text, redirect = false) => {
    setSuccessText(text);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if (redirect) navigate("/profile");
    }, 3000);
  };

  // --- PERSISTENCE: SAVING TO PROFILE ---
  const setContactToProfile = async () => {
    if (!currentUser) return;
    const errors = validateData(formData);
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }
    try {
      await setDoc(doc(db, "users", currentUser.uid),
        { contactDetails: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
            email: formData.email
        }}, { merge: true }
      );
      setHasContactInfo(true);
      triggerSuccess("Profile contact info updated!");
    } catch (error) {
      console.error("Error saving contact:", error);
    }
  };

  const setAddressToProfile = async () => {
    if (!currentUser) return;
    if (!formData.city?.trim() || !formData.street?.trim()) {
      alert("Please fill in City and Street");
      return;
    }
    await setDoc(doc(db, "users", currentUser.uid),
      { addressDetails: {
          ...formData,
          city: formData.city.trim(),
          street: formData.street.trim()
      }}, { merge: true }
    );
    setHasAddressInfo(true);
    triggerSuccess("Profile address updated!");
  };

  // --- THE FINAL TRANSACTION ---
  const handleConfirmOrder = async () => {
    const errors = validateData(formData);
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      alert("Please fill in your contact information");
      return;
    }
    if (!formData.city?.trim() || !formData.street?.trim()) {
      alert("Please provide a shipping address");
      return;
    }
    if (enrichedBagElements.length === 0) {
      alert("Your bag is empty");
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        userId: currentUser.uid,
        items: enrichedBagElements, // Зберігаємо повні дані (з цінами на момент покупки)
        total: calculateTotal(),
        contactDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email
        },
        shippingAddress: {
          city: formData.city,
          region: formData.region,
          street: formData.street,
          house: formData.house,
          country: formData.country
        },
        paymentMethod: paymentMethod,
        status: "Processing", 
        createdAt: serverTimestamp() 
      };

      // 1. Додаємо замовлення в глобальну колекцію orders
      await addDoc(collection(db, "orders"), orderData);

      // 2. Очищаємо кошик користувача у його документі користувача
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { bagElements: [] }, { merge: true });

      triggerSuccess("Order placed successfully! Redirecting to profile...", true);
    } catch (error) {
      console.error("Critical Order Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- GOOGLE PAY INTEGRATION ---
  const handleGooglePay = async () => {
    const errors = validateData(formData);
    if (Object.keys(errors).length > 0) {
        setContactErrors(errors);
        alert("Please fill in contact info first");
        return;
    }

    if (!window.google || !window.google.payments) {
      alert("Google Pay is currently unavailable");
      return;
    }

    const paymentsClient = new window.google.payments.api.PaymentsClient({ environment: 'TEST' });
    
    const paymentDataRequest = {
      apiVersion: 2, apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: { allowedCardNetworks: ['VISA','MASTERCARD'], allowedAuthMethods:['PAN_ONLY','CRYPTOGRAM_3DS'] },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: { gateway: 'example', gatewayMerchantId: 'exampleGatewayMerchantId' }
        }
      }],
      merchantInfo: { merchantId: '01234567890123456789', merchantName: 'Demo Store' },
      transactionInfo: {
        totalPriceStatus: 'FINAL', totalPriceLabel: 'Total',
        totalPrice: calculateTotal(), // Використовуємо фінальну вартість зі знижкою замість субтоталу
        currencyCode: 'USD', countryCode: 'US'
      }
    };

    try {
      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      if (paymentData) {
        handleConfirmOrder();
      }
    } catch (err) {
      console.error("GPay error or cancelled", err);
    }
  };

  if (loading) return <div className="loader-full">Processing...</div>;

  return (
    <div className="checkout-bg" style={{ position: "relative" }}>
      
      {showSuccess && (
        <div className="success-screen-v2" style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(4px)"
        }}>
          <div className="success-message show">
            <div className="success-icon">✓</div>
            <h3>Success!</h3>
            <p>{successText}</p>
            <button className="save-btn-custom" onClick={() => navigate("/profile")}>
              Go to Profile
            </button>
          </div>
        </div>
      )}

      <Container className="checkout-container-v2">
        <div className="checkout-main-content">
          
          {/* STEP 1: CONTACT */}
          <div className="checkout-card-v2">
            <div className="card-title-v2"><span className="step-icon">1</span><h3>Contact Information</h3></div>
            <div className="card-body-v2">
              <div className="input-grid-v2">
                <div className={`field-v2 ${contactErrors.firstName ? "error" : ""}`}>
                  <label>First Name</label>
                  <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Required" />
                </div>
                <div className={`field-v2 ${contactErrors.lastName ? "error" : ""}`}>
                  <label>Last Name</label>
                  <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Required" />
                </div>
              </div>
              <div className={`field-v2 ${contactErrors.phone ? "error" : ""}`}>
                <label>Phone Number</label>
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Required" />
              </div>
              {!hasContactInfo && <button className="save-btn-custom" onClick={setContactToProfile}>Save to profile</button>}
            </div>
          </div>

          {/* STEP 2: SHIPPING */}
          <div className="checkout-card-v2">
            <div className="card-title-v2"><span className="step-icon">2</span><h3>Shipping Address</h3></div>
            <div className="card-body-v2">
              <div className="field-v2"><label>Country</label><input name="country" value={formData.country} readOnly /></div>
              <div className="input-grid-v2">
                <div className="field-v2"><label>City</label><input name="city" value={formData.city} onChange={handleChange} /></div>
                <div className="field-v2"><label>Region</label><input name="region" value={formData.region} onChange={handleChange} /></div>
              </div>
              <div className="street-row-v2">
                <div className="field-v2 street-col"><label>Street</label><input name="street" value={formData.street} onChange={handleChange} /></div>
                <div className="field-v2 house-col"><label>House</label><input name="house" value={formData.house} onChange={handleChange} /></div>
              </div>
              {!hasAddressInfo && <button className="save-btn-custom" onClick={setAddressToProfile}>Save to profile</button>}
            </div>
          </div>

          {/* STEP 3: PAYMENT METHOD */}
          <div className="checkout-card-v2">
            <div className="card-title-v2"><span className="step-icon">3</span><h3>Payment Method</h3></div>
            <div className="card-body-v2">
              <div className="payment-grid-v2">
                <div className={`payment-item-v2 ${paymentMethod==='online'?'active':''}`} onClick={()=>setPaymentMethod('online')}>
                  <div className="payment-icon-wrapper online-icons-flex">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" style={{height:'20px'}}/>
                  </div>
                  <span className="payment-name">Online Payment</span>
                  <p className="payment-sub">Google Pay, Visa, Mastercard</p>
                </div>
                <div className={`payment-item-v2 ${paymentMethod==='cash'?'active':''}`} onClick={()=>setPaymentMethod('cash')}>
                  <div className="payment-icon-wrapper"><i className="bi bi-truck"></i></div>
                  <span className="payment-name">Cash on Delivery</span>
                  <p className="payment-sub">Pay when you receive</p>
                </div>
              </div>
              {paymentMethod==='cash' && <div className="payment-info-notice"><p>Pay the total amount to the courier upon delivery.</p></div>}
            </div>
          </div>

          {/* CHECKOUT SUMMARY & ACTION */}
          <div className="checkout-summary-v2">
            <div className="summary-details-v2">
              <div className="s-line"><span>Subtotal</span><span>${calculateSubtotal()}</span></div>
              <div className="s-line"><span>Shipping</span><span className="free-text">FREE</span></div>
              <div className="s-line total-v2"><span>Order Total</span><span>${calculateTotal()}</span></div>
            </div>

            <button
              className={`confirm-btn-v2 ${paymentMethod==='online'?'btn-gpay-black':''}`}
              onClick={paymentMethod==='online' ? handleGooglePay : handleConfirmOrder}
            >
              {paymentMethod==='online'?(
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Buy with" style={{height:'24px'}}/>
              ):'Confirm Order'}
            </button>
            <p className="secure-note text-center">Secure SSL Encrypted Checkout</p>
          </div>

        </div>
      </Container>
    </div>
  );
}

export default Checkout;