import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeadlineCalculatorProps {
  state: string;
  role: string;
  dateType: 'last-furnishing' | 'first-furnishing';
}

// ─── Deadline Logic ───────────────────────────────────────────────────────────

function calculateDeadline(
  state: string,
  role: string,
  inputDate: string,
  projectType: 'residential' | 'commercial'
): { deadline: Date | null; ruleSummary: string } {
  if (!inputDate) return { deadline: null, ruleSummary: '' };

  const date = new Date(inputDate + 'T00:00:00');

  switch (state) {
    case 'michigan': {
      const days = projectType === 'residential' ? 90 : 180;
      const deadline = new Date(date);
      deadline.setDate(deadline.getDate() + days);
      return {
        deadline,
        ruleSummary: `Michigan: ${days} days from last furnishing date (${projectType} project).`,
      };
    }

    case 'california': {
      const deadline = new Date(date);
      deadline.setDate(deadline.getDate() + 90);
      return {
        deadline,
        ruleSummary: 'California: 90 days from last furnishing date.',
      };
    }

    case 'texas': {
      const isGC =
        role === 'general-contractor';
      const isSub =
        role === 'subcontractor' ||
        role === 'sub-subcontractor' ||
        role === 'material-supplier' ||
        role === 'equipment-rental';

      if (isGC) {
        // 15th of 4th month after last furnishing
        const deadline = new Date(date);
        deadline.setMonth(deadline.getMonth() + 4);
        deadline.setDate(15);
        return {
          deadline,
          ruleSummary: 'Texas (GC): 15th of the 4th month after last furnishing.',
        };
      } else if (isSub && projectType === 'residential') {
        // 15th of 3rd month after month of last furnishing
        const deadline = new Date(date);
        deadline.setMonth(deadline.getMonth() + 3);
        deadline.setDate(15);
        return {
          deadline,
          ruleSummary: 'Texas (Sub, residential): 15th of the 3rd month after month of last furnishing.',
        };
      } else {
        // Sub, commercial: 15th of 4th month
        const deadline = new Date(date);
        deadline.setMonth(deadline.getMonth() + 4);
        deadline.setDate(15);
        return {
          deadline,
          ruleSummary: 'Texas (Sub, commercial): 15th of the 4th month after month of last furnishing.',
        };
      }
    }

    case 'florida': {
      // Florida NTO: 45 days from first furnishing date
      const deadline = new Date(date);
      deadline.setDate(deadline.getDate() + 45);
      return {
        deadline,
        ruleSummary: 'Florida NTO: 45 days from first furnishing date.',
      };
    }

    default: {
      // Generic: 90 days
      const deadline = new Date(date);
      deadline.setDate(deadline.getDate() + 90);
      return {
        deadline,
        ruleSummary: 'Generic: 90 days from furnishing date. Verify your state\'s specific rules.',
      };
    }
  }
}

function daysUntil(deadline: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeadlineCalculator({
  state,
  role,
  dateType,
}: DeadlineCalculatorProps) {
  const [inputDate, setInputDate] = useState('');
  const [projectType, setProjectType] = useState<'residential' | 'commercial'>('residential');
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderSet, setReminderSet] = useState(false);

  const { deadline, ruleSummary } = calculateDeadline(state, role, inputDate, projectType);
  const daysLeft = deadline ? daysUntil(deadline) : null;

  const urgencyColor =
    daysLeft === null
      ? 'text-slate-500'
      : daysLeft < 7
      ? 'text-red-600'
      : daysLeft <= 30
      ? 'text-amber-600'
      : 'text-trust-green';

  const urgencyBg =
    daysLeft === null
      ? 'bg-slate-50 border-slate-200'
      : daysLeft < 7
      ? 'bg-red-50 border-red-200'
      : daysLeft <= 30
      ? 'bg-amber-50 border-amber-200'
      : 'bg-green-50 border-green-200';

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderEmail || !deadline) return;

    // Store in localStorage for now
    const reminders = JSON.parse(localStorage.getItem('lienform-reminders') || '[]');
    reminders.push({
      email: reminderEmail,
      deadline: deadline.toISOString(),
      state,
      role,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('lienform-reminders', JSON.stringify(reminders));

    console.log('Reminder set:', { email: reminderEmail, deadline, state, role });
    setReminderSet(true);
  };

  const stateName = state
    ? state.charAt(0).toUpperCase() + state.slice(1).replace(/-/g, ' ')
    : 'your state';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Deadline Calculator</h3>
        <p className="text-sm text-slate-500">
          Calculate your lien filing deadline based on {stateName} law.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {dateType === 'first-furnishing' ? 'First' : 'Last'} furnishing date{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
            {dateType === 'first-furnishing'
              ? 'The date you first provided labor or materials.'
              : 'The last date you provided labor or materials.'}
          </p>
        </div>

        {(state === 'michigan') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Project type</label>
            <div className="flex gap-3">
              {(['residential', 'commercial'] as const).map((type) => (
                <label
                  key={type}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border-2 cursor-pointer capitalize text-sm font-medium transition-all ${
                    projectType === type
                      ? 'border-navy-600 bg-navy-50 text-navy-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="projectType"
                    value={type}
                    checked={projectType === type}
                    onChange={() => setProjectType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {deadline && (
        <div className={`rounded-xl border p-4 ${urgencyBg}`}>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-700">Your deadline is:</p>
            <p className="text-xl font-bold text-slate-900">{formatDate(deadline)}</p>
            <p className={`text-sm font-semibold mt-1 ${urgencyColor}`}>
              {daysLeft === 0
                ? 'TODAY is your deadline!'
                : daysLeft! < 0
                ? `Deadline passed ${Math.abs(daysLeft!)} days ago`
                : `You have ${daysLeft} days remaining`}
            </p>
            {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
              <p className={`text-xs font-medium mt-1 ${urgencyColor}`}>
                ⚠ Filing deadline is approaching. Act soon.
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3 border-t border-current/10 pt-3">{ruleSummary}</p>
        </div>
      )}

      {!inputDate && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-sm text-slate-400">
          Enter a furnishing date above to see your deadline.
        </div>
      )}

      {/* Reminder */}
      {deadline && daysLeft !== null && daysLeft > 0 && (
        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-medium text-slate-700 mb-3">
            Get a reminder 7 days before your deadline
          </p>
          {reminderSet ? (
            <div className="flex items-center gap-2 text-sm text-trust-green font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Reminder saved! We'll email you on{' '}
              {formatDate(new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000))}.
            </div>
          ) : (
            <form onSubmit={handleReminderSubmit} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-colors whitespace-nowrap"
              >
                Remind Me
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
