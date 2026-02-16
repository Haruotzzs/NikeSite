import "./checkout.css";
import "../../styles.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

function Checkout() {
  const navigate = useNavigate();
  const [bagElements, setBagElements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("online");
  const [hasContactInfo, setHasContactInfo] = useState(false);
  const [hasAddressInfo, setHasAddressInfo] = useState(false);
  const [contactErrors, setContactErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    country: "Ukraine", city: "", region: "",
    street: "", house: "", apartment: "", postalCode: ""
  });

  const validateData = (data) => {
    const errors = {};
    if (!data.firstName || data.firstName.trim() === "") errors.firstName = "Required";
    if (!data.lastName || data.lastName.trim() === "") errors.lastName = "Required";
    if (!data.phone || data.phone.trim() === "") errors.phone = "Required";
    return errors;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBagElements(data.bagElements || []);
          
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (contactErrors[name]) {
      setContactErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const calculateTotal = () => {
    return bagElements.reduce((total, item) => {
      return total + (Number(item.tovarPrice) * (item.bagProductCount || 1));
    }, 0).toFixed(2);
  };

  const triggerSuccess = (text, redirect = false) => {
    setSuccessText(text);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if (redirect) navigate("/profile");
    }, 3000);
  };

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

  const handleConfirmOrder = async () => {
    // 1. Валідація
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
    if (bagElements.length === 0) {
      alert("Your bag is empty");
      return;
    }

    try {
      setLoading(true);

      // 2. Створюємо об'єкт замовлення
      // ВАЖЛИВО: Поля мають збігатися з тим, що очікує Orders.jsx (напр. "total")
      const orderData = {
        userId: currentUser.uid,
        items: bagElements,
        total: calculateTotal(), // Використовуємо "total", як у вашому Orders.jsx
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

      // 3. Додаємо в колекцію "orders"
      await addDoc(collection(db, "orders"), orderData);

      // 4. Очищаємо кошик користувача в його документі
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { bagElements: [] }, { merge: true });

      // 5. Успіх
      triggerSuccess("Order placed successfully! Redirecting to profile...", true);
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      merchantInfo: { merchantId: '01234567890123456789', merchantName: 'Demo Merchant' },
      transactionInfo: {
        totalPriceStatus: 'FINAL', totalPriceLabel: 'Total',
        totalPrice: calculateTotal(), currencyCode: 'USD', countryCode: 'US'
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

  if (loading) return <div className="loader-full">Loading...</div>;

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
              {!hasContactInfo && <button className="save-btn-custom" onClick={setContactToProfile}>Set to profile</button>}
            </div>
          </div>

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
              {!hasAddressInfo && <button className="save-btn-custom" onClick={setAddressToProfile}>Set to profile</button>}
            </div>
          </div>

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
              {paymentMethod==='cash' && <div className="payment-info-notice"><p>You will pay the total amount to the courier upon receiving package.</p></div>}
            </div>
          </div>

          <div className="checkout-summary-v2">
            <div className="summary-details-v2">
              <div className="s-line"><span>Subtotal</span><span>${calculateTotal()}</span></div>
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
            <p className="secure-note">By clicking the button you agree to our Terms of Service</p>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default Checkout;