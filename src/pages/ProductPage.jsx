import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ARModal from "../components/ARModal.jsx";
import ProductImage from "../components/ProductImage.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getProductLens } from "../utils/lensManager.js";

const ProductPage = () => {
  const { id } = useParams();
  const { products, api, addToCart } = useApp();
  const [product, setProduct] = useState(() => products.find((item) => item._id === id) || null);
  const [showAR, setShowAR] = useState(false);
  const [productLensId, setProductLensId] = useState("");

  useEffect(() => {
    if (product) return;
    api
      .get(`/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => setProduct(null));
  }, [api, id, product]);

  useEffect(() => {
    const productId = product?._id || id;
    setProductLensId(getProductLens(productId) || "");
  }, [id, product?._id]);

  if (!product) {
    return <div className="mx-auto max-w-7xl px-8 py-8 text-text">Loading product details...</div>;
  }

  const lensId = productLensId || getProductLens(product._id);
  const canUseVirtualTryOn = Boolean(product.isArEnabled && lensId);

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="grid gap-8 rounded-2xl border border-border bg-card p-8 lg:grid-cols-2">
        <ProductImage src={product.image} alt={product.name} className="w-full rounded-2xl object-cover" />
        <div className="flex flex-col gap-4">
          <p className="text-sm font-normal uppercase tracking-[0.12em] text-accent">{product.category}</p>
          <h2 className="text-3xl font-medium text-text">{product.name}</h2>
          <p className="text-sm font-normal leading-7 text-text/75">{product.description}</p>
          <p className="text-xl font-medium text-text">Rs. {product.price}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => addToCart(product)}
              disabled={product.stockCount === 0}
              className="pill-button bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {product.stockCount === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
            {canUseVirtualTryOn && (
              <button onClick={() => setShowAR(true)} className="pill-button bg-bg text-text">
                Virtual Try-On
              </button>
            )}
          </div>
        </div>
      </section>
      <ARModal open={showAR} lensId={lensId} onClose={() => setShowAR(false)} />
    </main>
  );
};

export default ProductPage;
