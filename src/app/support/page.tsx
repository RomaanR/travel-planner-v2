"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";

type Status = "idle" | "sending" | "success" | "error";

export default function SupportPage() {
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, message }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again.";
        setErrorMsg(msg);
        setStatus("error");
      }
    } catch {
      setErrorMsg("Unable to send your message. Please check your connection.");
      setStatus("error");
    }
  }

  const inputClass =
    "border border-ink/20 bg-transparent px-4 py-3 font-sans text-sm text-ink " +
    "placeholder:text-ink-light focus:outline-none focus:border-ink/60 transition-colors w-full";

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 md:px-16 pt-24 pb-24">

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="mb-12"
        >
          <BackButton href="/" label="HOME" />
        </motion.div>

        {/* Editorial header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="mb-12"
        >
          <p className="micro-copy text-ink-light mb-4">Client Support</p>
          <div className="w-12 h-px bg-ink/20 mb-6" />
          <h1
            className="font-serif italic text-ink leading-none mb-4"
            style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
          >
            How can we assist you?
          </h1>
          <p className="font-sans text-ink-light text-base md:text-lg leading-relaxed max-w-md">
            Share your question or concern. Our concierge team will respond within 24 hours.
          </p>
        </motion.div>

        {/* Form / Success toggle */}
        <AnimatePresence mode="wait">
          {status === "success" ? (

            /* ── Success state ── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="border border-ink/10 bg-paper-dark px-8 py-10"
            >
              <p className="micro-copy text-emerald-accent mb-3">Message Received</p>
              <p className="font-serif italic text-ink text-2xl leading-snug mb-4">
                Thank you.
              </p>
              <p className="font-sans text-ink-light text-sm leading-relaxed max-w-sm">
                Our concierge team has received your message and will respond shortly.
              </p>
            </motion.div>

          ) : (

            /* ── Form ── */
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
            >
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="micro-copy text-ink-light">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                  className={inputClass}
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="micro-copy text-ink-light">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe your question, issue, or feedback&hellip;"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={status === "sending"}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Error message */}
              <AnimatePresence>
                {status === "error" && errorMsg && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-[11px] tracking-widest uppercase text-burnt-orange"
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className={
                    "micro-copy bg-ink text-paper px-8 py-3 transition-colors duration-200 " +
                    (status === "sending"
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-burnt-orange cursor-pointer")
                  }
                >
                  {status === "sending" ? "SENDING\u2026" : "SEND MESSAGE"}
                </button>
              </div>
            </motion.form>

          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
