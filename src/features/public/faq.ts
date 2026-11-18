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

/** Every question, for /faq. */
export const FULL_FAQ: FaqItem[] = [
  ...LANDING_FAQ.map((f) =>
    f.q.startsWith('My school')
      ? {
          ...f,
          a: 'Send your school’s email domain on the Request access page. Once the Agilearn team approves it, every teacher with that school email can sign up.',
        }
      : f.q.startsWith('Can I import')
        ? {
            ...f,
            a: 'Import rosters and class records from Excel or CSV, and export grades to PDF or a spreadsheet.',
          }
        : f,
  ),
  {
    q: 'What happens to attendance I take offline?',
    a: 'It saves on your device and uploads when you’re back online. If two devices disagree, you choose which version to keep.',
  },
  {
    q: 'Do students get accounts?',
    a: 'No. Accounts are for teachers and Agilearn’s admins. When you post grades, each student gets an email with only their own result.',
  },
  {
    q: 'Can I change the lecture and lab weights later?',
    a: 'Yes. Change the split for a class at any time and every final in that class updates.',
  },
  {
    q: 'Who can see my class records?',
    a: 'Only you and Agilearn’s admins. The Privacy Notice explains how class records are protected under the Data Privacy Act of 2012.',
  },
]
