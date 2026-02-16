import React, { useContext, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import "./product.css";
import "../../styles.css";
import avatar from "../../img/none_avatar.jpg";

// Імпорт методів Firestore
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore"; 
import { auth, db } from "../../../server/firebase.js";
import { ProductContext } from "../../../Context.jsx";

const Product = () => {
  const { id } = useParams();
  const products = useContext(ProductContext);

  const [showComments, setShowComments] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isInBag, setIsInBag] = useState(false);
  const [activeImg, setActiveImg] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  const product = products.find((item) => item.id === parseInt(id));

  const allVariants = products.filter(
    (item) => item.tovarClass === product?.tovarClass
  );

  const images = product?.productImg 
    ? (typeof product.productImg === 'object' 
        ? Object.values(product.productImg) 
        : [product.productImg])
    : [];

  useEffect(() => {
    if (images.length > 0) setActiveImg(images[0]);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setIsLiked(userData.likedItems?.includes(id) || false);
            const alreadyInBag = userData.bagElements?.some(
              item => item.id === product?.id && item.selectedSize === selectedSize
            );
            setIsInBag(alreadyInBag);
          }
        });
        return () => unsubscribeFirestore();
      } else {
        setCurrentUser(null);
        setIsLiked(false);
        setIsInBag(false);
      }
    });
    return () => unsubscribeAuth();
  }, [id, product?.id, selectedSize, images.length]); 

  const handleAddToBag = async () => {
    if (!currentUser) return alert("Будь ласка, увійдіть в акаунт.");
    if (product.size && !selectedSize) return alert("Будь ласка, виберіть розмір.");
    
    const displayImg = typeof product.productImg === 'object' 
      ? Object.values(product.productImg)[0] 
      : product.productImg;

    const userDocRef = doc(db, "users", currentUser.uid);
    const itemData = {
      id: product.id,
      tovarName: product.tovarName,
      tovarPrice: product.tovarPrice,
      productImg: displayImg,
      type: product.tovarClass,
      selectedSize: selectedSize, 
      colors: product.colors || 1
    };

    try {
      if (isInBag) {
        await setDoc(userDocRef, { bagElements: arrayRemove(itemData) }, { merge: true });
      } else {
        await setDoc(userDocRef, { bagElements: arrayUnion(itemData) }, { merge: true });
      }
    } catch (error) { console.error("Помилка кошика:", error); }
  };

  const handleLikeToggle = async () => {
    if (!currentUser) return alert("Будь ласка, увійдіть в акаунт.");
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await setDoc(userDocRef, {
        likedItems: isLiked ? arrayRemove(id) : arrayUnion(id)
      }, { merge: true });
    } catch (error) { console.error("Помилка лайка:", error); }
  };

  if (!product) return <h2>Product not found</h2>;

  const getBtnStyle = (sizeName) => {
    const isAvailable = product.size ? product.size[sizeName] : true;
    return {
      backgroundColor: isAvailable ? (selectedSize === sizeName ? "black" : "white") : "#f5f5f5",
      color: isAvailable ? (selectedSize === sizeName ? "white" : "black") : "#cccccc",
      cursor: isAvailable ? "pointer" : "not-allowed",
      opacity: isAvailable ? 1 : 0.6,
      border: "1px solid #ddd",
      marginRight: "5px",
      padding: "8px 12px",
      minWidth: "45px"
    };
  };

  return (
    <Container>
      {/* МОДАЛЬНЕ ВІКНО ВІДГУКІВ */}
      <div 
        className="Comments-pool" 
        style={{ display: showComments ? "flex" : "none" }}
        onClick={() => setShowComments(false)}
      >
        <div className="Comments-canvas" onClick={(e) => e.stopPropagation()}>
          <button className="close-modal" onClick={() => setShowComments(false)}>×</button>
          
          <div className="modal-content" style={{ width: '100%' }}>
            <div className="modal-product-summary" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
              <img 
                src={images[0]} 
                alt="Product mini" 
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} 
              />
              <div className="mini-info">
                <h4 style={{ margin: 0, fontSize: '18px' }}>{product.tovarName}</h4>
                <p style={{ margin: 0, color: '#757575', fontSize: '14px' }}>{product.tovarClass}</p>
                <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{product.tovarPrice}$</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '20px' }} />

            <div className="rating" style={{ marginBottom: '20px', justifyContent: 'flex-start' }}>
              <div className="rating_stars" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div>
                  {[...Array(5)].map((_, i) => (
                    <span style={{ fontSize: "24px" }} key={i} className="material-symbols-outlined">star</span>
                  ))}
                </div>
                <div className="value">
                  <p style={{ margin: 0, fontWeight: 'bold' }}>3.12 / 5.0</p>
                </div>
              </div>
            </div>

            <h5 style={{ marginBottom: '15px' }}>Customer Reviews ({product.reviews?.length || 0})</h5>

            <div className="reviews-scroll-area" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review, index) => (
                  <div className="oneTab" key={index} style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #f9f9f9', paddingBottom: '15px' }}>
                    <img className="comment-avatar" src={avatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px' }} />
                    <div className="Username" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>{review.user}</p>
                        <div className="Stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span 
                              className="material-symbols-outlined" 
                              key={i} 
                              style={{ fontSize: '16px', color: i < review.rating ? 'black' : '#ddd' }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text" style={{ marginTop: '5px' }}>
                        <p style={{ fontSize: '14px', color: '#444' }}>{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ГОЛОВНИЙ КОНТЕНТ СТОРІНКИ */}
      <div style={{ paddingTop: "15vh", justifyContent: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="product-container">
          <div className="size-img">
            {images.map((imgUrl, index) => (
              <img 
                key={index} 
                src={imgUrl} 
                className={activeImg === imgUrl ? "active-thumb" : ""}
                onMouseEnter={() => setActiveImg(imgUrl)}
                alt="preview"
              />
            ))}
          </div>
          
          <div className="mainImg" style={{ display: "flex", zIndex: "1", flexDirection: "column" }}>
            <img src={activeImg || images[0]} alt={product.tovarName} />
            <div className="size" style={{ marginTop: '20px' }}>
              <p style={{ fontWeight: '500', marginBottom: '10px' }}>Select Size</p>
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                <button 
                  key={s}
                  disabled={product.size && product.size[s] === false}
                  onClick={() => setSelectedSize(s)}
                  style={getBtnStyle(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="title-container">
            <div className="info">
              <h2 className="product-title">{product.tovarName}</h2>
              <p style={{ color: '#757575' }}>{product.tovarClass}</p>
              <span className="card-price">
                <p style={{ fontSize: '22px', fontWeight: '600' }}>{product.tovarPrice}$</p>
              </span>
            </div>

            <div className="shippingInfo" style={{ margin: '20px 0' }}>
              <h2 className="card-title1">Shipping</h2>
              <p className="arrived">Standard delivery 3-5 business days.</p>
              <h2 className="card-title1" style={{ marginTop: '10px' }}>Find a Store</h2>
              <p><Link to="/stores" style={{ color: 'black', textDecoration: 'underline' }}>Click here</Link></p>
            </div>

            <div className="Btn_container">
              <div className="firstTab" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  className="Buy-btn" 
                  onClick={handleAddToBag}
                  style={{ 
                    backgroundColor: isInBag ? "#555" : "black", 
                    color: 'white', flex: 1, padding: '15px', borderRadius: '30px', border: 'none' 
                  }}
                >
                  {isInBag ? "Remove from Bag" : "Add to Bag"}
                </button>

                <button onClick={handleLikeToggle} className="Like-btn" style={{ background: 'none' }}>
                  <span 
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0", color: isLiked ? 'red' : 'black' }}
                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>

            <div className="towar-description" style={{ marginTop: '30px', lineHeight: '1.6' }}>
              <p style={{ fontWeight: 'bold' }}>Description</p>
              {product.description}
            </div>
            
            <div className="mark-desc" style={{ marginTop: '15px', fontSize: '14px', color: '#555' }}>
              <li style={{ listStyle: 'none' }}>Colour: {product.color || "Default"}</li>
              <li style={{ listStyle: 'none' }}>Style: IB3363-{product.id}</li>
            </div>
          </div>
        </div>

        {/* СЕКЦІЯ ПІД ТОВАРОМ (КОЛЬОРИ ЗЛІВА, ВІДГУКИ СПРАВА) */}
        <div className="reviews-section">
          {/* Блок з варіантами кольорів (Зліва) */}
          <div className="shown-colors">
            {allVariants.map((item) => (
              <Link key={item.id} to={`/product/${item.id}`}>
                <img 
                  src={typeof item.productImg === 'object' ? Object.values(item.productImg)[0] : item.productImg} 
                  alt="variant" 
                  style={{ border: item.id === product.id ? "2px solid black" : "1px solid #ddd" }}
                />
              </Link>
            ))}
          </div> 
          
          {/* Блок з закликом до відгуків (Справа) */}
          <div className="User_comment">
            <h3>Join the conversation</h3>
            <div className="rating">
              <div className="rating_stars">
                {[...Array(5)].map((_, i) => (
                  <span style={{ fontSize: "30px" }} key={i} className="material-symbols-outlined">star</span>
                ))}
                <div className="value"><h3>3.12</h3></div> 
              </div>
            </div> 
            <p style={{ marginBottom: '25px' }}>(502) reviews</p>
            
            <button className="write-review" onClick={() => setShowComments(true)}>
              <span className="material-symbols-outlined write-icon">edit</span>
              <p style={{ margin: 0 }}>Write a Review</p>
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Product;