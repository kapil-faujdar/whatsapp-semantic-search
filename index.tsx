import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';

// --- DATA & LOGIC ---

interface Message {
  id: string;
  sender: string;
  timestamp: string;
  type: 'text' | 'image' | 'pdf' | 'link';
  body: string;
  fileName?: string;
  linkUrl?: string;
  linkTitle?: string;
  ocrText?: string;
  isIncoming: boolean;
  isForwarded?: boolean;
}

interface SearchResult {
  message: Message;
  score: number;
  badges: string[];
  matchType: 'Exact' | 'Semantic' | 'Related';
}

interface ChatSession {
    id: string;
    name: string;
    status: string;
    messages: Message[];
    unreadCount?: number;
    timeDisplay?: string;
    isGroup?: boolean;
}

// EXPANDED DATASET (~60 Messages for rich search)
const ALL_MESSAGES: Message[] = [
    // --- JAN: New Year & Setup ---
    { id: "m1", sender: "Mom", timestamp: "2024-01-01T00:05:00", type: "text", body: "Happy New Year! 🎆 Hope 2024 is amazing for you.", isIncoming: true },
    { id: "m2", sender: "You", timestamp: "2024-01-01T00:06:00", type: "text", body: "Happy New Year Mom! Wishing you good health and happiness this year.", isIncoming: false },
    { id: "m3", sender: "Gym Buddy", timestamp: "2024-01-02T09:00:00", type: "text", body: "You coming today? Leg day.", isIncoming: true },
    { id: "m4", sender: "You", timestamp: "2024-01-02T09:05:00", type: "text", body: "Yeah, be there in 20 mins. Traffic is a bit heavy near the junction but I'm on my way. Start the warm-up without me!", isIncoming: false },
    
    // --- JAN: Work Project Start ---
    { id: "m5", sender: "Teammate", timestamp: "2024-01-05T10:00:00", type: "text", body: "Project Alpha kickoff is starting in the main conference room. We need to finalize the roadmap for Q1.", isIncoming: true },
    { id: "m6", sender: "Teammate", timestamp: "2024-01-05T14:00:00", type: "link", body: "Here is the Jira board for tracking tasks.", linkUrl: "https://jira.acmecorp.com/browse/ALPHA-1", linkTitle: "Project Alpha - Sprint 1 Board", isIncoming: true, isForwarded: true },
    
    // --- JAN: Bill 1 ---
    { id: "m7", sender: "Power Co.", timestamp: "2024-01-06T09:00:00", type: "pdf", body: "Your electricity bill for January is generated.", fileName: "Statement_JAN24.pdf", ocrText: "Jaipur Electricity Distribution Ltd. Billing Period: 01 Jan 2024. Due: $120.", isIncoming: true },

    // --- JAN: Car Issues ---
    { id: "m8", sender: "You", timestamp: "2024-01-15T16:30:00", type: "image", body: "Car making weird noise, took a photo of the engine light. It starts rattling whenever I go above 60kmph on the highway.", fileName: "IMG_Engine_Err.jpg", ocrText: "Check Engine. Error Code P0300. Misfire detected.", isIncoming: false },
    { id: "m9", sender: "Mechanic", timestamp: "2024-01-16T11:00:00", type: "pdf", body: "Here is the estimate for repairs.", fileName: "Repair_Est_Toyota.pdf", ocrText: "Joe's Auto Shop. Spark plug replacement. Total: $450.", isIncoming: true },

    // --- FEB: Family & ID (The Aadhaar Scenario) ---
    { id: "m10", sender: "Mom", timestamp: "2024-02-14T19:00:00", type: "text", body: "Dad needs you to update your nominee details in the bank account. He visited the branch today and they said KYC is pending.", isIncoming: true },
    { id: "m11", sender: "Mom", timestamp: "2024-02-14T19:30:00", type: "image", body: "Save this ID, you'll need it for KYC and tax.", fileName: "IMG_20240214_193022.jpg", ocrText: "GOVERNMENT OF INDIA. UNIQUE IDENTIFICATION AUTHORITY OF INDIA. Year of Birth: 1965. Male. Aadhaar.", isIncoming: true, isForwarded: true },
    { id: "m12", sender: "You", timestamp: "2024-02-14T19:31:00", type: "text", body: "Got it, I've saved the ID image to my secure folder. I'll log into the netbanking portal tonight and complete the KYC process.", isIncoming: false },

    // --- FEB: Work Integration (The API Scenario) ---
    { id: "m13", sender: "Teammate", timestamp: "2024-02-15T10:00:00", type: "text", body: "Hey, are you free to look at the integration guide? I'm stuck on the authentication flow.", isIncoming: true },
    { id: "m14", sender: "Teammate", timestamp: "2024-02-15T10:01:00", type: "link", body: "Use this for integration with the new payments flow.", linkUrl: "https://docs.acmecorp.com/developer/payments-v2/overview.html", linkTitle: "Acme Payments v2 – Developer Guide", isIncoming: true },
    
    // --- FEB: Bill 2 ---
    { id: "m15", sender: "Power Co.", timestamp: "2024-02-05T09:00:00", type: "pdf", body: "Your bill for Feb is ready.", fileName: "Statement_FEB24.pdf", ocrText: "Jaipur Electricity Distribution Ltd. Billing Period: 01 Feb 2024.", isIncoming: true },

    // --- FEB: Food / Recipe ---
    { id: "m16", sender: "Mom", timestamp: "2024-02-20T18:00:00", type: "image", body: "I made your favorite today!", fileName: "IMG_Curry.jpg", ocrText: "Spicy Chicken Curry. Ingredients: Cumin, Coriander, Chili.", isIncoming: true },
    { id: "m17", sender: "You", timestamp: "2024-02-20T18:05:00", type: "text", body: "Looks delicious! Send me the recipe text later, I want to try cooking it this weekend.", isIncoming: false },

    // --- MAR: Vacation Planning ---
    { id: "m18", sender: "You", timestamp: "2024-03-01T20:00:00", type: "text", body: "I need a break. Thinking of going to Goa for a long weekend. Need some beach time.", isIncoming: false },
    { id: "m19", sender: "Friend", timestamp: "2024-03-01T20:10:00", type: "link", body: "Check this hotel, it's on sale right now.", linkUrl: "https://booking.com/hotel/goa-resort", linkTitle: "Sunny Beach Resort & Spa - 50% Off", isIncoming: true },
    { id: "m20", sender: "You", timestamp: "2024-03-02T09:00:00", type: "text", body: "Booked the flights! We leave on Friday evening.", isIncoming: false },
    { id: "m21", sender: "Airline", timestamp: "2024-03-02T09:05:00", type: "pdf", body: "Your E-Ticket is attached.", fileName: "Ticket_BLR_GOI.pdf", ocrText: "Indigo Airlines. Flight 6E-453. Passenger: You. Date: 15 Mar.", isIncoming: true },

    // --- MAR: Work Issues ---
    { id: "m22", sender: "Teammate", timestamp: "2024-03-03T11:00:00", type: "text", body: "Did the API keys work?", isIncoming: true },
    { id: "m23", sender: "You", timestamp: "2024-03-03T11:05:00", type: "text", body: "Yeah but I'm getting 500 errors on the sandbox environment whenever I try to initialize the transaction with INR currency.", isIncoming: false },
    { id: "m24", sender: "Teammate", timestamp: "2024-03-03T11:10:00", type: "text", body: "Check the server logs, might be a config issue on the backend.", isIncoming: true },
    
    // --- MAR: Bill 3 (Latest) ---
    { id: "m25", sender: "Power Co.", timestamp: "2024-03-05T09:00:00", type: "pdf", body: "Your bill for March is ready.", fileName: "Statement_0394827_MAR24.pdf", ocrText: "Jaipur Electricity Distribution Ltd. Billing Period: 01 Mar 2024 – 31 Mar 2024. Amount Due: 4500 INR.", isIncoming: true },

    // --- MAR: Vacation Photos ---
    { id: "m26", sender: "You", timestamp: "2024-03-16T14:22:00", type: "image", body: "", fileName: "PXL_Beach.jpg", ocrText: "Sunset beach vacation vibes. Sand and Sea.", isIncoming: false },
    { id: "m27", sender: "You", timestamp: "2024-03-16T18:30:00", type: "image", body: "Dinner time.", fileName: "PXL_Seafood.jpg", ocrText: "Lobster Grill Restaurant Menu.", isIncoming: false },

    // --- SEMANTIC FILLERS for 'Bill' & 'ID' Search ---
    { id: "m38", sender: "Internet Co", timestamp: "2024-03-22T10:00:00", type: "text", body: "Your monthly fiber subscription is due tomorrow.", isIncoming: true },
    { id: "m39", sender: "You", timestamp: "2024-03-22T10:05:00", type: "text", body: "Remind me to recharge the wifi before it gets disconnected.", isIncoming: false },
    { id: "m40", sender: "Broker", timestamp: "2024-03-23T09:00:00", type: "pdf", body: "Here is the rent agreement draft.", fileName: "Rent_Agreement_2024.pdf", ocrText: "Tenancy Contract. Monthly Rent: 20,000 INR.", isIncoming: true },
    // Updated for multi-line demo
    { id: "m41", sender: "You", timestamp: "2024-03-23T09:30:00", type: "image", body: "Scan of my driving license. I need this for the rental agreement verification later today. Please print it out and keep it on my desk, I'm running late from the client meeting.", fileName: "DL_Scan_Front.jpg", ocrText: "Driving License. Union of India. Valid till 2030.", isIncoming: false },
    { id: "m42", sender: "Mom", timestamp: "2024-03-24T14:00:00", type: "text", body: "Did you pay the water tax? It's due this week.", isIncoming: true },
    
    // --- LATEST ---
    { id: "m43", sender: "You", timestamp: "2024-03-25T16:45:00", type: "text", body: "Where is that document mom sent? I can't find it in the group.", isIncoming: false },
    { id: "m44", sender: "System", timestamp: "2024-03-25T08:00:00", type: "text", body: "This message was deleted.", isIncoming: true },
    { id: "m45", sender: "Friend", timestamp: "2024-03-25T09:00:00", type: "text", body: "Movie tonight?", isIncoming: true },
    { id: "m46", sender: "You", timestamp: "2024-03-25T09:05:00", type: "text", body: "Can't, finishing the sprint. We have a hard deadline tomorrow and the QA team just found a critical bug in the checkout flow. Gonna be a late night.", isIncoming: false },
    { id: "m47", sender: "Mom", timestamp: "2024-03-26T08:00:00", type: "text", body: "Call me when free.", isIncoming: true },
    { id: "m48", sender: "You", timestamp: "2024-03-26T08:30:00", type: "text", body: "Will do.", isIncoming: false }
];

