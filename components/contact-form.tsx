'use client';

import { useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { isValidEmail, sanitizeText } from '@/lib/input-validation';

export function ContactForm() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const aboutImageUrl = 'https://res.cloudinary.com/dq4tkpuu4/image/upload/v1779992592/Kenny_v7ay6n.png';
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [-40, 36]);
  const imageScale = useTransform(scrollYProgress, [0, 0.4, 1], [1, 1, 1]);
  const accentScale = useTransform(scrollYProgress, [0.05, 0.42], [0, 1]);
  const panelX = useTransform(scrollYProgress, [0, 0.38], [-80, 0]);
  const panelOpacity = useTransform(scrollYProgress, [0, 0.28], [0, 1]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const honeypot = formData.get('website')?.toString().trim();

    if (honeypot) {
      setIsSubmitting(false);
      return;
    }

    const name = sanitizeText(formData.get('name'));
    const email = sanitizeText(formData.get('email')).toLowerCase();
    const subject = sanitizeText(formData.get('subject')) || 'Photography Inquiry';
    const message = sanitizeText(formData.get('message'));
    setFormError('');

    if (
      !name ||
      !email ||
      !message ||
      name.length > 100 ||
      subject.length > 150 ||
      message.length > 2000 ||
      !isValidEmail(email)
    ) {
      setFormError('Check the name, email, subject, and message fields and try again.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (response.ok) {
        setSubmitted(true);
        formElement.reset();
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        const result = await response.json().catch(() => ({}));
        setFormError(result.error || 'Your message could not be sent. Please try again.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setFormError('Your message could not be sent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="mx-auto w-full max-w-[430px] lg:ml-14 lg:mr-auto xl:ml-24">
      <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.3em] text-[#c0392b]">
        Contact
      </p>
      <h2 className="mb-9 font-serif text-4xl font-normal leading-none text-[#f0f0f0] sm:text-5xl">
        Let&apos;s talk<span className="italic text-[#c0392b]">.</span>
      </h2>

      {submitted ? (
        <div className="py-8">
          <div className="mb-5 h-px w-8 bg-[#c0392b]" />
          <p className="text-[15px] font-light leading-8 text-[#f0f0f0]">
            Message received.
            <br />
            I&apos;ll be in touch soon.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="sr-only">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              autoComplete="off"
              tabIndex={-1}
              className="pointer-events-none absolute opacity-0"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-[10px] uppercase tracking-[0.22em] text-[#666]">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your name"
                maxLength={100}
                autoComplete="name"
                required
                className="w-full border-0 border-b border-[#2a2a2a] bg-transparent px-0 py-3 text-sm leading-7 text-[#f0f0f0] outline-none transition-colors placeholder:text-[#3a3a3a] focus:border-[#c0392b]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[10px] uppercase tracking-[0.22em] text-[#666]">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                maxLength={254}
                autoComplete="email"
                required
                className="w-full border-0 border-b border-[#2a2a2a] bg-transparent px-0 py-3 text-sm leading-7 text-[#f0f0f0] outline-none transition-colors placeholder:text-[#3a3a3a] focus:border-[#c0392b]"
              />
            </div>
          </div>

          {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}

          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-[10px] uppercase tracking-[0.22em] text-[#666]">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Tell me about your project..."
              rows={4}
              maxLength={2000}
              required
              className="w-full resize-none border-0 border-b border-[#2a2a2a] bg-transparent px-0 py-3 text-sm leading-7 text-[#f0f0f0] outline-none transition-colors placeholder:text-[#3a3a3a] focus:border-[#c0392b]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-none border-0 bg-[#c0392b] px-7 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white hover:bg-[#a93226] disabled:bg-[#c0392b]/40"
            >
              <Mail size={16} />
              {isSubmitting ? 'Sending' : 'Send Message '}
            </Button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <motion.section
      ref={sectionRef}
      id="contact"
      className="relative min-h-screen overflow-hidden bg-[#0c0c0c] text-white"
    >
      <motion.div
        className="absolute inset-0 hidden bg-[#c61f34] lg:block"
        style={{
          clipPath: 'polygon(42% 0, 100% 0, 100% 100%, 58% 100%)',
          y: imageY,
          scale: imageScale,
        }}
      >
        <img
          src={aboutImageUrl}
          alt="KCAPTURED portrait"
          className="h-full w-full object-contain object-right"
        />
        <div className="absolute inset-0 bg-black/15" />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0 hidden origin-top bg-[#c0392b] opacity-90 lg:block"
        style={{
          clipPath: 'polygon(calc(42% - 2px) 0, calc(42% + 2px) 0, calc(58% + 2px) 100%, calc(58% - 2px) 100%)',
          scaleY: accentScale,
        }}
      />

      <div className="relative min-h-screen lg:hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: imageY, scale: imageScale }}
        >
          <img
            src={aboutImageUrl}
            alt="KCAPTURED portrait"
            className="h-full w-full object-cover"
            style={{ objectPosition: '40% center' }}
          />
          <div className="absolute inset-0 bg-[#0c0c0c]/85" />
        </motion.div>

        <motion.div
          className="relative z-10 flex min-h-screen w-full items-center bg-[#0c0c0c]/92 px-6 py-20 sm:px-10"
          initial={{ opacity: 0, y: 44 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.35 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {formContent}
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 mr-auto hidden min-h-screen w-[58%] items-center bg-[#0c0c0c] px-10 py-20 lg:flex"
        style={{
          clipPath: 'polygon(0 0, 72% 0, 100% 100%, 0 100%)',
          x: panelX,
          opacity: panelOpacity,
        }}
      >
        {formContent}
      </motion.div>
    </motion.section>
  );
}
