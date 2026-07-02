import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { alerts } from '../../utils/alerts';
import gameAudio from '../../utils/AudioEngine';
import { Plus, Users, Award, BookOpen, Send, Megaphone, Edit, Trash2, Check, X } from 'lucide-react';

export default function TeacherClassrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);

  // Editing State
  const [editingClassId, setEditingClassId] = useState(null);
  const [editClassNameText, setEditClassNameText] = useState('');

  // Announcement and assign dialog targets
  const [selectedClass, setSelectedClass] = useState(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [assignQuizId, setAssignQuizId] = useState('');

  useEffect(() => {
    fetchClassroomsAndQuizzes();
  }, []);

  const fetchClassroomsAndQuizzes = async () => {
    try {
      const classData = await api.get('/classrooms');
      setClassrooms(classData);
      const quizData = await api.get('/quizzes');
      setQuizzes(quizData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!className.trim()) return;
    gameAudio.playPowerUp();

    try {
      const newClass = await api.post('/classrooms', { name: className.trim() });
      alerts.success('Classroom Created!', `Class Code: ${newClass.code}`);
      setClassName('');
      fetchClassroomsAndQuizzes();
    } catch (err) {
      alerts.error('Creation Failed', err.message);
    }
  };

  const handleUpdateClass = async (classId) => {
    if (!editClassNameText.trim()) return;
    gameAudio.playPowerUp();

    try {
      await api.put(`/classrooms/${classId}`, { name: editClassNameText.trim() });
      alerts.success('Updated!', 'Classroom name updated successfully!');
      setEditingClassId(null);
      fetchClassroomsAndQuizzes();
    } catch (err) {
      alerts.error('Update Failed', err.message);
    }
  };

  const handleDeleteClass = async (classId) => {
    const confirmDelete = await alerts.confirm(
      'Delete Classroom?',
      'Are you sure you want to delete this classroom? Enrolled students will lose access.'
    );
    if (!confirmDelete) return;
    gameAudio.playIncorrect();

    try {
      await api.delete(`/classrooms/${classId}`);
      alerts.success('Deleted!', 'Classroom has been successfully deleted.');
      fetchClassroomsAndQuizzes();
    } catch (err) {
      alerts.error('Delete Failed', err.message);
    }
  };

  const handlePostAnnouncement = async (classId) => {
    if (!announcementText.trim()) return;
    gameAudio.playTick();

    try {
      await api.post(`/classrooms/${classId}/announcements`, { content: announcementText.trim() });
      alerts.success('Posted!', 'Bulletin announcement shared successfully!');
      setAnnouncementText('');
      fetchClassroomsAndQuizzes();
    } catch (err) {
      alerts.error('Failed to post', err.message);
    }
  };

  const handleAssignQuiz = async (classId) => {
    if (!assignQuizId) return;
    gameAudio.playPowerUp();

    try {
      await api.post(`/classrooms/${classId}/assign`, { quizId: assignQuizId });
      alerts.success('Assigned!', 'Quiz assigned to classroom successfully!');
      fetchClassroomsAndQuizzes();
    } catch (err) {
      alerts.error('Assign Failed', err.message);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '24px' }}>Loading classrooms...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px' }}>
      
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--primary-violet)' }}>
          Classrooms Manager
        </h2>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
          Create virtual spaces, enroll students, post bulletins, and assign homework!
        </p>
      </div>

      {/* Classroom Creation Panel */}
      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Create New Classroom</h3>
        <form onSubmit={handleCreateClass} style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. Biology Period 4" 
            value={className}
            onChange={e => setClassName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={!className.trim()}>
            <Plus size={16} /> Create Class
          </button>
        </form>
      </div>

      {/* Classrooms List grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {classrooms.map((cls) => (
          <div key={cls._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                {editingClassId === cls._id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editClassNameText}
                      onChange={e => setEditClassNameText(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                    />
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px' }}
                      onClick={() => handleUpdateClass(cls._id)}
                      title="Save Changes"
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '6px' }}
                      onClick={() => setEditingClassId(null)}
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{cls.name}</h3>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-dim)' }}
                      onClick={() => {
                        setEditingClassId(cls._id);
                        setEditClassNameText(cls.name);
                      }}
                      title="Edit Classroom Name"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--accent-magenta)' }}
                      onClick={() => handleDeleteClass(cls._id)}
                      title="Delete Classroom"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  Enrolled Students: {cls.students?.length || 0}
                </span>
              </div>

              <div style={{
                background: 'rgba(108,66,245,0.08)',
                border: '1px solid var(--primary-violet-glow)',
                padding: '4px 12px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-gray)' }}>PIN Code</span>
                <div style={{ fontWeight: 800, color: 'var(--primary-violet)', fontSize: '1.1rem' }}>{cls.code}</div>
              </div>
            </div>

            {/* Quick Actions (Announcements / Assignments) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              
              {/* Bulletin publisher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Megaphone size={14} color="var(--accent-orange)" /> Post Announcement
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Share an update with your class..." 
                    value={selectedClass === cls._id ? announcementText : ''}
                    onChange={e => {
                      setSelectedClass(cls._id);
                      setAnnouncementText(e.target.value);
                    }}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handlePostAnnouncement(cls._id)}
                    style={{ padding: '6px 12px' }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Quiz assignment dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} color="var(--accent-blue)" /> Assign Homework Assignment
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-input"
                    value={selectedClass === cls._id ? assignQuizId : ''}
                    onChange={e => {
                      setSelectedClass(cls._id);
                      setAssignQuizId(e.target.value);
                    }}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem', background: '#09090e' }}
                  >
                    <option value="">-- Choose Quiz from Library --</option>
                    {quizzes.map(q => (
                      <option key={q._id} value={q._id}>{q.title}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => handleAssignQuiz(cls._id)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Assign
                  </button>
                </div>
              </div>

            </div>

            {/* List of active bulletins */}
            {cls.announcements?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-gray)' }}>Bulletins</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                  {cls.announcements.slice().reverse().map((ann, aIdx) => (
                    <div key={aIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <p>{ann.content}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ))}

        {classrooms.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
            No classrooms created yet. Build one above to assign homework!
          </div>
        )}
      </div>

    </div>
  );
}