const CHATS: ChatSession[] = [
    {
        id: "chat_you",
        name: "Alice (You)",
        status: "Message yourself",
        messages: ALL_MESSAGES, 
        timeDisplay: "12:45"
    },
    {
        id: "chat_mom",
        name: "Mom",
        status: "Love you ❤️",
        messages: ALL_MESSAGES.filter(m => m.sender === "Mom" || (m.sender === "You" && (m.body.includes("Mom") || m.body.includes("receipt") || m.body.includes("pay") || m.body.includes("saved")))),
        unreadCount: 2,
        timeDisplay: "10:30"
    },
    {
        id: "chat_team",
        name: "Teammate",
        status: "At work",
        messages: ALL_MESSAGES.filter(m => m.sender === "Teammate" || (m.sender === "You" && (m.body.includes("API") || m.body.includes("sprint")))),
        timeDisplay: "Yesterday"
    },
    {
        id: "chat_power",
        name: "Power Co.",
        status: "Official Business Account",
        messages: ALL_MESSAGES.filter(m => m.sender === "Power Co." || (m.sender === "You" && m.body.includes("pay"))),
        timeDisplay: "Tuesday"
    },
    {
        id: "chat_gym",
        name: "Gym Buddy",
        status: "Gym rat",
        messages: ALL_MESSAGES.filter(m => m.sender === "Gym Buddy" || (m.sender === "You" && m.body.includes("20"))),
        timeDisplay: "Monday"
    }
];

