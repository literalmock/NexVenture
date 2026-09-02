import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "NEXVENTURE put the right investors in front of us before we even finished the deck.",
    name: "Ananya Rao",
    role: "Founder, AI HealthCare",
    metric: "Seed closed in 6 weeks",
  },
  {
    quote: "I see traction, mentor endorsements, and team depth before the first call.",
    name: "John Anderson",
    role: "Angel Investor",
    metric: "18 investments tracked",
  },
  {
    quote: "I joined a two-person startup as its first designer during my final semester.",
    name: "Meera Shah",
    role: "Product Designer",
    metric: "Joined at day zero",
  },
];

export function Testimonials() {
  return (
    <section id="voices" className="bg-[#f3f0e7] px-5 py-24 text-[#0a0d0c] sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
              05 / From the network
            </p>
            <h2 className="mt-8 text-[clamp(3.5rem,6vw,6.8rem)] leading-[0.84] font-semibold tracking-[-0.075em]">
              Outcomes,
              <span className="block font-serif font-normal italic">not vanity.</span>
            </h2>
            <p className="mt-7 max-w-sm text-base leading-7 text-[#0a0d0c]/55">
              The best network is measured by what happens after the introduction.
            </p>
          </div>

          <div className="border-t border-[#0a0d0c]/20">
            {testimonials.map((testimonial, index) => (
              <motion.figure
                key={testimonial.name}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55 }}
                className="grid gap-8 border-b border-[#0a0d0c]/20 py-10 sm:grid-cols-[70px_1fr] sm:py-14"
              >
                <span className="font-serif text-5xl text-[#ff7a59]">“</span>
                <div>
                  <blockquote className="max-w-3xl text-2xl leading-[1.2] tracking-[-0.035em] sm:text-4xl">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="mt-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">{testimonial.name}</p>
                      <p className="mt-1 text-xs text-[#0a0d0c]/48">{testimonial.role}</p>
                    </div>
                    <span className="rounded-full border border-[#0a0d0c]/20 px-3 py-1.5 font-mono text-[9px] font-bold tracking-wide uppercase">
                      {String(index + 1).padStart(2, "0")} · {testimonial.metric}
                    </span>
                  </figcaption>
                </div>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
