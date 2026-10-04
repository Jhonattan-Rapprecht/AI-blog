import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, FileText, Globe, Tag as TagIcon, Settings, Sparkles, LayoutDashboard, Plus, X, Moon, Sun, ChevronRight, ChevronLeft, Activity } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3000/api';
const socket = io('http://localhost:3000', {
    transports: ['websocket', 'polling']
});

const ArticleEditor = ({ theme, toggleTheme }) => {
    const [article, setArticle] = useState({
        title: '', slug: '', excerpt: '', content: '',
        featured_image: '', status: 'draft', category_id: '',
        seo_title: '', seo_description: '', seo_keywords: ''
    });
    const [aiConfig, setAIConfig] = useState({
        topic: '', targetAudience: 'General', language: 'English',
        tone: 'Professional', articleLength: 'Medium', category: '',
        keywords: '', additionalInstructions: ''
    });

    const [categories, setCategories] = useState([]);
    const [audiences, setAudiences] = useState(['General', 'Technical', 'Business', 'Beginners', 'Experts']);
    const [slugSuggestions, setSlugSuggestions] = useState([]);

    const [loading, setLoading] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [aiStatus, setAIStatus] = useState('Checking...');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [isAddingAudience, setIsAddingAudience] = useState(false);
    const [newAudience, setNewAudience] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchAIStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/ai/status`);
            setAIStatus(`${res.data.provider} (${res.data.model}) - ${res.data.status}`);
        } catch {
            setAIStatus('Disconnected');
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/categories`);
            setCategories(res.data);
        } catch (e) {
            console.error('Error fetching categories', e);
        }
    };

    useEffect(() => {
        socket.on('connect', () => {
            fetchAIStatus();
            fetchCategories();
        });

        socket.on('connect_error', () => {
            setAIStatus('Disconnected (Socket Error)');
        });

        socket.on('ai:generation:started', (data) => {
            setMessage(`AI is generating article about: ${data.topic}...`);
        });
        socket.on('ai:generation:completed', (data) => {
            setGenLoading(false);
            setMessage(`AI Generation complete! Article ID: ${data.articleId}`);
        });
        socket.on('ai:generation:failed', (data) => {
            setGenLoading(false);
            setMessage(`AI Generation failed: ${data.error}`);
        });

        const loadInitialData = async () => {
            await Promise.all([fetchAIStatus(), fetchCategories()]);
        };
        loadInitialData();

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('ai:generation:started');
            socket.off('ai:generation:completed');
            socket.off('ai:generation:failed');
        };
    }, []);

    const handleAddCategory = async () => {
        if (!newCatName) return;
        try {
            await axios.post(`${API_BASE}/categories`, { name: newCatName });
            await fetchCategories();
            setNewCatName('');
            setIsAddingCategory(false);
        } catch (e) {
            setMessage('Error adding category: ' + e.message);
        }
    };

    const handleAddAudience = () => {
        if (!newAudience) return;
        setAudiences(prev => [...prev, newAudience]);
        setNewAudience('');
        setIsAddingAudience(false);
    };

    const handleSuggestSlug = async () => {
        if (!article.title) return setMessage('Please enter a title first');
        try {
            const res = await axios.post(`${API_BASE}/ai/suggest-slug`, { title: article.title });
            setSlugSuggestions(res.data.suggestions);
        } catch (e) {
            setMessage('Slug suggestion failed: ' + e.message);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setArticle(prev => ({ ...prev, [name]: value }));
    };

    const handleAIChange = (e) => {
        const { name, value } = e.target;
        setAIConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/articles`, article);
            setMessage('Article saved successfully!');
        } catch (err) {
            setMessage('Error saving: ' + err.message);
        }
        setLoading(false);
    };

    const handleGenerate = async () => {
        if (!aiConfig.topic) return setMessage('Please enter a topic');
        setGenLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/ai/generate-article`, aiConfig);
            const normalized = {
                title: res.data.article.title || '',
                slug: res.data.article.slug || '',
                excerpt: res.data.article.excerpt || '',
                content: res.data.article.content || '',
                featured_image: res.data.article.featured_image || '',
                status: res.data.article.status || 'draft',
                category_id: res.data.article.category_id || '',
                seo_title: res.data.article.seo_title || '',
                seo_description: res.data.article.seo_description || '',
                seo_keywords: res.data.article.seo_keywords || '',
            };
            setArticle(normalized);
            setMessage('AI generated the article and saved it as draft!');
        } catch (err) {
            setMessage('AI Error: ' + err.message);
            setGenLoading(false);
        }
    };

    const themeColors = theme === 'light' ? {
        bg: '#fcfcfc',
        card: '#ffffff',
        text: '#333',
        subtext: '#666',
        border: '#ddd',
        inputBg: '#fff',
        inputText: '#333',
        accent: '#007bff'
    } : {
        bg: '#1a1a1a',
        card: '#2d2d2d',
        text: '#f5f5f5',
        subtext: '#aaa',
        border: '#444',
        inputBg: '#3d3d3d',
        inputText: '#f5f5f5',
        accent: '#8a2be2'
    };

    return (
        <div style={{
            padding: '2rem',
            maxWidth: '1400px',
            margin: '0 auto',
            fontFamily: 'Inter, system-ui, sans-serif',
            backgroundColor: themeColors.bg,
            color: themeColors.text,
            minHeight: '100vh',
            transition: 'all 0.3s ease',
            position: 'relative'
        }}>
            {/* COLLAPSIBLE LEFT SIDEBAR */}
            <div style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: isSidebarOpen ? '300px' : '50px',
                backgroundColor: themeColors.card,
                borderRight: `1px solid ${themeColors.border}`,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isSidebarOpen ? '4px 0 10px rgba(0,0,0,0.05)' : 'none'
            }}>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    style={{
                        position: 'absolute',
                        right: isSidebarOpen ? '-40px' : '10px',
                        top: '20px',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        border: `1px solid ${themeColors.border}`,
                        backgroundColor: themeColors.card,
                        color: themeColors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>

                {isSidebarOpen && (
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: themeColors.text, fontWeight: 'bold', fontSize: '18px' }}>
                            <Settings size={20} /> Settings
                        </div>

                        <div style={styles.sidebarSection}>
                            <h4 style={{ ...styles.sectionTitle, color: themeColors.text }}><Activity size={16} /> Monitoring</h4>
                            <div style={styles.statusItem}>
                                <span style={{ fontSize: '12px', color: themeColors.subtext }}>AI Connection:</span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: aiStatus === 'Disconnected' ? '#ff4d4d' : '#4caf50' }}>{aiStatus}</span>
                            </div>
                        </div>

                        <div style={styles.sidebarSection}>
                            <h4 style={{ ...styles.sectionTitle, color: themeColors.text }}><Moon size={16} /> Theme</h4>
                            <button onClick={toggleTheme} style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: `1px solid ${themeColors.border}`,
                                backgroundColor: themeColors.inputBg,
                                color: themeColors.inputText,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                {theme === 'light' ? <><Moon size={14} /> Dark Mode</> : <><Sun size={14} /> Light Mode</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={{ marginLeft: '60px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ color: themeColors.text }}>
                        <h1 style={{ margin: 0, color: themeColors.text }}>AI Article Editor</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleGenerate} disabled={genLoading} style={{ ...styles.button, backgroundColor: '#8a2be2', color: 'white' }}>
                            {genLoading ? 'Generating...' : <><Sparkles size={18} /> Generate with AI</>}
                        </button>
                        <button onClick={handleSave} disabled={loading} style={{ ...styles.button, backgroundColor: '#007bff', color: 'white' }}>
                            {loading ? 'Saving...' : <><Save size={18} /> Save Draft</>}
                        </button>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                    <div style={styles.mainForm}>
                        <div style={styles.field}>
                            <label style={{ ...styles.label, color: themeColors.subtext }}><FileText size={16} /> Title</label>
                            <input name="title" value={article.title || ''} onChange={handleChange} style={{ ...styles.input, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} placeholder="Enter article title..." />
                        </div>
                        <div style={styles.field}>
                            <label style={{ ...styles.label, color: themeColors.subtext }}>Content</label>
                            <textarea name="content" value={article.content || ''} onChange={handleChange} style={{ ...styles.input, height: '500px', resize: 'vertical', backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} placeholder="Start writing or use AI to generate..." />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ ...styles.sidebar, backgroundColor: themeColors.card, border: `1px solid ${themeColors.border}` }}>
                            <h3 style={{ marginTop: 0, color: themeColors.text }}><LayoutDashboard size={18} /> AI Configuration</h3>
                            <div style={styles.field}>
                                <label style={{ ...styles.label, color: themeColors.subtext }}>Topic</label>
                                <input name="topic" value={aiConfig.topic || ''} onChange={handleAIChange} style={{ ...styles.input, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} placeholder="e.g. Future of AI in Dev" />
                            </div>
                            <div style={styles.field}>
                                <label style={{ ...styles.label, color: themeColors.subtext }}>Audience</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select name="targetAudience" value={aiConfig.targetAudience || ''} onChange={handleAIChange} style={{ ...styles.input, flex: 1, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }}>
                                        {audiences.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <button onClick={() => setIsAddingAudience(true)} style={styles.iconButton}><Plus size={18} /></button>
                                </div>
                                {isAddingAudience && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <input value={newAudience} onChange={(e) => setNewAudience(e.target.value)} style={{ ...styles.input, flex: 1, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} placeholder="New audience..." />
                                        <button onClick={handleAddAudience} style={styles.iconButton}><Save size={14} /></button>
                                        <button onClick={() => setIsAddingAudience(false)} style={styles.iconButton}><X size={14} /></button>
                                    </div>
                                )}
                            </div>
                            <div style={styles.field}>
                                <label style={{ ...styles.label, color: themeColors.subtext }}>Tone</label>
                                <select name="tone" value={aiConfig.tone || ''} onChange={handleAIChange} style={{ ...styles.input, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }}>
                                    <option>Professional</option>
                                    <option>Conversational</option>
                                    <option>Technical</option>
                                    <option>Opinionated</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ ...styles.sidebar, backgroundColor: themeColors.card, border: `1px solid ${themeColors.border}` }}>
                            <h3 style={{ marginTop: 0, color: themeColors.text }}><Settings size={18} /> SEO & Metadata</h3>
                            <div style={styles.field}>
                                <label style={{ ...styles.label, color: themeColors.subtext }}><Globe size={16} /> Slug</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input name="slug" value={article.slug || ''} onChange={handleChange} style={{ ...styles.input, flex: 1, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} />
                                    <button onClick={handleSuggestSlug} style={styles.iconButton} title="AI Suggest Slug"><Sparkles size={18} /></button>
                                </div>
                                {slugSuggestions.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        {slugSuggestions.map(s => (
                                            <span key={s} onClick={() => setArticle(prev => ({ ...prev, slug: s }))} style={styles.slugChip}>
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={styles.field}>
                                <label style={{ ...styles.label, color: themeColors.subtext }}><TagIcon size={16} /> Category</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select name="category_id" value={article.category_id || ''} onChange={handleChange} style={{ ...styles.input, flex: 1, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }}>
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={() => setIsAddingCategory(true)} style={styles.iconButton}><Plus size={18} /></button>
                                </div>
                                {isAddingCategory && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} style={{ ...styles.input, flex: 1, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} placeholder="New category..." />
                                        <button onClick={handleAddCategory} style={styles.iconButton}><Save size={14} /></button>
                                        <button onClick={() => setIsAddingCategory(false)} style={styles.iconButton}><X size={14} /></button>
                                    </div>
                                )}
                            </div>
                            <div style={styles.field}>
                                <label style={{ ...styles.label, color: themeColors.subtext }}>SEO Title</label>
                                <input name="seo_title" value={article.seo_title || ''} onChange={handleChange} style={{ ...styles.input, backgroundColor: themeColors.inputBg, color: themeColors.inputText, borderColor: themeColors.border }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {message && <div style={styles.toast}>{message}</div>}
        </div>
    );
};

const styles = {
    button: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease' },
    iconButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: 'transparent', color: 'inherit' },
    mainForm: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    sidebar: { padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    sidebarSection: { display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' },
    sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', margin: 0 },
    statusItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
    slugChip: { padding: '4px 8px', backgroundColor: '#e0e0e0', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' },
    toast: { position: 'fixed', bottom: '20px', right: '20px', padding: '12px 20px', backgroundColor: '#333', color: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }
};

export default ArticleEditor;
