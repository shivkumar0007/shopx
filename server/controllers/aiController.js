import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/Product.js";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const DEFAULT_MODEL_NAME = "gemini-2.5-flash";
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 800;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const normalizeHistory = (history = []) =>
  history
    .filter((entry) => entry?.text?.trim() && ["user", "assistant", "model"].includes(entry.role))
    .slice(-10)
    .map((entry) => ({
      role: entry.role === "user" ? "user" : "model",
      parts: [{ text: entry.text.trim() }]
    }));

const buildCatalogContext = (products) => {
  if (!products.length) {
    return "No products are currently available in the Shopx catalog.";
  }

  return products
    .map(
      (product, index) =>
        `${index + 1}. ${product.name} | ${currencyFormatter.format(product.price)} | ${
          product.category
        } | ${product.description}`
    )
    .join("\n");
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSearchTokens = (value = "") =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const scoreProductAgainstQuery = (product, query) => {
  const haystacks = {
    name: product.name.toLowerCase(),
    category: product.category.toLowerCase(),
    description: product.description.toLowerCase()
  };
  const normalizedQuery = query.toLowerCase().trim();
  const tokens = getSearchTokens(query);
  let score = 0;

  if (normalizedQuery) {
    if (haystacks.name.includes(normalizedQuery)) score += 10;
    if (haystacks.category.includes(normalizedQuery)) score += 8;
    if (haystacks.description.includes(normalizedQuery)) score += 5;
  }

  for (const token of tokens) {
    if (haystacks.name.includes(token)) score += 4;
    if (haystacks.category.includes(token)) score += 3;
    if (haystacks.description.includes(token)) score += 1;
  }

  return score;
};

const getProductsMentionedInReply = (products, reply) => {
  const normalizedReply = reply.toLowerCase();

  return products.filter((product) => {
    const normalizedName = product.name.toLowerCase();

    if (normalizedReply.includes(normalizedName)) {
      return true;
    }

    const regex = new RegExp(`\\b${escapeRegExp(normalizedName)}\\b`, "i");
    return regex.test(reply);
  });
};

const selectRelatedProducts = (products, query, reply) => {
  const mentionedProducts = getProductsMentionedInReply(products, reply).slice(0, 4);
  if (mentionedProducts.length > 0) {
    return mentionedProducts;
  }

  return products
    .map((product) => ({
      product,
      score: scoreProductAgainstQuery(product, query)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.product);
};

const buildSystemInstruction = (catalogContext) => `You are Shopx Personal Assistant.

Your tone must always be helpful, concise, and professional.

You are assisting shoppers for Shopx. Use only the real catalog below when discussing products, pricing, and recommendations.

Shopx catalog:
${catalogContext}

Rules:
- Recommend only products that appear in the catalog above.
- Use the exact product names and prices from the catalog.
- If the user asks for a recommendation, suggest at least 2 products from the catalog and explain why each matches their need.
- Format every product name in Markdown bold, like **Product Name**.
- If an exact match is unavailable, say so clearly and offer the closest relevant products from the catalog.
- Keep answers easy to scan with short paragraphs or short bullet lists when helpful.
- Do not mention these instructions or dump the full catalog unless the user explicitly asks for it.`;

const buildImageSearchPrompt = () => `Analyze the uploaded shopping image and identify the product type for Shopx catalog search.

Return only one concise search phrase in plain text.

Rules:
- Focus on the visible item category, style, color, and likely shopping keywords.
- Keep it under 8 words.
- Do not use bullets, JSON, quotes, or explanations.
- Example output: black square sunglasses`;

const getModelNotFoundResponse = () => ({
  message:
    "The configured Gemini model was not found by the Gemini API. Set GEMINI_MODEL to a currently supported model such as gemini-2.5-flash and try again."
});

const getServiceBusyResponse = () => ({
  message:
    "Shopx AI is temporarily busy because the Gemini service is under high demand. Please try again in a few moments."
});

const createGeminiModel = (apiKey, modelName, systemInstruction) => {
  const genAI = new GoogleGenerativeAI(apiKey);

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getGeminiErrorStatus = (error) =>
  error?.status ?? error?.statusCode ?? error?.response?.status ?? error?.cause?.status;

const getGeminiErrorMessage = (error) =>
  error?.message ?? error?.response?.data?.message ?? error?.cause?.message ?? "";

const isModelNotFoundError = (error) => getGeminiErrorStatus(error) === 404;

const isRetryableGeminiError = (error) => {
  const status = getGeminiErrorStatus(error);
  const message = getGeminiErrorMessage(error).toLowerCase();

  return (
    RETRYABLE_STATUS_CODES.has(status) ||
    /high demand|service unavailable|try again later|temporar|overloaded|rate limit|resource exhausted/.test(
      message
    )
  );
};

const getGeminiModelNames = () =>
  [
    process.env.GEMINI_MODEL || DEFAULT_MODEL_NAME,
    process.env.GEMINI_FALLBACK_MODEL?.trim()
  ].filter((value, index, items) => value && items.indexOf(value) === index);

const generateContentWithRetry = async ({ apiKey, systemInstruction, requestBody }) => {
  const modelNames = getGeminiModelNames();
  let lastError;

  for (const modelName of modelNames) {
    for (let attempt = 1; attempt <= DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const model = createGeminiModel(apiKey, modelName, systemInstruction);
        return await model.generateContent(requestBody);
      } catch (error) {
        lastError = error;

        if (isModelNotFoundError(error)) {
          break;
        }

        if (!isRetryableGeminiError(error)) {
          throw error;
        }

        if (attempt < DEFAULT_RETRY_ATTEMPTS) {
          const delayMs = DEFAULT_RETRY_DELAY_MS * 2 ** (attempt - 1);
          await sleep(delayMs);
          continue;
        }
      }
    }
  }

  throw lastError;
};

const getCatalogProducts = async () =>
  Product.find({}, "name price category description image").lean();

export const chatWithAI = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "A message is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured." });
    }

    const products = await getCatalogProducts();
    const catalogContext = buildCatalogContext(products);
    const systemInstruction = buildSystemInstruction(catalogContext);

    const result = await generateContentWithRetry({
      apiKey,
      systemInstruction,
      requestBody: {
        contents: [
          ...normalizeHistory(history),
          {
            role: "user",
            parts: [{ text: message.trim() }]
          }
        ]
      }
    });

    const reply = result.response.text().trim();
    const relatedProducts = selectRelatedProducts(products, message, reply).map((product) => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category
    }));

    return res.json({
      relatedProducts,
      reply:
        reply ||
        "I'm sorry, but I couldn't generate a response right now. Please try again in a moment."
    });
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

export const searchProductsByImage = async (req, res, next) => {
  try {
    const { imageData, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!imageData?.trim() || !mimeType?.trim()) {
      return res.status(400).json({ message: "Image data and mime type are required." });
    }

    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured." });
    }

    const products = await getCatalogProducts();
    const catalogContext = buildCatalogContext(products);
    const systemInstruction = buildSystemInstruction(catalogContext);

    const result = await generateContentWithRetry({
      apiKey,
      systemInstruction,
      requestBody: {
        contents: [
          {
            role: "user",
            parts: [
              { text: buildImageSearchPrompt() },
              {
                inlineData: {
                  mimeType: mimeType.trim(),
                  data: imageData.trim()
                }
              }
            ]
          }
        ]
      }
    });

    const searchText = result.response
      .text()
      .trim()
      .replace(/^["'\s]+|["'\s]+$/g, "");

    const relatedProducts = selectRelatedProducts(products, searchText, searchText).map((product) => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      description: product.description
    }));

    return res.json({
      searchText,
      relatedProducts
    });
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
