'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { runStrategyRecommendation } from '@/lib/actions/neuroscience/strategy';
import { ProviderSelector } from '@/components/students/provider-selector';
import type { NeuroscienceStrategy } from '@/features/neuroscience/types';
import type { ProviderName } from '@/features/ai-engine/providers/types';

type Student = {
  id: string;
  name: string;
  school: string;
  grade: number;
  hasVark: boolean;
  hasMbti: boolean;
};

type Props = {
  students: Student[];
  locale: string;
  availableProviders: ProviderName[];
};

export default function StrategyForm({ students, locale, availableProviders }: Props) {
  const t = useTranslations('Neuroscience');
  const [isPending, startTransition] = useTransition();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [result, setResult] = useState<{
    strategy: NeuroscienceStrategy;
    provider: string;
    model: string;
    cached: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [fatigueLevel, setFatigueLevel] = useState<string>('');
  const [concentrationLevel, setConcentrationLevel] = useState<string>('');
  const [studyDuration, setStudyDuration] = useState('');
  const [goalType, setGoalType] = useState<'memorization' | 'comprehension' | 'problem_solving' | 'creativity' | 'review'>('comprehension');
  const [specificTopic, setSpecificTopic] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('auto');

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await runStrategyRecommendation({
        studentId: selectedStudentId,
        situation: {
          subject,
          difficulty,
          timeOfDay,
          ...(fatigueLevel && { fatigueLevel }),
          ...(concentrationLevel && { concentrationLevel }),
          ...(studyDuration && { studyDuration: parseInt(studyDuration, 10) }),
        },
        goal: {
          type: goalType,
          ...(specificTopic && { specificTopic }),
        },
        locale,
        provider: selectedProvider,
      });

      if (res.success) {
        setResult(res.data);
      } else if ('fieldErrors' in res) {
        const firstError = Object.values(res.fieldErrors).flat()[0];
        setError(firstError ?? '입력 값을 확인해주세요.');
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t('strategy')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('selectStudent')}</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger><SelectValue placeholder={t('selectStudent')} /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.school} {s.grade}학년)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStudent && (
              <div className="mt-2 flex gap-2">
                {selectedStudent.hasVark && <Badge variant="secondary">VARK</Badge>}
                {selectedStudent.hasMbti && <Badge variant="secondary">MBTI</Badge>}
                {!selectedStudent.hasVark && !selectedStudent.hasMbti && (
                  <p className="text-sm text-muted-foreground">{t('noProfile')}</p>
                )}
              </div>
            )}
          </div>

          <ProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            availableProviders={availableProviders}
            disabled={isPending}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('subject')}</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('subjectPlaceholder')} />
            </div>
            <div>
              <Label>{t('difficulty')}</Label>
              <Select value={difficulty} onValueChange={v => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t('difficultyEasy')}</SelectItem>
                  <SelectItem value="medium">{t('difficultyMedium')}</SelectItem>
                  <SelectItem value="hard">{t('difficultyHard')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('timeOfDay')}</Label>
              <Select value={timeOfDay} onValueChange={v => setTimeOfDay(v as typeof timeOfDay)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t('timeMorning')}</SelectItem>
                  <SelectItem value="afternoon">{t('timeAfternoon')}</SelectItem>
                  <SelectItem value="evening">{t('timeEvening')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('studyDuration')}</Label>
              <Input type="number" value={studyDuration} onChange={e => setStudyDuration(e.target.value)} placeholder="60" min={10} max={240} />
            </div>
            <div>
              <Label>{t('fatigue')}</Label>
              <Select value={fatigueLevel} onValueChange={setFatigueLevel}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('levelLow')}</SelectItem>
                  <SelectItem value="medium">{t('levelMedium')}</SelectItem>
                  <SelectItem value="high">{t('levelHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('concentration')}</Label>
              <Select value={concentrationLevel} onValueChange={setConcentrationLevel}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('levelLow')}</SelectItem>
                  <SelectItem value="medium">{t('levelMedium')}</SelectItem>
                  <SelectItem value="high">{t('levelHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('goalType')}</Label>
              <Select value={goalType} onValueChange={v => setGoalType(v as typeof goalType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="memorization">{t('goalMemorization')}</SelectItem>
                  <SelectItem value="comprehension">{t('goalComprehension')}</SelectItem>
                  <SelectItem value="problem_solving">{t('goalProblemSolving')}</SelectItem>
                  <SelectItem value="creativity">{t('goalCreativity')}</SelectItem>
                  <SelectItem value="review">{t('goalReview')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('specificTopic')}</Label>
              <Input value={specificTopic} onChange={e => setSpecificTopic(e.target.value)} placeholder={t('specificTopicPlaceholder')} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isPending || !selectedStudentId || !subject} className="w-full">
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('analyzing')}</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{t('getRecommendation')}</>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />{error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resultTitle')}</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{t('provider')}: {result.provider}/{result.model}</Badge>
              {result.cached && <Badge variant="secondary">{t('cached')}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {result.strategy.strategies.map((s, i) => (
                <AccordionItem key={i} value={`strategy-${i}`}>
                  <AccordionTrigger className="text-left">
                    <span className="font-medium">{i + 1}. {s.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('neuroBasis')}</p>
                      <p className="text-sm">{s.neuroBasis}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fitReason')}</p>
                      <p className="text-sm">{s.fitReason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('steps')}</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {s.steps.map((step, j) => <li key={j}>{step}</li>)}
                      </ol>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('expectedEffect')}</p>
                      <p className="text-sm">{s.expectedEffect}</p>
                    </div>
                    {s.caution && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('caution')}</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">{s.caution}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-6 space-y-3 border-t pt-4">
              <div>
                <p className="font-medium">{t('overallAdvice')}</p>
                <p className="text-sm text-muted-foreground">{result.strategy.overallAdvice}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-sm font-medium">{t('references')}:</span>
                {result.strategy.references.map((ref, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{ref}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
