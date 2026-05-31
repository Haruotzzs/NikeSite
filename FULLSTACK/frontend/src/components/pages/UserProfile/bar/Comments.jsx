import React from "react";
import { Link } from "react-router-dom";

function Comments({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="empty-reviews">
        <span className="material-symbols-outlined">notes</span>
        <p>You haven't shared any thoughts yet. Your feedback helps others!</p>
      </div>
    );
  }

  return (
    <div className="profile-reviews-list">
      <h2 style={{ marginBottom: "30px", fontWeight: "800", color: "#1e293b" }}>My Reviews</h2>

      {reviews.map((review, index) => (
        <div key={index} className="review-history-item">

          {/* Product image + name */}
          <div className="review-product-preview">
            <img
              src={review.productImg || "/none_img.jpg"}
              alt={review.productName}
              onError={(e) => { e.target.src = "/none_img.jpg"; }}
            />
            <div className="preview-details">
              <Link to={`/product/${review.productId}`} className="preview-name">
                {review.productName}
              </Link>
              <p className="preview-status" style={{ fontSize: "12px", color: "#888", margin: 0 }}>
                Verified Purchase
              </p>
            </div>
          </div>

          {/* Stars + date + text */}
          <div className="review-content-body">
            <div className="review-meta-row">
              <div className="stars-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "18px",
                      color: star <= review.rating ? "#000" : "#ddd",
                      fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
              <span className="review-date-label">
                {review.date
                  ? new Date(review.date).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Processing..."}
              </span>
            </div>
            <p className="review-text">"{review.comment}"</p>
          </div>

        </div>
      ))}
    </div>
  );
}

export default Comments;