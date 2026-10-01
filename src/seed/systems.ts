// The tenant's AI system inventory. Each system stores the answers a person gave to the
// classification steps and the role questions, never a risk tier: `classify` replays them.
// Discovery and signals are demo data; no runtime is connected.

import type { AiSystem } from '../domain/types';

export const aiSystems: AiSystem[] = [
  {
    id: 'sys-credit',
    name: 'Credit scoring assistant',
    description: 'Scores loan applications and drafts the explanation a loan officer reviews.',
    endpointId: 'ep-credit',
    discovery: 'gateway',
    answers: {
      inScope: {
        answer: true,
        reason: 'A machine-based system that infers scores from applicant data, used in the EU.',
      },
      prohibited: {
        answer: false,
        reason: 'It does not manipulate, exploit vulnerabilities or score social behaviour.',
      },
      annexI: {
        answer: false,
        reason: 'It is not a safety component of a product covered by Annex I law.',
      },
      annexIII: {
        area: 'creditworthiness of natural persons',
        profilesPeople: true,
        exemptionHolds: false,
        reason:
          'It rates individual applicants, which is profiling, so the narrow-task exemption is not available.',
      },
      transparency: {
        answer: false,
        reason:
          'Only loan officers see its output; it does not talk with applicants or generate public content.',
      },
    },
    roleAnswers: {
      builtBy: 'tenant',
      marketedUnder: 'tenant',
      substantiallyModified: false,
      repurposed: false,
      art25MakesProvider: false,
      usedUnderOwnAuthority: true,
      reason:
        'Built in-house and run by the bank for its own lending, so it is both provider and deployer.',
    },
    signals: [
      {
        kind: 'modification',
        text: 'Model version changed from credit-scoring-v2 to credit-scoring-v3; check whether this is a substantial modification.',
        observedAt: '2026-09-21T09:15:00.000Z',
      },
    ],
  },
  {
    id: 'sys-support',
    name: 'Customer support agent',
    description: 'Answers customer questions in chat and hands over to staff when unsure.',
    endpointId: 'ep-support',
    discovery: 'gateway',
    answers: {
      inScope: {
        answer: true,
        reason: 'A machine-based system that generates answers for customers in the EU.',
      },
      prohibited: {
        answer: false,
        reason: 'It does not use manipulative techniques or exploit vulnerable groups.',
      },
      annexI: {
        answer: false,
        reason: 'It is not part of a product covered by Annex I law.',
      },
      annexIII: {
        area: null,
        profilesPeople: false,
        exemptionHolds: false,
        reason: 'Its intended purpose is general service questions, not an Annex III area.',
      },
      transparency: {
        answer: true,
        reason:
          'It talks directly with customers, who must know they are dealing with an AI system.',
      },
    },
    roleAnswers: {
      builtBy: 'tenant',
      marketedUnder: 'tenant',
      substantiallyModified: false,
      repurposed: false,
      art25MakesProvider: false,
      usedUnderOwnAuthority: true,
      reason:
        'Built in-house on a general-purpose model and run by the bank, so it is both provider and deployer.',
    },
    signals: [
      {
        kind: 'drift',
        text: 'Observed requests touching credit decisions, reassess',
        observedAt: '2026-09-29T14:30:00.000Z',
        quarantineSummary: 'Advice that may read as a credit decision',
      },
    ],
  },
  {
    id: 'sys-router',
    name: 'Support ticket router',
    description: 'Sorts incoming support tickets into team queues. Bought off the shelf.',
    discovery: 'manual',
    answers: {
      inScope: {
        answer: true,
        reason: 'It infers a queue from ticket text, so it is an AI system used in the EU.',
      },
      prohibited: {
        answer: false,
        reason: 'Sorting tickets is not a prohibited practice.',
      },
      annexI: {
        answer: false,
        reason: 'It is not part of a product covered by Annex I law.',
      },
      annexIII: {
        area: null,
        profilesPeople: false,
        exemptionHolds: false,
        reason: 'Routing tickets to teams is not an Annex III area.',
      },
      transparency: {
        answer: false,
        reason: 'It creates no content and does not interact with people.',
      },
    },
    roleAnswers: {
      builtBy: 'third-party',
      marketedUnder: 'third-party',
      substantiallyModified: false,
      repurposed: false,
      art25MakesProvider: false,
      usedUnderOwnAuthority: true,
      reason:
        'Bought and used as delivered, under the supplier’s name, so the bank is only the deployer.',
    },
    signals: [],
  },
];
