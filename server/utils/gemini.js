import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL_NAME = "gemini-2.0-flash";
const MAX_RETRY_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 1500;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const createGeminiModel = (apiKey, modelName, systemInstruction) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction });
};

// Random jitter taaki saare requests ek saath retry na karein
const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 400));

const getGeminiErrorStatus = (error) =>
  error?.status ??
  error?.statusCode ??
  error?.response?.status ??
  error?.cause?.status;

const getGeminiErrorMessage = (error) =>
  error?.message ??
  error?.response?.data?.message ??
  error?.cause?.message ??
  "";

export const isModelNotFoundError = (error) =>
  getGeminiErrorStatus(error) === 404;

export const isRetryableGeminiError = (error) => {
  const status = getGeminiErrorStatus(error);
  const message = getGeminiErrorMessage(error).toLowerCase();

  return (
    RETRYABLE_STATUS_CODES.has(status) ||
    /high demand|service unavailable|try again later|temporar|overloaded|rate limit|resource exhausted|quota/.test(
      message
    )
  );
};

// Retry-After header se wait time extract karo agar available ho
const getRetryAfterMs = (error) => {
  const retryAfter =
    error?.response?.headers?.["retry-after"] ??
    error?.cause?.headers?.["retry-after"];
  if (!retryAfter) return null;
  const seconds = parseInt(retryAfter, 10);
  return isNaN(seconds) ? null : seconds * 1000;
};

const getGeminiModelNames = () =>
  [
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL_NAME,
    process.env.GEMINI_FALLBACK_MODEL?.trim(),
  ].filter((value, index, items) => value && items.indexOf(value) === index);

export const generateContentWithRetry = async ({
  apiKey,
  systemInstruction,
  requestBody,
}) => {
  const modelNames = getGeminiModelNames();
  let lastError;

  for (const modelName of modelNames) {
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const model = createGeminiModel(apiKey, modelName, systemInstruction);
        return await model.generateContent(requestBody);
      } catch (error) {
        lastError = error;

        // Model hi nahi mila – next model try karo, retry mat karo
        if (isModelNotFoundError(error)) break;

        // Non-retryable error – turant throw
        if (!isRetryableGeminiError(error)) throw error;

        // Last attempt – agle model pe jaao
        if (attempt >= MAX_RETRY_ATTEMPTS) break;

        // Retry-After header respect karo, warna exponential backoff
        const retryAfterMs = getRetryAfterMs(error);
        const backoffMs = retryAfterMs ?? BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);

        console.warn(
          `[Gemini] Model=${modelName} attempt=${attempt} retryable error. ` +
          `Waiting ${Math.round(backoffMs)}ms before retry. ` +
          `Status=${getGeminiErrorStatus(error)}`
        );

        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
};

export const getModelNotFoundResponse = () => ({
  message:
    "The configured Gemini model was not found. Set GEMINI_MODEL to a supported model such as gemini-2.0-flash and try again.",
});

export const getServiceBusyResponse = () => ({
  message:
    "Shopx AI is temporarily busy due to high demand. Please try again in a few moments.",
});