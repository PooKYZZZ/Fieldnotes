"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

type KnowledgeQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function KnowledgeCheck({ id, title, questions }: { id: string; title: string; questions: KnowledgeQuestion[] }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const current = questions[questionIndex];
  const hasAnswered = Object.hasOwn(answers, current.id);
  const isCorrect = answers[current.id] === current.correctIndex;
  const score = questions.reduce((count, question) => count + Number(answers[question.id] === question.correctIndex), 0);

  function checkAnswer() {
    if (selectedIndex === null || hasAnswered) return;
    setAnswers((previous) => ({ ...previous, [current.id]: selectedIndex }));
  }

  function continueCheck() {
    if (questionIndex === questions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedIndex(null);
  }

  function restartCheck() {
    setQuestionIndex(0);
    setSelectedIndex(null);
    setAnswers({});
    setFinished(false);
  }

  if (!current) return null;

  return (
    <section className="learning-knowledge-check" data-knowledge-check={id} aria-labelledby={`${id}-title`}>
      <div className="learning-knowledge-check-header">
        <p className="eyebrow">Knowledge check · Practice only</p>
        <h4 id={`${id}-title`}>{title}</h4>
        <p>Answer from memory, then read the explanation. This check does not create or claim a mastery record.</p>
      </div>

      {finished ? (
        <div className="knowledge-check-result" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div><strong>{score} of {questions.length} correct</strong><p>Use the explanations to decide what to revisit before your next practice step.</p></div>
          <button className="button button-outline" type="button" onClick={restartCheck}><RotateCcw size={14} aria-hidden="true" /> Try again</button>
        </div>
      ) : (
        <>
          <p className="knowledge-check-progress">Question {questionIndex + 1} of {questions.length}</p>
          <fieldset className="knowledge-check-question" disabled={hasAnswered}>
            <legend>{current.prompt}</legend>
            {current.options.map((option, index) => (
              <label className="knowledge-check-option" key={option}>
                <input
                  type="radio"
                  name={`${id}-${current.id}`}
                  value={index}
                  checked={selectedIndex === index}
                  onChange={() => setSelectedIndex(index)}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>

          {hasAnswered && (
            <div className={`knowledge-check-feedback${isCorrect ? " knowledge-check-feedback--correct" : " knowledge-check-feedback--incorrect"}`} role="status">
              {isCorrect ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
              <div><strong>{isCorrect ? "That is correct." : `Review the distinction: ${current.options[current.correctIndex]}`}</strong><p>{current.explanation}</p></div>
            </div>
          )}

          <div className="knowledge-check-actions">
            {!hasAnswered
              ? <button className="button button-primary" type="button" disabled={selectedIndex === null} onClick={checkAnswer}>Check answer</button>
              : <button className="button button-primary" type="button" onClick={continueCheck}>{questionIndex === questions.length - 1 ? "See result" : "Next question"}</button>}
          </div>
        </>
      )}
    </section>
  );
}
