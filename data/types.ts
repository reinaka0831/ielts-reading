
export type Question = {
  type:
    | 'true-false-not-given'
    | 'paragraph-matching'
    | 'matching-headings'
    | 'title-selection'
    | 'classification'
    | 'summary-completion'
    | 'sentence-completion'
    | 'table-completion'
    | 'flow-chart-completion'
    | 'diagram-label-completion'
    | 'sentence-endings'
    | 'multiple-choice'
    | 'matching-features'
    | 'short-answer';

  question: string;
  options: string[];
  correctAnswer: string;

  acceptableAnswers?: string[];

  explanation: string;
  advice: string;

  keywords?: string[];
  evidence?: string;
  strategy?: string;
};

export type ReadingData = {
  id: number;
  title: string;
  topic: string;
  difficulty: string;
  passage: string;
  questions: Question[];
};
