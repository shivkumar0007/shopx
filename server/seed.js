import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Product from "./models/Product.js";

dotenv.config();

const products = [
  {
    name: "AR Smart Sunglasses",
    price: 4999,
    description: "Lightweight sunglasses with premium polarized lenses.",
    category: "Fashion",
    image: "https://dummyimage.com/600x400/000/fff&text=AR+Sunglasses",
    stockCount: 14,
    snapLensUrl: "https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=abcd1111"
  },
  {
    name: "Virtual Try-On Lipstick Kit",
    price: 1999,
    description: "Long-lasting lipstick shades with virtual try-on support.",
    category: "Beauty",
    image: "https://dummyimage.com/600x400/900/fff&text=AR+Lipstick",
    stockCount: 3,
    snapLensUrl: "https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=abcd2222"
  },
  {
    name: "Running Shoes Pro",
    price: 3499,
    description: "Cushioned running shoes built for all-day comfort.",
    category: "Footwear",
    image: "https://dummyimage.com/600x400/222/fff&text=Shoes",
    stockCount: 0,
    snapLensUrl: ""
  },
  {
    name: "Noise-Canceling Headphones",
    price: 7999,
    description: "Over-ear headphones with immersive audio and ANC.",
    category: "Electronics",
    image: "https://dummyimage.com/600x400/555/fff&text=Headphones",
    stockCount: 8,
    snapLensUrl: ""
  },
  {
    name: "Minimal Leather Backpack",
    price: 2899,
    description: "Durable and stylish backpack with smart organization.",
    category: "Accessories",
    image: "https://dummyimage.com/600x400/444/fff&text=Backpack",
    stockCount: 4,
    snapLensUrl: ""
  }
];

const shouldResetCollection = process.env.SEED_RESET === "true";

const seedData = async () => {
  try {
    await connectDB();

    if (shouldResetCollection) {
      await Product.deleteMany({});
    }

    const operations = products.map((product) => ({
      updateOne: {
        filter: { name: product.name },
        update: { $set: product },
        upsert: true
      }
    }));

    const result = await Product.bulkWrite(operations);
    const totalAffected =
      result.upsertedCount + result.modifiedCount + (shouldResetCollection ? result.insertedCount || 0 : 0);

    console.log(
      shouldResetCollection
        ? `Shopx seed reset completed. Upserted ${result.upsertedCount} and modified ${result.modifiedCount} products.`
        : `Shopx seed completed safely. Upserted ${result.upsertedCount} and modified ${result.modifiedCount} products.`
    );

    if (totalAffected === 0) {
      console.log("Seed data already exists and is up to date.");
    }

    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
