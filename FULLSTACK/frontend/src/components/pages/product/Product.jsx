import React, { useContext, useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import "./product.css";
import "../../styles.css";
import avatar from "../../img/none_avatar.jpg";

// --- FIREBASE & CONTEXT IMPORTS ---
import { 
  doc, setDoc, arrayUnion, arrayRemove, onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../server/firebase.js";
import { ProductContext, backendUrl } from "../../../Context.jsx";
import Card from "../../card/Card.jsx"

/**
 * Product Component
 * Displays detailed information for a single product, handles reviews,
 * and syncs 'Likes' and 'Cart' status with Firebase.
 */
const Product = () => {
  const { id } = useParams(); // Get product ID from URL parameters
  const contextData = useContext(ProductContext);
  const products = contextData?.products || [];
  const scrollRef = useRef(null);

  // --- LOCAL STATE MANAGEMENT ---
  const [showComments, setShowComments] = useState(false); // Modal visibility
  const [currentUser, setCurrentUser] = useState(null);    // Authenticated user object
  const [isLiked, setIsLiked] = useState(false);           // Heart button state
  const [isInBag, setIsInBag] = useState(false);           // Cart status
  const [activeImg, setActiveImg] = useState(null);        // Main displayed image
  const [selectedSize, setSelectedSize] = useState(null);  // User selected size

  const [newComment, setNewComment] = useState("");        // New review text input
  const [newRating, setNewRating] = useState(0);           // New review star rating
  const [productReviews, setProductReviews] = useState([]); // List of product reviews

  // Find the specific product object from the global context
  const product = products.find((item) => item._id === id || item.id === parseInt(id));

  // --- REVIEW LOGIC ---
  
  /**
   * Calculates the average star rating based on current reviews.
   */
  const calculateAverageRating = () => {
    if (!product || product.reviews.length === 0) return 0;
    const total = product.reviews.reduce((sum, review) => sum + Number(review.rating), 0);
    const average = total / product.reviews.length;
    return average.toFixed(1);
  };

  const averageRating = calculateAverageRating();

  /**
   * Submits a new comment/rating to the backend API.
   * Prevents duplicate reviews and empty submissions.
   */
  const handleAddComment = async () => {
    if (!currentUser) return alert("Please log in to your account.");
    if (!newComment.trim()) return alert("Please write a review.");
    if (!newRating) return alert("Please rate the product.");

    const hasAlreadyReviewed = productReviews?.some(
      (review) => review.userId === currentUser.uid
    );

    if (hasAlreadyReviewed) {
      alert("You have already reviewed this product. Thank you for your feedback!");
      return;
    }

    const reviewData = {
      userId: currentUser.uid,
      user: currentUser.displayName || "Anonymous",
      comment: newComment,
      rating: newRating
    };

    try {
  const response = await fetch(`${backendUrl}/products`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: product.id,
      userId: reviewData.userId,
      user: reviewData.user,
      comment: reviewData.comment,
      rating: reviewData.rating
    }),
  });

  if (response.ok) {
    const data = await response.json();

    // беремо оновлені reviews з бекенда
    setProductReviews(data.reviews);

    alert("Review published!");

    setNewComment("");
    setNewRating(0);
    setShowComments(false);
  } else {
    const errorData = await response.json();
    alert(errorData.error || "An error occurred");
  }
} catch (error) {
  alert("Error sending comment");
}
  };

  // --- HELPERS & DERIVED DATA ---

  // Filter products for "You might also like" based on category
  const recommendations = products.filter(
    (item) => item.tovarClass === product?.tovarClass && (item._id !== product?._id && item.id !== product?.id)
  );

  const allVariants = products.filter(
    (item) => item.tovarClass === product?.tovarClass
  );

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  /**
   * Logic to safely extract an image URL from a product variant object
   */
  const getVariantImage = (variant) => {
    if (variant.images && variant.images.length > 0) return variant.images[0].url || variant.images[0];
    if (variant.mainImage) return variant.mainImage;
    if (variant.thumb) return variant.thumb;
    if (variant.productImg) return typeof variant.productImg === 'object' ? Object.values(variant.productImg)[0] : variant.productImg;
    return '';
  };

  // Process main product images into a flat array for the gallery
  const images = product?.images && product.images.length > 0
    ? product.images.map(img => img.url)
    : product?.productImg 
      ? (typeof product.productImg === 'object' ? Object.values(product.productImg) : [product.productImg])
      : [];

  // --- SIDE EFFECTS (Lifecycle) ---

  useEffect(() => {
    // Reset view and set default image on ID change
    if (images.length > 0) setActiveImg(images[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Fetch latest reviews for this product from API
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${backendUrl}/products/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProductReviews(product?.reviews || []);
        }
      } catch (error) {
        setProductReviews(product?.reviews || []);
      }
    };

    fetchProduct();

    // Monitor Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        
        // Listen to Firestore for real-time changes in User's Likes/Bag
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Check if current product is in likedItems
            setIsLiked(userData.likedItems?.includes(id) || userData.likedItems?.includes(product?._id) || false);
            
            // Check if product with the current selectedSize is in bag
            const alreadyInBag = userData.bagElements?.some(
              item => (item.id === product?._id || item.id === product?.id) && item.selectedSize === selectedSize
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
  }, [id, product?.id, product?._id, selectedSize, images.length]); 

  // --- ACTION HANDLERS ---

  /**
   * Adds or Removes item from Firestore 'bagElements' array
   */
  const handleAddToBag = async () => {
    if (!currentUser) return alert("Please log in to your account.");
    if (product.sizes && product.sizes.length > 0 && !selectedSize) return alert("Please select a size.");
    
    const displayImg = product.images && product.images.length > 0
        ? product.images[0].url
        : typeof product.productImg === 'object' 
          ? Object.values(product.productImg)[0] 
          : product.productImg;
    
    const userDocRef = doc(db, "users", currentUser.uid);
    const itemData = {
      id: product._id || product.id,
      tovarName: product.tovarName,
      tovarPrice: product.tovarPrice || product.price,
      productImg: displayImg,
      type: product.tovarClass,
      selectedSize: selectedSize, 
      colors: product.colors || 1,
      color: product.color || "",
      bagProductCount: 1,
      reviews: product.reviews || []
    };

    try {
      if (isInBag) {
        // Atomic removal from Firebase array
        await setDoc(userDocRef, { bagElements: arrayRemove(itemData) }, { merge: true });
      } else {
        // Atomic addition to Firebase array
        await setDoc(userDocRef, { bagElements: arrayUnion(itemData) }, { merge: true });
      }
    } catch (error) {
      alert("Error updating cart");
    }
  };

  /**
   * Toggles product ID in Firestore 'likedItems' array
   */
  const handleLikeToggle = async () => {
    if (!currentUser) return alert("Please log in to your account.");
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await setDoc(userDocRef, {
        likedItems: isLiked ? arrayRemove(id) : arrayUnion(id)
      }, { merge: true });
    } catch (error) { }
  };

  if (!product) return <h2>Product not found</h2>;

  /**
   * Helper to determine button CSS based on selection and availability
   */
  const getSizeBtnClass = (sizeName) => {
    const isAvailable = product.sizes ? product.sizes.includes(sizeName) : false;
    return [
      'size-btn',
      selectedSize === sizeName ? 'selected' : '',
      !isAvailable ? 'unavailable' : ''
    ].filter(Boolean).join(' ');
  };

  return (
    <Container>
      {/* --- REVIEW MODAL --- */}
      <div 
        className="Comments-pool" 
        style={{ display: showComments ? "flex" : "none" }}
        onClick={() => setShowComments(false)}
      >
        <div className="Comments-canvas" onClick={(e) => e.stopPropagation()}>
          <button className="close-modal" onClick={() => setShowComments(false)}>×</button>
          
          <div className="modal-content" style={{ width: '100%' }}>
            {/* Modal Product Preview */}
            <div className="modal-product-summary" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
              <img src={images[0]} alt="Product mini" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
              <div className="mini-info">
                <h4 style={{ margin: 0, fontSize: '18px' }}>{product.tovarName}</h4>
                <p style={{ margin: 0, color: '#757575', fontSize: '14px' }}>{product.tovarClass}</p>
                <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{product.tovarPrice}$</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '20px' }} />

            {/* Form to post a new review */}
            <div className="add-comment-form" style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    className="material-symbols-outlined"
                    style={{ cursor: 'pointer', color: star <= newRating ? 'black' : '#ddd',  fontVariationSettings: "'FILL' 1" }}
                    onClick={() => setNewRating(star)}
                  >star</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Write a review..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
                />
                <button 
                  onClick={handleAddComment}
                  style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: 'black', color: 'white', cursor: 'pointer' }}
                >Post</button>
              </div>
            </div>

            <h5>Customer Reviews ({product?.reviews.length || 0})</h5>

            {/* List of existing reviews */}
            <div className="reviews-scroll-area" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {product?.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review, index) => (
                  <div className="oneTab" key={index} style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #f9f9f9', paddingBottom: '15px' }}>
                    <img className="comment-avatar" src={avatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px' }} />
                    <div className="Username" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>{review.user}</p>
                        <div className="Stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', color: i < review.rating ? 'black' : '#ddd', fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
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

      {/* --- MAIN PRODUCT VIEW --- */}
      <div style={{ paddingTop: "15vh", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="product-container">
            {/* Gallery Thumbnails */}
            <div className="size-img">
            {images.map((imgUrl, index) => (
              <img 
                key={index} 
                src={imgUrl} 
                className={activeImg === imgUrl ? "active-thumb" : ""}
                onMouseEnter={() => setActiveImg(imgUrl)} // Hover changes main image
                alt="preview"
              />
            ))}
          </div>
          
          {/* Main Display Image and Size Selector */}
          <div className="mainImg">
            <img src={activeImg || images[0]} alt={product.tovarName} />
            <div className="size">
              <p style={{ fontWeight: '500', marginBottom: '10px' }}>Select Size</p>
              {sizeOptions.map((s) => {
                const isAvailable = product.sizes ? product.sizes.includes(s) : false;
                return (
                  <button 
                    key={s}
                    onClick={() => isAvailable && setSelectedSize(s)}
                    className={getSizeBtnClass(s)}
                    disabled={!isAvailable}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Details & Actions */}
          <div className="title-container">
            <div className="info">
              <h2 className="product-title">{product.tovarName}</h2>
              <p style={{ color: '#757575', marginBottom: '6px' }}>{product.tovarClass}</p>
              
              {product.color && (
                <p style={{ color: '#555', marginBottom: '10px', fontWeight: '500' }}>
                  Color: <span style={{ color: '#000', fontWeight: '700' }}>{product.color}</span>
                </p>
              )}

              {/* Price display with optional discount logic */}
              <span className="card-price">
                {product.discount && product.discount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ fontSize: '18px', textDecoration: 'line-through', color: '#999', margin: 0 }}>
                      ${product.tovarPrice || product.price}
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
                      ${Math.round((product.tovarPrice || product.price) * (1 - product.discount / 100))}
                    </p>
                    <span style={{ fontSize: '14px', color: '#e74c3c', fontWeight: '500' }}>
                      -{product.discount}% OFF
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize: '22px', fontWeight: '600' }}>${product.tovarPrice || product.price}</p>
                )}
              </span>
            </div>

            <div className="shippingInfo">
              <h2 className="card-title1">Shipping</h2>
              <p className="arrived">Standard delivery 3-5 business days.</p>
              <h2 className="card-title1" style={{ marginTop: '10px' }}>Find a Store</h2>
              <p><Link to="/find-a-store" style={{ color: 'black', textDecoration: 'underline' }}>Click here</Link></p>
            </div>

            {/* Action Buttons */}
            <div className="Btn_container">
              <div className="firstTab">
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
                    style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0", color: 'black' }}
                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>

            <div className="towar-description">
              <p style={{ fontWeight: 'bold' }}>Description</p>
              {product.description}
            </div>
            
            <div className="mark-desc">
              <li style={{ listStyle: 'none' }}>Variants: {product.variants && product.variants.length > 0 ? product.variants.map(v => v.name).join(', ') : "Default"}</li>
              <li style={{ listStyle: 'none' }}>Style: IB3363-{product.id || product._id}</li>
            </div>
          </div>
        </div>

        {/* --- COLORS / VARIANTS SECTION --- */}
        <div className="reviews-section">
           <div className="shown-colors">
            {product.variants && product.variants.length > 0 ? (
              product.variants.map((variant) => (
                <Link key={variant.id} to={`/product/${variant.id}`}>
                  <img 
                    src={getVariantImage(variant)} 
                    alt={variant.name} 
                    style={{ border: variant.id === product.id || variant.id === product._id ? "2px solid black" : "1px solid #ddd", borderRadius: '8px' }}
                    title={variant.name}
                  />
                </Link>
              ))
            ) : (
              allVariants.map((item) => (
                <Link key={item.id || item._id} to={`/product/${item.id || item._id}`}>
                  <img 
                    src={getVariantImage(item)} 
                    alt={item.tovarName || item.name || "variant"} 
                    style={{ border: item.id === product.id || item._id === product._id ? "2px solid black" : "1px solid #ddd", borderRadius: '8px' }}
                  />
                </Link>
              ))
            )}
          </div> 
          
          {/* --- RATING SUMMARY SECTION --- */}
          <div className="User_comment">
            <h3>Join the conversation</h3>
            <div className="rating">
              <div className="rating_stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    className="material-symbols-outlined" 
                    style={{ 
                      fontSize: "30px", 
                      color: star <= Math.round(averageRating) ? 'black' : '#ddd', 
                      fontVariationSettings: star <= Math.round(averageRating) ? "'FILL' 1" : "'FILL' 0" 
                    }} 
                  >
                    star
                  </span>
                ))}
                <div className="value">
                  <h3>{averageRating > 0 ? averageRating : "No rating"}</h3>
                </div> 
              </div>
            </div> 
            <p style={{ marginBottom: '25px' }}>({product.reviews?.length || 0}) reviews</p>
            
            {/* Trigger for Review Modal */}
            <button className="write-review" onClick={() => setShowComments(true)}>
              <span className="material-symbols-outlined write-icon">edit</span>
              <p style={{ margin: 0 }}>View all reviews</p>
            </button>
          </div>
        </div>

        {/* --- RECOMMENDATIONS SECTION --- */}
        <div className="recommendations-container" style={{ width: '100%', maxWidth: '1200px', margin: '80px 0', padding: '0 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontWeight: 'bold', margin: 0 }}>You might also like</h2>
          </div>
          <div className="recommendations-scroll" ref={scrollRef}>
            {recommendations.map(rec => (
              <Card key={rec._id || rec.id} product={rec} />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Product;