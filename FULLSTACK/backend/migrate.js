import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// scheme of products
const productSchema = new mongoose.Schema(
  {
    tovarName: { type: String, required: true },
    tovarClass: { type: String, required: true },
    price: { type: Number },
    tovarPrice: { type: Number },
    description: { type: String },
    color: { type: String },
    size: { type: Object },
    productImg: { type: Object }, // old format
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

async function migrate() {
  try {
    // connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // clear old products
    await Product.deleteMany({});
    console.log("Cleared old products");

    // read the products.json
    const productsPath = path.resolve("./store/products.json");
    const productsData = await fs.readFile(productsPath, "utf-8");
    const products = JSON.parse(productsData);

    console.log(`Found ${products.length} products to migrate`);

    // product migration logic
    const migratedProducts = products.map((p) => ({
      tovarName: p.tovarName,
      tovarClass: p.tovarClass,
      price: p.price || p.tovarPrice,
      tovarPrice: p.tovarPrice,
      description: p.description || "",
      color: p.color,
      size: p.size,
      productImg: p.productImg, 
      // convert old productImg object to new images array
      images: p.productImg
        ? Object.values(p.productImg).map((url) => ({
            filename: url.split("/").pop(),
            url: url,
          }))
        : [],
      reviews: p.reviews || [],
    }));

    // insert in MongoDB
    const result = await Product.insertMany(migratedProducts);
    console.log(`Successfully migrated ${result.length} products!`);

    // read userdata.json
    const userdataPath = path.resolve("./store/userdata.json");
    const userdataContent = await fs.readFile(userdataPath, "utf-8");
    const userdata = JSON.parse(userdataContent);

    console.log(`\n Users in userdata.json: ${userdata.length}`);
    console.log("User migration script ready (optional)");
    console.log('To migrate users too, create a "User" model and uncomment the user migration');

    console.log("\nMigration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrate();
