import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: string;
  question: string;
  category: string;
  options: { label: string; value: string; score: number }[];
}

const questions: Question[] = [
  {
    id: 'pre_approval',
    question: 'Does the buyer have a current pre-approval?',
    category: 'Finance',
    options: [
      { label: 'Yes, current and valid', value: 'yes', score: 20 },
      { label: 'Expired or about to expire', value: 'expiring', score: 10 },
      { label: 'No pre-approval', value: 'no', score: 0 },
    ],
  },
  {
    id: 'deposit',
    question: 'Does the buyer have their deposit funds ready?',
    category: 'Finance',
    options: [
      { label: 'Yes, in a savings account', value: 'ready', score: 20 },
      { label: 'Partially — needs to sell or access funds', value: 'partial', score: 10 },
      { label: 'No deposit saved yet', value: 'no', score: 0 },
    ],
  },
  {
    id: 'employment',
    question: "What is the buyer's employment situation?",
    category: 'Income',
    options: [
      { label: 'Full-time PAYG (2+ years)', value: 'stable', score: 20 },
      { label: 'Part-time, casual, or contract', value: 'variable', score: 10 },
      { label: 'Self-employed or recently changed jobs', value: 'complex', score: 5 },
      { label: 'Unemployed or on Centrelink', value: 'none', score: 0 },
    ],
  },
  {
    id: 'debts',
    question: 'Does the buyer have existing debts (credit cards, car loans, BNPL)?',
    category: 'Liabilities',
    options: [
      { label: 'No debts at all', value: 'none', score: 15 },
      { label: 'Small debts — manageable', value: 'small', score: 10 },
      { label: 'Significant debts', value: 'significant', score: 3 },
    ],
  },
  {
    id: 'solicitor',
    question: 'Has the buyer engaged a solicitor or conveyancer?',
    category: 'Legal',
    options: [
      { label: 'Yes, engaged and ready', value: 'yes', score: 15 },
      { label: 'Not yet but has one in mind', value: 'planned', score: 8 },
      { label: "No, hasn't thought about it", value: 'no', score: 0 },
    ],
  },
  {
    id: 'timeline',
    question: 'When does the buyer want to purchase?',
    category: 'Timeline',
    options: [
      { label: 'Actively looking — ready now', value: 'now', score: 10 },
      { label: 'Within the next 3 months', value: 'soon', score: 7 },
      { label: '6+ months away', value: 'later', score: 3 },
    ],
  },
];

const maxScore = questions.reduce((sum, q) => sum + Math.max(...q.options.map(o => o.score)), 0);

function getRiskLevel(score: number) {
  const pct = (score / maxScore) * 100;
  if (pct >= 75) return { label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle2, desc: 'This buyer is well-prepared and likely to settle smoothly. A strong lead for referral.' };
  if (pct >= 50) return { label: 'Medium Risk', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle, desc: "Some gaps in readiness. May need guidance on a few areas before they're finance-ready." };
  return { label: 'High Risk', color: 'text-destructive', bg: 'bg-red-50 border-red-200', icon: XCircle, desc: 'Significant preparation needed. Recommend addressing key gaps before proceeding with finance.' };
}

export default function BuyerReadinessScore() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const allAnswered = questions.every(q => answers[q.id]);

  const score = useMemo(() => {
    return questions.reduce((total, q) => {
      const selected = q.options.find(o => o.value === answers[q.id]);
      return total + (selected?.score || 0);
    }, 0);
  }, [answers]);

  const risk = getRiskLevel(score);
  const pct = Math.round((score / maxScore) * 100);

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
  };

  const weakAreas = useMemo(() => {
    return questions
      .filter(q => {
        const selected = q.options.find(o => o.value === answers[q.id]);
        const max = Math.max(...q.options.map(o => o.score));
        return selected && selected.score < max * 0.5;
      })
      .map(q => ({ category: q.category, question: q.question }));
  }, [answers]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Buyer Readiness Risk Score
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quickly assess how prepared a buyer is to move forward with finance. Answer each question to get a risk score.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {questions.map((q, i) => (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">{q.category}</span>
                      <span className="text-xs text-muted-foreground">Q{i + 1} of {questions.length}</span>
                    </div>
                    <CardTitle className="text-base mt-1">{q.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={answers[q.id] || ''}
                      onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                      className="space-y-2"
                    >
                      {q.options.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt.value} id={`${q.id}-${opt.value}`} />
                          <Label htmlFor={`${q.id}-${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              <Button
                size="lg"
                className="w-full"
                disabled={!allAnswered}
                onClick={() => setShowResults(true)}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Calculate Risk Score
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Score Card */}
              <Card className={`border ${risk.bg}`}>
                <CardContent className="pt-6 text-center space-y-4">
                  <risk.icon className={`w-12 h-12 mx-auto ${risk.color}`} />
                  <div>
                    <p className={`text-2xl font-bold ${risk.color}`}>{risk.label}</p>
                    <p className="text-4xl font-bold mt-1">{pct}%</p>
                    <p className="text-sm text-muted-foreground">Score: {score} / {maxScore}</p>
                  </div>
                  <Progress value={pct} className="h-3" />
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{risk.desc}</p>
                </CardContent>
              </Card>

              {/* Weak Areas */}
              {weakAreas.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" /> Areas to Address
                    </CardTitle>
                    <CardDescription>These areas scored low and may need attention before the buyer proceeds.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {weakAreas.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded mt-0.5 shrink-0">{a.category}</span>
                          <span>{a.question}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {questions.map(q => {
                    const selected = q.options.find(o => o.value === answers[q.id]);
                    const max = Math.max(...q.options.map(o => o.score));
                    return (
                      <div key={q.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{q.category}</span>
                        <span className="font-semibold shrink-0">{selected?.score || 0} / {max}</span>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Total</span>
                    <span>{score} / {maxScore}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Start Over
                </Button>
                <Button className="flex-1" onClick={() => navigate('/submit-referral')}>
                  Refer to Margin <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important Note:</strong> This tool provides a general indication of buyer readiness and is not a substitute for a formal finance assessment. Always refer clients for professional advice.
        </p>
      </main>
    </div>
  );
}
