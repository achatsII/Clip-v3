import type { GuidesDict } from '../types'

/** The site’s guides in English, written for English readers (the French in `fr.ts` is the source). */
export const en: GuidesDict = {
  index: {
    title: 'Guides to work instructions and on-the-job training',
    description: 'How to write work instructions, use a template, film them, train new employees on the job and build a skills matrix: practical guides for the plant floor.',
    h1: 'Practical guides for work instructions and on-the-job training',
    lead: 'Clear methods for documenting work and training people at the workstation, from your first work instruction to a skills matrix. Each guide takes a few minutes to read, at a desk or on the floor.',
  },

  ui: {
    guides: 'Guides',
    readingTime: (m) => `${m} min read`,
    updated: (d) => `Updated ${d}`,
    contents: 'In this guide',
    faq: 'Frequently asked questions',
    related: 'Read next',
  },

  guides: {
    write: {
      keyword: 'how to write work instructions',
      title: 'How to write work instructions, step by step',
      description: 'Pick the task, film the expert, write one action per step with its key points and reasons, place the warnings, then test and approve: the complete method.',
      h1: 'How to write work instructions operators actually follow',
      lead: 'Here is how to write work instructions that hold up on the floor. Start from the real task and have the person who knows it best show it. Then write one action per step, with its key points and the reason for each, and test the instruction with someone new before it goes to the workstation.',
      minutes: 6,
      sections: [
        {
          heading: 'Which task should you document first?',
          paragraphs: [
            'A work instruction covers one task, with a clear start and finish. “Change over packaging line 2” is a task; “packaging line 2” is not. Give each instruction a title that starts with a verb and uses the words people use on the floor.',
            'Start where a mistake costs the most. Four kinds of tasks go first:',
          ],
          list: {
            items: [
              'Tasks that can hurt someone: lockout, lifting, chemicals',
              'Tasks that cause scrap, rework or customer returns',
              'Rare tasks people forget from one time to the next, like annual maintenance',
              'Tasks only one expert can do, especially if that person is close to retirement',
            ],
          },
        },
        {
          heading: 'Watch the expert and film the task',
          paragraphs: [
            'Don’t write from memory at your desk. Go to the workstation and ask the person who knows the task best to do it at normal speed, explaining out loud as if they were training a new coworker. Film it with a phone, close to their hands.',
            'Ask questions at every tricky moment: “Why do you do that?” “What happens if you skip it?” “How do you know it’s tight enough?” Their answers become your key points. Also note the tools, parts, PPE and settings.',
            'If two experts do the task differently, don’t pick a winner on your own. Get them together, compare, and agree on the best way before you write anything down.',
          ],
        },
        {
          heading: 'How to write work instructions: one action per step',
          paragraphs: [
            'Break the task into important steps: the moments when the work moves forward. Each step is one action that starts with a verb: “Loosen the four guard screws,” not “The next thing to do is to proceed with loosening the screws.”',
            'A step that contains “and then” is usually two steps. But don’t go all the way down to single movements either: “Pick up the wrench” is not an important step. If the list keeps growing, split the task into two instructions, such as removal and installation.',
            'Keep sentences short and exact. Replace every vague word with something you can check: not “tighten well” but “tighten to 25 N·m”; not “clean” but “wipe until no trace of oil is left.”',
          ],
        },
        {
          heading: 'Key points and reasons: what makes the task succeed',
          paragraphs: [
            'This is the heart of Job Instruction, part of Training Within Industry (TWI), a program developed in the United States during World War II. For each important step, list its key points, then the reason for each one.',
            'A key point is anything in the step that could make or break the job, injure the worker, or make the work easier: the knack. Safety is always a key point. The reason explains why: people remember a key point, and respect it, when they know what it prevents. Two or three key points per step is plenty; if you have ten, the step is too big.',
            'An example from an assembly station:',
          ],
          list: {
            items: [
              'Step: tighten the four cover bolts.',
              'Key point: in a crisscross pattern, to the torque on the drawing.',
              'Reason: tightening in that order keeps the gasket from pinching and leaking.',
            ],
          },
        },
        {
          heading: 'Add visuals and put warnings where they belong',
          paragraphs: [
            'One photo or short video clip per step, taken from the operator’s point of view, beats a paragraph. Frame tightly on what matters and add an arrow or a circle. When a mistake keeps happening, show right and wrong side by side: the label placed straight, and the one that’s crooked.',
            'Put each warning at the step where the hazard exists, right before the action, not in a block on page one that nobody rereads. Three levels are enough: danger (risk of injury), caution (risk of damage or a defect) and good to know.',
            'Tools and PPE go at the top, in a “Before you start” section. People gather them first instead of discovering them at step 6.',
          ],
        },
        {
          heading: 'Test it with someone new, then get it approved',
          paragraphs: [
            'Hand the instruction to someone who has never done the task and watch them follow it on their own, without helping. Every pause, question or mistake points to something to fix in the instruction, not in the person.',
            'Once it’s fixed, have a second person approve it: a supervisor, quality or safety, depending on the task. The approval carries a date and a version number. That version, and only that one, goes to the workstation.',
          ],
        },
        {
          heading: 'Put it at the workstation and keep it current',
          paragraphs: [
            'An instruction is useful where the work happens: on the workstation tablet, in a binder at the machine or behind a QR code on the equipment. Pull the old copies: two versions at the same workstation is a mistake waiting to happen.',
            'Review it whenever something changes: a new tool, a new part, an incident, a near miss or feedback from an operator. Also set a review date, for example a year after publishing, so no instruction goes stale quietly. And when an operator flags an unclear step, fix it fast: it proves the instruction is being read.',
          ],
        },
      ],
      faq: [
        {
          q: 'What is the difference between an SOP and a work instruction?',
          a: 'An SOP (standard operating procedure) describes a process: who does what, when and why. A work instruction describes how to do one task, step by step, at the workstation. One SOP often points to several work instructions.',
        },
        {
          q: 'Who should write work instructions?',
          a: 'The person who knows the task best explains and shows it. A supervisor or process engineer structures and writes it. Someone new to the task tests it, and a second person approves it.',
        },
        {
          q: 'How many steps should a work instruction have?',
          a: 'As many as there are important steps, one action each. If the instruction gets long, split the task into phases that each get their own instruction, such as removal and installation.',
        },
        {
          q: 'Does every step need a photo?',
          a: 'Almost always, for hands-on work. A photo from the operator’s point of view, with an arrow on what matters, is understood faster than a sentence. For a movement or a knack, a short video clip works even better.',
        },
        {
          q: 'How often should work instructions be reviewed?',
          a: 'Whenever the work changes, and on a fixed date, for example once a year. Critical tasks deserve more frequent reviews. Every approved revision gets a new version number.',
        },
      ],
      cta: {
        title: 'Film the task, AI writes the steps',
        text: 'With Clip, the expert films the task while explaining it. AI writes one action per step, with key points, warnings and the right video clip; you review, fix and publish to the workstation.',
      },
    },

    template: {
      keyword: 'work instruction template',
      title: 'Work instruction template: every field, explained',
      description: 'A work instruction template to copy: header, tools and PPE, steps with key points, checks, approval and review date, with how to fill in each part.',
      h1: 'A work instruction template, and how to fill in every part',
      lead: 'Below is a work instruction template you can copy as is, followed by how to fill in each part. It fits on one or two pages: who, where and what; what you need before you start; the steps with their key points; the checks; then approval and the next review date.',
      minutes: 6,
      sections: [
        {
          heading: 'The work instruction template, ready to copy',
          paragraphs: [
            'Paste this list into a document or a spreadsheet. Keep the order: it follows the order in which the operator needs the information. Replace everything in brackets. If a field doesn’t apply to a task, delete it rather than writing “N/A.”',
          ],
          list: {
            ordered: true,
            items: [
              'Title: [verb + object, e.g. “Replace the belt on conveyor C-3”]',
              'Number and version: [WI-0042], version [3], effective [date]',
              'Workstation, area and equipment: [where the task is done, on which machine]',
              'Time and frequency: [about 20 min], [at every changeover]',
              'Who does it: [role and required qualification]',
              'Tools and materials: [each tool and part, with its part number]',
              'PPE: [safety glasses, cut-resistant gloves, hearing protection…]',
              'General warnings: [hazards present for the whole task]',
              'Steps: [no., action, key points, reason, photo]',
              'Checks and records: [what to check, with which instrument, limits, where to record, what to do if out of limits]',
              'Approval: written by [name], approved by [name], on [date]',
              'Review: next review on [date]; revision history',
            ],
          },
        },
        {
          heading: 'The header: title, number, version and workstation',
          paragraphs: [
            'The title states the action in shop-floor words: “Replace the belt on conveyor C-3,” not “Mechanical maintenance procedure.” It’s what operators will search for.',
            'The number identifies the document for good: a prefix and a counter (WI-0042) are enough, and a number is never reused. The version changes with every approved edit. The rule to hold: the version at the workstation is always the latest approved one.',
            'Workstation, area and equipment tell people where the instruction applies. Time and frequency help plan both the work and the training. Finally, say who can do the task: a trained operator, an electrician, a forklift operator.',
          ],
        },
        {
          heading: 'Before you start: tools, PPE and warnings',
          paragraphs: [
            'This section saves trips to the toolbox. Be specific: “13 mm wrench,” not “a wrench”; the exact part number of the belt; the quantity of each consumable.',
            'For PPE, use one icon and one word each, no sentences. General warnings keep only the hazards present from start to finish, such as a hot surface or noise. Everything else goes at the step where the hazard appears.',
            'Add the starting conditions, if any: machine stopped and locked out, spare parts on hand, area cleared.',
          ],
        },
        {
          heading: 'The steps: action, key points and reason',
          paragraphs: [
            'The body of the template is a table with five columns: number, action, key points, reason and visual. One row per important step, meaning each point where the work moves forward.',
            'An example from a drilling station: “Place the part in the fixture”; key point: machined face down, against both stops; reason: otherwise the hole ends up out of tolerance.',
          ],
          list: {
            items: [
              'Action: an imperative verb and an object. “Remove the guard.”',
              'Key points: what makes the step succeed, safety, the knack. Two or three at most.',
              'Reason: why the key point matters, in one short sentence.',
              'Visual: a photo from the operator’s point of view with an arrow or a circle, or a short video clip.',
            ],
          },
        },
        {
          heading: 'Checks and records: proof the job was done right',
          paragraphs: [
            'When a step calls for a check, write what to check, with which instrument and within which limits. Always take limits from the drawing, the specification or the routing; never make them up.',
            'Say where to record the result (the form, the log) and what to do if it’s out of limits: stop, quarantine the part, call the supervisor. That reading becomes the record that proves the task was done as planned.',
            'An example, after machining a shaft: measure the diameter with a micrometer at two points; limits: those on the drawing; write both values on the lot sheet; if out of limits, red-tag the part and call the supervisor.',
          ],
        },
        {
          heading: 'Approval and review date',
          paragraphs: [
            'One person writes the instruction and another approves it after checking the content and the safety. Record both names and the date. Match the approver to the risk: safety for a hazardous task, quality when a step includes a check, the supervisor for the rest.',
            'Set a review date, for example a year after publishing, and keep a short history: version, date, what changed, who approved. When a change affects a step or a key point, plan to retrain the people concerned.',
          ],
        },
        {
          heading: 'Mistakes that make a template useless',
          paragraphs: ['A template only helps if it stays simple. Watch out for these traps:'],
          list: {
            items: [
              'Too many fields: if the header takes a page, nobody reads the rest.',
              'Paragraphs instead of steps: the eye looks for one action at a time.',
              'All the warnings on page one, far from the dangerous step.',
              'Vague titles that nobody finds when searching.',
              'Old copies left at the workstation next to the new version.',
            ],
          },
        },
      ],
      faq: [
        {
          q: 'Is there an official work instruction template?',
          a: 'No. ISO 9001 asks for “documented information” but leaves its form to each organization. Your quality system or a customer may require certain fields; otherwise, this template covers the essentials.',
        },
        {
          q: 'Document, spreadsheet or app: which format should I use?',
          a: 'For a handful of instructions, a document works. Once you have dozens, the real challenge is versions: knowing which one is current and replacing it everywhere. An app that shows the latest approved version at the workstation solves that.',
        },
        {
          q: 'How long should a work instruction be?',
          a: 'As short as possible: one or two pages for most tasks. If it keeps growing, the task is probably too broad; split it into several instructions.',
        },
        {
          q: 'How should work instructions be numbered?',
          a: 'A prefix and a counter are enough, like WI-0042. Some plants add an area code. Keep the version separate from the number, and never reuse a retired number.',
        },
        {
          q: 'Does this template work for maintenance?',
          a: 'Yes. Add starting conditions such as lockout, and spare parts with their part numbers. For rare jobs, photos and key points matter even more, because nobody remembers them from one time to the next.',
        },
        {
          q: 'Can I move an old procedure into this template?',
          a: 'Yes. Take its steps one at a time, one action each, and add what’s almost always missing: key points, reasons and photos. Then check at the workstation that the task is still done the way it’s written.',
        },
      ],
      cta: {
        title: 'The template, filled in from a video',
        text: 'With Clip, AI writes the steps, key points and warnings, and suggests the category, equipment, duration, PPE and tools for you to confirm. Every publication creates a version, and the workstation’s QR code always leads to the latest one.',
      },
    },

    video: {
      keyword: 'video work instructions',
      title: 'Video work instructions: how to film them right',
      description: 'When video beats text, how to film with a phone, getting clear sound, turning footage into written steps, subtitles, translation, and where video falls short.',
      h1: 'Video work instructions: film the task, then turn it into clear steps',
      lead: 'Video work instructions show what text describes poorly: a movement, a sound, a position. Film with a phone held sideways, close to the hands, while the expert explains out loud; then turn the footage into written steps, each with its own short clip.',
      minutes: 6,
      sections: [
        {
          heading: 'When video work instructions beat text',
          paragraphs: [
            'Video wins when motion matters: a movement that takes a certain touch, a quick sequence of handling, a sound or a click that confirms a part is seated, a machine behavior people must learn to recognize.',
            'It also helps with rare tasks, like annual maintenance nobody remembers, and with people who struggle to read or who read in another language.',
            'For a simple setting, a value to read or a checklist, a photo and a sentence are enough. A three-minute video to say “set the selector to 2” wastes everyone’s time.',
          ],
        },
        {
          heading: 'Prepare the shoot',
          paragraphs: [
            'Pick a time when the task really happens: a planned changeover or scheduled maintenance. Ask the person who knows the task best to do it at normal speed.',
            'Before filming, have them walk you through the task and write down the list of steps. You’ll know where to cut, and nothing gets left out.',
            'Safety comes before the shot. Never ask anyone to skip a lockout, open a guard or slow down a dangerous move for the camera. Film only where it’s allowed, and give a heads-up to coworkers who will be in the frame.',
            'On the gear side: battery charged, storage space free, lens wiped. On the floor side: work area cleared and well lit.',
          ],
        },
        {
          heading: 'How to film with a phone',
          paragraphs: ['You don’t need professional gear. A recent phone is enough if you follow a few rules:'],
          list: {
            ordered: true,
            items: [
              'Hold the phone sideways: the picture fills a tablet or computer screen.',
              'Film close to the hands, from the operator’s point of view, over the shoulder.',
              'Keep it steady: two hands, elbows braced, or a mount.',
              'Light the work area, and don’t shoot toward a window behind the machine.',
              'Record one clip per step: stop, then start again at the next step.',
              'Show the expected result at the end, and the mistake to avoid if that’s safe.',
              'Let the camera roll two seconds before and after each movement: editing gets much easier.',
            ],
          },
        },
        {
          heading: 'Sound: the expert’s voice',
          paragraphs: [
            'What the expert says is often worth more than the picture. Ask them to explain out loud what they’re doing and why, as they would to a new coworker. Those explanations become your key points and reasons. Let them talk in their own words; you’ll clean up the text later.',
            'In a noisy shop, move the phone closer to the person speaking or use a lapel mic. If that’s not possible, record the explanation right after, somewhere quiet, while you watch the video together.',
            'Ask them to name things the way the floor does (“the red lever,” “the bottom valve”) and to say values clearly: torque, dimension, pressure.',
          ],
        },
        {
          heading: 'From video to written steps',
          paragraphs: [
            'A long video doesn’t work as is at the workstation. Watch it and note each important step with its start time. Then write one action per step, and pull the key points and reasons from what the expert said.',
            'Cut the video into short clips, one per step, and place each next to its text. When a step depends on seeing a detail, a still image with an arrow often works better than a clip. Keep the full video as the source: you’ll need it for the next revision.',
            'Finally, reread each step without the video. If it doesn’t make sense on its own, a word, a value or a criterion is missing.',
          ],
        },
        {
          heading: 'Subtitles and translation',
          paragraphs: [
            'On a noisy floor the voice is hard to hear, so subtitles and written steps carry the message. They also help people who understand a language better in writing than spoken. On the audio side, short sentences make readable subtitles: one idea per sentence, one movement at a time.',
            'To translate, start from the text of the steps and the subtitles, not the audio. Avoid text burned into the image, which is hard to translate and to fix. Have a bilingual person from the floor check the technical terms.',
          ],
        },
        {
          heading: 'Where video alone falls short',
          paragraphs: [
            'Video alone is hard to scan: you can’t skim it or search it for a word. At the workstation, people have to pause, rewind and restart it, often with gloves on.',
            'It also does a poor job of setting the standard. The eye follows the hands and misses the criterion: the torque, the dimension, the number of turns. And any change means filming again. The combination that works: one written action per step, its key points, and the clip that shows the movement.',
            'Video alone is hard to approve, too: to check one value, the approver has to watch the whole thing. Written steps can be reread, compared from one version to the next, and signed.',
          ],
        },
      ],
      faq: [
        {
          q: 'How long should a work instruction video be?',
          a: 'Film the whole task if you need to, but cut it up: at the workstation, each clip shows only one step, just long enough for the movement. People watch a short clip at the moment they need it; they tune out of a long video.',
        },
        {
          q: 'Do I need professional equipment?',
          a: 'No. A recent phone films well enough. A mount and a lapel mic help in a noisy shop, and good lighting matters more than the camera.',
        },
        {
          q: 'Can we film employees at work?',
          a: 'Tell the people being filmed, explain what the video is for, and frame the hands rather than faces. Follow your plant’s rules on photos and video, and don’t film anything confidential without approval.',
        },
        {
          q: 'Can video replace written work instructions?',
          a: 'Not on its own. Video shows the movement; the written step sets the standard and can be searched, translated and approved. Together, they make the best instruction.',
        },
        {
          q: 'Should I film in landscape or portrait?',
          a: 'Landscape in most cases: you see the hands, the part and the tool together, and the picture fills a tablet screen. Portrait suits a tall, narrow subject, such as an electrical panel.',
        },
        {
          q: 'Do I have to reshoot everything when the task changes?',
          a: 'No, if you filmed one clip per step: reshoot only the step that changed and replace its clip. Update the step’s text and the instruction’s version number too.',
        },
      ],
      cta: {
        title: 'Film once, get the steps',
        text: 'With Clip, the expert films the task in the app while explaining it. AI writes one action per step and keeps the right clip from the video for each one, down to the second; the video stays light, in 720p.',
      },
    },

    sopVsWi: {
      keyword: 'SOP vs work instruction',
      title: 'SOP vs work instruction: what’s the difference?',
      description: 'SOP vs work instruction: definitions, differences in scope, reader and detail, the document pyramid, plant-floor examples, and which one to write first.',
      h1: 'SOP vs work instruction: the difference, and which to write first',
      lead: 'The SOP vs work instruction question comes down to scope and detail. An SOP (standard operating procedure) says who does what, when and why across a process; a work instruction says exactly how to do one task, step by step, at the workstation.',
      minutes: 6,
      sections: [
        {
          heading: 'What is an SOP?',
          paragraphs: [
            'A standard operating procedure describes a process from end to end: its purpose, what it covers, who is responsible, the order of activities and the forms to fill in.',
            'It’s written for managers, supervisors, auditors and anyone who needs to understand how the work is organized. It often spans several workstations or departments, and it changes rarely. People read it at a desk, start to finish, when they need to understand the process.',
            'Example: the nonconforming product SOP says who detects a problem, who decides what happens next, where parts are quarantined and how it all gets documented. It never says how to apply a red tag; that’s a work instruction’s job.',
          ],
        },
        {
          heading: 'What is a work instruction?',
          paragraphs: [
            'A work instruction describes a single task at one workstation, step by step: the actions, key points, tools, PPE and photos. It’s the most detailed level of documentation on the floor.',
            'It’s written for the person doing the task, while they do it. So it’s very detailed and very visual, and it changes more often than the SOP: a new tool, a new part, feedback from the floor. People read it standing up, often with gloves on: one action per step, a photo, little text.',
            'Example: “Tag and isolate a nonconforming pallet at the packing station” shows where the red tag goes, what to write on it and where to move the pallet.',
          ],
        },
        {
          heading: 'SOP vs work instruction at a glance',
          paragraphs: ['The two documents work together, but they answer different questions. Side by side, the difference is easy to see:'],
          list: {
            items: [
              'Scope: an SOP covers a process; a work instruction, one task.',
              'Question: an SOP answers what, who, when and why; a work instruction answers how.',
              'Reader: an SOP serves managers and auditors; a work instruction, the operator at the workstation.',
              'Detail: an SOP stays general; a work instruction spells out every move and its criteria.',
              'Format: an SOP reads as text or a flowchart; a work instruction, as a series of illustrated steps.',
              'Updates: an SOP changes rarely; a work instruction follows every change at the workstation.',
            ],
          },
        },
        {
          heading: 'The document pyramid',
          paragraphs: [
            'Many plants organize their documents in four levels, from the most general to the most concrete, each resting on the one above. The lower you go, the more documents there are, the more precise they get, and the more often they change. It’s a practical model, not a requirement: ISO 9001 talks about “documented information” and leaves the structure up to each organization.',
            'Here’s how it looks for lockout:',
          ],
          list: {
            ordered: true,
            items: [
              'Policy: management’s commitment. “Nobody works on a machine until it’s at zero energy.”',
              'Procedure (SOP): the lockout program. Who may lock out, with what equipment, what training, what checks.',
              'Work instruction: the lockout sheet for press P-12. Each energy source, its isolation device and the zero-energy check.',
              'Form and record: the log where each lock applied and removed is written down. It proves the work was done.',
            ],
          },
        },
        {
          heading: 'Two more examples',
          paragraphs: [
            'In quality, the receiving inspection SOP says which lots get inspected, who does it and what happens to a rejected lot. The work instruction shows how to measure a shaft diameter with a micrometer: where to measure, how many readings, what limits.',
            'In maintenance, the preventive maintenance SOP says how work is planned, who does it and how a work order gets closed. The work instruction shows how to grease the bearings on conveyor C-3: which grease, how much, which points, in what order.',
            'Notice the question each document settles: the SOP organizes, the work instruction shows.',
          ],
        },
        {
          heading: 'Which one should you write first?',
          paragraphs: [
            'If an SOP already exists, because your quality system or a customer requires it, write the work instructions for the tasks it covers, starting with the riskiest or most error-prone.',
            'If nothing exists, start on the floor. Write work instructions first for the tasks that hurt: injuries, defects, know-how held by a single person. Once practices are stable, write the SOP that ties them together. By then, you’ll know what the process really looks like, not just what it looks like on paper.',
            'Either way, link them: the SOP lists the numbers of its work instructions, and each work instruction names its SOP. And keep the levels apart: when an SOP starts describing hand movements, that part belongs in a work instruction.',
          ],
        },
        {
          heading: 'Traps to avoid',
          paragraphs: ['A few mistakes blur the line between the two documents:'],
          list: {
            items: [
              'A fifty-page SOP that describes every move: nobody reads it, and it goes out of date with every change at the workstation.',
              'A work instruction that repeats the SOP’s purpose, scope and responsibilities before it gets to step one.',
              'Two documents that say different things about the same task.',
              'Work instructions with no number or version, which an SOP can’t reference.',
            ],
          },
        },
      ],
      faq: [
        {
          q: 'Is an SOP the same as a procedure?',
          a: 'Usually, yes: SOP stands for standard operating procedure. Some companies, though, call their work instructions SOPs. What matters is having clear definitions in your own system.',
        },
        {
          q: 'Can you have a work instruction without an SOP?',
          a: 'Yes. A small shop can run on work instructions alone. An SOP becomes useful when several roles or departments have to coordinate around the same process.',
        },
        {
          q: 'Who writes the SOP, and who writes the work instruction?',
          a: 'The process owner writes the SOP, often with quality. The work instruction is written at the workstation, with the person who knows the task and a supervisor or process engineer. Both are approved before they’re released.',
        },
        {
          q: 'Is a checklist a work instruction?',
          a: 'Not quite. A checklist reminds someone who already knows the task what to verify. A work instruction teaches how to do the task, with its steps, key points and reasons.',
        },
        {
          q: 'How much detail belongs in an SOP?',
          a: 'Enough to know who does what, when, and with which document. As soon as you describe movements, settings or values to respect at the workstation, that content belongs in a work instruction.',
        },
        {
          q: 'Where do forms and records fit?',
          a: 'At the bottom of the pyramid. A form is a blank template, like a reading sheet; once filled in, it becomes a record, the proof that the work was done. The work instruction says which one to fill in, and at which step.',
        },
      ],
      cta: {
        title: 'Your SOPs, broken down into work instructions',
        text: 'With Clip, the expert films the task while explaining it, and AI writes the instruction step by step. Your old documents count too: drop in a PDF or Word document and AI turns it into a structured draft, ready to review.',
      },
    },

    onboarding: {
      keyword: 'how to train new employees in manufacturing',
      title: 'How to train new employees in manufacturing: the TWI method',
      description: 'Prepare, present, try out, follow up: train new operators at the workstation with TWI Job Instruction, a work instruction, a few questions and a sign-off.',
      h1: 'How to train new employees in manufacturing, right at the workstation',
      lead: 'Here is how to train new employees in manufacturing without leaving it to chance: shadowing a coworker isn’t enough; you need a method and a document. TWI Job Instruction gives you four steps (prepare, present, try out, follow up), built on a written work instruction.',
      minutes: 6,
      sections: [
        {
          heading: 'Why shadowing alone falls short',
          paragraphs: [
            'Shadowing, where a new hire follows an experienced coworker, is a common way to train on the floor. It has limits: every trainer explains the job their own way, skips what seems obvious to them, passes on shortcuts along with good habits, and nothing records what was actually learned.',
            'Training Within Industry (TWI) was developed in the United States during World War II to train large numbers of new workers quickly. Its Job Instruction module teaches supervisors and experienced workers to train others, the same way every time. Its card ends with this line: if the person hasn’t learned, the instructor hasn’t taught.',
            'Shadowing still has its place: an experienced coworker makes a good trainer, as long as they follow the method and the same document as everyone else.',
          ],
        },
        {
          heading: 'Before training: get ready',
          paragraphs: [
            'The work instruction serves as your job breakdown: written well, it already holds the important steps, their key points and the reasons. Reread it at the workstation before each training session to make sure it still matches how the job is done.',
            'The Job Instruction card asks the trainer to get ready in four ways:',
          ],
          list: {
            items: [
              'A timetable: which skills each person should have, and by what date.',
              'The job broken down: important steps, key points and reasons. Safety is always a key point.',
              'Everything ready: the right equipment, materials and supplies, PPE included.',
              'The workstation arranged the way the person will be expected to keep it.',
            ],
          },
        },
        {
          heading: 'How to train new employees in manufacturing: TWI’s four steps',
          paragraphs: ['Here are the four steps as the Job Instruction card describes them, and what they look like at a workstation. Each one counts: skip the tryout and you find the mistakes in production.'],
          list: {
            ordered: true,
            items: [
              'Prepare the person. Put them at ease, name the job, find out what they already know, show what the part is for, and place them where they can see your hands.',
              'Present the operation. Tell, show and illustrate one important step at a time. Stress each key point and its reason. Don’t give more than they can master at once: first the steps, then the key points, then the reasons.',
              'Try out performance. They do the job while you correct errors. Then they do it again, explaining each step, key point and reason. Continue until you know they know.',
              'Follow up. Put them on their own, tell them who to go to for help, check often and encourage questions. Then taper off, little by little.',
            ],
          },
        },
        {
          heading: 'Train at the workstation, with the work instruction',
          paragraphs: [
            'Train at the real workstation, on real parts, and let the pace build up to normal speed. The work instruction is the script: every trainer follows it, so every new hire learns the same job.',
            'After training, the person keeps the instruction as a reference at the workstation. If a trainer does the task differently from what’s written, don’t let it slide: either the instruction needs fixing, or the practice does.',
            'Choose trainers who master the task and want to pass it on, and teach them the method. Doing a job well and teaching it well are two different skills.',
          ],
        },
        {
          heading: 'Check understanding with a few questions',
          paragraphs: [
            'During the tryout, the person shows they can do it. A few questions show they understand why. Three to five questions on key points and reasons are enough: “Why do we tighten in a crisscross pattern?” “What do you do if the dimension is out of tolerance?”',
            'Ask about what can go wrong, not trivia to memorize. A wrong answer isn’t a failure; it’s a signal to explain that point again. Ask at the workstation, in front of the part, so the person can show as well as tell.',
          ],
        },
        {
          heading: 'Supervisor sign-off',
          paragraphs: [
            'Before calling someone qualified, a supervisor watches them do the task alone at the workstation: safely, to the expected quality and at normal speed. The supervisor signs and dates the sign-off.',
            'Note which version of the work instruction it applies to. A simple scale helps track progress: in training, qualified, can train others.',
            'If the person isn’t there yet, it’s not a failure: go back to presenting the step that’s giving them trouble, then repeat the tryout.',
          ],
        },
        {
          heading: 'Keep a record, and retrain when the instruction changes',
          paragraphs: [
            'For every training, record who, which task or workstation, which version of the instruction, the date and who signed off. A table or a signed form is enough, as long as you can find it fast. Those records feed your skills matrix: they show who can cover for whom.',
            'When an instruction changes on something that matters (a step, a key point, safety), retrain the people concerned. Showing what changed and repeating the tryout is often enough. For rare or critical tasks, also plan a requalification at a set interval.',
          ],
        },
      ],
      faq: [
        {
          q: 'How long does it take to train a new operator?',
          a: 'It depends on the task, which is why TWI starts with a timetable: for each person, which tasks, by what date. Train in short sessions, one task at a time, and move on once the tryout is successful.',
        },
        {
          q: 'Who should train: the supervisor or an experienced operator?',
          a: 'Either one. Job Instruction was designed for supervisors and experienced workers alike. What matters is mastering both the task and the method.',
        },
        {
          q: 'What if the new hire doesn’t read English well?',
          a: 'Show more than you tell: photos, video clips, demonstration. Give them the instruction in their language if you can, and check understanding by having them do and explain the task, not with a written test.',
        },
        {
          q: 'Should safety training come before the workstation?',
          a: 'Yes. Orientation covers plant rules, emergencies and PPE. At the workstation, safety remains a key point of every task, explained at the moment it matters.',
        },
        {
          q: 'How do you know the training worked?',
          a: 'The person does the task alone, without errors, safely and at normal speed. During follow-up, look at the quality of their first parts and the questions they still ask.',
        },
        {
          q: 'What about a new hire who already has experience?',
          a: 'Keep the method, but move faster where they already know the work: that’s why the first step asks what they know. Stress your key points, because the way things are done changes from one plant to the next, even in a familiar trade.',
        },
      ],
      cta: {
        title: 'Train at the workstation, one step at a time',
        text: 'With Clip, the new hire follows the instruction on the workstation tablet and can have each step read aloud. At the end come a few questions drafted by AI and refined by the author; once passed, the training is recorded.',
      },
    },

    skillsMatrix: {
      keyword: 'skills matrix',
      title: 'Skills matrix for manufacturing: how to build one',
      description: 'People and workstations, skill levels, coverage per shift, requalification and common mistakes: how to build and maintain a skills matrix for your plant.',
      h1: 'Skills matrix: who can do what, at which workstation',
      lead: 'A skills matrix crosses people with workstations and shows, in each cell, where each person stands: in training, qualified or able to train others. Kept up to date, it shows every shift’s gaps at a glance, and who to train first.',
      minutes: 6,
      sections: [
        {
          heading: 'What is a skills matrix for?',
          paragraphs: [
            'Some plants call it a training matrix or a cross-training matrix. It’s a simple table that answers everyday questions: who can cover the welding station this weekend? Who needs training before the press 4 expert retires? Does this shift have enough qualified people to start the line?',
            'It also helps plan training and show auditors who is qualified for what. It states what a person is qualified to do, not whether they’re a good employee: it’s not a performance review. And it doesn’t replace training; it tells you where training is needed.',
          ],
        },
        {
          heading: 'Rows and columns',
          paragraphs: [
            'Put people in rows, grouped by shift or crew, in alphabetical order: it keeps the focus on coverage, not on who ranks where. Put workstations or tasks in columns, grouped by line or area.',
            'Pick the right level of detail. A workstation is enough when its tasks go together. Split out tasks that call for different qualifications: running the machine, doing the changeover, deep cleaning. Your work instructions make a good starting list; group the ones that always go together.',
            'Add a total at the bottom of each column (how many qualified people per workstation) and at the end of each row (how many workstations per person). Those two totals are where you’ll look first.',
          ],
        },
        {
          heading: 'Simple levels you can verify',
          paragraphs: [
            'Three or four levels are enough; with more, the rating turns into a matter of opinion. Write the definition of each level at the top of the matrix so every supervisor rates the same way.',
            'Each level needs a criterion you can observe, and moving up to “qualified” happens after a supervisor watches the person at the workstation, never on self-assessment alone. A sample scale:',
          ],
          list: {
            items: [
              'Level 0: not trained.',
              'Level 1: in training, does the task with someone alongside.',
              'Level 2: qualified, does the task alone, safely, at the expected quality and speed.',
              'Level 3: can train others, masters the task and knows how to teach it.',
            ],
          },
        },
        {
          heading: 'How to build a skills matrix, step by step',
          paragraphs: ['A spreadsheet is enough to start, and a single line is enough to learn. What matters is the method:'],
          list: {
            ordered: true,
            items: [
              'Start with one line or area, not the whole plant.',
              'List the workstations and tasks that require a qualification, using your work instructions.',
              'List the people, by shift.',
              'Define the levels and who signs off on them.',
              'Fill it in from evidence: recorded training and sign-offs at the workstation, not memory.',
              'Set the need: how many qualified people each workstation needs per shift.',
              'Find the gaps and plan training, most urgent first.',
              'Update it after every training, hire, departure or new instruction version.',
            ],
          },
        },
        {
          heading: 'Coverage per shift',
          paragraphs: [
            'A matrix that looks full can hide a fragile shift. Count the qualified people for each workstation, shift by shift, and look at nights, weekends and vacations too.',
            'Set a simple rule, for example at least two qualified people per workstation per shift, so one absence doesn’t stop the line. Then look for weak spots: a workstation only one person can run, or one person who is the only qualified operator on several workstations. That’s where cross-training pays off most: train a second person on those workstations before you train a third person anywhere else.',
            'One color per level makes the matrix readable at a glance. Add a “need” row under each column and mark in red the workstations that come up short. Check coverage before you approve vacations or move people between lines, not after.',
          ],
        },
        {
          heading: 'Requalify on a schedule',
          paragraphs: [
            'A skill that isn’t practiced fades: someone qualified on a changeover they last did a year ago may not be qualified today. Set a requalification interval based on risk, for example six months for safety-critical tasks and twelve or twenty-four months for the rest. Plan an upcoming requalification like any other training.',
            'Also requalify when someone hasn’t done the task in a long time, and when the instruction changes on something that matters. Requalification isn’t a course: an observation at the workstation and a few questions are often enough. Write the date of the last sign-off in each cell, and the matrix shows what’s coming due.',
          ],
        },
        {
          heading: 'Common mistakes',
          paragraphs: ['What makes a skills matrix stop being useful:'],
          list: {
            items: [
              'Hundreds of columns that nobody keeps up to date.',
              'Fuzzy levels that everyone reads differently.',
              'Cells filled in from memory or by self-assessment.',
              'No update after a training or a new instruction version.',
              'Posting it like a leaderboard: it describes qualifications, not performance.',
              'Ignoring shifts, which hides a workstation only one person can run at night.',
              'A matrix kept by one person, in a file the supervisors never see.',
            ],
          },
        },
      ],
      faq: [
        {
          q: 'What is the difference between a skills matrix and a training matrix?',
          a: 'A training matrix tracks the training people have completed; a skills matrix shows who can actually do the job, after a sign-off. One table often does both. Just remember that completed training doesn’t mean qualified.',
        },
        {
          q: 'How many skill levels should I use?',
          a: 'Three or four. Beyond that, the difference between two levels becomes a matter of opinion. The ILUO scale, known in lean plants, uses four; what matters is an observable criterion for each level.',
        },
        {
          q: 'Is a spreadsheet enough?',
          a: 'For one line or a small team, yes. With dozens of people and instructions that change, the hard part is keeping it current: tie it to recorded training instead of filling it in by hand. Otherwise, the matrix ends up describing last year’s team.',
        },
        {
          q: 'Who keeps the skills matrix up to date?',
          a: 'One owner per area or shift, usually the supervisor. Review it on a fixed schedule, such as the monthly team meeting, and after every training.',
        },
        {
          q: 'Should we post it on the floor?',
          a: 'Yes, if it’s used to plan, not to rank people. Sort it alphabetically, show qualifications rather than scores, and explain to the team what it’s for.',
        },
        {
          q: 'Who should we train first?',
          a: 'Start with workstations only one person can run, then shifts below the need, then known departures, such as a retirement. Where you can, pick people who already run a neighboring workstation: they start with part of the movements.',
        },
      ],
      cta: {
        title: 'Who is trained, and where',
        text: 'In Clip, training passed at the workstation is recorded, and the skills matrix maps people to workstations. When an instruction changes, the new version can require retraining.',
      },
    },
  },
}
