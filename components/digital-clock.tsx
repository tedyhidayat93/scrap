'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function DigitalClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set time immediately on mount
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!currentTime) {
    return (
      <div className="flex flex-wrap gap-3">
        <div className="text-xs font-medium">Loading...</div>
      </div>
    );
  }

  const formattedDate = format(currentTime, 'EEEE, d MMMM yyyy', { locale: id });
  const formattedTime = format(currentTime, 'HH:mm:ss');

  return (
    <div className="flex flex-wrap gap-3">
      <div className="text-xs font-medium">{formattedDate}</div>
      <div className="text-xs text-muted-foreground">{formattedTime} WIB</div>
    </div>
  );
}
