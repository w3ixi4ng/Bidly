import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { getCurrentBidWithFallback, placeBid, getBidsByTask } from '../api/bids';
import type { BidResponse } from '../api/bids';
import { createChat, getUserChats } from '../api/chats';
import { getChatMessages } from '../api/chatLogs';
import { getUser } from '../api/users';
import { getTasks, getTask, updateTask } from '../api/tasks';
import { releasePayment, refundPayment, getAccountStatus, captureFeaturedFee } from '../api/payment';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { sendMessage } from '../api/chatLogs';
import { useChatStore } from '../store/chatStore';
import { connectSocket, joinAuctionRoom } from '../socket/socket';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import AddTaskModal from '../components/AddTaskModal';
import ChatPanel from '../components/ChatPanel';
import AuthModal from '../components/AuthModal';
import Skeleton from '../components/Skeleton';
import type { Task } from '../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeStyle(status: Task['auction_status']): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  };
  switch (status) {
    case 'in-progress':
      return { ...base, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' };
    case 'completed':
      return { ...base, background: 'rgba(34,197,94,0.15)', color: '#16a34a' };
    case 'cancelled':
      return { ...base, background: 'rgba(239,68,68,0.15)', color: '#dc2626' };
    case 'pending':
      return { ...base, background: 'rgba(234,179,8,0.15)', color: '#ca8a04' };
    case 'pending-review':
      return { ...base, background: 'rgba(249,115,22,0.15)', color: '#ea580c' };
    case 'accepted':
      return { ...base, background: 'rgba(34,197,94,0.15)', color: '#16a34a' };
    case 'disputed':
      return { ...base, background: 'rgba(239,68,68,0.15)', color: '#dc2626' };
    default:
      return { ...base, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
  }
}

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { from?: string; tab?: string } | null;
  const fromDashboard = navState?.from === 'dashboard';
  const dashboardTab = navState?.tab;
  const { tasks, setTasks, currentBids, setCurrentBid } = useTaskStore();
  const { user } = useAuthStore();
  const { profileModalOpen, addTaskModalOpen, authModalOpen, setAuthModalOpen, isDark } = useUIStore();
  const { chats, setChats, upsertChat, setActiveChat, setMessages } = useChatStore();

  const [loadingTask, setLoadingTask] = useState(true);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [bidInput, setBidInput] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [lowBidConfirm, setLowBidConfirm] = useState(false);
  const [auctionClosed, setAuctionClosed] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [bidHistory, setBidHistory] = useState<BidResponse[]>([]);
  const [bidHistoryLoading, setBidHistoryLoading] = useState(false);
  const [bidderNames, setBidderNames] = useState<Record<string, string>>({});
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  // Feature upgrade state
  const stripe = useStripe();
  const elements = useElements();
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureError, setFeatureError] = useState('');
  const [featureStep, setFeatureStep] = useState<'confirm' | 'payment' | 'processing' | 'done'>('confirm');

  // Keyboard navigation for photo carousel
  useEffect(() => {
    if (carouselIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      const photos = tasks.find(t => t.task_id === taskId)?.photos;
      if (!photos) return;
      if (e.key === 'Escape') setCarouselIndex(null);
      if (e.key === 'ArrowLeft') setCarouselIndex((carouselIndex - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setCarouselIndex((carouselIndex + 1) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [carouselIndex, taskId, tasks]);

  const task = tasks.find((t) => t.task_id === taskId);
  const currentBid = task ? currentBids[task.task_id] : undefined;

  // Determine if auction is closed (DB status OR time expired)
  useEffect(() => {
    if (!task) return;
    if (
      task.auction_status === 'completed' ||
      task.auction_status === 'cancelled' ||
      task.auction_status === 'no-bids' ||
      task.auction_status === 'pending-review' ||
      task.auction_status === 'accepted' ||
      task.auction_status === 'disputed' ||
      new Date(task.auction_end_time).getTime() <= Date.now()
    ) {
      setAuctionClosed(true);
    }
  }, [task]);

  // Bootstrap websocket + chats if arriving directly on this page
  useEffect(() => {
    if (!user?.user_id) return;
    connectSocket(user.user_id);
    getUserChats(user.user_id)
      .then((chatsData) => {
        setChats(chatsData);
        chatsData.forEach((c) => upsertChat(c));
        return Promise.allSettled(
          chatsData.map((c) =>
            getChatMessages(c.chat_id).then((msgs) => {
              if (msgs.length > 0) setMessages(c.chat_id, msgs);
            })
          )
        );
      })
      .catch(() => {});
  }, [user?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Always fetch fresh task data when navigating to this page
  useEffect(() => {
    if (!taskId) return;
    getTask(taskId)
      .then(fresh => {
        useTaskStore.getState().upsertTask(fresh);
      })
      .catch(() => {
        // If individual fetch fails and store is empty, fetch all
        if (tasks.length === 0) {
          getTasks().then(setTasks).catch(() => {});
        }
      })
      .finally(() => setLoadingTask(false));
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join auction room and fetch current bid
  useEffect(() => {
    if (!task) return;
    setLoadingTask(false);

    joinAuctionRoom(task.task_id);

    if (!currentBids[task.task_id]) {
      getCurrentBidWithFallback(task.task_id)
        .then((bid) => setCurrentBid(task.task_id, bid))
        .catch(() => {/* no bids yet is fine */});
    }
  }, [task?.task_id, currentBids, setCurrentBid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch client name — skip API call if the poster is the logged-in user
  useEffect(() => {
    if (!task?.client_id) return;
    if (task.client_id === user?.user_id && user?.name) {
      setClientName(user.name);
      return;
    }
    setLoadingClient(true);
    getUser(task.client_id)
      .then((u) => setClientName(u.name ?? u.email))
      .catch(() => setClientName(task.client_id))
      .finally(() => setLoadingClient(false));
  }, [task?.client_id, user?.user_id, user?.name]);

  // Listen for auction ended via store change or time expiry
  useEffect(() => {
    if (!task) return;
    if (
      task.auction_status === 'completed' ||
      task.auction_status === 'no-bids' ||
      task.auction_status === 'pending-review' ||
      task.auction_status === 'accepted' ||
      task.auction_status === 'disputed' ||
      new Date(task.auction_end_time).getTime() <= Date.now()
    ) {
      setAuctionClosed(true);
    }
  }, [task?.auction_status, task?.auction_end_time]);

  // Fetch bid history
  useEffect(() => {
    if (!task) return;
    setBidHistoryLoading(true);
    getBidsByTask(task.task_id)
      .then(async (bids) => {
        // Sort newest first
        bids.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setBidHistory(bids);

        // Fetch unique bidder names
        const ids = [...new Set(bids.map(b => b.bidder_id))];
        const results = await Promise.allSettled(
          ids.map(id => getUser(id).then(u => ({ id, name: u.name ?? u.email })))
        );
        const names: Record<string, string> = {};
        results.forEach(r => { if (r.status === 'fulfilled') names[r.value.id] = r.value.name; });
        setBidderNames(names);
      })
      .catch(() => {})
      .finally(() => setBidHistoryLoading(false));
  }, [task?.task_id]);

  // Prepend new bids to history live when a bid_update arrives via websocket
  useEffect(() => {
    if (!task || !currentBid?.bidder_id || !currentBid?.bid_amount) return;
    const newEntry: BidResponse = {
      task_id: task.task_id,
      bidder_id: currentBid.bidder_id,
      bid_amount: currentBid.bid_amount,
      timestamp: new Date().toISOString(),
    };
    setBidHistory(prev => {
      // Avoid duplicate if same bidder+amount already exists anywhere in history
      const isDuplicate = prev.some(
        b => b.bidder_id === newEntry.bidder_id && b.bid_amount === newEntry.bid_amount
      );
      if (isDuplicate) return prev;
      return [newEntry, ...prev];
    });
    // Resolve bidder name if not yet known
    if (!bidderNames[currentBid.bidder_id]) {
      getUser(currentBid.bidder_id)
        .then(u => setBidderNames(prev => ({ ...prev, [currentBid.bidder_id]: u.name ?? u.email })))
        .catch(() => {});
    }
  }, [currentBid?.bidder_id, currentBid?.bid_amount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch winner name for closed auctions
  useEffect(() => {
    if (!task || !auctionClosed) return;
    const winnerId = task.freelancer_id ?? currentBid?.bidder_id;
    if (!winnerId) return;
    if (winnerId === user?.user_id && user?.name) {
      setWinnerName(user.name);
      return;
    }
    getUser(winnerId)
      .then(u => setWinnerName(u.name ?? u.email))
      .catch(() => setWinnerName(winnerId));
  }, [task?.freelancer_id, currentBid?.bidder_id, auctionClosed, user?.user_id, user?.name]);

  const validateBid = useCallback((): string => {
    const amount = Number(bidInput);
    if (!bidInput || isNaN(amount)) return 'Please enter a valid bid amount.';
    if (amount <= 0) return 'Bid must be greater than zero.';
    const hasBids = currentBid?.bid_amount != null && currentBid?.bidder_id != null;
    const ceiling = hasBids ? currentBid.bid_amount! : (task?.starting_bid ?? 0);
    if (hasBids) {
      if (amount >= ceiling) {
        return `Bid must be lower than current bid of $${ceiling.toFixed(2)}.`;
      }
    } else {
      if (amount > ceiling) {
        return `Bid must be at or below the starting bid of $${ceiling.toFixed(2)}.`;
      }
    }
    return '';
  }, [bidInput, currentBid, task]);

  const requireAuth = () => {
    if (!user) {
      setAuthModalOpen(true);
      return true;
    }
    return false;
  };

  const submitBid = async () => {
    if (!task || !user) return;
    setBidLoading(true);
    setBidError('');
    try {
      await placeBid({
        task_id: task.task_id,
        bidder_id: user.user_id,
        bid_amount: Number(bidInput),
        timestamp: new Date().toISOString(),
      });
      setCurrentBid(task.task_id, { bid_amount: Number(bidInput), bidder_id: user.user_id });
      setBidInput('');
      setLowBidConfirm(false);
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Failed to place bid.');
    } finally {
      setBidLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    if (requireAuth()) return;
    const errMsg = validateBid();
    if (errMsg) {
      setBidError(errMsg);
      return;
    }
    if (!task || !user) return;

    const amount = Number(bidInput);
    const reference = currentBid?.bid_amount ?? task.starting_bid;
    if (amount <= reference * 0.8) {
      setLowBidConfirm(true);
      return;
    }

    await submitBid();
  };

  const isWinning =
    currentBid?.bidder_id != null && user != null && currentBid.bidder_id === user.user_id;
  const isOwner = task?.client_id === user?.user_id;

  const FEATURED_FEE = 5;
  const STRIPE_FEE_PERCENT = 0.034;
  const STRIPE_FEE_FIXED = 0.50;
  const featureTotal = Math.ceil((FEATURED_FEE * 100 + STRIPE_FEE_FIXED * 100) / (1 - STRIPE_FEE_PERCENT)) / 100;
  const featureStripeFee = featureTotal - FEATURED_FEE;

  const handleFeaturePay = async () => {
    if (!task || !user) return;
    if (!stripe || !elements) {
      setFeatureError('Stripe is not loaded.');
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setFeatureError('Card element not found.');
      return;
    }
    setFeatureError('');
    setFeatureLoading(true);
    try {
      // Step 1: Get client secret from backend
      const result = await captureFeaturedFee(task.task_id, user.user_id);
      const clientSecret = result.client_secret;

      // Step 2: Confirm card payment with Stripe
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElement } }
      );
      if (stripeErr) {
        setFeatureError(stripeErr.message ?? 'Payment failed.');
        return;
      }
      setFeatureStep('processing');
      if (paymentIntent?.status !== 'succeeded') {
        setFeatureError('Payment was not successful.');
        setFeatureStep('payment');
        return;
      }
      // Webhook will update is_featured; optimistically update local state
      if (task) {
        const updatedTask = { ...task, is_featured: true };
        const updatedTasks = tasks.map(t => t.task_id === task.task_id ? updatedTask : t);
        setTasks(updatedTasks);
      }
      setFeatureStep('done');
      setTimeout(() => {
        setFeatureModalOpen(false);
        setFeatureStep('confirm');
      }, 1500);
    } catch (err) {
      setFeatureError(err instanceof Error ? err.message : 'Payment failed.');
      setFeatureStep('payment');
    } finally {
      setFeatureLoading(false);
    }
  };

  const handleMessageClient = async () => {
    if (requireAuth()) return;
    if (!task || !user) return;
    const clientId = task.client_id;

    const existing = chats.find(
      (c) =>
        (c.user_1_id === user.user_id && c.user_2_id === clientId) ||
        (c.user_1_id === clientId && c.user_2_id === user.user_id)
    );

    if (existing) {
      setActiveChat(existing.chat_id);
      return;
    }

    setChatLoading(true);
    try {
      const chat = await createChat(user.user_id, clientId);
      upsertChat(chat);
      setActiveChat(chat.chat_id);
    } catch {
      /* silently fail */
    } finally {
      setChatLoading(false);
    }
  };

  const isWinner = user != null && (
    task?.freelancer_id === user.user_id ||
    (auctionClosed && currentBid?.bidder_id === user.user_id)
  );

  // Helper: ensure a chat exists between two users, return the chat
  const ensureChat = async (userId: string, otherId: string) => {
    const existing = chats.find(
      (c) =>
        (c.user_1_id === userId && c.user_2_id === otherId) ||
        (c.user_1_id === otherId && c.user_2_id === userId)
    );
    if (existing) return existing;
    const chat = await createChat(userId, otherId);
    upsertChat(chat);
    return chat;
  };

  // Freelancer marks task as completed → status to pending-review, sends message to client
  const handleMarkComplete = async () => {
    if (!task || !user) return;
    if (!user.stripe_connected_account_id) {
      setActionError('Please connect your Stripe account in your profile before submitting work.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const status = await getAccountStatus(user.stripe_connected_account_id);
      if (!status.charges_enabled) {
        setActionError('Your Stripe account onboarding is incomplete. Please finish setting up your Stripe account in your profile before submitting work.');
        setActionLoading(false);
        return;
      }
    } catch {
      setActionError('Unable to verify your Stripe account status. Please try again.');
      setActionLoading(false);
      return;
    }
    setActionError('');
    try {
      await updateTask(task.task_id, { auction_status: 'pending-review' });
      // Update local store
      useTaskStore.getState().upsertTask({ ...task, auction_status: 'pending-review' });

      // Send automated chat message to client with task link
      const chat = await ensureChat(user.user_id, task.client_id);
      const taskUrl = `${window.location.origin}/task/${task.task_id}`;
      await sendMessage({
        chat_id: chat.chat_id,
        sender_id: user.user_id,
        recipient_id: task.client_id,
        message: `I've completed the work on "${task.title}". Please review and approve when you're satisfied.\n\nView task: ${taskUrl}`,
      });

      useUIStore.getState().addToast({
        message: 'Work submitted! The client has been notified to review.',
        type: 'success',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as completed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Client approves work → status to accepted, triggers payment release
  const handleAcceptDelivery = async () => {
    if (!task || !user) return;
    setActionLoading(true);
    setActionError('');
    try {
      const winnerId = task.freelancer_id ?? currentBid?.bidder_id;
      const winningAmount = currentBid?.bid_amount ?? task.starting_bid;

      if (!winnerId) {
        setActionError('Could not determine the freelancer for this task.');
        setActionLoading(false);
        return;
      }

      // Release payment to freelancer (commission deducted server-side)
      const releaseResult = await releasePayment({
        payment_id: task.payment_id,
        freelancer_id: winnerId,
        amount: winningAmount,
        client_id: task.client_id,
      });

      const payout = releaseResult.freelancer_payout ?? winningAmount;
      const commission = releaseResult.commission_amount ?? 0;

      // Update task status to accepted
      await updateTask(task.task_id, { auction_status: 'accepted' });
      useTaskStore.getState().upsertTask({ ...task, auction_status: 'accepted' });

      // Notify freelancer via chat with payout breakdown
      const chat = await ensureChat(user.user_id, winnerId);
      const payoutMsg = commission > 0
        ? `I've approved the work for "${task.title}". Payment breakdown: $${winningAmount.toFixed(2)} winning bid - $${commission.toFixed(2)} platform fee = $${payout.toFixed(2)} paid to you. Thank you for your work!`
        : `I've approved the work for "${task.title}". Payment of $${winningAmount.toFixed(2)} has been released. Thank you for your work!`;
      await sendMessage({
        chat_id: chat.chat_id,
        sender_id: user.user_id,
        recipient_id: winnerId,
        message: payoutMsg,
      });

      useUIStore.getState().addToast({
        message: `Work approved! $${payout.toFixed(2)} released to freelancer ($${commission.toFixed(2)} platform fee).`,
        type: 'success',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve work.');
    } finally {
      setActionLoading(false);
    }
  };

  // Client disputes delivery → status to disputed, notifies freelancer
  const handleDisputeDelivery = async () => {
    if (!task || !user) return;
    setActionLoading(true);
    setActionError('');
    try {
      const winnerId = task.freelancer_id ?? currentBid?.bidder_id;
      if (!winnerId) {
        setActionError('Could not determine the freelancer for this task.');
        setActionLoading(false);
        return;
      }

      await updateTask(task.task_id, { auction_status: 'disputed' });
      useTaskStore.getState().upsertTask({ ...task, auction_status: 'disputed' });

      // Notify freelancer via chat
      const chat = await ensureChat(user.user_id, winnerId);
      const taskUrl = `${window.location.origin}/task/${task.task_id}`;
      await sendMessage({
        chat_id: chat.chat_id,
        sender_id: user.user_id,
        recipient_id: winnerId,
        message: `I've requested revisions for "${task.title}". Please review my feedback and resubmit when the changes are made.\n\nView task: ${taskUrl}`,
      });

      useUIStore.getState().addToast({
        message: 'Revisions requested. The freelancer has been notified.',
        type: 'warning',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to request revisions.');
    } finally {
      setActionLoading(false);
    }
  };

  // Freelancer resubmits after dispute → back to pending-review
  const handleResubmit = async () => {
    if (!task || !user) return;
    setActionLoading(true);
    setActionError('');
    try {
      await updateTask(task.task_id, { auction_status: 'pending-review' });
      useTaskStore.getState().upsertTask({ ...task, auction_status: 'pending-review' });

      const chat = await ensureChat(user.user_id, task.client_id);
      const taskUrl = `${window.location.origin}/task/${task.task_id}`;
      await sendMessage({
        chat_id: chat.chat_id,
        sender_id: user.user_id,
        recipient_id: task.client_id,
        message: `I've made the requested changes for "${task.title}" and resubmitted for your review.\n\nView task: ${taskUrl}`,
      });

      useUIStore.getState().addToast({
        message: 'Work resubmitted for review. The client has been notified.',
        type: 'success',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resubmit.');
    } finally {
      setActionLoading(false);
    }
  };

  // Client rejects work and cancels the task → refund to client, notify freelancer
  const handleRejectAndCancel = async () => {
    if (!task || !user) return;
    setActionLoading(true);
    setActionError('');
    try {
      const winnerId = task.freelancer_id ?? currentBid?.bidder_id;

      // Refund the full amount back to the client's card
      await refundPayment(task.payment_id);

      await updateTask(task.task_id, { auction_status: 'cancelled' });
      useTaskStore.getState().upsertTask({ ...task, auction_status: 'cancelled' });

      if (winnerId) {
        const chat = await ensureChat(user.user_id, winnerId);
        await sendMessage({
          chat_id: chat.chat_id,
          sender_id: user.user_id,
          recipient_id: winnerId,
          message: `The task "${task.title}" has been cancelled and closed. The full amount will be refunded to my card.`,
        });
      }

      useUIStore.getState().addToast({
        message: 'Task cancelled. The full amount will be refunded to your card.',
        type: 'success',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Freelancer abandons the task → refund client, notify client
  const handleAbandonTask = async () => {
    if (!task || !user) return;
    setActionLoading(true);
    setActionError('');
    try {
      // Refund the full amount back to the client's card
      await refundPayment(task.payment_id);

      await updateTask(task.task_id, { auction_status: 'cancelled' });
      useTaskStore.getState().upsertTask({ ...task, auction_status: 'cancelled' });

      const chat = await ensureChat(user.user_id, task.client_id);
      await sendMessage({
        chat_id: chat.chat_id,
        sender_id: user.user_id,
        recipient_id: task.client_id,
        message: `I'm unable to fulfil the task "${task.title}" and have withdrawn. The full amount will be refunded to your card.`,
      });

      useUIStore.getState().addToast({
        message: 'You have withdrawn from this task. The client has been notified.',
        type: 'warning',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to withdraw from task.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingTask || !task) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <Skeleton height="40px" width="70%" />
              <Skeleton height="16px" />
              <Skeleton height="16px" width="80%" />
              <Skeleton height="16px" width="60%" />
              <Skeleton height="16px" width="40%" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton height="180px" />
            </div>
          </div>
          {!loadingTask && !task && (
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Task not found.</p>
              <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
                Back to Tasks
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div className="page-container">
        {/* Back link */}
        <button
          className="btn btn-ghost"
          onClick={() => fromDashboard ? navigate('/dashboard', { state: { tab: dashboardTab } }) : navigate('/tasks')}
          style={{ marginBottom: 20, fontSize: 14, padding: '6px 0' }}
        >
          {fromDashboard ? '← Back to Dashboard' : '← Back to Tasks'}
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {/* Title + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1
                  style={{
                    fontSize: 'clamp(24px, 3vw, 36px)',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {task.title}
                </h1>
                {task.category && (
                  <span style={{
                    display: 'inline-block', marginTop: 8,
                    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: {
                      Design: 'rgba(236,72,153,0.12)', Development: 'rgba(59,130,246,0.12)',
                      Writing: 'rgba(234,179,8,0.12)', Marketing: 'rgba(34,197,94,0.12)',
                      Other: 'rgba(156,163,175,0.12)',
                    }[task.category] ?? 'rgba(156,163,175,0.12)',
                    color: {
                      Design: '#db2777', Development: '#2563eb',
                      Writing: '#ca8a04', Marketing: '#16a34a',
                      Other: '#6b7280',
                    }[task.category] ?? '#6b7280',
                    letterSpacing: '0.3px',
                  }}>
                    {task.category}
                  </span>
                )}
              </div>
              {(() => {
                const displayStatus = auctionClosed && task.auction_status === 'in-progress' ? 'completed' : task.auction_status;
                const labels: Record<string, string> = {
                  'pending': 'Pending', 'in-progress': 'In Progress', 'completed': 'Completed',
                  'cancelled': 'Cancelled', 'no-bids': 'No Bids',
                  'pending-review': 'Pending Review', 'accepted': 'Accepted', 'disputed': 'Revisions Requested',
                };
                return (
                  <span style={getStatusBadgeStyle(displayStatus)}>
                    {labels[displayStatus] ?? displayStatus}
                  </span>
                );
              })()}
            </div>

            {/* Description */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Description
              </div>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  fontSize: 15,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {task.description}
              </p>
            </div>

            {/* Requirements checklist */}
            {task.requirements && task.requirements.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Requirements
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {task.requirements.map((req, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        fontSize: 14,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--text-secondary)',
                          flexShrink: 0,
                          marginTop: 8,
                        }}
                      />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {task.photos && task.photos.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Photos
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {task.photos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Task photo ${i + 1}`}
                      onClick={() => setCarouselIndex(i)}
                      style={{
                        width: '100%', height: 140, objectFit: 'cover',
                        borderRadius: 8, border: '1px solid var(--border)',
                        cursor: 'pointer', transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Photo Carousel Lightbox */}
            {task.photos && carouselIndex !== null && (
              <div
                onClick={() => setCarouselIndex(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9999,
                  background: 'rgba(0,0,0,0.85)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setCarouselIndex(null)}
                  style={{
                    position: 'absolute', top: 20, right: 20,
                    background: 'none', border: 'none', color: 'white',
                    fontSize: 32, cursor: 'pointer', lineHeight: 1,
                  }}
                >
                  ×
                </button>

                {/* Prev */}
                {task.photos.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); setCarouselIndex((carouselIndex - 1 + task.photos!.length) % task.photos!.length); }}
                    style={{
                      position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                      width: 44, height: 44, borderRadius: '50%',
                      fontSize: 22, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ‹
                  </button>
                )}

                {/* Image */}
                <img
                  src={task.photos[carouselIndex]}
                  alt={`Photo ${carouselIndex + 1}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    maxWidth: '85vw', maxHeight: '85vh',
                    objectFit: 'contain', borderRadius: 8,
                  }}
                />

                {/* Next */}
                {task.photos.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); setCarouselIndex((carouselIndex + 1) % task.photos!.length); }}
                    style={{
                      position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                      width: 44, height: 44, borderRadius: '50%',
                      fontSize: 22, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ›
                  </button>
                )}

                {/* Counter */}
                <div style={{
                  position: 'absolute', bottom: 24,
                  color: 'rgba(255,255,255,0.7)', fontSize: 14,
                }}>
                  {carouselIndex + 1} / {task.photos.length}
                </div>
              </div>
            )}

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Posted by:
                </span>
                {loadingClient ? (
                  <Skeleton variant="text" width="120px" height="14px" />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {clientName ?? task.client_id}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Starts:
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {formatDate(task.auction_start_time)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Deadline:
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(task.auction_end_time)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Starting bid:
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  ${task.starting_bid.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Message Client button */}
            {!isOwner && (
              <button
                className="btn btn-primary"
                onClick={handleMessageClient}
                disabled={chatLoading}
                style={{ alignSelf: 'flex-start', padding: '10px 20px' }}
              >
                {chatLoading ? <span className="spinner" /> : 'Message Client'}
              </button>
            )}

            {/* Feature this listing button — owner only */}
            {isOwner && !task.is_featured && task.auction_status === 'in-progress' && !auctionClosed && (
              <button
                onClick={() => { setFeatureModalOpen(true); setFeatureStep('confirm'); setFeatureError(''); }}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #eab308, #f59e0b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(234,179,8,0.3)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Feature this listing — $5.00
              </button>
            )}

            {/* Featured badge for owner */}
            {isOwner && task.is_featured && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '8px 14px',
                background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.15))',
                border: '1px solid rgba(234,179,8,0.3)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                color: '#ca8a04',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ca8a04" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Featured Listing
              </div>
            )}

          </div>

          {/* Right column — Bid Panel */}
          <div>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Bid display */}
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {auctionClosed ? 'Final Bid' : 'Current Bid'}
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                  {currentBid?.bid_amount != null && currentBid?.bidder_id != null
                    ? `$${currentBid.bid_amount.toFixed(2)}`
                    : 'No bids'}
                </div>
                {!auctionClosed && currentBid?.bidder_id == null && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Starting at ${task.starting_bid.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Winning badge — only while auction is live */}
              {isWinning && !auctionClosed && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: 10,
                    color: '#16a34a',
                    fontWeight: 700,
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  You're winning! 🎉
                </div>
              )}

              {/* Auction closed state */}
              {auctionClosed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Status-specific panels */}
                  {task.auction_status === 'accepted' ? (
                    /* ── Accepted / Payment Released ── */
                    <div style={{
                      padding: '20px', borderRadius: 12, textAlign: 'center',
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 4, fontSize: 15 }}>
                        Work Approved
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Payment of <strong>${((currentBid?.bid_amount ?? task.starting_bid) * 0.9).toFixed(2)}</strong> has been released to the freelancer.
                      </div>
                    </div>

                  ) : task.auction_status === 'pending-review' ? (
                    /* ── Pending Review ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        padding: '16px', borderRadius: 12, textAlign: 'center',
                        background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                        <div style={{ fontWeight: 700, color: '#ea580c', marginBottom: 4, fontSize: 15 }}>
                          Awaiting Review
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {isOwner
                            ? 'The freelancer has submitted their work. Review and approve, or request revisions.'
                            : isWinner
                              ? 'Your work has been submitted. Waiting for the client to review.'
                              : 'The freelancer has submitted their work for client review.'}
                        </div>
                      </div>

                      {/* Client: Accept / Request Revisions / Reject buttons */}
                      {isOwner && (() => {
                        const winAmt = currentBid?.bid_amount ?? task.starting_bid;
                        const commissionRate = 0.10;
                        const commissionAmt = winAmt * commissionRate;
                        const freelancerPayout = winAmt - commissionAmt;
                        return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Payment breakdown */}
                          <div style={{
                            padding: '12px 14px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            fontSize: 13,
                            color: 'var(--text-secondary)',
                          }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Payment Breakdown</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span>Winning bid</span>
                              <span style={{ color: 'var(--text-primary)' }}>${winAmt.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span>Platform fee ({(commissionRate * 100).toFixed(0)}%)</span>
                              <span style={{ color: '#ef4444' }}>-${commissionAmt.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span style={{ color: 'var(--text-primary)' }}>Freelancer receives</span>
                              <span style={{ color: '#22c55e' }}>${freelancerPayout.toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            onClick={handleAcceptDelivery}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                              color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            {actionLoading ? 'Processing...' : 'Approve & Release Payment'}
                          </button>
                          <button
                            onClick={handleDisputeDelivery}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10,
                              border: '1px solid rgba(249,115,22,0.3)',
                              background: 'rgba(249,115,22,0.08)',
                              color: '#ea580c', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Request Revisions
                          </button>
                          <button
                            onClick={handleRejectAndCancel}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Reject & Cancel Task
                          </button>
                          {actionError && (
                            <span className="error-msg" style={{ textAlign: 'center' }}>{actionError}</span>
                          )}
                        </div>
                        );
                      })()}
                    </div>

                  ) : task.auction_status === 'disputed' ? (
                    /* ── Disputed / Revisions Requested ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        padding: '16px', borderRadius: 12, textAlign: 'center',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
                        <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4, fontSize: 15 }}>
                          Revisions Requested
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {isWinner
                            ? 'The client has requested changes. Please review their feedback in the chat and resubmit when ready.'
                            : isOwner
                              ? 'You\'ve requested revisions. Waiting for the freelancer to resubmit.'
                              : 'The client has requested revisions from the freelancer.'}
                        </div>
                      </div>

                      {/* Freelancer: Resubmit / Withdraw buttons */}
                      {isWinner && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={handleResubmit}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            {actionLoading ? 'Submitting...' : 'Resubmit for Review'}
                          </button>
                          <button
                            onClick={handleAbandonTask}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Unable to Fulfil
                          </button>
                          {actionError && (
                            <span className="error-msg" style={{ textAlign: 'center' }}>{actionError}</span>
                          )}
                        </div>
                      )}

                      {/* Client: Reject & Cancel in disputed state */}
                      {isOwner && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={handleRejectAndCancel}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Reject & Cancel Task
                          </button>
                          {actionError && (
                            <span className="error-msg" style={{ textAlign: 'center' }}>{actionError}</span>
                          )}
                        </div>
                      )}
                    </div>

                  ) : (
                    /* ── Default closed state (completed / no-bids / cancelled) ── */
                    <>
                      <div
                        style={{
                          padding: '16px',
                          background: 'var(--bg-secondary)',
                          borderRadius: 10,
                          textAlign: 'center',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                          Auction Closed
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          This auction has ended.
                        </div>
                      </div>

                      {/* Winner or no-bids info */}
                      {task.auction_status === 'no-bids' || (currentBid?.bidder_id == null && currentBid?.bid_amount == null) ? (
                        <div style={{
                          padding: '12px 14px', borderRadius: 10, textAlign: 'center',
                          background: 'rgba(156,163,175,0.08)', border: '1px solid rgba(156,163,175,0.2)',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                            No one bid on this task
                          </div>
                        </div>
                      ) : winnerName ? (
                        <div style={{
                          padding: '12px 14px', borderRadius: 10,
                          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                          <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                            Won by {winnerName}
                          </span>
                        </div>
                      ) : null}

                      {/* Freelancer: Mark as Completed / Unable to Fulfil buttons */}
                      {isWinner && (task.auction_status === 'completed' || (task.auction_status === 'in-progress' && auctionClosed)) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={handleMarkComplete}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            {actionLoading ? 'Submitting...' : 'Mark as Completed'}
                          </button>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
                            This will notify the client to review your work and release payment.
                          </p>
                          <button
                            onClick={handleAbandonTask}
                            disabled={actionLoading}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Unable to Fulfil
                          </button>
                          {actionError && (
                            <span className="error-msg" style={{ textAlign: 'center' }}>{actionError}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : !user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                    Log in or sign up to place a bid on this task.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setAuthModalOpen(true)}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    Log In to Bid
                  </button>
                </div>
              ) : isOwner ? (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  This is your task. You cannot bid on it.
                </div>
              ) : (
                /* Bid input */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Your Bid ($)</label>
                    <input
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      value={bidInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          setBidInput(val);
                          setBidError('');
                        }
                      }}
                      placeholder={
                        currentBid?.bid_amount != null && currentBid?.bidder_id != null
                          ? `Less than $${currentBid.bid_amount.toFixed(2)}`
                          : `At or below $${task.starting_bid.toFixed(2)}`
                      }
                      disabled={bidLoading || isWinning}
                      onKeyDown={(e) => e.key === 'Enter' && !isWinning && !bidLoading && bidInput && handlePlaceBid()}
                    />
                    {bidError && <span className="error-msg">{bidError}</span>}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handlePlaceBid}
                    disabled={bidLoading || !bidInput || isWinning}
                    style={{ width: '100%', padding: '12px', opacity: isWinning ? 0.5 : undefined }}
                  >
                    {bidLoading ? <span className="spinner" /> : isWinning ? 'You\'re Already Winning' : 'Place Bid'}
                  </button>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Lower bid wins. Bids are binding.
                  </p>
                </div>
              )}
            </div>

            {/* Bid History */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                border: '1px solid var(--border)',
                marginTop: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Bid History ({bidHistory.length})
              </div>
              {bidHistoryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                      <Skeleton variant="text" width="120px" height="14px" />
                      <Skeleton variant="text" width="80px" height="14px" />
                    </div>
                  ))}
                </div>
              ) : bidHistory.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                  No bids have been placed yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {bidHistory.map((bid, i) => (
                    <div
                      key={bid.bid_id ?? i}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: i < bidHistory.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {i === 0 && (
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#6366f1', boxShadow: '0 0 6px #6366f1',
                            display: 'inline-block', flexShrink: 0,
                          }} />
                        )}
                        <span style={{
                          fontSize: 13, fontWeight: i === 0 ? 700 : 500,
                          color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}>
                          {bidderNames[bid.bidder_id] ?? bid.bidder_id.slice(0, 8) + '...'}
                          {bid.bidder_id === user?.user_id && (
                            <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 4, fontWeight: 700 }}>(you)</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 700,
                          color: i === 0 ? '#6366f1' : 'var(--text-primary)',
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}>
                          ${bid.bid_amount.toFixed(2)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 90, textAlign: 'right' }}>
                          {new Date(bid.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {user && profileModalOpen && <ProfileModal />}
      {user && addTaskModalOpen && <AddTaskModal />}
      {user && <ChatPanel />}
      {authModalOpen && <AuthModal />}

      {/* Low bid confirmation modal */}
      {lowBidConfirm && (
        <div className="modal-overlay" onClick={() => setLowBidConfirm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Unusually Low Bid
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                Your bid of <strong style={{ color: 'var(--text-primary)' }}>${Number(bidInput).toFixed(2)}</strong> is
                significantly lower than the current {currentBid?.bid_amount != null ? 'bid' : 'starting price'} of{' '}
                <strong style={{ color: 'var(--text-primary)' }}>${(currentBid?.bid_amount ?? task!.starting_bid).toFixed(2)}</strong>.
                Are you sure you want to proceed?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setLowBidConfirm(false)}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitBid}
                  disabled={bidLoading}
                  style={{ flex: 1, padding: '10px' }}
                >
                  {bidLoading ? <span className="spinner" /> : 'Confirm Bid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature listing payment modal */}
      {featureModalOpen && (
        <div
          onClick={() => { if (featureStep !== 'processing') { setFeatureModalOpen(false); setFeatureStep('confirm'); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {(featureStep === 'confirm' || featureStep === 'payment') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Payment</h3>
                  <button
                    onClick={() => { if (!featureLoading) { setFeatureModalOpen(false); setFeatureStep('confirm'); } }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{
                  padding: 14, border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', background: 'var(--bg)',
                }}>
                  <CardElement options={{
                    style: {
                      base: {
                        fontSize: '14px',
                        color: isDark ? '#fafafa' : '#09090b',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        '::placeholder': { color: isDark ? '#a1a1aa' : '#71717a' },
                        iconColor: isDark ? '#a1a1aa' : '#71717a',
                      },
                      invalid: { color: '#ef4444' },
                    },
                  }} />
                </div>

                <div style={{
                  padding: '12px 16px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Featured listing fee</span>
                    <span style={{ color: '#eab308', fontWeight: 600 }}>${FEATURED_FEE.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Processing fee (3.4% + $0.50)</span>
                    <span style={{ fontWeight: 600 }}>${featureStripeFee.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total charge</span>
                    <span>${featureTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                    Processing fee is non-refundable.
                  </div>
                </div>

                {featureError && <span className="error-msg">{featureError}</span>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setFeatureModalOpen(false); setFeatureStep('confirm'); }}
                    disabled={featureLoading}
                    style={{ flex: 1 }}
                  >
                    ← Back
                  </button>
                  <button
                    className="btn"
                    onClick={handleFeaturePay}
                    disabled={featureLoading || !stripe}
                    style={{
                      flex: 2, opacity: featureLoading ? 0.7 : 1,
                      background: 'linear-gradient(135deg, #eab308, #f59e0b)', color: '#fff',
                    }}
                  >
                    {featureLoading ? 'Processing payment...' : 'Pay & Feature'}
                  </button>
                </div>
              </div>
            )}

            {featureStep === 'processing' && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <span className="spinner" style={{ marginBottom: 12, display: 'inline-block' }} />
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Processing your payment...</div>
              </div>
            )}

            {featureStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>&#11088;</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#eab308', marginBottom: 6 }}>Listing Featured!</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your listing now has a gold badge and priority placement.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