// EXPANDED SYNONYM MAP for "Fake Semantic" Vibe
const SYNONYMS: Record<string, string[]> = {
    // Identity & Docs (Typo handling)
    "aadhaar": ["id", "kyc", "identification", "uidai", "govt", "document", "card", "license", "adhar", "aadhar", "adhaar"],
    "adhar": ["aadhaar", "id", "card"],
    "adhaar": ["aadhaar", "id", "card"],
    "aadhar": ["aadhaar", "id", "card"],
    
    "id": ["aadhaar", "pan", "passport", "card", "identification", "kyc", "license"],
    "passport": ["id", "travel", "document"],
    "license": ["id", "driving", "scan", "document"],

    // Tech & Work
    "api": ["integration", "developer", "webhook", "docs", "guide", "json", "endpoint"],
    "code": ["api", "java", "script", "error", "bug", "jira", "sprint"],
    "work": ["project", "alpha", "jira", "sprint", "meeting", "office", "server"],
    "error": ["bug", "fail", "crash", "p0300", "500", "logs"],
    
    // Finance - Removed 'payment' from 'bill' to avoid matching 'Payments API'
    "bill": ["invoice", "statement", "electricity", "light", "due", "cost", "amount", "receipt", "recharge", "subscription", "rent", "tax", "unpaid"],
    "unpaid": ["bill", "due", "cost"],
    "due": ["bill", "unpaid"],
    "receipt": ["bill", "invoice", "statement", "proof", "transaction", "cost"],
    "electricity": ["bill", "power", "light", "jaipur", "current"],
    "invoice": ["bill", "receipt", "estimate", "cost"],
    
    // Travel & Vacation
    "trip": ["vacation", "flight", "booking", "hotel", "beach", "goa", "ticket", "travel"],
    "travel": ["trip", "flight", "ticket", "booking", "hotel"],
    "flight": ["indigo", "airline", "ticket", "plane", "travel"],
    "ticket": ["flight", "travel", "booking", "indigo"],
    
    // Food
    "food": ["dinner", "lunch", "recipe", "curry", "chicken", "menu", "restaurant", "hungry"],
    "recipe": ["food", "cook", "ingredients"],
    
    // Car
    "car": ["engine", "mechanic", "repair", "toyota", "driving", "vehicle"],
    "repair": ["mechanic", "fix", "broken", "cost", "estimate"]
};

