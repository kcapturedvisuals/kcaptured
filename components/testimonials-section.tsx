'use client';

import { Testimonial } from '@/lib/testimonials-data';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const response = await fetch('/api/testimonials');
        if (!response.ok) {
          throw new Error('Failed to load testimonials');
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Unexpected response');
        }
        setTestimonials(data);
      } catch (error) {
        console.error('Failed to load testimonials:', error);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    }

    loadTestimonials();
  }, []);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (loading) {
    return null;
  }

  if (testimonials.length === 0) {
    return <section className="bg-black py-16 text-center text-gray-400">No testimonials available yet.</section>;
  }

  const current = testimonials[currentIndex];

  return (
    <section 
      className="py-16 md:py-24 relative"
      style={{
        backgroundImage: 'url(https://res.cloudinary.com/dq4tkpuu4/image/upload/v1773520574/kcompressed_iul9zi.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Client Testimonials
          </h2>
          <p className="text-xl text-gray-200">
            Hear from those who trust us with their special moments
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-md border border-gray-700">
          {/* Video/Content Area */}
          {current.videoUrl && (
            <div className="mb-8 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center max-w-2xl mx-auto">
              <video
                src={current.videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Client info */}
          <div className="text-center mb-8 space-y-1">
            <p className="font-semibold text-lg text-white">
              {current.clientName}
            </p>
            <p className="text-gray-400">{current.clientRole}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={prev}
              size="icon"
              className="bg-transparent border-white text-white hover:bg-white hover:text-black"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-gray-600'
                  }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={next}
              size="icon"
              className="bg-transparent border-white text-white hover:bg-white hover:text-black"
              aria-label="Next testimonial"
            >
              <ChevronRight size={24} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
