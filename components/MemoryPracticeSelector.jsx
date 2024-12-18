import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Layout, BookA, Users } from 'lucide-react';

export default function MemoryPracticeSelector() {
  const [activeMode, setActiveMode] = useState('pao');

  const modes = [
    {
      id: 'pao',
      title: '2-Digit PAO',
      description: 'Practice Person-Action-Object associations for numbers 00-99',
      icon: <Brain className="w-6 h-6" />,
      content: 'Current mode'
    },
    {
      id: 'cards',
      title: 'Card PAO',
      description: 'Learn and practice card-specific PAO systems',
      icon: <Layout className="w-6 h-6" />,
      content: 'Card practice'
    },
    {
      id: 'peg',
      title: 'Peg System',
      description: 'Master the peg system for ordered list memorization',
      icon: <BookA className="w-6 h-6" />,
      content: 'Peg system'
    },
    {
      id: 'names',
      title: 'Names & Faces',
      description: 'Techniques for remembering names and associated information',
      icon: <Users className="w-6 h-6" />,
      content: 'Names practice'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Tabs defaultValue="pao" onValueChange={setActiveMode}>
        <TabsList className="grid grid-cols-4 gap-4 mb-4">
          {modes.map(mode => (
            <TabsTrigger
              key={mode.id}
              value={mode.id}
              className="flex flex-col items-center p-4 gap-2"
            >
              {mode.icon}
              <span className="text-sm font-medium">{mode.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {modes.map(mode => (
          <TabsContent key={mode.id} value={mode.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {mode.icon}
                  {mode.title}
                </CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500">Practice module content will load here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
