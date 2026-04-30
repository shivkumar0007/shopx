/* global process */
import Product from "../models/Product.js";
import User from "../models/User.js";
import { normalizeSnapLensId } from "../utils/snapLens.js";
import {
  generateContentWithRetry,
  getModelNotFoundResponse,
  getServiceBusyResponse,
  isModelNotFoundError,
  isRetryableGeminiError
} from "../utils/gemini.js";

const RECOMMENDATION_SYSTEM_INSTRUCTION = `Act as a professional stylist. Suggest 3 complementary product categories that go perfectly with the input product. If the category is missing, infer it from the name. If the product is unique/niche, suggest universal essentials like "Gift Wrap", "Premium Warranty", or "Best-selling Accessories". Return ONLY a JSON array: [{"category": "...", "reasoning": "..."}]`;
const CLICKED_PRODUCTS_LIMIT = 20;
const PERSONALIZED_RECOMMENDATION_LIMIT = 5;
const PRODUCT_RECOMMENDATION_FIELDS =
  "name price category description image stockCount reviews tags discountPercentage isFlashSale saleEndTime";

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => String(tag || "").trim()).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    ];
  }

  return [];
};

const tokenize = (value = "") =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const normalizeText = (value = "") => String(value || "").trim().toLowerCase();

const stripMarkdownFence = (value = "") =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const deriveFallbackTags = (product) =>
  [
    ...new Set(
      [
        product.category,
        ...tokenize(product.name),
        ...tokenize(product.description)
      ].filter(Boolean)
    )
  ].slice(0, 8);

const buildRecommendationPrompt = (product) => {
  const tags = normalizeTags(product.tags);
  const productTags = tags.length > 0 ? tags : deriveFallbackTags(product);

  return JSON.stringify({
    name: product.name,
    category: product.category,
    tags: productTags
  });
};

const parseRecommendationResponse = (rawText = "") => {
  try {
    const parsed = JSON.parse(stripMarkdownFence(rawText));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        category: String(item?.category || "").trim(),
        reasoning: String(item?.reasoning || "").trim()
      }))
      .filter((item) => item.category && item.reasoning)
      .slice(0, 3);
  } catch {
    return [];
  }
};

const buildFallbackSuggestions = (product) => [
  {
    category: "Accessories",
    reasoning: `Adds a polished finish around ${product.category || "the main product"}.`
  },
  {
    category: "Best-selling Accessories",
    reasoning: "Brings in a reliable add-on when the match is broad or style-led."
  },
  {
    category: "Gift Wrap",
    reasoning: "Works as a safe universal essential when a niche pairing is harder to source."
  }
];

const buildPersonalizedSystemInstruction = (history) =>
  `Analyzing user history: ${JSON.stringify(history)}. Prioritize products and categories the user opened many times. Suggest 5 highly relevant products from our MongoDB collection that match these categories/tags. Ensure the output is a JSON list of products. Return ONLY valid JSON.`;

const buildCatalogPrompt = (catalog) =>
  JSON.stringify({
    catalog: catalog.map((product) => ({
      _id: String(product._id),
      name: product.name,
      category: product.category,
      tags: normalizeTags(product.tags),
      description: product.description,
      price: product.price,
      averageRating: Number(getAverageRating(product).toFixed(1)),
      stockCount: product.stockCount
    })),
    outputShape: [
      {
        _id: "MongoDB product id",
        name: "Product name",
        category: "Product category",
        reason: "Short reason based on user history"
      }
    ]
  });

const getAverageRating = (product) => {
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  if (reviews.length === 0) return 0;

  return reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length;
};

const getBestSellerScore = (product) =>
  (Array.isArray(product.reviews) ? product.reviews.length : 0) * 8 +
  getAverageRating(product) * 6 +
  Number(product.stockCount || 0) * 0.15;

const isActiveOffer = (product) =>
  Boolean(
    product.isFlashSale &&
    Number(product.discountPercentage || 0) > 0 &&
    product.saleEndTime &&
    new Date(product.saleEndTime).getTime() > Date.now()
  );

const getOfferScore = (product) =>
  (isActiveOffer(product) ? 80 : 0) +
  Number(product.discountPercentage || 0) * 2 +
  getBestSellerScore(product);

