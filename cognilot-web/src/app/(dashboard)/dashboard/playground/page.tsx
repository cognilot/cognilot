'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Play, Sparkles } from 'lucide-react';

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

  // States for creating a skill
  const [name, setName] = useState('');
  const [triggerDomain, setTriggerDomain] = useState('');
  const [triggerLabel, setTriggerLabel] = useState('');
  const [instruction, setInstruction] = useState('');

  // States for the Test Bench
  const [testDomain, setTestDomain] = useState('');
  const [testLabel, setTestLabel] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [matchedSkill, setMatchedSkill] = useState<Skill | null>(null);

  useEffect(() => {
    // Load skills from localStorage
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
    toast.success(`Skill "${newSkill.name}" created successfully.`);
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

    // Find first active skill that matches
    const matched = skills.find((skill) => {
      if (!skill.isActive) return false;

      // Match domain (if skill has one configured)
      if (skill.triggerDomain) {
        const skillDom = skill.triggerDomain.toLowerCase();
        if (nDomain && !nDomain.includes(skillDom) && !skillDom.includes(nDomain)) {
          return false;
        }
      }

      // Match label pattern (if skill has one configured)
      if (skill.triggerLabel) {
        const skillLab = skill.triggerLabel.toLowerCase();
        if (!nLabel.includes(skillLab)) {
          return false;
        }
      }

      // If it doesn't specify domain or label, it's a global override candidate
      return !!(skill.triggerDomain || skill.triggerLabel);
    });

    setMatchedSkill(matched || null);

    if (matched) {
      setTestResult(`[Cognilot Sandbox Engine]
> Matched custom skill: "${matched.name}"
> Overriding system instruction: "${matched.instruction}"
> Resolving dynamic prompt variables...
> Output: [Autofilled successfully using custom prompt parameters]`);
    } else {
      setTestResult(`[Cognilot Sandbox Engine]
> No custom skill matched.
> Routing to default inference engine (Groq/Llama-3.3-70B)...
> System instructions loaded successfully.
> Output: [Autofilled using default models]`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6 animate-pulse">
        <div>// compiling_skills_sandbox.sh...</div>
        <div className="h-64 bg-white/2 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px]">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-accent-violet">#</span> playground.md
        </h1>
        <p className="text-white/40">
          {'// Configure custom prompts, instructions, and templates for specific domains'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form and Sandbox (Takes 2/3 cols on lg screens) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Create Skill Window */}
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1 text-right">
                skills/creator.sh
              </div>
            </div>

            <form onSubmit={handleCreateSkill} className="p-6 space-y-5">
              <div className="text-white/30 select-none font-bold uppercase tracking-wider text-[11px]">
                ## create_new_skill
              </div>

              {/* Name */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  skill_name
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. bio_summarizer"
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                  required
                />
              </div>

              {/* Trigger Domain */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  target_domain
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <input
                  type="text"
                  value={triggerDomain}
                  onChange={(e) => setTriggerDomain(e.target.value)}
                  placeholder="e.g. linkedin.com (optional)"
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                />
              </div>

              {/* Trigger Label */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  target_label
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <input
                  type="text"
                  value={triggerLabel}
                  onChange={(e) => setTriggerLabel(e.target.value)}
                  placeholder="e.g. summary, bio, experience (optional)"
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                />
              </div>

              {/* Instructions */}
              <div className="flex flex-col relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-2">
                <div className="text-accent-violet select-none py-1 flex items-center font-semibold mb-1">
                  prompt_instructions
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="// Enter details about how the AI should write, filter or summarize this field...&#10;// e.g. 'Summarize my work experience in exactly 3 bullet points, using a formal tone.'"
                  className="w-full bg-white/2 border border-white/5 text-white rounded p-3 placeholder:text-white/10 focus:bg-white/5 transition-colors outline-none resize-y min-h-[120px] font-mono text-[13px]"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="py-2 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded transition-colors flex items-center gap-2 group font-bold select-none cursor-pointer"
                >
                  <span className="text-accent-violet font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    {'>'}
                  </span>
                  ./create_skill.sh
                </button>
              </div>
            </form>
          </div>

          {/* Test Bench Sandbox */}
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1 text-right">
                skills/test_bench.sh
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-white/30 select-none font-bold uppercase tracking-wider text-[11px]">
                ## interactive_sandbox_test
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/40 block text-[11px] mb-1">
                    Simulate URL/Domain:
                  </label>
                  <input
                    type="text"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="e.g. linkedin.com"
                    className="w-full bg-transparent border-b border-white/10 text-white pb-1 focus:border-white/30 outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/40 block text-[11px] mb-1">
                    Simulate Field Label:
                  </label>
                  <input
                    type="text"
                    value={testLabel}
                    onChange={(e) => setTestLabel(e.target.value)}
                    placeholder="e.g. Summary"
                    className="w-full bg-transparent border-b border-white/10 text-white pb-1 focus:border-white/30 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestInference}
                className="py-2 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded transition-colors flex items-center gap-2 group font-bold select-none cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-accent-cyan" />
                [EXECUTE SANDBOX TEST]
              </button>

              {testResult && (
                <div className="bg-white/2 border border-white/5 p-4 rounded-lg font-mono text-[12px] leading-relaxed text-white/70 whitespace-pre">
                  {testResult}
                  {matchedSkill && (
                    <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded flex items-start gap-2">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Active Skill Overriding Prompt:</div>
                        <div className="italic mt-1">&quot;{matchedSkill.instruction}&quot;</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Skills List */}
        <div>
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1">
                Active Skills Library
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-white/30 select-none font-bold uppercase tracking-wider text-[11px]">
                ## configured_skills ({skills.length})
              </div>

              {skills.length === 0 ? (
                <div className="text-white/20 select-none py-8 border border-dashed border-white/5 rounded-lg text-center">
                  // No custom skills defined yet. Use the editor to construct one.
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
                        <span className="font-bold text-white font-mono">{skill.name}</span>
                        <div className="flex items-center gap-2 select-none">
                          <button
                            onClick={() => handleToggleSkill(skill.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              skill.isActive
                                ? 'bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan hover:bg-cyan-500/20'
                                : 'bg-white/5 border border-white/10 text-white/30 hover:bg-white/10'
                            }`}
                          >
                            {skill.isActive ? '[ACTIVE]' : '[INACTIVE]'}
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id, skill.name)}
                            className="text-white/30 hover:text-red-400 p-1 rounded transition-colors"
                            title="Delete skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Triggers info */}
                      {(skill.triggerDomain || skill.triggerLabel) && (
                        <div className="text-[11px] space-y-1 mb-3 text-white/40 border-b border-white/5 pb-2">
                          {skill.triggerDomain && (
                            <div>
                              <span className="text-accent-violet">domain:</span>{' '}
                              {skill.triggerDomain}
                            </div>
                          )}
                          {skill.triggerLabel && (
                            <div>
                              <span className="text-accent-violet">label_matches:</span>{' '}
                              {skill.triggerLabel}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className="text-white/60 text-[12px] bg-white/2 p-2 rounded border border-white/5 line-clamp-3 overflow-hidden font-mono leading-relaxed"
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
    </div>
  );
}
