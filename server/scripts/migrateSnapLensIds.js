import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";
import { normalizeSnapLensId } from "../utils/snapLens.js";

dotenv.config();

const migrateSnapLensIds = async () => {
  try {
    await connectDB();

    const products = await Product.collection
      .find({}, { projection: { snapLensId: 1, snapLensUrl: 1, isArEnabled: 1, name: 1 } })
      .toArray();

    if (products.length === 0) {
      console.log("No products found for Snap Lens migration.");
      process.exit(0);
    }

    let updatedCount = 0;

    for (const product of products) {
      const normalizedLensId = normalizeSnapLensId(product.snapLensId || product.snapLensUrl || "");
      const shouldUpdate =
        normalizedLensId !== (product.snapLensId || "") ||
        Boolean(normalizedLensId) !== Boolean(product.isArEnabled) ||
        Object.prototype.hasOwnProperty.call(product, "snapLensUrl");

      if (!shouldUpdate) {
        continue;
      }

      await Product.collection.updateOne(
        { _id: product._id },
        {
          $set: {
            snapLensId: normalizedLensId,
            isArEnabled: Boolean(normalizedLensId)
          },
          $unset: {
            snapLensUrl: 1
          }
        }
      );

      updatedCount += 1;
      console.log(`Updated ${product.name} -> lensId: ${normalizedLensId || "(empty)"}`);
    }

    console.log(`Snap Lens migration completed. Updated ${updatedCount} product(s).`);
    process.exit(0);
  } catch (error) {
    console.error(`Snap Lens migration failed: ${error.message}`);
    process.exit(1);
  }
};

migrateSnapLensIds();
