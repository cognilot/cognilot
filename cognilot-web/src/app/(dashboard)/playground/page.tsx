'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Play, Sparkles } from 'lucide-react';
import { DocLayout } from '@/components/layout/DocLayout';
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
        `Matched Skill: "${matched.name}"\nCustom Prompt Instruction:\n"${matched.instruction}"\n\nExecution Status: Verified and matched domain/field patterns.`
      );
    } else {
      setTestResult(
        `No custom skill matched.\nRouting to default model (Groq Llama-3.3-70B).\nStandard autofill rules applied.`
      );
    }
  };

  if (loading) {
    return (
      <DocLayout
        filename="Skills Workbench"
        description="Configure domain-specific AI prompt instructions and test behavior"
      >
        <div className="h-72 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
      </DocLayout>
    );
  }

  return (
    <DocLayout
      filename="Skills Workbench"
      description="Configure domain-specific AI prompt instructions and test behavior"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Creator & Test Sandbox */}
        <div className="lg:col-span-2 space-y-8">
          {/* Creator Form */}
          <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2.5 pb-6 border-b border-white/5 mb-6">
              <Plus className="w-5 h-5 text-accent-violet" />
              <div>
                <h2 className="text-base font-bold text-white">Create Custom Skill</h2>
                <p className="text-xs text-dim mt-0.5">
                  Teach Cognilot how to format, summarize, or translate specific inputs
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSkill} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Skill Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Bio Summarizer"
                    className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:border-accent-violet outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">
                    Trigger Domain (Optional)
                  </label>
                  <input
                    type="text"
                    value={triggerDomain}
                    onChange={(e) => setTriggerDomain(e.target.value)}
                    placeholder="e.g. linkedin.com"
                    className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:border-accent-violet outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">
                  Trigger Field Label (Optional)
                </label>
                <input
                  type="text"
                  value={triggerLabel}
                  onChange={(e) => setTriggerLabel(e.target.value)}
                  placeholder="e.g. summary, bio, experience"
                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:border-accent-violet outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">
                  AI System Instructions
                </label>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Example: Keep the output strictly under 100 words, highlight leadership experience, and use professional 3rd-person tone."
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl p-4 text-sm focus:border-accent-violet outline-none transition-colors resize-y leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2">
                <Button variant="solid" size="md" type="submit">
                  <Plus className="w-4 h-4" />
                  <span>Create Skill</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Testing Sandbox */}
          <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2.5 pb-6 border-b border-white/5 mb-6">
              <Play className="w-5 h-5 text-accent-cyan" />
              <div>
                <h2 className="text-base font-bold text-white">Test Skill Matching Sandbox</h2>
                <p className="text-xs text-dim mt-0.5">
                  Verify if your skills trigger accurately before browsing
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Test Domain</label>
                  <input
                    type="text"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="e.g. linkedin.com"
                    className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:border-accent-cyan outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Test Field Label</label>
                  <input
                    type="text"
                    value={testLabel}
                    onChange={(e) => setTestLabel(e.target.value)}
                    placeholder="e.g. Summary"
                    className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:border-accent-cyan outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <Button
                  variant="terminal"
                  size="md"
                  type="button"
                  onClick={handleTestInference}
                  className="cursor-pointer"
                >
                  <Play className="w-4 h-4 text-accent-cyan" />
                  <span>Execute Test</span>
                </Button>
              </div>

              {testResult && (
                <div className="bg-[#0a0a0f] border border-white/10 p-5 rounded-xl text-xs font-mono text-white/80 whitespace-pre-wrap leading-relaxed">
                  {testResult}
                  {matchedSkill && (
                    <div className="mt-4 p-3 bg-accent-violet/10 border border-accent-violet/30 text-accent-violet rounded-lg font-sans flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-accent-violet" />
                      <div>
                        <div className="font-semibold text-xs">
                          Skill Activated: {matchedSkill.name}
                        </div>
                        <div className="text-white/60 text-xs mt-1">
                          &quot;{matchedSkill.instruction}&quot;
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Configured Skills List */}
        <div>
          <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg h-full">
            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
              <h2 className="text-base font-bold text-white">Active Skills</h2>
              <span className="text-xs font-mono text-white/40">{skills.length} total</span>
            </div>

            {skills.length === 0 ? (
              <div className="text-white/30 py-12 border border-dashed border-white/10 rounded-xl text-center text-xs">
                No custom skills defined yet.
              </div>
            ) : (
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`border rounded-xl p-4 transition-all ${
                      skill.isActive
                        ? 'border-white/10 bg-white/[0.02]'
                        : 'border-white/5 bg-white/[0.01] opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {skill.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleSkill(skill.id)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            skill.isActive
                              ? 'bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan'
                              : 'bg-white/5 border border-white/10 text-white/40'
                          }`}
                        >
                          {skill.isActive ? 'Active' : 'Off'}
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id, skill.name)}
                          className="text-white/30 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {(skill.triggerDomain || skill.triggerLabel) && (
                      <div className="text-[11px] text-white/40 space-y-0.5 mb-2 font-mono">
                        {skill.triggerDomain && <div>@{skill.triggerDomain}</div>}
                        {skill.triggerLabel && <div>#{skill.triggerLabel}</div>}
                      </div>
                    )}

                    <div className="text-xs text-white/70 bg-white/[0.02] p-2.5 rounded-lg border border-white/5 line-clamp-3 leading-relaxed">
                      {skill.instruction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DocLayout>
  );
}