// WhatsApp-ish Colors
const AVATAR_COLORS = [
    '#00A884', // Teal
    '#34B7F1', // Light Blue
    '#6558FF', // Purple
    '#E91E63', // Pink
    '#FF5722', // Orange
    '#FFC107', // Amber
    '#8C8C8C', // Gray
];

function runIntentSearch(query: string, messages: Message[]): SearchResult[] {
    if (!query || query.trim().length < 2) return [];

    const queryLower = query.toLowerCase().trim();
    // Improved Tokenization: Remove trailing 's' to handle simple plurals (bills -> bill)
    const tokens = queryLower.split(/\s+/).flatMap(t => {
        const base = t.replace(/s$/, ''); // Stem: bills -> bill
        return base !== t ? [t, base] : [t];
    });
    
    let results: SearchResult[] = [];

    messages.forEach(msg => {
        let score = 0;
        let badges = new Set<string>();
        let isExact = false;
        
        const bodyText = (msg.body || "").toLowerCase();
        const ocr = (msg.ocrText || "").toLowerCase();
        const title = (msg.linkTitle || "").toLowerCase();
        const file = (msg.fileName || "").toLowerCase();
        const sender = msg.sender.toLowerCase();
        
        // Exact Phrase Check
        if (bodyText.includes(queryLower) || file.includes(queryLower)) {
            score += 100;
            badges.add("Exact Match");
            isExact = true;
        }

        const checkToken = (token: string) => {
            let hit = false;
            // High Value Fields
            if (ocr.includes(token)) { score += 30; badges.add("OCR"); hit = true; }
            if (title.includes(token)) { score += 30; badges.add("Semantic"); hit = true; }
            if (file.includes(token)) { score += 20; hit = true; }
            
            // Standard Fields
            if (bodyText.includes(token)) { score += 10; hit = true; }
            if (sender.includes(token)) { score += 5; hit = true; }

            // Synonym Check
            if (SYNONYMS[token]) {
                SYNONYMS[token].forEach(syn => {
                    if (bodyText.includes(syn) || ocr.includes(syn) || title.includes(syn) || file.includes(syn)) {
                        score += 15; badges.add("Semantic"); hit = true;
                    }
                });
            }
            return hit;
        };

        tokens.forEach(t => checkToken(t));

        if (score > 0) {
            const dateScore = new Date(msg.timestamp).getTime() / 10000000000; 
            score += dateScore;
            results.push({ message: msg, score: score, badges: Array.from(badges), matchType: isExact ? 'Exact' : 'Semantic' });
        }
    });

    results.sort((a, b) => b.score - a.score);

    return results;
}

// --- COMPONENTS ---

const ProfileAvatar = ({ name, size = 40 }: { name: string, size?: number }) => {
    const cleanName = name.replace(" (You)", "");
    const initial = cleanName.charAt(0).toUpperCase();
    const colorIndex = cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
    const backgroundColor = AVATAR_COLORS[colorIndex];
    
    return (
        <div style={{
            width: size, 
            height: size, 
            borderRadius: '50%', 
            backgroundColor, 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: size * 0.45,
            fontWeight: 500,
            flexShrink: 0
        }}>
            {initial}
        </div>
    );
};

const ResultCard = ({ result, onClick }: { result: SearchResult, onClick: () => void }) => {
    const { message, badges } = result;
    const date = new Date(message.timestamp).toLocaleDateString();
    
    let icon;
    let typeClass = 'txt';
    let preview = message.body;

    if (message.type === 'image') {
        typeClass = 'img';
        icon = <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
        preview = message.ocrText || message.fileName || "Image";
    } else if (message.type === 'pdf') {
        typeClass = 'pdf';
        icon = <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
        preview = message.fileName || "Document";
    } else if (message.type === 'link') {
        typeClass = 'link';
        icon = <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
        preview = message.linkTitle || message.body;
    } else {
        icon = <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
    }

    return (
        <div className="result-card" onClick={onClick}>
            <div className={`res-thumb ${typeClass}`}>
                {icon}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
                <div className="res-title">{message.sender}</div>
                <div className="res-sub" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{preview}</div>
                <div className="res-badges">
                    {badges.map((b, i) => (
                        <span key={i} style={{background: '#E9EDEF', color: '#667781', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 500}}>
                            {b}
                        </span>
                    ))}
                </div>
            </div>
            <div style={{fontSize: 11, color: '#888', alignSelf: 'flex-start', marginTop: 2}}>{date}</div>
        </div>
    );
};

const ResultSection = ({ title, results, onResultClick }: { title: string, results: SearchResult[], onResultClick: (r: SearchResult) => void }) => {
    const [expanded, setExpanded] = useState(false);
    
    if (results.length === 0) return null;
    
    const displayResults = expanded ? results : results.slice(0, 3);
    const hasMore = results.length > 3;

    return (
        <div style={{marginBottom: 16}}>
            <div className="section-label">{title} ({results.length})</div>
            {displayResults.map((res) => (
                <ResultCard key={res.message.id} result={res} onClick={() => onResultClick(res)} />
            ))}
            {hasMore && !expanded && (
                <div 
                    onClick={() => setExpanded(true)}
                    style={{
                        padding: '10px', 
                        textAlign: 'center', 
                        color: '#008069', 
                        fontWeight: 500, 
                        fontSize: 14, 
                        background: 'white', 
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        cursor: 'pointer'
                    }}
                >
                    Show all ({results.length - 3} more)
                </div>
            )}
        </div>
    );
};

