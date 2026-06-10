import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LifeBuoy, MessageCircle, Mail, BookOpen } from 'lucide-react';
import { PageHeader, Tile, Label, Button } from '../components/ui';
import { cn } from '../lib/cn';

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'What is NODAL and who is it for?',
    a: 'NODAL is a business intelligence workspace built for South African SMEs. It brings your inventory, sales, cash flow and suppliers into one place, then layers AI insights on top so you can make faster, data-backed decisions.',
  },
  {
    q: 'How does the AI Coach work?',
    a: 'The AI Coach reads your live business data and benchmarks it against thousands of similar SMEs. Ask it anything — from "forecast my revenue" to "where am I losing money" — and it responds with tailored, actionable guidance. You can open it from the sidebar.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Your business data stays scoped to your workspace and is only sent to the AI service to generate the insights you request. We never sell your data or share it with third parties.',
  },
  {
    q: 'How is my AI credit score calculated?',
    a: 'The score blends several weighted factors — cash flow stability, sales velocity, inventory health and payment consistency. Each factor is scored from your real data and combined into a single grade you can track over time on the AI Hub.',
  },
  {
    q: 'Can I change the look of the app?',
    a: 'Absolutely. Open Settings to switch between light and dark mode and pick from several accent themes. The whole interface — including the glass surfaces and the AI blob — recolours instantly.',
  },
  {
    q: 'How do I add products, sales or suppliers?',
    a: 'Each section has an add button in the top-right (e.g. "Add product" on Inventory). Fill in the details and save — your dashboard metrics and AI insights update automatically.',
  },
  {
    q: 'How do I share my storefront?',
    a: 'Go to Storefront, customise your profile and products, then copy your storefront link or share it straight to WhatsApp. Customers can browse your catalogue without needing an account.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Most tables — sales, inventory, cash flow — have an Export option that downloads a CSV you can open in Excel or Google Sheets. Invoices can be printed or saved as PDF from the Sales screen.',
  },
];

const FAQItem: React.FC<{ faq: FAQ; open: boolean; onToggle: () => void }> = ({ faq, open, onToggle }) => (
  <div className="border-b border-hairline last:border-b-0">
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 py-4 text-left"
      aria-expanded={open}
    >
      <span className="text-[0.9375rem] font-semibold text-ink">{faq.q}</span>
      <ChevronDown
        className={cn(
          'h-5 w-5 shrink-0 text-muted transition-transform duration-300',
          open && 'rotate-180 text-accent',
        )}
      />
    </button>
    <div
      className={cn(
        'grid transition-all duration-300 ease-out',
        open ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="overflow-hidden">
        <p className="text-[0.875rem] leading-relaxed text-muted">{faq.a}</p>
      </div>
    </div>
  </div>
);

const Help: React.FC = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help & FAQs"
        subtitle="Answers to common questions about running your business on NODAL."
      />

      {/* Quick support channels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile interactive as="button" onClick={() => navigate('/coach')} className="items-start gap-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.9375rem] font-semibold text-ink">Ask the AI Coach</p>
            <p className="text-[0.8125rem] text-muted">Instant answers from your data</p>
          </div>
        </Tile>
        <Tile interactive as="button" onClick={() => { window.location.href = 'mailto:support@nodal.co.za'; }} className="items-start gap-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.9375rem] font-semibold text-ink">Email support</p>
            <p className="text-[0.8125rem] text-muted">support@nodal.co.za</p>
          </div>
        </Tile>
        <Tile interactive as="button" onClick={() => navigate('/ai')} className="items-start gap-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.9375rem] font-semibold text-ink">Explore the AI Hub</p>
            <p className="text-[0.8125rem] text-muted">Insights & benchmarks</p>
          </div>
        </Tile>
      </div>

      {/* FAQ list */}
      <Tile className="gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <LifeBuoy className="h-4 w-4" />
          </span>
          <Label>Frequently asked questions</Label>
        </div>
        <div className="mt-2">
          {FAQS.map((faq, i) => (
            <FAQItem
              key={faq.q}
              faq={faq}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </Tile>

      {/* Still need help */}
      <Tile className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-lg font-semibold text-ink">Still need a hand?</p>
        <p className="mx-auto max-w-md text-sm text-muted">
          Our team is here to help you get the most out of NODAL. Reach out any time and we'll get
          back to you.
        </p>
        <Button variant="accent" onClick={() => navigate('/coach')}>
          <MessageCircle className="h-4 w-4" />
          Chat with the AI Coach
        </Button>
      </Tile>
    </div>
  );
};

export default Help;
