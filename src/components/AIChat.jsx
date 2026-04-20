import axios from "axios";
import { MessageCircle, SendHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import ProductImage from "./ProductImage.jsx";

const initialAssistantMessage =
  "Welcome to SHOPX. I'm your personal shopping assistant. Ask for product suggestions, budget-friendly picks, or category-specific recommendations.";

const renderInlineFormatting = (text, keyPrefix, role) =>
  text.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((segment, index) => {
    const isBold = segment.startsWith("**") && segment.endsWith("**");

    if (isBold) {
      return (
        <strong
          key={`${keyPrefix}-bold-${index}`}
          className={role === "user" ? "font-semibold text-white" : "font-semibold text-[#111827] dark:text-white"}
        >
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${keyPrefix}-text-${index}`}>{segment}</span>;
  });

const renderMessageText = (text, role) =>
  text.split("\n").map((line, index) => {
    if (!line.trim()) {
      return <div key={`space-${index}`} className="h-3" />;
    }

    return (
      <p key={`line-${index}`} className="leading-6">
        {renderInlineFormatting(line, `line-${index}`, role)}
      </p>
    );
  });

const TypingIndicator = () => (
  <div className="flex max-w-[85%] items-end gap-3">
    <div className="rounded-[1.4rem] border border-white/20 bg-white/65 px-4 py-3 text-sm text-slate-600 shadow-[0_16px_50px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-white/10 dark:text-white/80">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#6c63ff]">Typing...</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-[#6c63ff] animate-bounce"
              style={{ animationDelay: `${dot * 0.12}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: "assistant-welcome", role: "assistant", text: initialAssistantMessage, products: [] }
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, isTyping, open]);

  const sendMessage = async (event) => {
    event?.preventDefault();

    if (!input.trim() || isTyping) return;

    const text = input.trim();
    const history = messages.map(({ role, text: content }) => ({ role, text: content }));
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/ai/chat`, {
        message: text,
        history
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now() + 1}`,
          role: "assistant",
          products: Array.isArray(data?.relatedProducts) ? data.relatedProducts : [],
          text:
            data?.reply ||
            "I'm sorry, but I couldn't prepare a recommendation right now. Please try again."
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now() + 1}`,
          role: "assistant",
          products: [],
          text:
            error?.response?.data?.message ||
            "I'm having trouble reaching the SHOPX assistant right now. Please try again in a moment."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[32rem] w-[calc(100vw-2rem)] max-w-[24rem] flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 text-slate-900 shadow-[0_32px_90px_rgba(15,23,42,0.22)] backdrop-blur-md dark:bg-black/70 dark:text-white sm:right-8">
          <div className="relative overflow-hidden border-b border-white/20 px-5 py-4">
            <div
              className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full blur-3xl"
              style={{ background: "rgba(108, 99, 255, 0.22)" }}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 text-white shadow-[0_12px_30px_rgba(108,99,255,0.35)]"
                  style={{ background: "linear-gradient(135deg, #6c63ff 0%, #8b7dff 100%)" }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-800 dark:text-white/95">
                    SHOPX Personal Assistant
                  </p>
                  <p className="mt-1 max-w-[15rem] text-xs leading-5 text-slate-500 dark:text-white/60">
                    Live catalog guidance with tailored product suggestions and pricing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 bg-white/55 p-2 text-slate-700 transition hover:scale-105 hover:bg-white/80 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
                aria-label="Close AI shopping assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[87%] rounded-[1.6rem] px-4 py-3 text-sm shadow-[0_14px_40px_rgba(15,23,42,0.1)] ${
                    message.role === "user"
                      ? "border border-[#6c63ff]/25 text-white"
                      : "border border-white/20 bg-white/75 text-slate-700 backdrop-blur-md dark:bg-white/10 dark:text-white/80"
                  }`}
                  style={
                    message.role === "user"
                      ? {
                          background:
                            "linear-gradient(135deg, rgba(108,99,255,1) 0%, rgba(124,116,255,0.92) 100%)"
                        }
                      : undefined
                  }
                >
                  {renderMessageText(message.text, message.role)}
                </div>

                {message.role === "assistant" && Array.isArray(message.products) && message.products.length > 0 && (
                  <div className="mt-2 grid gap-2">
                    {message.products.map((product) => (
                      <Link
                        key={product._id}
                        to={`/products/${product._id}`}
                        className="flex items-center gap-3 rounded-[1.2rem] border border-white/20 bg-white/80 p-2.5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:scale-[1.01] hover:border-[#6c63ff]/35 hover:bg-white dark:bg-white/10"
                        onClick={() => setOpen(false)}
                      >
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-white">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-white/60">
                            {product.category}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#6c63ff]">
                            Rs. {product.price}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-white/20 p-4">
            <div className="flex items-center gap-2 rounded-[1.4rem] border border-white/20 bg-white/70 px-3 py-2 shadow-[0_10px_40px_rgba(15,23,42,0.1)] backdrop-blur-md dark:bg-white/10">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="h-11 flex-1 bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/35"
                placeholder="Ask for recommendations, gifting ideas, or price-conscious picks..."
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6c63ff 0%, #857dff 100%)",
                  boxShadow: "0 12px 30px rgba(108, 99, 255, 0.28)"
                }}
                aria-label="Send message"
              >
                <SendHorizontal size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-8 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/25 text-white transition duration-300 hover:scale-105 sm:right-8"
        style={{
          background: "linear-gradient(135deg, #6c63ff 0%, #857dff 100%)",
          boxShadow: "0 20px 45px rgba(108, 99, 255, 0.35)"
        }}
        aria-label="Open AI shopping assistant"
      >
        <MessageCircle size={20} />
      </button>
    </>
  );
};

export default AIChat;
