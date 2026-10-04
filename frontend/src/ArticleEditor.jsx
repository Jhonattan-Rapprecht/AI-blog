import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Send, RefreshCcw, FileText, Globe, Tag as TagIcon, Settings, Sparkles, LayoutDashboard } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');

const ArticleEditor = () => {
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
    const [loading, setLoading] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [aiStatus, setAIStatus] = useState('Checking...');

    useEffect(() => {
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

        fetchAIStatus();
        return () => {
            socket.off('ai:generation:started');
            socket.off('ai:generation:completed');
            socket.off('ai:generation:failed');
        };
    }, []);

    const fetchAIStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/ai/status`);
            setAIStatus(`${res.data.provider} (${res.data.model}) - ${res.data.status}`);
        } catch (e) {
            setAIStatus('Disconnected');
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
            setArticle(res.data.article);
            setMessage('AI generated the article and saved it as draft!');
        } catch (err) {
            setMessage('AI Error: ' + err.message);
            setGenLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>AI Article Editor</h1>
                    <p style={{ color: '#666', fontSize: '14px' }}>AI Status: <strong>{aiStatus}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleGenerate} disabled={genLoading} style={{ ...styles.button, backgroundColor: '#8a2be2' }}>
                        {genLoading ? 'Generating...' : <><Sparkles size={18} /> Generate with AI</>}
                    </button>
                    <button onClick={handleSave} disabled={loading} style={styles.button}>
                        {loading ? 'Saving...' : <><Save size={18} /> Save Draft</>}
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                <div style={styles.mainForm}>
                    <div style={styles.field}>
                        <label style={styles.label}><FileText size={16} /> Title</label>
                        <input name="title" value={article.title} onChange={handleChange} style={styles.input} placeholder="Enter article title..." />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Content</label>
                        <textarea name="content" value={article.content} onChange={handleChange} style={{ ...styles.input, height: '500px', resize: 'vertical' }} placeholder="Start writing or use AI to generate..." />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={styles.sidebar}>
                        <h3 style={{ marginTop: 0 }}><LayoutDashboard size={18} /> AI Configuration</h3>
                        <div style={styles.field}>
                            <label style={styles.label}>Topic</label>
                            <input name="topic" value={aiConfig.topic} onChange={handleAIChange} style={styles.input} placeholder="e.g. Future of AI in Dev" />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Tone</label>
                            <select name="tone" value={aiConfig.tone} onChange={handleAIChange} style={styles.input}>
                                <option>Professional</option>
                                <option>Conversational</option>
                                <option>Technical</option>
                                <option>Opinionated</option>
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Audience</label>
                            <input name="targetAudience" value={aiConfig.targetAudience} onChange={handleAIChange} style={styles.input} />
                        </div>
                    </div>

                    <div style={styles.sidebar}>
                        <h3 style={{ marginTop: 0 }}><Settings size={18} /> SEO & Metadata</h3>
                        <div style={styles.field}>
                            <label style={styles.label}><Globe size={16} /> Slug</label>
                            <input name="slug" value={article.slug} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}><TagIcon size={16} /> Category ID</label>
                            <input name="category_id" value={article.category_id} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>SEO Title</label>
                            <input name="seo_title" value={article.seo_title} onChange={handleChange} style={styles.input} />
                        </div>
                    </div>
                </div>
            </div>
            {message && <div style={styles.toast}>{message}</div>}
        </div>
    );
};

const styles = {
    button: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'opacity 0.2s' },
    mainForm: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    sidebar: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
    toast: { position: 'fixed', bottom: '20px', right: '20px', padding: '12px 20px', backgroundColor: '#333', color: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }
};

export default ArticleEditor;