const getRecommendationScore = (product, category) => {
  const normalizedCategory = normalizeText(category);
  const tokens = tokenize(category);
  const haystacks = [
    normalizeText(product.category),
    normalizeText(product.name),
    normalizeText(product.description),
    normalizeText(normalizeTags(product.tags).join(" "))
  ];

  let score = 0;

  if (!normalizedCategory) return score;

  if (haystacks[0] === normalizedCategory) score += 28;
  if (haystacks.some((value) => value.includes(normalizedCategory))) score += 18;

  for (const token of tokens) {
    if (normalizeText(product.category).includes(token)) score += 10;
    if (normalizeText(product.name).includes(token)) score += 8;
    if (normalizeText(normalizeTags(product.tags).join(" ")).includes(token)) score += 7;
    if (normalizeText(product.description).includes(token)) score += 4;
  }

  return score;
};

const chooseBestSellerFallback = (products, usedIds = new Set()) =>
  products
    .filter((product) => !usedIds.has(String(product._id)))
    .sort((a, b) => getBestSellerScore(b) - getBestSellerScore(a))[0] || null;

const chooseProductForSuggestion = (products, suggestion, usedIds = new Set()) => {
  const availableProducts = products.filter((product) => !usedIds.has(String(product._id)));
  const scoredMatches = availableProducts
    .map((product) => ({
      product,
      score: getRecommendationScore(product, suggestion.category)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return getBestSellerScore(b.product) - getBestSellerScore(a.product);
    });

  if (scoredMatches.length > 0) {
    return scoredMatches[0].product;
  }

  return chooseBestSellerFallback(products, usedIds);
};

const getRecommendationCatalog = async () => {
  const inStockProducts = await Product.find(
    { stockCount: { $gt: 0 } },
    PRODUCT_RECOMMENDATION_FIELDS
  ).lean();

  return inStockProducts.length > 0
    ? inStockProducts
    : await Product.find({}, PRODUCT_RECOMMENDATION_FIELDS).lean();
};

const getBestOfferProductsFromCatalog = (catalog = [], limit = PERSONALIZED_RECOMMENDATION_LIMIT) =>
  [...catalog]
    .sort((a, b) => getOfferScore(b) - getOfferScore(a))
    .slice(0, limit);

const buildInterestProfile = (history = []) => {
  const categoryWeights = new Map();
  const tagWeights = new Map();
  const productWeights = new Map();

  history.forEach((entry, index) => {
    const recencyWeight = Math.max(1, CLICKED_PRODUCTS_LIMIT - index);
    const productId = String(entry.productId || "");

    if (productId) {
      productWeights.set(productId, (productWeights.get(productId) || 0) + recencyWeight);
    }

    if (entry.category) {
      const category = normalizeText(entry.category);
      categoryWeights.set(category, (categoryWeights.get(category) || 0) + recencyWeight);
    }

    normalizeTags(entry.tags).forEach((tag) => {
      const normalizedTag = normalizeText(tag);
      tagWeights.set(normalizedTag, (tagWeights.get(normalizedTag) || 0) + recencyWeight);
    });
  });

  return { categoryWeights, productWeights, tagWeights };
};

const buildInteractionHistory = (clickedProducts = []) =>
  clickedProducts
    .slice(0, CLICKED_PRODUCTS_LIMIT)
    .map((entry) => ({
      productId: String(entry.product?._id || entry.product || ""),
      name: entry.product?.name || "",
      category: entry.category || entry.product?.category || "",
      tags: normalizeTags(entry.product?.tags),
      clickedAt: entry.clickedAt
    }))
    .filter((entry) => entry.productId || entry.category);

const getPersonalizedFallbackProducts = (
  catalog = [],
  history = [],
  limit = PERSONALIZED_RECOMMENDATION_LIMIT
) => {
  if (history.length === 0) {
    return getBestOfferProductsFromCatalog(catalog, limit);
  }

  const { categoryWeights, productWeights, tagWeights } = buildInterestProfile(history);

  return [...catalog]
    .map((product) => {
      const productId = String(product._id);
      const productTags = normalizeTags(product.tags).map((tag) => normalizeText(tag));
      const tagScore = productTags.reduce((sum, tag) => sum + (tagWeights.get(tag) || 0), 0);
      const categoryScore = categoryWeights.get(normalizeText(product.category)) || 0;
      const openedScore = productWeights.get(productId) || 0;

      return {
        product,
        score:
          openedScore * 8 +
          categoryScore * 5 +
          tagScore * 3 +
          getOfferScore(product) * 0.35
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return getOfferScore(b.product) - getOfferScore(a.product);
    })
    .map((entry) => entry.product)
    .slice(0, limit);
};

const parsePersonalizedProductResponse = (rawText = "", catalog = []) => {
  try {
    const parsed = JSON.parse(stripMarkdownFence(rawText));
    if (!Array.isArray(parsed)) return [];

    const productById = new Map(catalog.map((product) => [String(product._id), product]));
    const productByName = new Map(catalog.map((product) => [normalizeText(product.name), product]));
    const usedIds = new Set();

    return parsed
      .map((item) => {
        const candidate = item?.product && typeof item.product === "object" ? item.product : item;
        const id = String(candidate?._id || candidate?.id || candidate?.productId || "");
        const name = normalizeText(candidate?.name || candidate?.productName || "");
        const product = productById.get(id) || productByName.get(name);

        if (!product || usedIds.has(String(product._id))) return null;
        usedIds.add(String(product._id));
        return product;
      })
      .filter(Boolean)
      .slice(0, PERSONALIZED_RECOMMENDATION_LIMIT);
  } catch {
    return [];
  }
};

const fillRecommendationGaps = (recommendedProducts, fallbackProducts) => {
  const usedIds = new Set(recommendedProducts.map((product) => String(product._id)));
  const fillers = fallbackProducts.filter((product) => !usedIds.has(String(product._id)));

  return [...recommendedProducts, ...fillers].slice(0, PERSONALIZED_RECOMMENDATION_LIMIT);
};

const mapSuggestionsToProducts = (catalog = [], suggestions = []) => {
  const usedIds = new Set();

  return suggestions
    .map((suggestion) => {
      const matchedProduct = chooseProductForSuggestion(catalog, suggestion, usedIds);
      if (!matchedProduct) return null;

      usedIds.add(String(matchedProduct._id));

      return {
        category: suggestion.category,
        reasoning: suggestion.reasoning,
        product: matchedProduct
      };
    })
    .filter(Boolean);
};

const buildProductPayload = (body) => {
  const snapLensId = normalizeSnapLensId(body.snapLensId || "");
  const isFlashSale = Boolean(body.isFlashSale);
  const discountPercentage = Math.max(0, Math.min(90, Number(body.discountPercentage || 0)));
  const saleDurationHours = Math.max(0, Number(body.saleDurationHours ?? body.saleDuration ?? 0));
  const saleEndTime =
    isFlashSale && discountPercentage > 0 && saleDurationHours > 0
      ? new Date(Date.now() + saleDurationHours * 60 * 60 * 1000)
      : null;

  const payload = {
    name: body.name,
    price: Number(body.price),
    description: body.description,
    category: body.category,
    image: body.image,
    stockCount: Math.max(0, Number(body.stockCount ?? 0)),
    snapLensId,
    isArEnabled: Boolean(snapLensId),
    isFlashSale: Boolean(saleEndTime),
    discountPercentage: saleEndTime ? discountPercentage : 0,
    saleDurationHours: saleEndTime ? saleDurationHours : 0,
    saleEndTime
  };

  if (body.tags !== undefined) {
    payload.tags = normalizeTags(body.tags);
  }

  return payload;
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(buildProductPayload(req.body));
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    return res.json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  } catch (error) {
    next(error);
  }
};

export const addProductReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const rating = Number(req.body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const reviewPayload = {
      userName: req.user?.name || "Customer",
      rating,
      comment: req.body.comment?.trim() || "",
      reviewImage: req.body.reviewImage?.trim() || ""
    };

    const existingReview = product.reviews.find((review) => review.userName === reviewPayload.userName);

    if (existingReview) {
      existingReview.rating = reviewPayload.rating;
      existingReview.comment = reviewPayload.comment;
      existingReview.reviewImage = reviewPayload.reviewImage;
    } else {
      product.reviews.unshift(reviewPayload);
    }

    await product.save();
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    Object.assign(product, buildProductPayload(req.body));
    const updated = await product.save();
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await product.deleteOne();
    return res.json({ message: "Product removed" });
  } catch (error) {
    next(error);
  }
};

