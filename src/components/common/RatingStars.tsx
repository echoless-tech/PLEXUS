import React from 'react';
import { Star } from 'lucide-react';
import type { BusinessRating } from '../../types';
import { confidenceLabel } from '../../lib/rating';
import { cn } from '../../lib/cn';

/** Five-star display of a derived rating, with a confidence caption. */
export const RatingStars: React.FC<{
  rating: BusinessRating;
  size?: number;
  showLabel?: boolean;
  className?: string;
}> = ({ rating, size = 14, showLabel = true, className }) => {
  const filled = Math.round(rating.score);
  const none = rating.confidence === 'none';
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5', className)}>
      <span className="flex items-center gap-0.5" aria-label={`${rating.score} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(i <= filled && !none ? 'fill-accent text-accent' : 'text-faint')}
            strokeWidth={1.75}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-[0.75rem] text-muted">
          {none ? confidenceLabel.none : `${rating.score.toFixed(1)} · ${confidenceLabel[rating.confidence]}`}
        </span>
      )}
    </div>
  );
};

export default RatingStars;
