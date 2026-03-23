import React from 'react';
import { FaEnvelope } from 'react-icons/fa';

type ContactCTAProps = {
  topCtaLabel?: string;
  topCtaHref?: string;
};

export default function ContactCTA({
  topCtaLabel = "Let's make hiring simple!",
  topCtaHref = '/employer/login',
}: ContactCTAProps) {
  return (
    <section className="connect-section reveal reveal--up bg-gray-50 py-0">
      {/* Top banner: Ready to get Started */}
      <div className="bg-gray-100 py-8 mb-8">
        <div className="container text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Ready to get <span className="text-emerald-600 relative inline-block heading--smile">Started
            {/* Yellow curved underline (SVG) */}
            {/* <svg aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 -bottom-3 md:-bottom-4 w-24 md:w-36 h-5 md:h-6 text-amber-400" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 18 C34 28 86 28 110 18" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg> */}
          </span>
          </h2>
          <div className="mt-4">
            <a href={topCtaHref} className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-full text-sm shadow-sm hover:bg-emerald-800">{topCtaLabel}</a>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="max-w-6xl mx-auto mt-0 sm:mt-4">
          <div className="bg-white rounded-lg shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 md:p-10">
            <div>
              <h3 className="text-3xl font-semibold">Let&apos;s <span className="text-emerald-600    decoration-2 underline-offset-4  heading--smile">Connect</span></h3>
              <p className="mt-3 text-gray-600 max-w-md">We appreciate quick responses. Drop us a message, and we’ll get back to you faster than your coffee cools!</p>
              <a href="/contact" className="inline-block mt-6 px-6 py-3 bg-emerald-700 text-white font-medium rounded-full shadow-md hover:bg-emerald-800 transition">Contact Now</a>
            </div>

            {/* Right card - floating, shadowed */}
            <div className="flex items-center justify-center md:justify-end">
              <div className="w-full max-w-sm bg-white border border-gray-100 rounded-xl p-6 md:p-8 shadow-lg transform -translate-y-4 md:translate-y-0">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
                    <FaEnvelope aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email Us</div>
                    <a href="mailto:admin@findtern.in" className="text-sm font-medium text-gray-800 hover:underline">For inquiries: admin@findtern.in</a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