export const trackProductClick = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select("category");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.clickedProducts = [
      {
        product: product._id,
        category: product.category,
        clickedAt: new Date()
      },
      ...(user.clickedProducts || [])
    ].slice(0, CLICKED_PRODUCTS_LIMIT);

    await user.save();

    return res.status(201).json({
      message: "Product interaction tracked",
      clickedProductsCount: user.clickedProducts.length
    });
  } catch (error) {
    next(error);
  }
};

export const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("clickedProducts preferences")
      .populate("clickedProducts.product", "name category tags");

    if (!user) return res.status(404).json({ message: "User not found" });

    const history = buildInteractionHistory(user.clickedProducts || []);
    const catalog = await getRecommendationCatalog();
    const fallbackProducts = getPersonalizedFallbackProducts(
      catalog,
      history,
      PERSONALIZED_RECOMMENDATION_LIMIT
    );

    if (history.length === 0) {
      return res.json({
        source: "best-offers",
        recommendations: fallbackProducts
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        source: "fallback",
        recommendations: fallbackProducts
      });
    }

    try {
      const result = await generateContentWithRetry({
        apiKey,
        systemInstruction: buildPersonalizedSystemInstruction(history),
        requestBody: {
          contents: [
            {
              role: "user",
              parts: [{ text: buildCatalogPrompt(catalog) }]
            }
          ]
        }
      });

      const aiProducts = parsePersonalizedProductResponse(result.response.text(), catalog);

      return res.json({
        source: aiProducts.length > 0 ? "personalized-ai" : "fallback",
        recommendations: fillRecommendationGaps(aiProducts, fallbackProducts)
      });
    } catch {
      return res.json({
        source: "fallback",
        recommendations: fallbackProducts
      });
    }
  } catch (error) {
    if (isModelNotFoundError(error)) {
      return res.status(502).json(getModelNotFoundResponse());
    }

    if (isRetryableGeminiError(error)) {
      return res.status(503).json(getServiceBusyResponse());
    }

    next(error);
  }
};

