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

async function migrateProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // updated product, adding sizes: [] if sizes field does not exist
    const result = await Product.updateMany(
      { sizes: { $exists: false } },
      { $set: { sizes: [] } }
    );

    console.log(`Migration completed: ${result.modifiedCount} products updated`);

    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrateProducts();