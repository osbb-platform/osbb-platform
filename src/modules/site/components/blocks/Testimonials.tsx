import type { SiteTestimonialContent } from "@/src/modules/site/data/siteContent";

type TestimonialsProps = {
  testimonials: readonly SiteTestimonialContent[];
};

export function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <div className="osbb-testimonials">
      {testimonials.map((testimonial) => (
        <blockquote className="osbb-testimonial" key={testimonial.id}>
          <p>«{testimonial.quote}»</p>

          <footer>
            <strong>{testimonial.authorName}</strong>
            <span>
              {testimonial.authorRole}, {testimonial.city}
            </span>
          </footer>
        </blockquote>
      ))}
    </div>
  );
}
