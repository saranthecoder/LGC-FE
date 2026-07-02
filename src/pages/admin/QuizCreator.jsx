import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { Sparkles, Plus, Check, Trash2, ArrowLeft, Upload } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';
import { alerts } from '../../utils/alerts';

export default function QuizCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  // Manual State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (editId) {
      const loadQuiz = async () => {
        try {
          const quiz = await api.get(`/quizzes/${editId}`);
          setQuizTitle(quiz.title);
          setQuizDescription(quiz.description || '');
          setQuestions(quiz.questions || []);
        } catch (err) {
          alerts.error('Error', 'Failed to load quiz details.');
        }
      };
      loadQuiz();
    }
  }, [editId]);
  
  // Current question draft state
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [timeLimit, setTimeLimit] = useState(30);
  const [qType, setQType] = useState('mcq'); // 'mcq' | 'tf' | 'fib' | 'match'
  const [fibAnswerText, setFibAnswerText] = useState(''); // For Fill in the blanks correct answer
  const [matchPairs, setMatchPairs] = useState([{ left: '', right: '' }]);

  const addMatchPair = () => {
    setMatchPairs([...matchPairs, { left: '', right: '' }]);
  };

  const removeMatchPair = (idx) => {
    setMatchPairs(matchPairs.filter((_, i) => i !== idx));
  };

  const handleMatchPairChange = (idx, field, val) => {
    const updated = [...matchPairs];
    updated[idx][field] = val;
    setMatchPairs(updated);
  };




  const handleAddQuestion = () => {
    if (!qText.trim()) {
      alerts.error('Missing Information', 'Please fill out the question text.');
      return;
    }

    let finalOptions = [];
    let finalCorrectIdx = 0;
    let finalCorrectAnswers = [];
    let finalMatchPairs = [];

    if (qType === 'mcq') {
      if (options.some(o => !o.trim())) {
        alerts.error('Missing Information', 'Please fill out all 4 option choices.');
        return;
      }
      finalOptions = [...options];
      finalCorrectIdx = correctIdx;
    } else if (qType === 'tf') {
      finalOptions = ['True', 'False'];
      finalCorrectIdx = correctIdx; // 0 for True, 1 for False
    } else if (qType === 'fib') {
      if (!fibAnswerText.trim()) {
        alerts.error('Missing Answer', 'Please specify the correct answer phrase.');
        return;
      }
      finalCorrectAnswers = [fibAnswerText.trim()];
    } else if (qType === 'match') {
      if (matchPairs.some(p => !p.left.trim() || !p.right.trim())) {
        alerts.error('Missing Pairs', 'Please fill out all matching left and right elements.');
        return;
      }
      finalMatchPairs = [...matchPairs];
    }

    gameAudio.playTick();
    setQuestions([
      ...questions,
      {
        questionText: qText,
        type: qType,
        options: finalOptions,
        correctOptionIndex: finalCorrectIdx,
        correctAnswers: finalCorrectAnswers,
        matchPairs: finalMatchPairs,
        timeLimit: Number(timeLimit)
      }
    ]);

    // Reset draft
    setQText('');
    setOptions(['', '', '', '']);
    setCorrectIdx(0);
    setFibAnswerText('');
    setMatchPairs([{ left: '', right: '' }]);
    setQType('mcq');
  };


  const handleDeleteQuestion = (idx) => {
    gameAudio.playIncorrect();
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleManualSave = async () => {
    if (!quizTitle.trim()) {
      alerts.error('Missing Information', 'Quiz title is required.');
      return;
    }
    if (questions.length === 0) {
      alerts.error('Empty Quiz', 'Add at least one question to save.');
      return;
    }

    gameAudio.playPowerUp();
    try {
      if (editId) {
        await api.put(`/quizzes/${editId}`, {
          title: quizTitle,
          description: quizDescription,
          questions
        });
      } else {
        await api.post('/quizzes', {
          title: quizTitle,
          description: quizDescription,
          questions
        });
      }
      gameAudio.playCorrect();
      alerts.success('Saved!', editId ? 'Quiz updated successfully!' : 'Quiz Saved to Library!');
      navigate('/admin/library');
    } catch (err) {
      alerts.error('Save Failed', err.message);
    }
  };

  const handleTemplateUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let imported = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            throw new Error('JSON template must be an array of questions.');
          }
          parsed.forEach((q, idx) => {
            if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || q.correctOptionIndex === undefined) {
              throw new Error(`Invalid format on question index ${idx + 1}.`);
            }
            imported.push({
              questionText: q.questionText,
              options: q.options.slice(0, 4),
              correctOptionIndex: Number(q.correctOptionIndex),
              timeLimit: Number(q.timeLimit || 30)
            });
          });
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length <= 1) {
            throw new Error('CSV must contain a header and at least one question line.');
          }

          // Simple CSV parser
          const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          // Skip header line
          for (let i = 1; i < lines.length; i++) {
            const columns = parseCSVLine(lines[i]);
            if (columns.length < 7) {
              throw new Error(`CSV line ${i + 1} does not have enough columns. (Needed: questionText, option1, option2, option3, option4, correctOptionIndex, timeLimit)`);
            }
            imported.push({
              questionText: columns[0].replace(/^"|"$/g, ''),
              options: [
                columns[1].replace(/^"|"$/g, ''),
                columns[2].replace(/^"|"$/g, ''),
                columns[3].replace(/^"|"$/g, ''),
                columns[4].replace(/^"|"$/g, '')
              ],
              correctOptionIndex: Number(columns[5]),
              timeLimit: Number(columns[6] || 30)
            });
          }
        } else {
          throw new Error('Unsupported file extension. Use .json or .csv.');
        }

        if (imported.length > 0) {
          gameAudio.playCorrect();
          setQuestions(prev => [...prev, ...imported]);
          alerts.success('Imported!', `Successfully imported ${imported.length} questions from template!`);
        }
      } catch (err) {
        gameAudio.playIncorrect();
        alerts.error('Import Failed', err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadTemplate = (format) => {
    gameAudio.playPowerUp();
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([
        {
          "questionText": "What is the primary gas found in Earth's atmosphere?",
          "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
          "correctOptionIndex": 1,
          "timeLimit": 30
        },
        {
          "questionText": "Which chemical element has the symbol Au?",
          "options": ["Silver", "Iron", "Gold", "Copper"],
          "correctOptionIndex": 2,
          "timeLimit": 20
        }
      ], null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "questions_template.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const csvContent = "data:text/csv;charset=utf-8,questionText,option1,option2,option3,option4,correctOptionIndex,timeLimit\n" +
        "What is the closest star to Earth,Alpha Centauri,Proxima Centauri,The Sun,Sirius,2,15\n" +
        "Which planet has the most prominent rings,Jupiter,Saturn,Uranus,Neptune,1,20\n" +
        "How many bones are in the adult human body,106,206,306,406,1,30\n" +
        "What is the boiling point of water in Celsius,50 C,90 C,100 C,120 C,2,15";
      const encodedUri = encodeURI(csvContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", encodedUri);
      downloadAnchor.setAttribute("download", "questions_template.csv");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };





  return (
    <div className="creator-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          className="btn btn-outline" 
          style={{ padding: '8px' }}
          onClick={() => { gameAudio.playTick(); navigate('/admin/dashboard'); }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{editId ? 'Edit Quiz' : 'Create a Quiz'}</h2>
      </div>

      {/* Manual Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
          
          {/* Title Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Quiz Details</h3>
            <div className="form-group">
              <label>Quiz Title</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Biology Unit 1 Review" 
                value={quizTitle}
                onChange={e => setQuizTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                className="form-input" 
                placeholder="Brief description of the quiz topics" 
                rows={2}
                value={quizDescription}
                onChange={e => setQuizDescription(e.target.value)}
                style={{ resize: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Import Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
              <Upload size={18} /> Import Questions from File Template
            </h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
              Upload a JSON or CSV template to bulk add questions to this quiz.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }}
                onClick={() => downloadTemplate('csv')}
              >
                Download Excel (CSV) Template
              </button>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => downloadTemplate('json')}
              >
                Download JSON Template
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="file" 
                accept=".json,.csv"
                id="template-upload"
                style={{ display: 'none' }}
                onChange={handleTemplateUpload}
              />
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => document.getElementById('template-upload').click()}
              >
                Choose JSON or CSV File
              </button>
              
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', flex: 1, minWidth: '240px' }}>
                Templates available in project workspace root: <code>questions_template.json</code> / <code>questions_template.csv</code>
              </span>
            </div>
          </div>

          {/* Added Questions List */}
          {questions.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Added Questions ({questions.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {questions.map((q, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-gray)' }}>{idx + 1}. </span>
                          <span style={{ fontWeight: 500, fontSize: '0.98rem' }}>{q.questionText}</span>
                        </div>
                        
                        <span style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-color)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          color: 'var(--text-gray)',
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }}>
                          ⏱️ {q.timeLimit}s
                        </span>
                      </div>

                      {/* Display choices grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '10px',
                        marginTop: '16px'
                      }}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = Number(oIdx) === Number(q.correctOptionIndex);
                          return (
                            <div 
                              key={oIdx}
                              style={{
                                background: isCorrect ? 'rgba(0, 206, 132, 0.08)' : 'rgba(255,255,255,0.01)',
                                border: `1px solid ${isCorrect ? 'var(--accent-green)' : 'var(--border-color)'}`,
                                borderRadius: '6px',
                                padding: '8px 14px',
                                fontSize: '0.82rem',
                                color: isCorrect ? 'var(--accent-green)' : 'var(--text-gray)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'var(--transition-smooth)'
                              }}
                            >
                              <span style={{ fontWeight: 700, opacity: isCorrect ? 1 : 0.6 }}>
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span style={{ wordBreak: 'break-word' }}>{opt}</span>
                              {isCorrect && <Check size={14} color="var(--accent-green)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      className="btn btn-outline" 
                      style={{ border: 'none', color: 'var(--accent-magenta)', padding: '6px', marginTop: '-4px' }}
                      onClick={() => handleDeleteQuestion(idx)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Question Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Add Question</h3>
            
            <div className="form-group">
              <label>Question Text</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="What is the speed of light?"
                value={qText}
                onChange={e => setQText(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Question Type</label>
              <select 
                className="form-input" 
                value={qType}
                onChange={e => {
                  setQType(e.target.value);
                  setCorrectIdx(0);
                }}
                style={{ background: '#161622', color: '#fff' }}
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="tf">True / False</option>
                <option value="fib">Fill in the Blanks</option>
                <option value="match">Match the Following</option>
              </select>
            </div>

            {/* Dynamic Inputs Based on Question Type */}
            {qType === 'mcq' && (
              <div className="form-group">
                <label>Answer Options & Correct Option Choice</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  {options.map((opt, oIdx) => (
                    <div 
                      key={oIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${correctIdx === oIdx ? 'var(--accent-green)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        padding: '4px 12px'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="correct_choice" 
                        checked={correctIdx === oIdx} 
                        onChange={() => setCorrectIdx(oIdx)}
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        placeholder={`Option ${oIdx + 1}`}
                        className="form-input"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...options];
                          newOpts[oIdx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        style={{ border: 'none', background: 'transparent', padding: '8px 0' }}
                      />
                      {correctIdx === oIdx && <Check size={18} color="var(--accent-green)" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {qType === 'tf' && (
              <div className="form-group">
                <label>Select Correct Truth Value</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${correctIdx === 0 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setCorrectIdx(0)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    True (Correct)
                  </button>
                  <button
                    type="button"
                    className={`btn ${correctIdx === 1 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setCorrectIdx(1)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    False (Correct)
                  </button>
                </div>
              </div>
            )}

            {qType === 'fib' && (
              <div className="form-group">
                <label>Define Correct Answer Text</label>
                <input 
                  type="text"
                  placeholder="Enter the correct answer phrase (case-insensitive)"
                  className="form-input"
                  value={fibAnswerText}
                  onChange={e => setFibAnswerText(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              </div>
            )}

            {qType === 'match' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Matching Pairs (Left matches Right)</label>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={addMatchPair}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    + Add Pair
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {matchPairs.map((pair, pIdx) => (
                    <div key={pIdx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder={`Left Key ${pIdx + 1} (e.g. Gold)`}
                        className="form-input"
                        value={pair.left}
                        onChange={e => handleMatchPairChange(pIdx, 'left', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: 'var(--text-gray)' }}>➔</span>
                      <input 
                        type="text" 
                        placeholder={`Right Val ${pIdx + 1} (e.g. Au)`}
                        className="form-input"
                        value={pair.right}
                        onChange={e => handleMatchPairChange(pIdx, 'right', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {matchPairs.length > 1 && (
                        <button 
                          type="button" 
                          className="btn btn-outline" 
                          onClick={() => removeMatchPair(pIdx)}
                          style={{ border: 'none', color: 'var(--accent-magenta)', padding: '6px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Timers */}
            <div className="form-group">
              <label>Time Limit (seconds)</label>
              <select 
                className="form-input" 
                value={timeLimit}
                onChange={e => setTimeLimit(Number(e.target.value))}
                style={{ background: '#161622', color: '#fff' }}
              >
                <option value={10}>10 Seconds (Very Fast)</option>
                <option value={20}>20 Seconds (Fast)</option>
                <option value={30}>30 Seconds (Standard)</option>
                <option value={60}>60 Seconds (Extended)</option>
              </select>
            </div>

            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ justifyContent: 'center', borderColor: 'var(--primary-violet)', color: 'var(--primary-violet)' }}
              onClick={handleAddQuestion}
            >
              <Plus size={18} /> Add Question to List
            </button>
          </div>

          {/* Action Button */}
          <button 
            type="button" 
            className="btn btn-primary"
            style={{ padding: '14px', justifyContent: 'center' }}
            onClick={handleManualSave}
            disabled={questions.length === 0 || !quizTitle.trim()}
          >
            {editId ? 'Save Changes' : 'Save Quiz to Library'}
          </button>
      </div>
    </div>
  );
}
