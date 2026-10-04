import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, Send, RefreshCcw, FileText, Globe, Tag as TagIcon, Settings, Sparkles, LayoutDashboard, Plus, X, ChevronRight, ChevronLeft, Activity, Moon, Sun } from 'lucide-react';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        socket.on('connect', () => {
            fetchAIStatus();
            fetchCategories();
        });
        socket.on('connect_error', (err) => {
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
        fetchAIStatus();
        fetchCategories();
        return () => {
            socket.off('connect');
            socket.off('connect_error');
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

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/categories`);
            setCategories(res.data);
        } catch (e) {
            console.error('Error fetching categories', e);
        }
    };

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

    const handleContentChange = (content) => {
        setArticle(prev => ({ ...prev, content }));
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
                slug: res.//S truncated for space...
