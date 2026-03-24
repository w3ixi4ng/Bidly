import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useChatStore } from '../store/chatStore';
import { getTasksByClient, getTasksByFreelancer, getTask } from '../api/tasks';
import { getBidsByUser, getCurrentBidWithFallback, getBidsByTask } from '../api/bids';
import { getUserChats } from '../api/chats';
import { getChatMessages } from '../api/chatLogs';
import { getUser } from '../api/users';
import type { User } from '../types';
import { connectSocket } from '../socket/socket';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import AddTaskButton from '../components/AddTaskButton';
import AddTaskModal from '../components/AddTaskModal';
import ChatPanel from '../components/ChatPanel';
import AuthModal from '../components/AuthModal';
import Skeleton from '../components/Skeleton';
import type { Task, CurrentBid as CurrentBidType } from '../types';
import type { BidResponse } from '../api/bids';

type DashboardTab = 'my-tasks' | 'my-bids' | 'won' | 'transactions';
type StatusFilter = 'all' | 'pending' | 'in-progress' | 'completed' | 'no-bids' | 'pending-review' | 'accepted' | 'disputed' | 'cancelled';
type BidStatusFilter = 'all' | 'active' | 'winning' | 'outbid' | 'ended';
type WonFilter = 'all' | 'active' | 'under-review' | 'paid';
type TxnFilter = 'all' | 'payments' | 'earnings' | 'refunds';
type SortField = 'date' | 'amount';
type SortDir = 'desc' | 'asc';

function formatCountdown(endTime: string): { text: string; urgency: 'low' | 'medium' | 'high' } {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { text: 'Ended', urgency: 'high' };
  const totalHours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return { text: `${days}d ${remainingHours}h left`, urgency: 'low' };
  }
  if (totalHours > 2) return { text: `${totalHours}h ${mins}m left`, urgency: 'medium' };
  if (totalHours > 0) return { text: `${totalHours}h ${mins}m left`, urgency: 'high' };
  if (mins > 0) return { text: `${mins}m left`, urgency: 'high' };
  return { text: '<1m left', urgency: 'high' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isTaskActive(task: Task): boolean {
  return (
    (task.auction_status === 'in-progress' || task.auction_status === 'pending') &&
    new Date(task.auction_end_time).getTime() > Date.now()
  );
}

function formatStartsIn(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return 'Starting soon';
  const totalHours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return `Starts in ${days}d ${remainingHours}h`;
  }
  if (totalHours > 0) return `Starts in ${totalHours}h ${mins}m`;
  if (mins > 0) return `Starts in ${mins}m`;
  return 'Starting soon';
}

/** Returns the effective display status, accounting for time expiry */
function effectiveStatus(task: Task): Task['auction_status'] {
  // Don't override statuses that are already in a post-auction flow
  if (['pending-review', 'accepted', 'disputed'].includes(task.auction_status)) {
    return task.auction_status;
  }
  if (
    (task.auction_status === 'in-progress' || task.auction_status === 'pending') &&
    new Date(task.auction_end_time).getTime() <= Date.now()
  ) {
    return 'completed'; // time expired — treat as ended
  }
  return task.auction_status;
}

const TABS: { key: DashboardTab; label: string; icon: JSX.Element }[] = [
  {
    key: 'my-tasks',
    label: 'My Tasks',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: 'my-bids',
    label: 'My Bids',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    key: 'won',
    label: 'Won Auctions',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2h10v-2c0-.76-.85-1.25-2.03-1.79C14.47 17.98 14 17.55 14 17v-2.34" />
        <path d="M18 2H6v7a6 6 0 1012 0V2z" />
      </svg>
    ),
  },
  {
    key: 'transactions',
    label: 'Transactions',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'no-bids', label: 'No Bids' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending-review', label: 'Pending Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'disputed', label: 'Pending Revision' },
  { key: 'cancelled', label: 'Cancelled' },
];

const BID_STATUS_FILTERS: { key: BidStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'winning', label: 'Winning' },
  { key: 'outbid', label: 'Outbid' },
  { key: 'ended', label: 'Past' },
];

