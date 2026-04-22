import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL_NAME = "gemini-2.5-flash";
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 800;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

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

export const isModelNotFoundError = (error) => getGeminiErrorStatus(error) === 404;

export const isRetryableGeminiError = (error) => {
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

export const generateContentWithRetry = async ({ apiKey, systemInstruction, requestBody }) => {
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

export const getModelNotFoundResponse = () => ({
  message:
    "The configured Gemini model was not found by the Gemini API. Set GEMINI_MODEL to a currently supported model such as gemini-2.5-flash and try again."
});

export const getServiceBusyResponse = () => ({
  message:
    "Shopx AI is temporarily busy because the Gemini service is under high demand. Please try again in a few moments."
});
