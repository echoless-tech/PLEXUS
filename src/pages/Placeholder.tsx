import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { PageHeader, Tile, Button } from '../components/ui';

const TITLES: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  '/settings': {
    eyebrow: 'Workspace',
    title: 'Settings',
    subtitle: 'Business preferences, team access and integrations will live here.',
  },
  '/help': {
    eyebrow: 'Support',
    title: 'Help & Resources',
    subtitle: 'Guides, FAQs and live chat support are on the way.',
  },
};

const Placeholder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = TITLES[location.pathname] ?? {
    eyebrow: 'NODAL',
    title: 'Coming soon',
    subtitle: "This part of the workspace isn't ready yet \u2014 check back shortly.",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        subtitle={meta.subtitle}
        actions={
          <Button variant="soft" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
        }
      />

      <Tile className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-ink">We're building this</p>
          <p className="mx-auto max-w-md text-sm text-muted">
            This feature is part of the NODAL roadmap. In the meantime, everything you need to run
            your business is on the dashboard and the tools in the sidebar.
          </p>
        </div>
        <Button variant="accent" onClick={() => navigate('/ai')}>
          Explore the AI Hub
        </Button>
      </Tile>
    </div>
  );
};

export default Placeholder;
