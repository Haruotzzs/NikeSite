import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const productSchema = new mongoose.Schema(
  {
    tovarName: { type: String, required: true },
    tovarClass: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    sizes: [{ type: String }],
    discount: { type: Number, default: 0, min: 0, max: 100 },
    images: [
      {
        filename: { type: String },
        url: { type: String },
      },
    ],
    reviews: [
      {
        userId: { type: String },
        user: { type: String },
        comment: { type: String },
        rating: { type: Number },
        date: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

async function migrateDiscount() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // updating product, adding discount: 0 if discount field does not exist
    const result = await Product.updateMany(
      { discount: { $exists: false } },
      { $set: { discount: 0 } }
    );

    console.log(`Migration completed: ${result.modifiedCount} products updated with discount field`);

    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrateDiscount();