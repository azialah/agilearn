import type { FaqItem } from './FaqAccordion'

/** FAQ shown on the landing page; /about reuses it with two longer answers. */
export const LANDING_FAQ: FaqItem[] = [
  {
    q: 'Who can sign up for Agilearn?',
    a: 'Teachers with an approved school email domain can sign up on their own. Admin accounts are set up by the Agilearn team.',
  },
  {
    q: 'My school isn’t listed yet. How do I join?',
    a: 'Enter your school email at the bottom of this page. If your domain isn’t approved yet, you can request access for your school right there.',
  },
  {
    q: 'How are final grades calculated?',
    a: 'You set the lecture and laboratory weights. Agilearn keeps each final current as you enter scores, with no spreadsheet formulas to maintain.',
  },
  {
    q: 'Can I import my roster and export grades?',
    a: 'Import rosters and class records from Excel, and export grades to PDF or a spreadsheet.',
  },
  {
    q: 'Does Agilearn work on my phone?',
    a: 'Yes. Install it to your home screen and it opens like an app, including offline attendance.',
  },
]
