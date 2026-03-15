import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { usePresenceStore } from '../store/presenceStore';
import { getChatMessages, sendMessage } from '../api/chatLogs';
import { getUser } from '../api/users';
import Skeleton from './Skeleton';

function linkify(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part}</a>
      : part
  );
}

const LIST_WIDTH = 320;
const THREAD_WIDTH = 360;
const LIST_HEIGHT = 480;
const THREAD_HEIGHT = 480;

const SearchIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const ComposeIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ChevronDownIcon = ({ up }: { up?: boolean }) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
    style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const DotsIcon = () => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ChatPanel: React.FC = () => {
  const { user } = useAuthStore();
  const { isDark } = useUIStore();
  const { isOnline } = usePresenceStore();
  const {
    chats, messages, unreadCounts, userCache,
    activeChatId, setMessages, setActiveChat, cacheUser, addMessage, markRead,
  } = useChatStore();

  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const threadOpen = activeChatId !== null;

  // Fetch other users as soon as chats arrive
  useEffect(() => {
    if (!user || chats.length === 0) return;
    chats.forEach(chat => {
      const otherId = chat.user_1_id === user.user_id ? chat.user_2_id : chat.user_1_id;
      if (otherId && !userCache[otherId]) {
        getUser(otherId).then(u => cacheUser(u)).catch(() => {});
      }
    });
  }, [chats, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll messages
  useEffect(() => {
    if (threadOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChatId, threadOpen]);

  // Focus textarea when thread opens
  useEffect(() => {
    if (threadOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [activeChatId]);

  const openThread = useCallback(async (chat_id: string) => {
    setActiveChat(chat_id);
    markRead(chat_id);
    if (!messages[chat_id]) {
      setLoadingMessages(true);
      try {
        const msgs = await getChatMessages(chat_id);
        setMessages(chat_id, msgs);
      } catch { /* show empty */ }
      finally { setLoadingMessages(false); }
    }
  }, [messages, setActiveChat, setMessages, markRead]);

  const closeThread = () => {
    setActiveChat(null);
    setSendText('');
    setSendError('');
  };

  const handleSend = async () => {
    if (!sendText.trim() || !activeChatId || !user) return;
    const activeChat = chats.find(c => c.chat_id === activeChatId);
    if (!activeChat) return;
    const recipientId = activeChat.user_1_id === user.user_id ? activeChat.user_2_id : activeChat.user_1_id;
    if (!recipientId) return;

    const text = sendText.trim();
    setSendText('');
    setSendError('');
    setSending(true);
    addMessage(activeChatId, { sender_id: user.user_id, message: text, timestamp: new Date().toISOString() });

    try {
      await sendMessage({ chat_id: activeChatId, sender_id: user.user_id, recipient_id: recipientId, message: text });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (chat_id: string) => {
    const chat = chats.find(c => c.chat_id === chat_id);
    if (!chat || !user) return null;
    const otherId = chat.user_1_id === user.user_id ? chat.user_2_id : chat.user_1_id;
    return otherId ? userCache[otherId] : null;
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const other = getOtherUser(chat.chat_id);
    const name = other?.name ?? other?.email ?? '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeOther = activeChatId ? getOtherUser(activeChatId) : null;
  const activeOtherId = activeChatId ? (() => {
    const chat = chats.find(c => c.chat_id === activeChatId);
    if (!chat || !user) return null;
    return chat.user_1_id === user.user_id ? chat.user_2_id : chat.user_1_id;
  })() : null;
  const activeOtherName = activeOther ? (activeOther.name ?? activeOther.email ?? 'Chat') : 'Chat';
  const activeOtherInitials = activeOtherName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  // Current user initials for the bar avatar
  const myName = user?.name ?? user?.email ?? 'U';
  const myInitials = myName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  // Shared card styles
  const cardBg = isDark ? '#1e1e2e' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const headerBg = isDark ? '#1e1e2e' : '#ffffff';
  const rowHover = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const rowActive = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)';
  const textPrimary = isDark ? '#f1f5f9' : '#111827';
  const textSecondary = isDark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const msgBubbleOther = isDark ? 'rgba(255,255,255,0.09)' : '#f3f4f6';

  const avatarEl = (initials: string, size = 36) => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.33, fontWeight: 800,
      fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0,
    }}>
      {initials}
    </div>
  );

  const iconBtn = (onClick: () => void, children: React.ReactNode, title?: string) => (
    <button onClick={onClick} title={title} style={{
      width: 30, height: 30, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'none', border: 'none', cursor: 'pointer',
      color: textSecondary,
      transition: 'background 0.15s, color 0.15s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = rowHover; (e.currentTarget as HTMLButtonElement).style.color = textPrimary; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = textSecondary; }}
    >{children}</button>
  );

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 20, zIndex: 300,
      display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      pointerEvents: 'none', // so the gap doesn't block page clicks
    }}>

      {/* ── THREAD WINDOW — floats to the left of the list ── */}
      {threadOpen && activeChatId && (
        <div style={{
          width: THREAD_WIDTH,
          height: THREAD_HEIGHT,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'all',
          animation: 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Thread header */}
          <div style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${divider}`,
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0, background: headerBg,
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {avatarEl(activeOtherInitials, 34)}
              {activeOtherId && isOnline(activeOtherId) && (
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#22c55e', border: `2px solid ${cardBg}`,
                }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeOtherName}
              </div>
              {activeOtherId && (
                <div style={{ fontSize: 11, color: isOnline(activeOtherId) ? '#22c55e' : textSecondary }}>
                  {isOnline(activeOtherId) ? 'Active now' : 'Offline'}
                </div>
              )}
            </div>
            {iconBtn(closeThread, <CloseIcon />, 'Close')}
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '16px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {loadingMessages ? (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {avatarEl(activeOtherInitials, 28)}
                  <Skeleton width="55%" height="36px" style={{ borderRadius: 12 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Skeleton width="45%" height="36px" style={{ borderRadius: 12 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {avatarEl(activeOtherInitials, 28)}
                  <Skeleton width="65%" height="36px" style={{ borderRadius: 12 }} />
                </div>
              </>
            ) : (messages[activeChatId] ?? []).length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 40 }}>
                {avatarEl(activeOtherInitials, 52)}
                <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginTop: 4 }}>{activeOtherName}</div>
                <div style={{ fontSize: 13, color: textSecondary }}>Start the conversation</div>
              </div>
            ) : (
              (messages[activeChatId] ?? []).map((msg, i) => {
                const isMine = msg.sender_id === user?.user_id;
                const showAvatar = !isMine;
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
                    alignItems: 'flex-end', gap: 6,
                    marginTop: i > 0 ? 2 : 0,
                  }}>
                    {showAvatar ? avatarEl(activeOtherInitials, 26) : <div style={{ width: 26, flexShrink: 0 }} />}
                    <div style={{
                      maxWidth: '72%',
                      padding: '9px 13px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMine ? '#6366f1' : msgBubbleOther,
                      color: isMine ? 'white' : textPrimary,
                      fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                    }}>
                      {linkify(msg.message)}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {sendError && (
            <div style={{ padding: '0 14px 4px', fontSize: 12, color: '#f87171' }}>{sendError}</div>
          )}

          {/* Input area */}
          <div style={{
            borderTop: `1px solid ${divider}`,
            background: headerBg,
            flexShrink: 0,
          }}>
            <div style={{ padding: '10px 12px 6px', position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={sendText}
                onChange={e => setSendText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Write a message…"
                disabled={sending}
                rows={2}
                style={{
                  width: '100%', padding: '8px 0',
                  border: 'none', outline: 'none', resize: 'none',
                  background: 'transparent',
                  color: textPrimary,
                  fontSize: 14, lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{
              padding: '6px 12px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${divider}`,
            }}>
              <div />
              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!sendText.trim() || sending}
                style={{
                  padding: '6px 18px',
                  borderRadius: 999,
                  background: sendText.trim() ? '#6366f1' : isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                  color: sendText.trim() ? 'white' : textSecondary,
                  border: 'none',
                  cursor: sendText.trim() ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 700,
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {sending
                  ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                  : 'Send'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST PANEL ── */}
      <div style={{
        width: LIST_WIDTH,
        display: 'flex', flexDirection: 'column',
        pointerEvents: 'all',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        {/* ── BAR — always visible at TOP of the card ── */}
        <div style={{
          height: 52,
          display: 'flex', alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          cursor: 'pointer',
          borderBottom: listOpen ? `1px solid ${divider}` : 'none',
          flexShrink: 0,
        }}
          onClick={() => setListOpen(v => !v)}
        >
          {/* My avatar with green dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarEl(myInitials, 34)}
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 10, height: 10, borderRadius: '50%',
              background: '#22c55e',
              border: `2px solid ${cardBg}`,
            }} />
          </div>

          {/* Title */}
          <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: textPrimary }}>
            Messaging
          </span>

          {/* Right icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={e => e.stopPropagation()}>
            {totalUnread > 0 && (
              <span style={{
                background: '#6366f1', color: 'white',
                borderRadius: 999, fontSize: 10, fontWeight: 700,
                padding: '2px 6px', marginRight: 4,
              }}>{totalUnread}</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); setListOpen(v => !v); }}
              style={{
                width: 30, height: 30, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: textSecondary,
              }}
            >
              <ChevronDownIcon up={listOpen} />
            </button>
          </div>
        </div>

        {/* Expanded list body — slides down below the bar */}
        <div style={{
          height: listOpen ? LIST_HEIGHT : 0,
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
        }}>
          {listOpen && (
            <>
              {/* Search */}
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: inputBg,
                  borderRadius: 8, padding: '7px 11px',
                  border: `1px solid ${divider}`,
                }}>
                  <span style={{ color: textSecondary, display: 'flex', flexShrink: 0 }}><SearchIcon /></span>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search messages"
                    style={{
                      flex: 1, border: 'none', outline: 'none',
                      background: 'transparent', color: textPrimary,
                      fontSize: 13, fontFamily: 'inherit',
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, display: 'flex' }}>
                      <CloseIcon />
                    </button>
                  )}
                </div>
              </div>

              {/* Chat list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredChats.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: textSecondary, fontSize: 13 }}>
                    {searchQuery ? `No results for "${searchQuery}"` : 'No conversations yet.'}
                  </div>
                ) : (
                  filteredChats.map(chat => {
                    const other = getOtherUser(chat.chat_id);
                    const unread = unreadCounts[chat.chat_id] ?? 0;
                    const isActive = activeChatId === chat.chat_id;
                    const initials = other
                      ? (other.name ?? other.email ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
                      : '?';
                    const displayName = other ? (other.name ?? other.email ?? 'User') : null;

                    const otherId = chat.user_1_id === user?.user_id ? chat.user_2_id : chat.user_1_id;
                    const online = otherId ? isOnline(otherId) : false;

                    return (
                      <button
                        key={chat.chat_id}
                        onClick={() => openThread(chat.chat_id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px',
                          background: isActive ? rowActive : 'none',
                          border: 'none', borderBottom: `1px solid ${divider}`,
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = rowHover; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}
                      >
                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          {other ? avatarEl(initials, 44) : <Skeleton variant="circle" width={44} height={44} />}
                          {online && (
                            <span style={{
                              position: 'absolute', bottom: 1, right: 1,
                              width: 11, height: 11, borderRadius: '50%',
                              background: '#22c55e',
                              border: `2px solid ${cardBg}`,
                            }} />
                          )}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: 2 }}>
                            {displayName ? (
                              <span style={{
                                fontSize: 14, fontWeight: unread > 0 ? 700 : 600,
                                color: textPrimary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                display: 'block',
                              }}>
                                {displayName}
                              </span>
                            ) : (
                              <Skeleton variant="text" width="55%" height="14px" />
                            )}
                          </div>
                          <div style={{
                            fontSize: 12, color: unread > 0 ? textPrimary : textSecondary,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontWeight: unread > 0 ? 600 : 400,
                          }}>
                            {messages[chat.chat_id]?.slice(-1)[0]?.message ?? 'Start chatting...'}
                          </div>
                        </div>

                        {/* Unread badge */}
                        {unread > 0 && (
                          <span style={{
                            background: '#6366f1', color: 'white',
                            borderRadius: 999, fontSize: 11, fontWeight: 700,
                            padding: '2px 7px', minWidth: 20, textAlign: 'center', flexShrink: 0,
                          }}>{unread > 99 ? '99+' : unread}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default ChatPanel;
