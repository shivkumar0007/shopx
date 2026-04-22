import { Star } from "lucide-react";

const renderStars = (rating, filledClassName = "fill-accent text-accent") =>
  Array.from({ length: 5 }, (_, index) => {
    const filled = index < rating;
    return (
      <Star
        key={`${rating}-${index}`}
        size={15}
        strokeWidth={1.8}
        className={filled ? filledClassName : "text-text/20"}
      />
    );
  });

const formatDate = (value) => {
  if (!value) return "Recently";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const ReviewList = ({ reviews = [] }) => {
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews
    : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Customer Reviews</p>
          <h3 className="mt-2 text-2xl font-medium text-text">What shoppers are saying</h3>
        </div>
        <div className="rounded-[1.4rem] border border-border bg-bg px-4 py-3">
          <p className="text-sm text-text/55">Average Rating</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-medium text-text">{averageRating.toFixed(1)}</span>
            <div className="flex items-center gap-1">{renderStars(Math.round(averageRating))}</div>
            <span className="text-sm text-text/55">({totalReviews})</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {totalReviews === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg px-5 py-10 text-center text-sm text-text/60">
            No reviews yet. Be the first to share how this product feels in real life.
          </div>
        ) : (
          reviews.map((review) => (
            <article key={review._id || `${review.userName}-${review.createdAt}`} className="rounded-2xl border border-border bg-bg p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-medium text-text">{review.userName}</p>
                    <div className="flex items-center gap-1">{renderStars(Number(review.rating || 0))}</div>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text/40">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
                {review.reviewImage ? (
                  <img
                    src={review.reviewImage}
                    alt={`${review.userName} review`}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-text/70">
                {review.comment || "Loved the overall finish and experience."}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default ReviewList;