const WON_FILTERS: { key: WonFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'In Progress' },
  { key: 'under-review', label: 'Under Review' },
  { key: 'paid', label: 'Paid' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setAuth, access_token } = useAuthStore();
  const { profileModalOpen, addTaskModalOpen, authModalOpen, isDark } = useUIStore();
  const { setChats, upsertChat, setMessages } = useChatStore();

  const initialTab = (location.state as { tab?: DashboardTab })?.tab ?? 'my-tasks';
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [taskFilter, setTaskFilter] = useState<StatusFilter>('all');
  const [bidFilter, setBidFilter] = useState<BidStatusFilter>('all');
  const [wonFilter, setWonFilter] = useState<WonFilter>('all');
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Data — client tasks
  const [clientTasks, setClientTasks] = useState<Task[]>([]);

  // Data — bid-related (shared between My Bids + Won tabs)
  const [userBids, setUserBids] = useState<BidResponse[]>([]);
  const [allBidTasks, setAllBidTasks] = useState<Task[]>([]);
  const [allCurrentBids, setAllCurrentBids] = useState<Record<string, CurrentBidType>>({});
  const [freelancerTasks, setFreelancerTasks] = useState<Task[]>([]);
  const [bidDataLoaded, setBidDataLoaded] = useState(false);

  // Winner name cache for completed client tasks
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});
  // Current bids for client tasks (to show winner info)
  const [clientTaskBids, setClientTaskBids] = useState<Record<string, CurrentBidType>>({});
  const [bidCounts, setBidCounts] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate('/tasks');
  }, [user, navigate]);

  // Bootstrap websocket + chats
  useEffect(() => {
    if (!user?.user_id) return;
    connectSocket(user.user_id);
    getUser(user.user_id)
      .then(fresh => setAuth(fresh, access_token ?? ''))
      .catch(() => {});
    getUserChats(user.user_id)
      .then(chatsData => {
        setChats(chatsData);
        chatsData.forEach(c => upsertChat(c));
        return Promise.allSettled(
          chatsData.map(c =>
            getChatMessages(c.chat_id).then(msgs => {
              if (msgs.length > 0) setMessages(c.chat_id, msgs);
            })
          )
        );
      })
      .catch(() => {});
  }, [user?.user_id]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!user?.user_id) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'my-tasks' || activeTab === 'transactions') {
          const tasks = await getTasksByClient(user.user_id);
          if (cancelled) return;
          setClientTasks(tasks);

          // Fetch current bids for all client tasks
          const bidResults = await Promise.allSettled(
            tasks.map(t =>
              getCurrentBidWithFallback(t.task_id)
                .then(bid => ({ task_id: t.task_id, bid }))
                .catch(() => ({ task_id: t.task_id, bid: { bid_amount: null, bidder_id: null } as CurrentBidType }))
            )
          );
          if (cancelled) return;
          const bidsMap: Record<string, CurrentBidType> = {};
          bidResults.forEach(r => {
            if (r.status === 'fulfilled' && r.value.bid.bid_amount != null) {
              bidsMap[r.value.task_id] = r.value.bid;
            }
          });
          setClientTaskBids(bidsMap);

          // Fetch bid counts for tasks that have bids
          const tasksWithBids = Object.keys(bidsMap);
          if (tasksWithBids.length > 0) {
            Promise.allSettled(
              tasksWithBids.map(taskId =>
                getBidsByTask(taskId).then(bids => ({ taskId, count: bids.length }))
              )
            ).then(results => {
              if (cancelled) return;
              const counts: Record<string, number> = {};
              results.forEach(r => {
                if (r.status === 'fulfilled') counts[r.value.taskId] = r.value.count;
              });
              setBidCounts(counts);
            });
          }

          // Fetch winner names for completed tasks
          const endedTasks = tasks.filter(t => !isTaskActive(t));
          const winnerIds = new Set<string>();
          endedTasks.forEach(t => {
            const bid = bidsMap[t.task_id];
            if (bid?.bidder_id) winnerIds.add(bid.bidder_id);
            if (t.freelancer_id) winnerIds.add(t.freelancer_id);
          });
          const nameResults = await Promise.allSettled(
            [...winnerIds].map(id =>
              getUser(id).then((u: User) => ({ id, name: u.name ?? u.email }))
            )
          );
          if (cancelled) return;
          const names: Record<string, string> = {};
          nameResults.forEach(r => {
            if (r.status === 'fulfilled') names[r.value.id] = r.value.name;
          });
          setWinnerNames(names);
        }
        if (activeTab === 'my-bids' || activeTab === 'won' || activeTab === 'transactions') {
          // If bid data already loaded, just reuse it
          if (bidDataLoaded) {
            setLoading(false);
            return;
          }

          // Fetch all bid-related data in parallel
          const [bids, fTasks] = await Promise.all([
            getBidsByUser(user.user_id),
            getTasksByFreelancer(user.user_id),
          ]);
          if (cancelled) return;
          setUserBids(bids);
          setFreelancerTasks(fTasks);

          // Get unique task IDs from bids
          const taskIds = [...new Set(bids.map(b => b.task_id))];

          // Also include freelancer tasks not already in bids
          const bidTaskIdSet = new Set(taskIds);
          fTasks.forEach(t => {
            if (!bidTaskIdSet.has(t.task_id)) taskIds.push(t.task_id);
          });

          // Fetch task details for each
          const taskResults = await Promise.allSettled(taskIds.map(id => {
            // Use freelancer tasks directly if we already have them
            const existing = fTasks.find(t => t.task_id === id);
            if (existing) return Promise.resolve(existing);
            return getTask(id);
          }));
          const tasks: Task[] = [];
          taskResults.forEach(r => { if (r.status === 'fulfilled') tasks.push(r.value); });
          if (!cancelled) setAllBidTasks(tasks);

          // Fetch current bids for ALL tasks (not just active)
          const bidResults = await Promise.allSettled(
            tasks.map(t =>
              getCurrentBidWithFallback(t.task_id)
                .then(bid => ({ task_id: t.task_id, bid }))
                .catch(() => ({ task_id: t.task_id, bid: { bid_amount: null, bidder_id: null } as CurrentBidType }))
            )
          );
          const bidsMap: Record<string, CurrentBidType> = {};
          bidResults.forEach(r => {
            if (r.status === 'fulfilled' && r.value.bid.bid_amount != null) {
              bidsMap[r.value.task_id] = r.value.bid;
            }
          });
          if (!cancelled) {
            setAllCurrentBids(bidsMap);
            setBidDataLoaded(true);
          }
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [activeTab, user?.user_id, bidDataLoaded]);

  // Poll pending client tasks whose start time recently passed to detect transition to in-progress
  useEffect(() => {
    if (activeTab !== 'my-tasks') return;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const pendingPastStart = clientTasks.filter(
      t => t.auction_status === 'pending' &&
        new Date(t.auction_start_time).getTime() <= now &&
        now - new Date(t.auction_start_time).getTime() < fiveMinutes
    );
    if (pendingPastStart.length === 0) return;

    const poll = setInterval(() => {
      pendingPastStart.forEach(t => {
        getTask(t.task_id)
          .then(fresh => {
            if (fresh.auction_status !== 'pending') {
              setClientTasks(prev => prev.map(ct => ct.task_id === fresh.task_id ? fresh : ct));
            }
          })
          .catch(() => {});
      });
    }, 5000);

    return () => clearInterval(poll);
  }, [activeTab, clientTasks]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Grid entrance animation
  useEffect(() => {
    if (loading || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.dash-card');
    gsap.fromTo(cards,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
    );
  }, [loading, activeTab, taskFilter, bidFilter, wonFilter, txnFilter, sortField, sortDir]);

  // --- Derived data ---

  // Generic sort helper for tasks
  const sortTasks = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      if (sortField === 'amount') {
        const aAmt = clientTaskBids[a.task_id]?.bid_amount ?? a.starting_bid;
        const bAmt = clientTaskBids[b.task_id]?.bid_amount ?? b.starting_bid;
        return sortDir === 'desc' ? bAmt - aAmt : aAmt - bAmt;
      }
      const aTime = new Date(a.auction_start_time).getTime();
      const bTime = new Date(b.auction_start_time).getTime();
      return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });
  };

  // Filtered client tasks by status
  const filteredClientTasks = sortTasks(clientTasks.filter(task => {
    if (taskFilter === 'all') return true;
    return effectiveStatus(task) === taskFilter;
  }));

  // For My Bids: get the user's latest bid per task
  const latestBidPerTask: Record<string, BidResponse> = {};
  userBids.forEach(bid => {
    const existing = latestBidPerTask[bid.task_id];
    if (!existing || new Date(bid.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      latestBidPerTask[bid.task_id] = bid;
    }
  });

  // Won tasks: freelancer_id matches OR (auction ended + user holds winning bid)
  const freelancerTaskIds = new Set(freelancerTasks.map(t => t.task_id));
  const wonTaskSet = new Set<string>();
  // From freelancer_id
  freelancerTasks.forEach(t => wonTaskSet.add(t.task_id));
  // From current bids on ended auctions (Redis)
  allBidTasks.forEach(t => {
    if (!isTaskActive(t) && allCurrentBids[t.task_id]?.bidder_id === user?.user_id) {
      wonTaskSet.add(t.task_id);
    }
  });
  // Also check tasks where freelancer_id is set to current user (covers cases where Redis data expired)
  allBidTasks.forEach(t => {
    if (t.freelancer_id === user?.user_id) {
      wonTaskSet.add(t.task_id);
    }
  });

  const wonTasks = allBidTasks
    .filter(t => wonTaskSet.has(t.task_id));

  const filteredWonTasks = (() => {
    const filtered = wonTasks.filter(task => {
      if (wonFilter === 'all') return true;
      const s = effectiveStatus(task);
      if (wonFilter === 'active') return s === 'in-progress' || s === 'completed' || s === 'disputed';
      if (wonFilter === 'under-review') return s === 'pending-review';
      if (wonFilter === 'paid') return s === 'accepted';
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortField === 'amount') {
        const aAmt = latestBidPerTask[a.task_id]?.bid_amount ?? a.starting_bid;
        const bAmt = latestBidPerTask[b.task_id]?.bid_amount ?? b.starting_bid;
        return sortDir === 'desc' ? bAmt - aAmt : aAmt - bAmt;
      }
      const aTime = new Date(a.auction_end_time).getTime();
      const bTime = new Date(b.auction_end_time).getTime();
      return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });
  })();

  // Bid tasks: all tasks user has bid on (excluding won)
  const bidTasks = allBidTasks
    .filter(t => latestBidPerTask[t.task_id] && !wonTaskSet.has(t.task_id));

  // Filtered bid tasks
  const filteredBidTasks = (() => {
    const filtered = bidTasks.filter(task => {
      if (bidFilter === 'all') return true;
      const active = isTaskActive(task);
      const isWinning = allCurrentBids[task.task_id]?.bidder_id === user?.user_id;
      if (bidFilter === 'active') return active;
      if (bidFilter === 'winning') return active && isWinning;
      if (bidFilter === 'outbid') return active && !isWinning;
      if (bidFilter === 'ended') return !active;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortField === 'amount') {
        const aAmt = latestBidPerTask[a.task_id]?.bid_amount ?? 0;
        const bAmt = latestBidPerTask[b.task_id]?.bid_amount ?? 0;
        return sortDir === 'desc' ? bAmt - aAmt : aAmt - bAmt;
      }
      const aTime = new Date(a.auction_start_time).getTime();
      const bTime = new Date(b.auction_start_time).getTime();
      return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });
  })();

  const handleCardClick = (task: Task) => navigate(`/task/${task.task_id}`, { state: { from: 'dashboard', tab: activeTab } });

  // --- Transactions derived data ---
  type Transaction = {
    id: string;
    taskTitle: string;
    taskId: string;
    type: 'payment' | 'earning' | 'refund';
    amount: number;
    date: string;
    status: string;
  };

  const transactions: Transaction[] = (() => {
    const txns: Transaction[] = [];

    // Client payments: tasks user posted where payment was captured
    clientTasks.forEach(task => {
      const s = effectiveStatus(task);
      const bid = clientTaskBids[task.task_id];
      const amount = bid?.bid_amount ?? task.starting_bid;

      if (s === 'accepted') {
        txns.push({
          id: `pay-${task.task_id}`,
          taskTitle: task.title,
          taskId: task.task_id,
          type: 'payment',
          amount,
          date: task.auction_end_time,
          status: 'Released',
        });
      } else if (s === 'cancelled' && !isTaskActive(task)) {
        txns.push({
          id: `ref-${task.task_id}`,
          taskTitle: task.title,
          taskId: task.task_id,
          type: 'refund',
          amount: task.starting_bid,
          date: task.auction_end_time,
          status: 'Cancelled — Refunded',
        });
      } else if (s === 'no-bids') {
        txns.push({
          id: `nobid-${task.task_id}`,
          taskTitle: task.title,
          taskId: task.task_id,
          type: 'refund',
          amount: task.starting_bid,
          date: task.auction_end_time,
          status: 'No Bids — Refunded',
        });
      } else if (s === 'in-progress' || s === 'pending' || s === 'completed' || s === 'pending-review' || s === 'disputed') {
        // Completed with no bids → refundable, not awaiting release
        const hasBids = bid && bid.bid_amount !== null && bid.bidder_id;
        if (s === 'completed' && !hasBids) {
          txns.push({
            id: `nobid-${task.task_id}`,
            taskTitle: task.title,
            taskId: task.task_id,
            type: 'refund',
            amount: task.starting_bid,
            date: task.auction_end_time,
            status: 'No Bids — Refunded',
          });
        } else {
          txns.push({
            id: `hold-${task.task_id}`,
            taskTitle: task.title,
            taskId: task.task_id,
            type: 'payment',
            amount: task.starting_bid,
            date: task.auction_start_time,
            status: s === 'pending' || s === 'in-progress' ? 'Held' : s === 'pending-review' ? 'In Review' : s === 'disputed' ? 'Disputed' : 'Awaiting Release',
          });
        }
      }
    });

    // Freelancer earnings: tasks user won
    wonTasks.forEach(task => {
      const s = effectiveStatus(task);
      const bid = allCurrentBids[task.task_id];
      const amount = bid?.bid_amount ?? task.starting_bid;

      if (s === 'accepted') {
        txns.push({
          id: `earn-${task.task_id}`,
          taskTitle: task.title,
          taskId: task.task_id,
          type: 'earning',
          amount,
          date: task.auction_end_time,
          status: 'Received',
        });
      } else {
        txns.push({
          id: `earn-pending-${task.task_id}`,
          taskTitle: task.title,
          taskId: task.task_id,
          type: 'earning',
          amount,
          date: task.auction_end_time,
          status: s === 'pending-review' ? 'In Review' : s === 'disputed' ? 'Disputed' : 'Pending',
        });
      }
    });

    return txns;
  })();

  const filteredTransactions = (() => {
    const filtered = transactions.filter(txn => {
      if (txnFilter === 'all') return true;
      if (txnFilter === 'payments') return txn.type === 'payment';
      if (txnFilter === 'earnings') return txn.type === 'earning';
      if (txnFilter === 'refunds') return txn.type === 'refund';
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortField === 'amount') {
        return sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      return sortDir === 'desc'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  })();

  const TXN_FILTERS: { key: TxnFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'payments', label: 'Payments' },
    { key: 'earnings', label: 'Earnings' },
    { key: 'refunds', label: 'Refunds' },
  ];

  const statusBadge = (task: Task) => {
    const status = effectiveStatus(task);
    const colors: Record<string, { bg: string; color: string; label: string }> = {
      'in-progress': { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', label: 'In Progress' },
      completed: { bg: 'rgba(34,197,94,0.15)', color: '#16a34a', label: 'Completed' },
      cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626', label: 'Cancelled' },
      pending: { bg: 'rgba(234,179,8,0.15)', color: '#ca8a04', label: 'Pending' },
      'no-bids': { bg: 'rgba(156,163,175,0.15)', color: '#6b7280', label: 'No Bids' },
      'pending-review': { bg: 'rgba(249,115,22,0.15)', color: '#ea580c', label: 'Pending Review' },
      accepted: { bg: 'rgba(34,197,94,0.15)', color: '#16a34a', label: 'Accepted' },
      disputed: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626', label: 'Revisions Requested' },
    };
    const c = colors[status] ?? colors.pending;
    return (
      <span style={{
        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: c.bg, color: c.color,
        letterSpacing: '0.3px', whiteSpace: 'nowrap',
      }}>
        {c.label}
      </span>
    );
  };

  const urgencyColor = (u: string) => ({
    low: '#22c55e', medium: '#f97316', high: '#ef4444',
  }[u] ?? '#6b7280');

  const cardStyle = (hovered: boolean): React.CSSProperties => ({
    background: 'var(--surface)',
    border: `1px solid ${hovered ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
    borderRadius: 20,
    padding: '20px 22px 18px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: hovered
      ? '0 12px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.08)'
      : '0 2px 8px rgba(0,0,0,0.05)',
    transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
  });

  const renderTimerOrEnded = (task: Task) => {
    if (isTaskActive(task)) {
      const cd = formatCountdown(task.auction_end_time);
      return (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ends in</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <svg width="12" height="12" fill="none" stroke={urgencyColor(cd.urgency)} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: urgencyColor(cd.urgency) }}>{cd.text}</span>
          </div>
        </>
      );
    }
    return (
      <>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ended</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(task.auction_end_time)}</div>
      </>
    );
  };

  // Category badge colors
  const categoryColors: Record<string, { bg: string; color: string }> = {
    Design: { bg: 'rgba(236,72,153,0.12)', color: '#db2777' },
    Development: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
    Writing: { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
    Marketing: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
    Other: { bg: 'rgba(156,163,175,0.12)', color: '#6b7280' },
  };

  const renderCategoryBadge = (category: string) => {
    const c = categoryColors[category] ?? categoryColors.Other;
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
        background: c.bg, color: c.color, letterSpacing: '0.3px', whiteSpace: 'nowrap',
      }}>
        {category}
      </span>
    );
  };

  // --- Render card for My Tasks tab ---
  const renderClientTaskCard = (task: Task) => {
    const status = effectiveStatus(task);
    const bid = clientTaskBids[task.task_id];
    const winnerId = task.freelancer_id ?? bid?.bidder_id;
    const winnerName = winnerId ? winnerNames[winnerId] : null;
    const isPending = task.auction_status === 'pending' && new Date(task.auction_start_time).getTime() > Date.now();

    return (
      <HoverCard key={task.task_id} onClick={() => handleCardClick(task)}>
        {(hovered) => (
          <div style={cardStyle(hovered)}>
            {hovered && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '20px 20px 0 0' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </h3>
                {task.category && (
                  <div>{renderCategoryBadge(task.category)}</div>
                )}
              </div>
              {statusBadge(task)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 16, flex: 1 }}>
              {task.description}
            </p>

            {/* Status info */}
            {status !== 'pending' && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginBottom: 12,
                background: status === 'pending-review' ? 'rgba(249,115,22,0.08)'
                  : status === 'disputed' ? 'rgba(239,68,68,0.08)'
                  : status === 'accepted' ? 'rgba(34,197,94,0.08)'
                  : (isTaskActive(task) && bid?.bidder_id) ? 'rgba(99,102,241,0.08)'
                  : status === 'no-bids' ? 'rgba(156,163,175,0.08)'
                  : (winnerName ? 'rgba(34,197,94,0.08)' : 'rgba(156,163,175,0.08)'),
                border: `1px solid ${
                  status === 'pending-review' ? 'rgba(249,115,22,0.2)'
                  : status === 'disputed' ? 'rgba(239,68,68,0.2)'
                  : status === 'accepted' ? 'rgba(34,197,94,0.2)'
                  : (isTaskActive(task) && bid?.bidder_id) ? 'rgba(99,102,241,0.2)'
                  : status === 'no-bids' ? 'rgba(156,163,175,0.2)'
                  : (winnerName ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)')
                }`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {status === 'pending-review' ? (
                  <>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>📋</span>
                    <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>
                      Review needed — {winnerName ?? 'freelancer'} submitted work
                    </span>
                  </>
                ) : status === 'disputed' ? (
                  <>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>🔄</span>
                    <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                      Revisions requested — waiting for resubmission
                    </span>
                  </>
                ) : status === 'accepted' ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                      Accepted — payment released to {winnerName ?? 'freelancer'}
                    </span>
                  </>
                ) : isTaskActive(task) && bid?.bidder_id ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                      {bidCounts[task.task_id] ?? 1} bid{(bidCounts[task.task_id] ?? 1) !== 1 ? 's' : ''} placed
                    </span>
                  </>
                ) : status === 'no-bids' || (!winnerName && !bid?.bidder_id) ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                      {isTaskActive(task) ? 'No bids yet' : 'No one bid on this task'}
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                      Won by {winnerName}
                    </span>
                    {bid?.bid_amount != null && (
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginLeft: 'auto' }}>
                        ${bid.bid_amount.toFixed(2)}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {bid?.bid_amount != null ? 'Current Bid' : 'Starting Bid'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: bid?.bid_amount != null ? '#6366f1' : 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}>
                  ${bid?.bid_amount != null ? bid.bid_amount.toFixed(2) : task.starting_bid.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {isPending ? (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Auction</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ca8a04' }}>{formatStartsIn(task.auction_start_time)}</div>
                  </>
                ) : renderTimerOrEnded(task)}
              </div>
            </div>
          </div>
        )}
      </HoverCard>
    );
  };

  // --- Render card for My Bids tab ---
  const renderBidTaskCard = (task: Task) => {
    const myBid = latestBidPerTask[task.task_id];
    const currentBid = allCurrentBids[task.task_id];
    const isWinning = currentBid?.bidder_id === user?.user_id;
    const active = isTaskActive(task);

    return (
      <HoverCard key={task.task_id} onClick={() => handleCardClick(task)}>
        {(hovered) => (
          <div style={cardStyle(hovered)}>
            {hovered && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '20px 20px 0 0' }} />}

            {/* Winning / Outbid badge */}
            {active && (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 999,
                background: isWinning ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${isWinning ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isWinning ? '#22c55e' : '#ef4444',
                  boxShadow: `0 0 6px ${isWinning ? '#22c55e' : '#ef4444'}`,
                  animation: 'cardPulse 2s ease infinite',
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: isWinning ? '#16a34a' : '#dc2626', letterSpacing: '0.5px' }}>
                  {isWinning ? 'WINNING' : 'OUTBID'}
                </span>
              </div>
            )}

            {/* Status badge for ended auctions */}
            {!active && (
              <div style={{ position: 'absolute', top: 16, right: 16 }}>
                {statusBadge(task)}
              </div>
            )}

            <div style={{ marginBottom: 10, paddingRight: 80, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </h3>
              {task.category && <div style={{ marginTop: 6 }}>{renderCategoryBadge(task.category)}</div>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 16, flex: 1 }}>
              {task.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Your Bid
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}>
                  ${myBid ? myBid.bid_amount.toFixed(2) : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {renderTimerOrEnded(task)}
              </div>
            </div>
          </div>
        )}
      </HoverCard>
    );
  };

  // --- Render card for Won tab ---
  const renderWonTaskCard = (task: Task) => {
    const myBid = latestBidPerTask[task.task_id];
    const wonBadgeConfig = {
      'pending-review': { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)', color: '#ea580c', label: 'IN REVIEW', icon: '📋' },
      'accepted': { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', color: '#16a34a', label: 'PAID', icon: '✓' },
      'disputed': { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', color: '#dc2626', label: 'REVISIONS', icon: '🔄' },
    }[task.auction_status] ?? { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', color: '#16a34a', label: 'WON', icon: '✓' };

    return (
      <HoverCard key={task.task_id} onClick={() => handleCardClick(task)}>
        {(hovered) => (
          <div style={cardStyle(hovered)}>
            {hovered && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: task.auction_status === 'disputed' ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '20px 20px 0 0' }} />}

            {/* Status badge */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 999,
              background: wonBadgeConfig.bg,
              border: `1px solid ${wonBadgeConfig.border}`,
            }}>
              {wonBadgeConfig.icon === '✓' ? (
                <svg width="12" height="12" fill="none" stroke={wonBadgeConfig.color} strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <span style={{ fontSize: 10 }}>{wonBadgeConfig.icon}</span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: wonBadgeConfig.color, letterSpacing: '0.5px' }}>{wonBadgeConfig.label}</span>
            </div>

            <div style={{ marginBottom: 10, paddingRight: 70, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </h3>
              {task.category && <div style={{ marginTop: 6 }}>{renderCategoryBadge(task.category)}</div>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 16, flex: 1 }}>
              {task.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Your Winning Bid
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}>
                  ${myBid ? myBid.bid_amount.toFixed(2) : `${task.starting_bid.toFixed(2)}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {task.auction_status === 'accepted' ? 'Paid' : task.auction_status === 'pending-review' ? 'Submitted' : task.auction_status === 'disputed' ? 'Revisions' : 'Completed'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(task.auction_end_time)}</div>
              </div>
            </div>
          </div>
        )}
      </HoverCard>
    );
  };

  const renderSkeletons = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 180, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 22px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Skeleton variant="text" width="65%" height="20px" />
            <Skeleton variant="rect" width="72px" height="22px" style={{ borderRadius: 999, flexShrink: 0 }} />
          </div>
          <Skeleton variant="text" width="100%" height="14px" />
          <Skeleton variant="text" width="80%" height="14px" />
          <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton variant="text" width="80px" height="20px" />
            <Skeleton variant="text" width="90px" height="16px" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = (message: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', textAlign: 'center' }}>
      <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)', opacity: 0.4, marginBottom: 20 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h.01M15 9h.01M9 15h6" />
      </svg>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>
        Nothing here yet
      </h3>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360 }}>
        {message}
      </p>
    </div>
  );

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 18px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    background: active
      ? (isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)')
      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
    color: active ? '#6366f1' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  });

  const renderSortControls = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Sort:</span>
      <button onClick={() => setSortField('date')} style={chipStyle(sortField === 'date')}>
        Date
      </button>
      <button onClick={() => setSortField('amount')} style={chipStyle(sortField === 'amount')}>
        Amount
      </button>
      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
      <button onClick={() => setSortDir('desc')} style={chipStyle(sortDir === 'desc')}>
        ↓
      </button>
      <button onClick={() => setSortDir('asc')} style={chipStyle(sortDir === 'asc')}>
        ↑
      </button>
    </div>
  );

  const renderFilterBar = <T extends string>(filters: { key: T; label: string }[], current: T, setCurrent: (f: T) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.key} onClick={() => setCurrent(f.key)} style={chipStyle(current === f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {renderSortControls()}
    </div>
  );

  // Stats for current tab
  const getStats = () => {
    if (activeTab === 'my-tasks') {
      const active = clientTasks.filter(isTaskActive).length;
      const completed = clientTasks.filter(t => !isTaskActive(t)).length;
      return [
        { label: 'Total Tasks', value: String(clientTasks.length) },
        { label: 'Active', value: String(active) },
        { label: 'Completed', value: String(completed) },
      ];
    }
    if (activeTab === 'my-bids') {
      const activeBids = bidTasks.filter(isTaskActive).length;
      const winning = bidTasks.filter(t => isTaskActive(t) && allCurrentBids[t.task_id]?.bidder_id === user?.user_id).length;
      return [
        { label: 'Active Bids', value: String(activeBids) },
        { label: 'Winning', value: String(winning) },
        { label: 'Total', value: String(bidTasks.length) },
      ];
    }
    if (activeTab === 'won') {
      return [
        { label: 'Auctions Won', value: String(wonTasks.length) },
      ];
    }
    // transactions tab
    const totalPaid = transactions.filter(t => t.type === 'payment' && t.status === 'Released').reduce((s, t) => s + t.amount, 0);
    const totalEarned = transactions.filter(t => t.type === 'earning' && t.status === 'Received').reduce((s, t) => s + t.amount, 0);
    return [
      { label: 'Total', value: String(transactions.length) },
      { label: 'Paid Out', value: `$${totalPaid.toFixed(2)}` },
      { label: 'Earned', value: `$${totalEarned.toFixed(2)}` },
    ];
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>
      <Navbar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px 100px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 999, marginBottom: 10,
                background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)'}`,
                fontSize: 11, fontWeight: 700, letterSpacing: '1px',
                color: '#6366f1', textTransform: 'uppercase' as const,
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
                Dashboard
              </div>
              <h1 style={{
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-1px',
                fontFamily: "'Space Grotesk', sans-serif",
                marginBottom: 6,
              }}>
                My Activity
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                Track your posted tasks, active bids, and won auctions.
              </p>
            </div>

            {/* Stats strip */}
            {!loading && (
              <div style={{
                display: 'flex', gap: 0,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 14, overflow: 'hidden',
                alignSelf: 'flex-start',
              }}>
                {getStats().map((s, i, arr) => (
                  <div key={s.label} style={{
                    padding: '12px 20px',
                    borderRight: i < arr.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1', fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setTaskFilter('all'); setBidFilter('all'); setWonFilter('all'); setTxnFilter('all'); setSortField('date'); setSortDir('desc'); }}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                background: activeTab === tab.key
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab.key ? '0 2px 10px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-filter chips + sort controls */}
        {activeTab === 'my-tasks' && renderFilterBar(STATUS_FILTERS, taskFilter, setTaskFilter)}
        {activeTab === 'my-bids' && renderFilterBar(BID_STATUS_FILTERS, bidFilter, setBidFilter)}
        {activeTab === 'won' && renderFilterBar(WON_FILTERS, wonFilter, setWonFilter)}
        {activeTab === 'transactions' && renderFilterBar(TXN_FILTERS, txnFilter, setTxnFilter)}

        {/* Content */}
        {loading ? renderSkeletons() : (
          <div ref={gridRef}>
            {activeTab === 'my-tasks' && (
              filteredClientTasks.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>
                    {filteredClientTasks.length} task{filteredClientTasks.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {filteredClientTasks.map(renderClientTaskCard)}
                  </div>
                </>
              ) : renderEmpty(
                taskFilter !== 'all'
                  ? `No tasks with status "${STATUS_FILTERS.find(f => f.key === taskFilter)?.label}".`
                  : "You haven't posted any tasks yet. Create your first task to get competitive bids!"
              )
            )}

            {activeTab === 'my-bids' && (
              filteredBidTasks.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>
                    {filteredBidTasks.length} bid{filteredBidTasks.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {filteredBidTasks.map(renderBidTaskCard)}
                  </div>
                </>
              ) : renderEmpty(
                bidFilter !== 'all'
                  ? `No ${BID_STATUS_FILTERS.find(f => f.key === bidFilter)?.label?.toLowerCase()} bids.`
                  : "You haven't placed any bids yet. Browse the marketplace to find tasks to bid on!"
              )
            )}

            {activeTab === 'won' && (
              filteredWonTasks.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>
                    {filteredWonTasks.length} auction{filteredWonTasks.length !== 1 ? 's' : ''}{wonFilter !== 'all' ? ` (${WON_FILTERS.find(f => f.key === wonFilter)?.label})` : ' won'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {filteredWonTasks.map(renderWonTaskCard)}
                  </div>
                </>
              ) : renderEmpty(
                wonFilter === 'active'
                  ? "No active tasks right now."
                  : wonFilter === 'under-review'
                    ? "No tasks under review."
                    : wonFilter === 'paid'
                      ? "No paid tasks yet."
                      : "You haven't won any auctions yet. Keep bidding to win your first task!"
              )
            )}

            {activeTab === 'transactions' && (
              filteredTransactions.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredTransactions.map(txn => {
                      const typeConfig = {
                        payment: { icon: '↑', color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'Payment' },
                        earning: { icon: '↓', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Earning' },
                        refund: { icon: '←', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Refund' },
                      }[txn.type];

                      const statusColor = {
                        'Released': '#f97316',
                        'Received': '#22c55e',
                        'Cancelled — Refunded': '#6366f1',
                        'Held': '#ca8a04',
                        'Pending': '#ca8a04',
                        'In Review': '#ea580c',
                        'Disputed': '#dc2626',
                        'Awaiting Release': '#ca8a04',
                        'No Bids — Refunded': '#6b7280',
                      }[txn.status] ?? 'var(--text-secondary)';

                      return (
                        <div
                          key={txn.id}
                          className="dash-card"
                          onClick={() => navigate(`/task/${txn.taskId}`, { state: { from: 'dashboard', tab: 'transactions' } })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '16px 20px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            cursor: 'pointer',
                            transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.08)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                          }}
                        >
                          {/* Type icon */}
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: typeConfig.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, fontWeight: 700, color: typeConfig.color,
                            flexShrink: 0,
                          }}>
                            {typeConfig.icon}
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{
                                fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                                fontFamily: "'Space Grotesk', sans-serif",
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {txn.taskTitle}
                              </span>
                              <span style={{
                                padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                background: typeConfig.bg, color: typeConfig.color,
                                flexShrink: 0,
                              }}>
                                {typeConfig.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {formatDate(txn.date)}
                            </div>
                          </div>

                          {/* Amount + status */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 16, fontWeight: 800,
                              color: txn.type === 'earning' ? '#22c55e' : txn.type === 'refund' ? '#6366f1' : 'var(--text-primary)',
                              fontFamily: "'Space Grotesk', sans-serif",
                            }}>
                              {txn.type === 'earning' ? '+' : txn.type === 'refund' ? '+' : '-'}${txn.amount.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: statusColor, marginTop: 2 }}>
                              {txn.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : renderEmpty(
                txnFilter === 'payments'
                  ? "No payments yet. Payments appear when you post tasks."
                  : txnFilter === 'earnings'
                    ? "No earnings yet. Win auctions to start earning!"
                    : txnFilter === 'refunds'
                      ? "No refunds yet."
                      : "No transactions yet. Post a task or bid on one to get started!"
              )
            )}
          </div>
        )}
      </div>

      <AddTaskButton />
      {user && addTaskModalOpen && <AddTaskModal />}
      {user && profileModalOpen && <ProfileModal />}
      {user && <ChatPanel />}
      {authModalOpen && <AuthModal />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800;900&display=swap');
        @keyframes cardPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 640px) {
          .dash-tab-bar { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
};

// Tiny helper to avoid repeating hover state logic per card
const HoverCard: React.FC<{
  onClick: () => void;
  children: (hovered: boolean) => React.ReactNode;
}> = ({ onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="dash-card"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children(hovered)}
    </div>
  );
};

export default Dashboard;
