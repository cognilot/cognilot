'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Play, Sparkles } from 'lucide-react';
import { ReadmeLayout } from '@/components/layout/ReadmeLayout';
import { Button } from '@/components/ui/button';

interface Skill {
  id: string;
  name: string;
  triggerDomain?: string;
  triggerLabel?: string;
  instruction: string;
  isActive: boolean;
  createdAt: string;
}

export default function PlaygroundPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [triggerDomain, setTriggerDomain] = useState('');
  const [triggerLabel, setTriggerLabel] = useState('');
  const [instruction, setInstruction] = useState('');

  const [testDomain, setTestDomain] = useState('');
  const [testLabel, setTestLabel] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [matchedSkill, setMatchedSkill] = useState<Skill | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cognilot_skills');
    if (saved) {
      try {
        setSkills(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  }, []);

  const saveSkills = (updatedSkills: Skill[]) => {
    setSkills(updatedSkills);
    localStorage.setItem('cognilot_skills', JSON.stringify(updatedSkills));
  };

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instruction.trim()) {
      toast.error('Skill name and prompt instruction are required.');
      return;
    }

    const newSkill: Skill = {
      id: crypto.randomUUID(),
      name: name.trim(),
      triggerDomain: triggerDomain.trim() || undefined,
      triggerLabel: triggerLabel.trim().toLowerCase() || undefined,
      instruction: instruction.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const nextSkills = [...skills, newSkill];
    saveSkills(nextSkills);

    setName('');
    setTriggerDomain('');
    setTriggerLabel('');
    setInstruction('');
    toast.success(`Skill "${newSkill.name}" created.`);
  };

  const handleDeleteSkill = (id: string, skillName: string) => {
    if (!confirm(`Delete skill "${skillName}"?`)) return;
    const nextSkills = skills.filter((s) => s.id !== id);
    saveSkills(nextSkills);
    toast.success(`Skill "${skillName}" deleted.`);
  };

  const handleToggleSkill = (id: string) => {
    const nextSkills = skills.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    saveSkills(nextSkills);
  };

  const handleTestInference = () => {
    if (!testLabel.trim()) {
      toast.error('Please enter a field label to test.');
      return;
    }

    const nLabel = testLabel.toLowerCase().trim();
    const nDomain = testDomain.toLowerCase().trim();

    const matched = skills.find((skill) => {
      if (!skill.isActive) return false;
      if (skill.triggerDomain) {
        const skillDom = skill.triggerDomain.toLowerCase();
        if (nDomain && !nDomain.includes(skillDom) && !skillDom.includes(nDomain)) return false;
      }
      if (skill.triggerLabel) {
        const skillLab = skill.triggerLabel.toLowerCase();
        if (!nLabel.includes(skillLab)) return false;
      }
      return !!(skill.triggerDomain || skill.triggerLabel);
    });

    setMatchedSkill(matched || null);

    if (matched) {
      setTestResult(
        `Matched skill: "${matched.name}"\nInstruction: "${matched.instruction}"\nResult: Autofilled using custom prompt`
      );
    } else {
      setTestResult(
        `No custom skill matched.\nUsing default model (Groq/Llama-3.3-70B).\nResult: Autofilled using default inference`
      );
    }
  };

  if (loading) {
    return (
      <ReadmeLayout
        filename="playground.md"
        description="Configure custom prompts and instructions for specific domains"
      >
        <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
      </ReadmeLayout>
    );
  }

  return (
    <ReadmeLayout
      filename="playground.md"
      description="Configure custom prompts and instructions for specific domains"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-5">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                Create Skill
              </div>

              <form onSubmit={handleCreateSkill} className="space-y-4">
                <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                  <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">Name</div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. bio_summarizer"
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                    required
                  />
                </div>

                <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                  <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">Domain</div>
                  <input
                    type="text"
                    value={triggerDomain}
                    onChange={(e) => setTriggerDomain(e.target.value)}
                    placeholder="e.g. linkedin.com (optional)"
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                  />
                </div>

                <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                  <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">Label</div>
                  <input
                    type="text"
                    value={triggerLabel}
                    onChange={(e) => setTriggerLabel(e.target.value)}
                    placeholder="e.g. summary, bio, experience (optional)"
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                  />
                </div>

                <div className="flex flex-col relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-2">
                  <div className="text-white/60 font-medium py-1 mb-1">Instructions</div>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="How should the AI write, filter, or summarize this field?"
                    className="w-full bg-white/2 border border-white/5 text-white rounded p-3 placeholder:text-white/15 focus:bg-white/5 transition-colors outline-none resize-y min-h-[120px] text-sm"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button variant="terminal" size="sm" type="submit">
                    <Plus className="w-3.5 h-3.5" />
                    Create Skill
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-5">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                Test Sandbox
              </div>

              <div className="space-y-0">
                <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                  <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                    Domain
                  </span>
                  <input
                    type="text"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="e.g. linkedin.com"
                    className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                  />
                </div>
                <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                  <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                    Field Label
                  </span>
                  <input
                    type="text"
                    value={testLabel}
                    onChange={(e) => setTestLabel(e.target.value)}
                    placeholder="e.g. Summary"
                    className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                  />
                </div>
              </div>

              <Button variant="terminal" size="sm" type="button" onClick={handleTestInference}>
                <Play className="w-3.5 h-3.5" />
                Run Test
              </Button>

              {testResult && (
                <div className="bg-white/2 border border-white/5 p-4 rounded-lg text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">
                  {testResult}
                  {matchedSkill && (
                    <div className="mt-3 p-3 bg-accent-violet/10 border border-accent-violet/20 text-accent-violet rounded flex items-start gap-2">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Active skill override:</div>
                        <div className="italic mt-1">&quot;{matchedSkill.instruction}&quot;</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden h-full">
            <div className="p-6 space-y-6">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                Configured Skills ({skills.length})
              </div>

              {skills.length === 0 ? (
                <div className="text-white/20 py-8 border border-dashed border-white/5 rounded-lg text-center text-sm">
                  No skills defined yet. Use the editor to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`border rounded-lg p-4 transition-all ${
                        skill.isActive
                          ? 'border-white/10 bg-white/[0.02]'
                          : 'border-white/5 bg-white/[0.005] opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="font-medium text-white">{skill.name}</span>
                        <div className="flex items-center gap-2 select-none">
                          <button
                            onClick={() => handleToggleSkill(skill.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              skill.isActive
                                ? 'bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/20'
                                : 'bg-white/5 border border-white/10 text-white/30 hover:bg-white/10'
                            }`}
                          >
                            {skill.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id, skill.name)}
                            className="text-white/30 hover:text-red-400 p-1 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {(skill.triggerDomain || skill.triggerLabel) && (
                        <div className="text-[11px] space-y-1 mb-3 text-white/40 border-b border-white/5 pb-2">
                          {skill.triggerDomain && (
                            <div>
                              <span className="text-white/50">Domain:</span> {skill.triggerDomain}
                            </div>
                          )}
                          {skill.triggerLabel && (
                            <div>
                              <span className="text-white/50">Label:</span> {skill.triggerLabel}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className="text-white/60 text-[12px] bg-white/2 p-2 rounded border border-white/5 line-clamp-3 overflow-hidden leading-relaxed"
                        title={skill.instruction}
                      >
                        {skill.instruction}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ReadmeLayout>
  );
}