const MessageBubble = ({ msg, isHighlighted, setRef }: { key?: React.Key; msg: Message, isHighlighted: boolean, setRef: (el: HTMLDivElement | null) => void }) => {
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div 
            ref={setRef}
            id={msg.id}
            className={`message ${msg.isIncoming ? 'incoming' : 'outgoing'} ${isHighlighted ? 'highlighted' : ''}`}
        >
            {msg.isForwarded && (
                 <div className="forwarded-tag">
                     <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 17 20 12 15 7"></polyline><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path></svg>
                     Forwarded
                 </div>
            )}
            {msg.type === 'image' && (
                <div className="image-attachment">
                     <div style={{width: '100%', height: 160, background: '#e0e0e0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#888'}}>
                         <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path></svg>
                         <div style={{fontSize: 12, marginTop: 5}}>{msg.fileName}</div>
                     </div>
                </div>
            )}
            {msg.type === 'pdf' && (
                <div className="file-attachment">
                    <div className="file-icon pdf">
                         <div style={{fontWeight: 700, fontSize: 10}}>PDF</div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                        <span style={{fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#111b21'}}>{msg.fileName}</span>
                        <span style={{fontSize: 11, color: '#667781'}}>1 page • PDF</span>
                    </div>
                </div>
            )}
            {msg.type === 'link' && (
                <div className="link-preview">
                    <div className="link-content">
                        <div style={{fontWeight: 600, fontSize: 13, marginBottom: 2, color: '#111b21'}}>{msg.linkTitle || 'Link'}</div>
                        <div style={{fontSize: 12, color: '#667781', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{msg.linkUrl}</div>
                    </div>
                </div>
            )}
            {msg.body && <div style={{marginTop: (msg.type === 'image' || msg.type === 'link') ? 4 : 0, color: '#111b21'}}>{msg.body}</div>}
            
            <div className="msg-meta">
                {timeStr}
                { !msg.isIncoming && <span className="read-ticks">✓✓</span> }
            </div>
        </div>
    );
}

const ChatScreen = ({ chat, onBack }: { chat: ChatSession, onBack: () => void }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
    
    // Refs for scrolling
    const historyRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Search effect
    useEffect(() => {
        if (searchQuery.length > 1) {
            const results = runIntentSearch(searchQuery, chat.messages);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, chat.messages]);

    // Scroll to bottom on mount
    useEffect(() => {
        if (historyRef.current && searchQuery.length === 0) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [chat.id, searchQuery]);

    const handleResultClick = (result: SearchResult) => {
        setSearchQuery(''); // Close search results
        setHighlightedMsgId(result.message.id);
        
        // Wait for render to find the element
        setTimeout(() => {
            const el = messageRefs.current[result.message.id];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);

        // Remove highlight after animation
        setTimeout(() => setHighlightedMsgId(null), 2000);
    };

    const groupedResults = useMemo(() => {
        if (!searchResults.length) return null;
        const exact = searchResults.filter(r => r.matchType === 'Exact');
        const semantic = searchResults.filter(r => r.matchType === 'Semantic');
        return { exact, semantic };
    }, [searchResults]);

    return (
        <div className="chat-screen-bg">
            {/* Header */}
            <div className="chat-header">
                <div className="back-btn" onClick={onBack}>
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div style={{marginLeft: 0, marginRight: 8}}>
                    <ProfileAvatar name={chat.name} size={36} />
                </div>
                <div style={{flex: 1, cursor: 'pointer', overflow: 'hidden'}}>
                    <div style={{fontWeight: 600, fontSize: 16, color: '#111b21', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>{chat.name}</div>
                    <div style={{fontSize: 11, color: '#667781', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>{chat.status || 'click here for contact info'}</div>
                </div>
                <div className="icon-btn">
                     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </div>
                <div className="icon-btn">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div className="icon-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </div>
            </div>

            {/* Smart Search Bar */}
            <div className="smart-search-bar">
                <div className="search-input-wrapper">
                     <svg viewBox="0 0 24 24" width="20" height="20" stroke="#54656F" strokeWidth="2" fill="none" style={{marginLeft: 10}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                     <input 
                        type="text" 
                        placeholder="Search 'bills', 'aadhaar', 'tickets'..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <div className="clear-search" onClick={() => setSearchQuery('')}>✕</div>
                    )}
                </div>
            </div>

            {/* Results Overlay OR Chat History */}
            <div className="chat-body-container">
                {searchQuery.length > 1 ? (
                    <div className="search-results-overlay">
                         {groupedResults ? (
                            <div style={{padding: '16px 12px'}}>
                                <ResultSection title="Exact Matches" results={groupedResults.exact} onResultClick={handleResultClick} />
                                <ResultSection title="Semantic Matches" results={groupedResults.semantic} onResultClick={handleResultClick} />
                                
                                {groupedResults.exact.length === 0 && groupedResults.semantic.length === 0 && (
                                    <div className="no-results">
                                        <div style={{fontSize: 16, marginBottom: 8}}>No results found</div>
                                        <div style={{fontSize: 13}}>Try using different keywords like "bill", "invoice", "photo"...</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="no-results">Searching...</div>
                        )}
                    </div>
                ) : (
                    <div className="chat-history" ref={historyRef}>
                        {chat.messages.map((msg, i) => {
                            const isSameSender = i > 0 && chat.messages[i-1].sender === msg.sender;
                            return (
                                <div key={msg.id} style={{
                                    marginTop: isSameSender ? 2 : 12,
                                    display: 'flex',
                                    justifyContent: msg.isIncoming ? 'flex-start' : 'flex-end',
                                    paddingRight: msg.isIncoming ? 0 : 0,
                                    paddingLeft: msg.isIncoming ? 0 : 0
                                }}>
                                     <MessageBubble 
                                        msg={msg} 
                                        isHighlighted={msg.id === highlightedMsgId} 
                                        setRef={(el) => messageRefs.current[msg.id] = el}
                                     />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Composer */}
            <div className="composer">
                <div className="icon-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" style={{color: '#54656F'}}>
                        <path d="M12 5V19M5 12H19"/>
                    </svg>
                </div>
                <div className="composer-pill">
                    <input type="text" placeholder="Message" />
                    <div className="icon-btn" style={{padding: 4}}>
                         <svg viewBox="0 0 24 24" width="24" height="24" stroke="#54656F" strokeWidth="2" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </div>
                </div>
                <div className="mic-btn">
                     <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="currentColor" style={{fill: 'white', stroke: 'none'}}>
                         <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                         <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                     </svg>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [activeChat, setActiveChat] = useState<ChatSession | null>(null);

    const handleChatSelect = (chat: ChatSession) => {
        setActiveChat(chat);
        setView('chat');
    };

    const handleBack = () => {
        setView('list');
        setActiveChat(null);
    };

    return (
        <>
            <div className="app-container">
            <style>{`
                :root {
                    --wa-bg-list: #FFFFFF;
                    --wa-bg-chat: #EFE7DE;
                    --wa-white: #FFFFFF;
                    --wa-green-outgoing: #D9FDD3;
                    --wa-gray-text: #667781;
                    --wa-header-text: #111b21;
                    --wa-icon: #54656F;
                    --shadow: 0 1px 0.5px rgba(0,0,0,0.13);
                }
                * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
                
                body { background-color: #d1d7db; }

                .app-container {
                    width: 100%;
                    max-width: 430px;
                    height: 100%;
                    background-color: var(--wa-white);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    box-shadow: 0 0 20px rgba(0,0,0,0.05);
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                
                /* List View Styles */
                .chat-list { flex: 1; overflow-y: auto; background-color: #fff; padding-bottom: 70px; }
                
                .home-header {
                    padding: 12px 16px 8px;
                    background: white;
                }
                .home-title-row {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
                }
                .home-logo { font-size: 22px; font-weight: 700; color: #25D366; }
                .home-icons { display: flex; gap: 24px; color: #111b21; }
                
                .filter-chips { display: flex; gap: 8px; margin-bottom: 5px; }
                .chip {
                    padding: 6px 14px; background: #F0F2F5; border-radius: 20px;
                    font-size: 13px; font-weight: 500; color: #54656F; cursor: pointer;
                }
                .chip.active { background: #E7FCE3; color: #008069; }

                .search-bar-static {
                    background: #F0F2F5; border-radius: 24px; padding: 8px 15px;
                    display: flex; align-items: center; gap: 10px; margin-bottom: 15px;
                    color: #54656F; cursor: text;
                    font-size: 15px;
                }

                .chat-item {
                    display: flex; align-items: center; padding: 0 16px;
                    cursor: pointer; height: 72px;
                }
                .chat-item:active { background-color: #f5f5f5; }
                .chat-item-avatar { margin-right: 15px; }
                .chat-item-info {
                    flex: 1; min-width: 0; height: 100%;
                    border-bottom: 1px solid #f0f2f5;
                    display: flex; flex-direction: column; justify-content: center;
                }
                .chat-item-row1 { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .chat-item-name { font-weight: 500; font-size: 17px; color: #111b21; }
                .chat-item-date { font-size: 12px; color: #667781; }
                .chat-item-row2 { display: flex; justify-content: space-between; align-items: center; }
                .chat-item-msg { font-size: 14px; color: #667781; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
                .unread-badge {
                    background: #25D366; color: white; font-size: 11px; font-weight: 700;
                    min-width: 18px; height: 18px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center; padding: 0 4px;
                    margin-left: 6px;
                }

                .bottom-nav {
                    height: 60px; border-top: 1px solid #E9EDEF; background: white;
                    display: flex; justify-content: space-around; align-items: center;
                    position: absolute; bottom: 0; width: 100%; z-index: 50;
                }
                .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; cursor: pointer; }
                .nav-label { font-size: 12px; font-weight: 500; color: #54656F; }
                .nav-item.active .nav-label { color: #111b21; font-weight: 600; }
                .nav-icon { color: #54656F; }
                .nav-item.active .nav-icon { color: #111b21; stroke-width: 2.5px; }

                .fab {
                    position: absolute; bottom: 80px; right: 20px;
                    width: 56px; height: 56px; border-radius: 16px;
                    background: #008069; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center; color: white;
                }

                /* Chat Screen Structure */
                .chat-screen-bg {
                    background-color: var(--wa-bg-chat);
                    background-image: radial-gradient(#d4d0c9 15%, transparent 16%), radial-gradient(#d4d0c9 15%, transparent 16%);
                    background-size: 60px 60px;
                    background-position: 0 0, 30px 30px;
                    flex: 1; display: flex; flex-direction: column; overflow: hidden;
                    position: relative;
                }
                .chat-screen-bg::before {
                    content: "";
                    position: absolute; top:0; left:0; right:0; bottom:0;
                    background-color: rgba(239, 231, 222, 0.85);
                    pointer-events: none;
                }

                .chat-header {
                    background-color: white; padding: 6px 10px; height: 60px;
                    display: flex; align-items: center; gap: 6px; z-index: 10;
                    box-shadow: 0 1px 0 rgba(0,0,0,0.05);
                    flex-shrink: 0;
                }
                .back-btn { cursor: pointer; padding: 8px; border-radius: 50%; color: #111b21; margin-right: -4px; }
                .back-btn:active { background: #f0f2f5; }
                
                /* Smart Search Bar */
                .smart-search-bar {
                    background: transparent;
                    padding: 8px 12px;
                    z-index: 9;
                    display: flex; flex-direction: column; gap: 8px;
                }
                .search-input-wrapper {
                    background: #F0F2F5;
                    border-radius: 20px;
                    height: 40px;
                    display: flex; align-items: center;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .search-input-wrapper input {
                    border: none; background: transparent; outline: none;
                    flex: 1; padding: 0 10px; font-size: 15px; color: #111b21;
                }
                .search-input-wrapper input::placeholder { color: #667781; }
                .clear-search { padding: 8px; color: #667781; font-size: 14px; cursor: pointer; }
                
                /* Chat Body */
                .chat-body-container {
                    flex: 1; position: relative; overflow: hidden;
                }
                
                .chat-history {
                    height: 100%; overflow-y: auto; 
                    padding: 10px 16px 20px; 
                    display: flex; flex-direction: column; 
                    z-index: 1;
                }

                .search-results-overlay {
                    position: absolute; top:0; left:0; right:0; bottom:0;
                    background: rgba(240, 242, 245, 0.95);
                    backdrop-filter: blur(5px);
                    overflow-y: auto; z-index: 20;
                }
                
                /* Results */
                .section-label {
                    font-size: 13px; font-weight: 600; color: #008069; margin: 15px 0 8px 5px; text-transform: uppercase;
                }
                .result-card {
                    background: white; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
                    display: flex; align-items: flex-start; gap: 12px; 
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer;
                }
                .res-thumb {
                    width: 40px; height: 40px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
                }
                .res-thumb.img { background: #F0F2F5; color: #8e24aa; }
                .res-thumb.pdf { background: #FFEBEE; color: #D32F2F; }
                .res-thumb.link { background: #E3F2FD; color: #1976D2; }
                .res-thumb.txt { background: #E7FCE3; color: #008069; }
                .res-title { font-weight: 600; font-size: 15px; color: #111b21; margin-bottom: 2px; }
                .res-sub { font-size: 12px; color: #667781; margin-bottom: 4px; }
                .res-badges { display: flex; flex-wrap: wrap; gap: 6px; }
                .no-results { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #667781; }

                /* Messages */
                .message {
                    max-width: 80%;
                    padding: 6px 8px 6px 9px;
                    border-radius: 8px;
                    font-size: 14.5px;
                    line-height: 19px;
                    position: relative;
                    box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
                    margin-bottom: 2px;
                    word-wrap: break-word; /* Ensure long words break */
                    overflow-wrap: break-word;
                }
                .message.incoming {
                    align-self: flex-start;
                    background-color: var(--wa-white);
                    border-top-left-radius: 0;
                    margin-left: 8px;
                }
                .message.incoming::before {
                    content: ""; position: absolute; top: 0; left: -8px;
                    width: 0; height: 0;
                    border-top: 0px solid transparent;
                    border-right: 8px solid var(--wa-white);
                    border-bottom: 12px solid transparent;
                    filter: drop-shadow(-1px 1px 1px rgba(0,0,0,0.05));
                }
                
                .message.outgoing {
                    align-self: flex-end;
                    background-color: var(--wa-green-outgoing);
                    border-top-right-radius: 0;
                    margin-right: 8px;
                }
                .message.outgoing::after {
                    content: ""; position: absolute; top: 0; right: -8px;
                    width: 0; height: 0;
                    border-top: 0px solid transparent;
                    border-left: 8px solid var(--wa-green-outgoing);
                    border-bottom: 12px solid transparent;
                    filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.05));
                }

                .message.highlighted {
                    animation: highlight 2s ease-out;
                }
                @keyframes highlight {
                    0% { background-color: #ffeaa7; }
                    100% { background-color: inherit; }
                }

                .forwarded-tag {
                    display: flex; align-items: center; gap: 4px;
                    font-size: 11px; color: #667781; font-style: italic; margin-bottom: 4px;
                }
                .msg-meta {
                    display: flex; justify-content: flex-end; align-items: center; 
                    font-size: 11px; color: rgba(0,0,0,0.45); margin-top: 2px; gap: 3px;
                }
                .read-ticks { color: #53bdeb; font-size: 14px; font-weight: bold; margin-left: 2px; }

                /* Attachments */
                .file-attachment {
                    background: rgba(0,0,0,0.03); border-radius: 6px; padding: 8px;
                    display: flex; align-items: center; gap: 10px; margin-bottom: 4px;
                }
                .file-icon.pdf {
                    width: 32px; height: 38px; background: #FFEBEE; border-radius: 4px;
                    display: flex; align-items: center; justify-content: center; color: #D32F2F;
                }
                .link-preview {
                    background: #f0f2f5; border-radius: 6px; padding: 8px; margin-bottom: 4px; border-left: 3px solid #dfe3e5;
                }

                .composer {
                    padding: 5px 8px;
                    display: flex; align-items: flex-end; gap: 8px;
                    min-height: auto; background-color: transparent;
                    margin-bottom: 4px; z-index: 10;
                }
                .composer-pill {
                    flex: 1; background: white; border-radius: 24px;
                    display: flex; align-items: center; padding: 8px 6px 8px 12px;
                    min-height: 44px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);
                }
                .composer-pill input {
                    flex: 1; border: none; outline: none; font-size: 16px;
                    padding: 0 8px; background: transparent; color: #111b21;
                }
                .composer-pill input::placeholder { color: #54656F; opacity: 1; }
                .icon-btn {
                    color: #54656F; padding: 6px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                }
                .mic-btn {
                    width: 48px; height: 48px; background: #00A884;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    color: white; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    cursor: pointer; margin-bottom: 1px;
                }
            `}</style>

            {view === 'list' ? (
                <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                    <div className="home-header">
                        <div className="home-title-row">
                            <div className="home-logo">WhatsApp</div>
                            <div className="home-icons">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </div>
                        </div>
                        <div className="search-bar-static">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#54656F" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <span>Search...</span>
                        </div>
                        <div className="filter-chips">
                            <div className="chip active">All</div>
                            <div className="chip">Unread</div>
                            <div className="chip">Favorites</div>
                            <div className="chip">Groups</div>
                        </div>
                    </div>

                    <div className="chat-list">
                        <div className="chat-item">
                            <div className="chat-item-avatar">
                                <div style={{width: 48, height: 48, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="#54656F" strokeWidth="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                            </div>
                            <div className="chat-item-info" style={{border: 'none'}}>
                                <div className="chat-item-name" style={{fontSize: 16, fontWeight: 600}}>Archived</div>
                            </div>
                        </div>
                        {CHATS.map(chat => (
                            <div key={chat.id} className="chat-item" onClick={() => handleChatSelect(chat)}>
                                <div className="chat-item-avatar">
                                    <ProfileAvatar name={chat.name} size={48} />
                                </div>
                                <div className="chat-item-info">
                                    <div className="chat-item-row1">
                                        <div className="chat-item-name">{chat.name}</div>
                                        <div className="chat-item-date" style={{color: chat.unreadCount ? '#25D366' : '#667781'}}>{chat.timeDisplay}</div>
                                    </div>
                                    <div className="chat-item-row2">
                                        <div className="chat-item-msg">{chat.messages.length > 0 ? (chat.messages[chat.messages.length - 1].body || 'Media') : ''}</div>
                                        {chat.unreadCount && <div className="unread-badge">{chat.unreadCount}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="fab">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>

                    <div className="bottom-nav">
                        <div className="nav-item active">
                            <div className="nav-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
                            <div className="nav-label">Chats</div>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg></div>
                            <div className="nav-label">Updates</div>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                            <div className="nav-label">Communities</div>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>
                            <div className="nav-label">Calls</div>
                        </div>
                    </div>
                </div>
            ) : (
                <ChatScreen chat={activeChat!} onBack={handleBack} />
            )}
        </div>
        <Analytics />
    </>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);