export const getAIRecommendations = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const catalog = await Product.find(
      {
        _id: { $ne: product._id },
        stockCount: { $gt: 0 }
      },
      "name price category description image stockCount reviews tags discountPercentage isFlashSale saleEndTime"
    ).lean();
    const fallbackSuggestions = buildFallbackSuggestions(product);
    const fallbackRecommendations = mapSuggestionsToProducts(catalog, fallbackSuggestions);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        productId: product._id,
        recommendations: fallbackRecommendations
      });
    }

    try {
      const result = await generateContentWithRetry({
        apiKey,
        systemInstruction: RECOMMENDATION_SYSTEM_INSTRUCTION,
        requestBody: {
          contents: [
            {
              role: "user",
              parts: [{ text: buildRecommendationPrompt(product) }]
            }
          ]
        }
      });

      const aiSuggestions = parseRecommendationResponse(result.response.text());
      const suggestions =
        aiSuggestions.length === 3 ? aiSuggestions : fallbackSuggestions;
      const recommendations = mapSuggestionsToProducts(catalog, suggestions);

      return res.json({
        productId: product._id,
        recommendations: recommendations.length > 0 ? recommendations : fallbackRecommendations
      });
    } catch {
      return res.json({
        productId: product._id,
        recommendations: fallbackRecommendations
      });
    }
  } catch (error) {
    if (isModelNotFoundError(error)) {
      return res.status(502).json(getModelNotFoundResponse());
    }

    if (isRetryableGeminiError(error)) {
      return res.status(503).json(getServiceBusyResponse());
    }

    next(error);
  }
};

export const recommendProducts = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("preferences");
    if (!user) return res.status(404).json({ message: "User not found" });

    const preferences = user.preferences || [];
    if (preferences.length === 0) {
      const fallback = await Product.find().limit(10);
      return res.json(fallback);
    }

    const regexPattern = preferences.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const products = await Product.find({
      $or: [
        { category: { $in: preferences } },
        { name: { $regex: regexPattern, $options: "i" } },
        { description: { $regex: regexPattern, $options: "i" } }
      ]
    }).limit(20);

    return res.json(products);
  } catch (error) {
    next(error);
  }
};
