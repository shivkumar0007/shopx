import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";

const ProductImage = ({ src, alt, className = "", style, ...restProps }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-card text-text/35 ${className}`} style={style} {...restProps}>
        <ImageIcon size={28} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={style}
      {...restProps}
    />
  );
};

export default ProductImage;
