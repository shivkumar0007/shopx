import { ImagePlus, LoaderCircle, Star, UploadCloud } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext.jsx";
import { uploadImageToCloudinary } from "../utils/cloudinary.js";

const ReviewForm = ({ productId, onReviewAdded }) => {
  const { api, user } = useApp();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewImage, setReviewImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      setReviewImage(uploadedUrl);
      toast.success("Review image uploaded.");
    } catch (error) {
      toast.error(error.message || "Could not upload review image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.token) {
      toast.error("Please login to post a review.");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/products/${productId}/reviews`, {
        rating,
        comment,
        reviewImage
      });

      setRating(0);
      setHoveredRating(0);
      setComment("");
      setReviewImage("");
      onReviewAdded?.(data);
      toast.success("Review submitted successfully.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">Write A Review</p>
        <h3 className="mt-2 text-2xl font-medium text-text">Share your product experience</h3>
        <p className="mt-2 text-sm text-text/65">
          Rate the product, add a quick note, and optionally attach a real customer photo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-medium text-text">Your Rating</p>
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }, (_, index) => {
              const current = index + 1;
              const active = current <= (hoveredRating || rating);

              return (
                <button
                  key={current}
                  type="button"
                  onMouseEnter={() => setHoveredRating(current)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(current)}
                  className="rounded-full p-1.5 transition hover:scale-105"
                >
                  <Star
                    size={24}
                    strokeWidth={1.9}
                    className={active ? "fill-accent text-accent" : "text-text/20"}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text">Comment</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            placeholder="Tell other shoppers what stood out for you."
          />
        </label>

        <div className="rounded-2xl border border-dashed border-accent/30 bg-bg p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card text-text/35">
                {reviewImage ? (
                  <img src={reviewImage} alt="Review preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={20} strokeWidth={1.8} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text">Attach a product photo</p>
                <p className="text-xs text-text/55">Optional Cloudinary upload for visual reviews.</p>
              </div>
            </div>

            <label
              htmlFor={`review-image-${productId}`}
              className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-text transition hover:border-accent hover:text-accent ${
                uploading ? "pointer-events-none opacity-60" : "cursor-pointer"
              }`}
            >
              {uploading ? (
                <LoaderCircle size={16} strokeWidth={1.7} className="animate-spin" />
              ) : (
                <UploadCloud size={16} strokeWidth={1.7} />
              )}
              {uploading ? "Saving..." : "Upload Photo"}
            </label>
            <input
              id={`review-image-${productId}`}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                handleImageUpload(file);
                event.target.value = "";
              }}
            />
          </div>

          <p className="mt-3 truncate text-xs text-text/50">
            {reviewImage || "No review image selected yet."}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="pill-button inline-flex items-center gap-2 bg-accent text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={16} strokeWidth={1.7} className="animate-spin" />
          ) : (
            <Star size={16} strokeWidth={1.7} />
          )}
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </section>
  );
};

export default ReviewForm;
